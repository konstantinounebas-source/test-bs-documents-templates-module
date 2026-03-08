import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, SkipForward, RefreshCw, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

export default function ChatStepQC({ batchId, department, onNext, onSkip, onBack }) {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [form, setForm] = useState({ qc_type: "", qc_level: "" });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [selectedItems, setSelectedItems] = useState(new Set());

  const { data: batchHeader } = useQuery({
    queryKey: ["BatchHeader", batchId],
    queryFn: () => base44.entities.BatchHeader.filter({ id: batchId }),
    enabled: !!batchId, select: d => d?.[0], staleTime: Infinity
  });

  const { data: allDepartments = [] } = useQuery({
    queryKey: ["Department"],
    queryFn: () => base44.entities.Department.filter({ is_active: true }),
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60, // 1 hour cache
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * (2 ** attemptIndex + Math.random()), 60000)
  });
  const currentDeptId = useMemo(
    () => allDepartments.find(d => d.name === department)?.id || null,
    [allDepartments, department]
  );

  const { data: qcTypes = [] } = useQuery({
    queryKey: ["QCType"],
    queryFn: () => base44.entities.QCType.filter({ is_active: true }),
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * (2 ** attemptIndex + Math.random()), 60000)
  });
  const { data: qcLevels = [] } = useQuery({
    queryKey: ["QCLevel"],
    queryFn: () => base44.entities.QCLevel.filter({ is_active: true }),
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * (2 ** attemptIndex + Math.random()), 60000)
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
    enabled: !!batchId, 
    staleTime: 30000,
    gcTime: 1000 * 60 * 10, // 10 min cache
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * (2 ** attemptIndex + Math.random()), 60000)
  });

  const { data: existingQC = [] } = useQuery({
    queryKey: ["QC_Initial_Stock", batchId],
    queryFn: () => base44.entities.QC_Initial_Stock.filter({ batch_header_id: batchId }),
    enabled: !!batchId, 
    staleTime: 30000,
    gcTime: 1000 * 60 * 10,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * (2 ** attemptIndex + Math.random()), 60000)
  });

  const { data: scheduledData = [] } = useQuery({
    queryKey: ["ScheduledData", batchHeader?.date, batchHeader?.department],
    queryFn: () => base44.entities.ScheduledData.filter({ date: batchHeader.date, department_id: batchHeader.department }),
    enabled: !!batchHeader?.date && !!batchHeader?.department, 
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * (2 ** attemptIndex + Math.random()), 60000)
  });

  const processedLines = batchLines.filter(bl => (bl.qty_processed || 0) > 0);

  const totalQCTime = existingQC.reduce((sum, qc) => {
    const perPiece = parseFloat(qc.qc_per_piece_min || 0);
    const qty = parseInt(qc.qty_affected || 0);
    return sum + (perPiece * qty);
  }, 0);

  const handleEditStart = (qc) => {
    setEditingId(qc.id);
    setEditForm({ ...qc });
  };

  const handleEditSave = async () => {
    if (!editingId) return;
    try {
      await base44.entities.QC_Initial_Stock.update(editingId, editForm);
      queryClient.invalidateQueries(["QC_Initial_Stock", batchId]);
      setEditingId(null);
      toast.success("✅ QC record ενημερώθηκε");
    } catch {
      toast.error("Σφάλμα ενημέρωσης");
    }
  };

  const handleDelete = async (id) => {
    try {
      await base44.entities.QC_Initial_Stock.delete(id);
      queryClient.invalidateQueries(["QC_Initial_Stock", batchId]);
      toast.success("✅ QC record διαγράφηκε");
    } catch {
      toast.error("Σφάλμα διαγραφής");
    }
  };

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
      const message = created > 0 
        ? `✅ QC Initial Stock συγχρονίστηκε από Schedule - ${created} καταχωρήσεις προστέθηκαν.` 
        : "ℹ️ Όλα τα QC records υπάρχουν ήδη στο σύστημα.";
      onNext(message);
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
        <div className="flex items-center gap-1">
          <button onClick={onBack} className="text-slate-400 hover:text-slate-600 p-0.5"><ChevronLeft className="w-4 h-4" /></button>
          <p className="text-xs font-semibold text-slate-700">QC Initial Stock</p>
        </div>
        <Button variant="ghost" size="sm" className="text-xs h-6 text-slate-400" onClick={onSkip}>
          <SkipForward className="w-3 h-3 mr-1" /> Παράλειψη
        </Button>
      </div>

      {existingQC.length > 0 && (
        <div className="space-y-2">
          <div className="bg-blue-50 border border-blue-200 rounded p-2">
            <p className="text-xs font-semibold text-blue-900">Total QC Time: {totalQCTime.toFixed(2)} min ({(totalQCTime / 60).toFixed(2)} hrs)</p>
          </div>
          <div className="bg-slate-50 rounded border border-slate-200 p-2 max-h-56 overflow-y-auto">
            <div className="grid grid-cols-6 gap-1 text-[10px] font-semibold text-slate-600 mb-1 pb-1 border-b sticky top-0 bg-slate-50">
              <div>Item</div>
              <div>Type</div>
              <div>Level</div>
              <div>Per-piece (min)</div>
              <div>Qty</div>
              <div>Actions</div>
            </div>
            {existingQC.map((qc) => (
              <div key={qc.id} className="grid grid-cols-6 gap-1 text-[10px] text-slate-700 py-0.5 border-b border-slate-100 last:border-0 items-center">
                <div>{qc.item_code}</div>
                <div>{qc.qc_type}</div>
                <div>{qc.qc_level}</div>
                {editingId === qc.id ? (
                  <>
                    <input type="number" step="0.01" value={editForm.qc_per_piece_min || 0} 
                      onChange={(e) => setEditForm(f => ({ ...f, qc_per_piece_min: e.target.value }))}
                      className="h-6 px-1 border border-slate-300 rounded text-[10px]" />
                    <input type="number" value={editForm.qty_affected || 0}
                      onChange={(e) => setEditForm(f => ({ ...f, qty_affected: e.target.value }))}
                      className="h-6 px-1 border border-slate-300 rounded text-[10px]" />
                    <div className="flex gap-0.5">
                      <button onClick={handleEditSave} className="text-green-600 hover:text-green-700">✓</button>
                      <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>{(qc.qc_per_piece_min || 0).toFixed(2)}</div>
                    <div>{qc.qty_affected}</div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEditStart(qc)} className="text-blue-600 hover:text-blue-700">✏</button>
                      <button onClick={() => handleDelete(qc.id)} className="text-red-600 hover:text-red-700">🗑</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
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