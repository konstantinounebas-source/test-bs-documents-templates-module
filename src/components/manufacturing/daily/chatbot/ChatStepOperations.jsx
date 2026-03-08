import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, SkipForward, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function ChatStepOperations({ batchId, onNext, onSkip }) {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: batchHeader } = useQuery({
    queryKey: ["BatchHeader", batchId],
    queryFn: () => base44.entities.BatchHeader.filter({ id: batchId }),
    enabled: !!batchId, select: d => d?.[0], staleTime: Infinity
  });

  const { data: existingOps = [] } = useQuery({
    queryKey: ["Operations", batchId],
    queryFn: () => base44.entities.Operations.filter({ batch_header_id: batchId }),
    enabled: !!batchId, staleTime: 0
  });

  const { data: batchLines = [] } = useQuery({
    queryKey: ["Batch_Lines", batchId],
    queryFn: () => base44.entities.Batch_Lines.filter({ batch_header_id: batchId }),
    enabled: !!batchId, staleTime: 0
  });

  const totalOpTime = existingOps.reduce((s, o) => s + (o.operation_time_min || 0), 0);
  const processedCount = batchLines.filter(bl => (bl.qty_processed || 0) > 0).length;

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const processedLines = batchLines.filter(bl => (bl.qty_processed || 0) > 0);
      if (!processedLines.length) { toast.info("Δεν υπάρχουν processed lines"); setIsSyncing(false); return; }

      const bundleId = batchHeader?.bundle_id;
      const [stdLinesAll, schedDataAll, allProfileNames, allOperations] = await Promise.all([
        bundleId ? base44.entities.StdSetLines.filter({ bundle_id: bundleId }) : Promise.resolve([]),
        (batchHeader?.date && batchHeader?.department)
          ? base44.entities.ScheduledData.filter({ date: batchHeader.date, department_id: batchHeader.department })
          : Promise.resolve([]),
        base44.entities.OperationProfileName.list(),
        base44.entities.Operation.list()
      ]);

      const stdMap = {};
      stdLinesAll.forEach(sl => { stdMap[`${sl.item_code || ""}|${sl.operation}`] = sl.std_min_per_pc || 0; });
      const getStd = (ic, op) => stdMap[`${ic}|${op}`] ?? stdMap[`|${op}`] ?? 0;

      const existingItemCodes = new Set(processedLines.map(bl => bl.item_code));
      const opsToDelete = existingOps.filter(op => existingItemCodes.has(op.item_code));
      await Promise.all(opsToDelete.map(op => base44.entities.Operations.delete(op.id)));

      const opsToCreate = [];
      for (const bl of processedLines) {
        const qty = bl.qty_processed;
        const sched = schedDataAll.find(sd => sd.item_code === bl.item_code);
        if (sched?.operation_profile_id) {
          const profile = allProfileNames.find(p => p.id === sched.operation_profile_id);
          const activeOps = (profile?.operations_required || [])
            .map(id => allOperations.find(o => o.id === id)).filter(Boolean).map(o => o.name);
          if (activeOps.length > 0) {
            const groupId = `sync-${batchId}-${bl.item_code}-${Date.now()}`;
            activeOps.forEach(opName => {
              const std = getStd(bl.item_code, opName);
              opsToCreate.push({ batch_header_id: batchId, item_code: bl.item_code, operation: opName,
                qty_operation: qty, std_min_pc_lookup: std, operation_time_min: qty * std,
                operation_profile_id: sched.operation_profile_id, profile_group_id: groupId, source_type: "SCHEDULE" });
            });
          } else {
            opsToCreate.push({ batch_header_id: batchId, item_code: bl.item_code, operation: "",
              qty_operation: qty, operation_profile_id: sched.operation_profile_id, source_type: "SCHEDULE" });
          }
        } else {
          opsToCreate.push({ batch_header_id: batchId, item_code: bl.item_code, operation: "",
            qty_operation: qty, source_type: "MANUAL" });
        }
      }
      if (opsToCreate.length) await base44.entities.Operations.bulkCreate(opsToCreate);
      queryClient.invalidateQueries(["Operations", batchId]);
      toast.success(`✅ Synced ${processedLines.length} item(s)`);
      onNext(`✅ Operations συγχρονίστηκαν από Batch Lines (${processedLines.length} items).`);
    } catch (err) {
      toast.error(`Σφάλμα: ${err?.message || "Άγνωστο"}`);
    }
    setIsSyncing(false);
  };

  return (
    <div className="border-t p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-700">Operations</p>
        <Button variant="ghost" size="sm" className="text-xs h-6 text-slate-400" onClick={onSkip}>
          <SkipForward className="w-3 h-3 mr-1" /> Παράλειψη
        </Button>
      </div>

      {existingOps.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-700">
          ✅ {existingOps.length} operations καταχωρημένα · Σύνολο χρόνου: {totalOpTime.toFixed(1)} min
        </div>
      )}

      <Button size="sm" variant="outline" className="w-full text-xs" onClick={handleSync} disabled={isSyncing}>
        {isSyncing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
        Sync από Batch Lines ({processedCount} items)
      </Button>

      <Button size="sm" className="w-full text-xs bg-green-600 hover:bg-green-700"
        onClick={() => onNext("⏭ Operations – Συνέχεια...")}>
        <CheckCircle2 className="w-3 h-3 mr-1" /> Συνέχεια → Team Time - Persons
      </Button>
    </div>
  );
}