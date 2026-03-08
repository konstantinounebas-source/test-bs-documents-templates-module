import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, SkipForward, RefreshCw, Trash2, Pencil, Check, X, ChevronLeft, Plus } from "lucide-react";
import { toast } from "sonner";

function ConsumableRow({ line, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(line.actual_qty ?? line.expected_qty ?? 0);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await onUpdate(line.id, { actual_qty: parseFloat(val) || 0 });
    setSaving(false);
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-1 px-2 py-1 text-[10px] text-slate-700 hover:bg-slate-50 group">
      <span className="flex-1 truncate font-medium">{line.consumable}</span>
      <span className="text-slate-400 truncate max-w-[40px]">{line.item_code}</span>
      {editing ? (
        <>
          <input type="number" value={val} onChange={e => setVal(e.target.value)}
            className="w-14 border rounded px-1 py-0.5 text-[10px] outline-none focus:border-blue-400" />
          <button onClick={save} disabled={saving} className="text-green-600 hover:text-green-800">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          </button>
          <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600"><X className="w-3 h-3" /></button>
        </>
      ) : (
        <>
          <span className="text-slate-400 w-10 text-right">{(line.expected_qty || 0).toFixed(2)}e</span>
          <span className="text-slate-700 font-medium w-10 text-right">{(line.actual_qty || 0).toFixed(2)}a</span>
          <button onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-700 ml-1"><Pencil className="w-3 h-3" /></button>
          <button onClick={() => onDelete(line.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
        </>
      )}
    </div>
  );
}

export default function ChatStepConsumables({ batchId, onNext, onSkip, onBack }) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [manualForm, setManualForm] = useState({ consumable: "", item_code: "", operation: "", unit: "", actual_qty: "", notes: "" });
  const [isSavingManual, setIsSavingManual] = useState(false);

  const { data: consumables = [] } = useQuery({
    queryKey: ["Consumable"],
    queryFn: () => base44.entities.Consumable.list(),
    staleTime: Infinity
  });

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

  const operationOptions = useMemo(() => {
    const seen = new Set();
    return batchOperations.filter(op => {
      const key = `${op.item_code}__${op.operation}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map(op => ({ item_code: op.item_code, operation: op.operation }));
  }, [batchOperations]);

  const handleAddManual = async () => {
    if (!manualForm.consumable || !manualForm.actual_qty || !manualForm.unit) {
      toast.error("Consumable, Unit και Actual Qty είναι υποχρεωτικά"); return;
    }
    setIsSavingManual(true);
    try {
      await base44.entities.ConsumablesActual.create({
        batch_header_id: batchId,
        department: batchHeader?.department || "",
        consumable: manualForm.consumable,
        item_code: manualForm.item_code,
        operation: manualForm.operation,
        unit: manualForm.unit,
        actual_qty: parseFloat(manualForm.actual_qty) || 0,
        expected_qty: 0,
        notes: manualForm.notes,
        is_auto_generated: false
      });
      queryClient.invalidateQueries(["ConsumablesActual", batchId]);
      toast.success("✅ Consumable προστέθηκε");
      setManualForm({ consumable: "", item_code: "", operation: "", unit: "", actual_qty: "", notes: "" });
      setShowAddForm(false);
    } catch { toast.error("Σφάλμα αποθήκευσης"); }
    setIsSavingManual(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.ConsumablesActual.delete(id);
    queryClient.invalidateQueries(["ConsumablesActual", batchId]);
    toast.success("Διαγράφηκε");
  };

  const handleUpdate = async (id, data) => {
    await base44.entities.ConsumablesActual.update(id, data);
    queryClient.invalidateQueries(["ConsumablesActual", batchId]);
    toast.success("Ενημερώθηκε");
  };

  const totalActual = lines.reduce((s, l) => s + (l.actual_qty || 0), 0);
  const totalExpected = lines.reduce((s, l) => s + (l.expected_qty || 0), 0);

  return (
    <div className="border-t p-3 space-y-2 overflow-y-auto max-h-[420px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={onBack} className="text-slate-400 hover:text-slate-600 p-0.5"><ChevronLeft className="w-4 h-4" /></button>
          <p className="text-xs font-semibold text-slate-700">Consumables</p>
        </div>
        <Button variant="ghost" size="sm" className="text-xs h-6 text-slate-400" onClick={onSkip}>
          <SkipForward className="w-3 h-3 mr-1" /> Παράλειψη
        </Button>
      </div>

      {lines.length > 0 && (
        <>
          <div className="bg-indigo-50 border border-indigo-200 rounded p-2 text-xs text-indigo-700">
            ✅ {lines.length} εγγραφές · EXP: {totalExpected.toFixed(2)} · ACT: {totalActual.toFixed(2)}
          </div>
          <div className="border rounded divide-y max-h-40 overflow-y-auto">
            <div className="grid grid-cols-4 px-2 py-1 text-[9px] font-semibold text-slate-400 uppercase">
              <span>Consumable</span><span>Item</span><span className="text-right">EXP</span><span className="text-right">ACT</span>
            </div>
            {lines.map(l => (
              <ConsumableRow key={l.id} line={l} onDelete={handleDelete} onUpdate={handleUpdate} />
            ))}
          </div>
        </>
      )}

      {expectedRows.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-700">
          📊 {expectedRows.length} expected rows από standards
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