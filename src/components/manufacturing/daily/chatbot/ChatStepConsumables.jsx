import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, SkipForward, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function ChatStepConsumables({ batchId, onNext, onSkip }) {
  const queryClient = useQueryClient();

  const { data: batchHeader } = useQuery({
    queryKey: ["BatchHeader", batchId],
    queryFn: () => base44.entities.BatchHeader.filter({ id: batchId }),
    enabled: !!batchId, select: d => d?.[0], staleTime: Infinity
  });

  const { data: consumablesStdLines = [] } = useQuery({
    queryKey: ["ConsumablesStandardsLines", batchHeader?.bundle_id],
    queryFn: () => base44.entities.ConsumablesStandardsLines.filter({ bundle_id: batchHeader.bundle_id }),
    enabled: !!batchHeader?.bundle_id, staleTime: Infinity
  });

  const { data: batchOperations = [] } = useQuery({
    queryKey: ["Operations", batchId],
    queryFn: () => base44.entities.Operations.filter({ batch_header_id: batchId }),
    enabled: !!batchId, staleTime: 30 * 1000
  });

  const { data: lines = [] } = useQuery({
    queryKey: ["ConsumablesActual", batchId],
    queryFn: () => base44.entities.ConsumablesActual.filter({ batch_header_id: batchId }),
    enabled: !!batchId, staleTime: 0
  });

  const expectedRows = useMemo(() => {
    if (!batchOperations.length || !consumablesStdLines.length) return [];
    const rows = [];
    batchOperations.forEach(op => {
      let stds = consumablesStdLines.filter(s => s.item_code === op.item_code && s.operation === op.operation);
      if (!stds.length) stds = consumablesStdLines.filter(s => s.item_code === op.item_code);
      if (!stds.length) stds = consumablesStdLines.filter(s => s.operation === op.operation);
      stds.forEach(std => {
        const qty = op.qty_operation || 0;
        const exp = std.rate_type === "unit" ? qty * (std.rate_value || 0) : qty * (std.rate_value || 0) / 100;
        rows.push({ key: `${op.id}_${std.id}`, item_code: op.item_code, operation: op.operation,
          consumable: std.consumable, unit: std.unit, rate_type: std.rate_type, rate_value: std.rate_value,
          ops_qty: qty, expected_qty: exp });
      });
    });
    return rows;
  }, [batchOperations, consumablesStdLines]);

  const autoGenerateMutation = useMutation({
    mutationFn: async () => {
      if (!expectedRows.length) throw new Error("Δεν βρέθηκαν standards για τις operations.");
      const existingKeys = new Set(lines.map(l => `${l.item_code}|${l.operation}|${l.consumable}`));
      const newRows = expectedRows.filter(r => !existingKeys.has(`${r.item_code}|${r.operation}|${r.consumable}`));
      if (!newRows.length) throw new Error("Όλες οι εγγραφές υπάρχουν ήδη.");
      await Promise.all(newRows.map(r => base44.entities.ConsumablesActual.create({
        batch_header_id: batchId, department: batchHeader?.department || "",
        consumable: r.consumable, item_code: r.item_code, operation: r.operation,
        expected_qty: r.expected_qty, actual_qty: r.expected_qty, unit: r.unit,
        rate_type: r.rate_type, is_auto_generated: true, notes: ""
      })));
      return newRows.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries(["ConsumablesActual", batchId]);
      toast.success(`✅ Προστέθηκαν ${count} consumable rows`);
    },
    onError: (err) => toast.error(err.message || "Σφάλμα")
  });

  const totalActual = lines.reduce((s, l) => s + (l.actual_qty || 0), 0);
  const totalExpected = lines.reduce((s, l) => s + (l.expected_qty || 0), 0);

  return (
    <div className="border-t p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-700">Consumables</p>
        <Button variant="ghost" size="sm" className="text-xs h-6 text-slate-400" onClick={onSkip}>
          <SkipForward className="w-3 h-3 mr-1" /> Παράλειψη
        </Button>
      </div>

      {lines.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded p-2 text-xs text-indigo-700 space-y-0.5">
          <div>✅ {lines.length} εγγραφές καταχωρημένες</div>
          <div>EXP: {totalExpected.toFixed(2)} · ACT: {totalActual.toFixed(2)}</div>
        </div>
      )}

      {expectedRows.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-700">
          📊 {expectedRows.length} expected rows από standards βρέθηκαν
        </div>
      )}

      {expectedRows.length > 0 && (
        <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => autoGenerateMutation.mutate()}
          disabled={autoGenerateMutation.isPending}>
          {autoGenerateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
          Generate από Standards ({expectedRows.length})
        </Button>
      )}

      <Button size="sm" className="w-full text-xs bg-green-600 hover:bg-green-700"
        onClick={() => onNext("🎉 Η καταχώριση ολοκληρώθηκε! Όλα τα βήματα εκτελέστηκαν.")}>
        <CheckCircle2 className="w-3 h-3 mr-1" /> Ολοκλήρωση
      </Button>
    </div>
  );
}