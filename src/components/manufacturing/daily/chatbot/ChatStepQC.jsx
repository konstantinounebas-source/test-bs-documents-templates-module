import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, SkipForward, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function ChatStepQC({ batchId, department, onNext, onSkip }) {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [form, setForm] = useState({ qc_type: "", qc_level: "" });

  const { data: batchHeader } = useQuery({
    queryKey: ["BatchHeader", batchId],
    queryFn: () => base44.entities.BatchHeader.filter({ id: batchId }),
    enabled: !!batchId, select: d => d?.[0], staleTime: Infinity
  });

  const { data: allDepartments = [] } = useQuery({
    queryKey: ["Department"],
    queryFn: () => base44.entities.Department.filter({ is_active: true }),
    staleTime: Infinity
  });
  const currentDeptId = useMemo(
    () => allDepartments.find(d => d.name === department)?.id || null,
    [allDepartments, department]
  );

  const { data: qcTypes = [] } = useQuery({
    queryKey: ["QCType"],
    queryFn: () => base44.entities.QCType.filter({ is_active: true }),
    staleTime: Infinity
  });
  const { data: qcLevels = [] } = useQuery({
    queryKey: ["QCLevel"],
    queryFn: () => base44.entities.QCLevel.filter({ is_active: true }),
    staleTime: Infinity
  });

  const filteredQcTypes = useMemo(
    () => qcTypes.filter(qt => !qt.department_ids?.length || !currentDeptId || qt.department_ids.includes(currentDeptId)),
    [qcTypes, currentDeptId]
  );
  const filteredQcLevels = useMemo(
    () => qcLevels.filter(ql => !ql.department_ids?.length || !currentDeptId || ql.department_ids.includes(currentDeptId)),
    [qcLevels, currentDeptId]
  );

  const { data: batchLines = [] } = useQuery({
    queryKey: ["Batch_Lines", batchId],
    queryFn: () => base44.entities.Batch_Lines.filter({ batch_header_id: batchId }),
    enabled: !!batchId, staleTime: 0
  });

  const { data: existingQC = [] } = useQuery({
    queryKey: ["QC_Initial_Stock", batchId],
    queryFn: () => base44.entities.QC_Initial_Stock.filter({ batch_header_id: batchId }),
    enabled: !!batchId, staleTime: 0
  });

  const { data: scheduledData = [] } = useQuery({
    queryKey: ["ScheduledData", batchHeader?.date, batchHeader?.department],
    queryFn: () => base44.entities.ScheduledData.filter({ date: batchHeader.date, department_id: batchHeader.department }),
    enabled: !!batchHeader?.date && !!batchHeader?.department, staleTime: Infinity
  });

  const processedLines = batchLines.filter(bl => (bl.qty_processed || 0) > 0);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const schedWithQC = scheduledData.filter(sd => sd.qc_type && sd.qc_qty > 0);
      if (!schedWithQC.length) { toast.info("Δεν υπάρχουν scheduled QC entries"); setIsSyncing(false); return; }

      let created = 0;
      for (const sd of schedWithQC) {
        const bl = batchLines.find(l => l.item_code === sd.item_code);
        if (!bl || !bl.qty_processed) continue;
        const exists = existingQC.find(q => q.item_code === sd.item_code && q.qc_type === sd.qc_type);
        if (exists) continue;
        await base44.entities.QC_Initial_Stock.create({
          batch_header_id: batchId, item_code: sd.item_code,
          qc_type: sd.qc_type, qc_level: sd.qc_level || "", qty_affected: bl.qty_processed
        });
        created++;
      }
      queryClient.invalidateQueries(["QC_Initial_Stock", batchId]);
      toast.success(created > 0 ? `Συγχρονίστηκαν ${created} QC record(s)` : "Όλα τα QC records υπάρχουν ήδη");
    } catch { toast.error("Αποτυχία sync"); }
    setIsSyncing(false);
  };

  const handleAddAll = async () => {
    if (!form.qc_type || !form.qc_level) { toast.error("Επίλεξε QC Type και QC Level"); return; }
    if (!processedLines.length) { toast.info("Δεν υπάρχουν processed lines"); return; }
    setIsSaving(true);
    try {
      for (const bl of processedLines) {
        const exists = existingQC.find(q => q.item_code === bl.item_code && q.qc_type === form.qc_type);
        if (exists) continue;
        await base44.entities.QC_Initial_Stock.create({
          batch_header_id: batchId, item_code: bl.item_code,
          qc_type: form.qc_type, qc_level: form.qc_level, qty_affected: bl.qty_processed
        });
      }
      queryClient.invalidateQueries(["QC_Initial_Stock", batchId]);
      toast.success("✅ QC records προστέθηκαν");
      onNext("✅ QC Initial Stock καταχωρήθηκε για όλα τα processed items.");
    } catch { toast.error("Σφάλμα αποθήκευσης"); }
    setIsSaving(false);
  };

  return (
    <div className="border-t p-3 space-y-3 overflow-y-auto max-h-80">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-700">QC Initial Stock</p>
        <Button variant="ghost" size="sm" className="text-xs h-6 text-slate-400" onClick={onSkip}>
          <SkipForward className="w-3 h-3 mr-1" /> Παράλειψη
        </Button>
      </div>

      {existingQC.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded p-2 text-xs text-green-700">
          ✅ {existingQC.length} QC record(s) υπάρχουν ήδη
        </div>
      )}

      {/* Sync from schedule */}
      {scheduledData.some(sd => sd.qc_type) && (
        <Button size="sm" variant="outline" className="w-full text-xs" onClick={handleSync} disabled={isSyncing}>
          {isSyncing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
          Sync από Schedule
        </Button>
      )}

      {/* Manual add for all processed items */}
      <div className="space-y-1">
        <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wide">Μαζική Προσθήκη (όλα τα processed items)</p>
        <div className="grid grid-cols-2 gap-1">
          <div>
            <p className="text-[10px] text-slate-500 mb-0.5">QC Type</p>
            <Select value={form.qc_type} onValueChange={v => setForm(f => ({ ...f, qc_type: v }))}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Επίλεξε..." /></SelectTrigger>
              <SelectContent>
                {filteredQcTypes.map(qt => <SelectItem key={qt.id} value={qt.name}>{qt.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 mb-0.5">QC Level</p>
            <Select value={form.qc_level} onValueChange={v => setForm(f => ({ ...f, qc_level: v }))}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Επίλεξε..." /></SelectTrigger>
              <SelectContent>
                {filteredQcLevels.map(ql => <SelectItem key={ql.id} value={ql.name}>{ql.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button size="sm" className="w-full text-xs bg-blue-600 hover:bg-blue-700" onClick={handleAddAll} disabled={isSaving || !form.qc_type || !form.qc_level}>
          {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
          Προσθήκη QC για {processedLines.length} item(s)
        </Button>
      </div>

      <Button size="sm" className="w-full text-xs bg-green-600 hover:bg-green-700"
        onClick={() => onNext("⏭ QC Initial Stock – Συνέχεια...")}>
        <CheckCircle2 className="w-3 h-3 mr-1" /> Συνέχεια → Operations
      </Button>
    </div>
  );
}