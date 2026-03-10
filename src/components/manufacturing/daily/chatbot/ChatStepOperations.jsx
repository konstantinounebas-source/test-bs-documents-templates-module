import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle2, SkipForward, RefreshCw, Trash2, ChevronLeft, Pencil, Check, X, Plus } from "lucide-react";
import { toast } from "sonner";

function OpRow({ op, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(op.operation_time_min || 0);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await onUpdate(op.id, { operation_time_min: parseFloat(val) || 0 });
    setSaving(false);
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-1 px-2 py-1 text-[10px] text-slate-700 hover:bg-slate-50 rounded group">
      <span className="flex-1 truncate font-medium">{op.item_code}</span>
      <span className="text-slate-400 truncate max-w-[60px]">{op.operation || "—"}</span>
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
          <span className="text-slate-500 w-12 text-right">{(op.operation_time_min || 0).toFixed(1)}m</span>
          <button onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-700 ml-1"><Pencil className="w-3 h-3" /></button>
          <button onClick={() => onDelete(op.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
        </>
      )}
    </div>
  );
}

export default function ChatStepOperations({ batchId, onNext, onSkip, onBack }) {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ item_code: "", operation_profile_id: "" });
  const [selectedOperations, setSelectedOperations] = useState({});

  // ── Fetch batch header ────────────────────────────────────────────────────
  const { data: batchHeader } = useQuery({
    queryKey: ["BatchHeader", batchId],
    queryFn: () => base44.entities.BatchHeader.filter({ id: batchId }),
    enabled: !!batchId, select: d => d?.[0], staleTime: Infinity
  });

  // ── Fetch existing operations ─────────────────────────────────────────────
  const { data: existingOps = [] } = useQuery({
    queryKey: ["Operations", batchId],
    queryFn: () => base44.entities.Operations.filter({ batch_header_id: batchId }),
    enabled: !!batchId, staleTime: 0
  });

  // ── Fetch batch lines ─────────────────────────────────────────────────────
  const { data: batchLines = [] } = useQuery({
    queryKey: ["Batch_Lines", batchId],
    queryFn: () => base44.entities.Batch_Lines.filter({ batch_header_id: batchId }),
    enabled: !!batchId, staleTime: 0
  });

  // ── Fetch all operations (master list) ───────────────────────────────────
  const { data: allOperations = [] } = useQuery({
    queryKey: ["Operation"],
    queryFn: () => base44.entities.Operation.list(),
    staleTime: Infinity
  });

  // ── Fetch profile names filtered by department ────────────────────────────
  const { data: profileNames = [] } = useQuery({
    queryKey: ["OperationProfileName"],
    queryFn: () => base44.entities.OperationProfileName.list(),
    staleTime: Infinity
  });

  // ── Fetch StdSetLines for std_min_per_pc lookups ──────────────────────────
  const { data: stdSetLines = [] } = useQuery({
    queryKey: ["StdSetLines", batchHeader?.bundle_id],
    queryFn: () => base44.entities.StdSetLines.filter({ bundle_id: batchHeader.bundle_id }),
    enabled: !!batchHeader?.bundle_id, staleTime: Infinity
  });

  // ── Item codes from bundle ────────────────────────────────────────────────
  const itemCodes = useMemo(() => {
    return [...new Set(stdSetLines.map(l => l.item_code))].filter(Boolean).sort();
  }, [stdSetLines]);

  // ── Profiles filtered to department ──────────────────────────────────────
  const departmentProfiles = useMemo(() => {
    if (!batchHeader?.department) return profileNames;
    return profileNames.filter(p => p.department === batchHeader.department);
  }, [profileNames, batchHeader]);

  // ── Operations for selected profile ──────────────────────────────────────
  const operationsForProfile = useMemo(() => {
    if (!formData.operation_profile_id) return [];
    const profile = profileNames.find(p => p.id === formData.operation_profile_id);
    if (!profile?.operations_required) return [];
    return profile.operations_required
      .map(id => allOperations.find(o => o.id === id))
      .filter(Boolean);
  }, [formData.operation_profile_id, profileNames, allOperations]);

  // ── qty_processed for selected item ──────────────────────────────────────
  const selectedItemQtyProcessed = useMemo(() => {
    if (!formData.item_code) return null;
    const bl = batchLines.find(l => l.item_code === formData.item_code);
    return bl?.qty_processed ?? null;
  }, [formData.item_code, batchLines]);

  const totalOpTime = existingOps.reduce((s, o) => s + (o.operation_time_min || 0), 0);
  const processedCount = batchLines.filter(bl => (bl.qty_processed || 0) > 0).length;

  // ── Delete handler ────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    await base44.entities.Operations.delete(id);
    queryClient.invalidateQueries(["Operations", batchId]);
    toast.success("Διαγράφηκε");
  };

  const handleUpdate = async (id, data) => {
    await base44.entities.Operations.update(id, data);
    queryClient.invalidateQueries(["Operations", batchId]);
    toast.success("Ενημερώθηκε");
  };

  // ── Save metric helper ────────────────────────────────────────────────────
  const saveOpTimeMetric = async () => {
    if (!batchHeader) return;
    const allOps = await base44.entities.Operations.filter({ batch_header_id: batchId });
    const total = allOps.reduce((s, o) => s + (o.operation_time_min || 0), 0);
    const existing = await base44.entities.DailyMetricValue.filter({
      metric_code: "OP_TIME", date: batchHeader.date, department: batchHeader.department
    });
    if (existing.length > 0) {
      await base44.entities.DailyMetricValue.update(existing[0].id, { value: total });
    } else {
      await base44.entities.DailyMetricValue.create({
        metric_code: "OP_TIME", date: batchHeader.date, department: batchHeader.department, value: total
      });
    }
    queryClient.invalidateQueries(["DailyMetricValue"]);
  };

  // ── Add operations from profile form ─────────────────────────────────────
  const handleAdd = async () => {
    if (!formData.item_code || !formData.operation_profile_id) {
      toast.error("Επίλεξε item code και operation profile");
      return;
    }
    const selectedOps = Object.entries(selectedOperations).filter(([_, qty]) => qty > 0);
    if (selectedOps.length === 0) {
      toast.error("Επίλεξε τουλάχιστον μία operation με ποσότητα");
      return;
    }
    if (selectedItemQtyProcessed !== null) {
      const over = selectedOps.find(([_, qty]) => qty > selectedItemQtyProcessed);
      if (over) {
        const opName = allOperations.find(o => o.id === over[0])?.name || over[0];
        toast.error(`Qty για "${opName}" υπερβαίνει το qty processed (${selectedItemQtyProcessed})`);
        return;
      }
    }
    setIsSaving(true);
    const groupId = `manual-${Date.now()}`;
    const createPromises = selectedOps.map(([opId, qty]) => {
      const operation = allOperations.find(o => o.id === opId);
      if (!operation) return null;
      const stdLine = stdSetLines.find(sl => sl.item_code === formData.item_code && sl.operation === operation.name);
      const stdMinPc = stdLine?.std_min_per_pc || 0;
      return base44.entities.Operations.create({
        batch_header_id: batchId,
        item_code: formData.item_code,
        operation: operation.name,
        qty_operation: parseFloat(qty),
        source_type: "PROFILE",
        operation_profile_id: formData.operation_profile_id,
        profile_group_id: groupId,
        std_min_pc_lookup: stdMinPc,
        operation_time_min: parseFloat(qty) * stdMinPc
      });
    }).filter(Boolean);

    await Promise.all(createPromises);
    await queryClient.invalidateQueries(["Operations", batchId]);
    await saveOpTimeMetric();
    toast.success("✅ Operations προστέθηκαν");
    setFormData({ item_code: "", operation_profile_id: "" });
    setSelectedOperations({});
    setShowAddForm(false);
    setIsSaving(false);
  };

  // ── Sync from batch lines ─────────────────────────────────────────────────
  const handleSync = async () => {
    setIsSyncing(true);
    const processedLines = batchLines.filter(bl => (bl.qty_processed || 0) > 0);
    if (!processedLines.length) { toast.info("Δεν υπάρχουν processed lines"); setIsSyncing(false); return; }
    const bundleId = batchHeader?.bundle_id;
    const [stdLinesAll, schedDataAll, allProfileNames, allOps] = await Promise.all([
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
        const activeOps = (profile?.operations_required || []).map(id => allOps.find(o => o.id === id)).filter(Boolean).map(o => o.name);
        if (activeOps.length > 0) {
          const groupId = `sync-${batchId}-${bl.item_code}-${Date.now()}`;
          activeOps.forEach(opName => {
            const std = getStd(bl.item_code, opName);
            opsToCreate.push({ batch_header_id: batchId, item_code: bl.item_code, operation: opName, qty_operation: qty, std_min_pc_lookup: std, operation_time_min: qty * std, operation_profile_id: sched.operation_profile_id, profile_group_id: groupId, source_type: "SCHEDULE" });
          });
        } else {
          opsToCreate.push({ batch_header_id: batchId, item_code: bl.item_code, operation: "", qty_operation: qty, operation_profile_id: sched.operation_profile_id, source_type: "SCHEDULE" });
        }
      } else {
        opsToCreate.push({ batch_header_id: batchId, item_code: bl.item_code, operation: "", qty_operation: qty, source_type: "MANUAL" });
      }
    }
    if (opsToCreate.length) await base44.entities.Operations.bulkCreate(opsToCreate);
    await queryClient.invalidateQueries(["Operations", batchId]);
    await saveOpTimeMetric();
    toast.success(`✅ Synced ${processedLines.length} item(s)`);
    setIsSyncing(false);
  };

  return (
    <div className="border-t p-3 space-y-2 overflow-y-auto max-h-[480px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={onBack} className="text-slate-400 hover:text-slate-600 p-0.5"><ChevronLeft className="w-4 h-4" /></button>
          <p className="text-xs font-semibold text-slate-700">Operations</p>
        </div>
        <Button variant="ghost" size="sm" className="text-xs h-6 text-slate-400" onClick={onSkip}>
          <SkipForward className="w-3 h-3 mr-1" /> Παράλειψη
        </Button>
      </div>

      {/* Summary */}
      {existingOps.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-700">
          ✅ {existingOps.length} operations · Σύνολο: {totalOpTime.toFixed(1)} min
        </div>
      )}

      {/* Existing ops list */}
      {existingOps.length > 0 && (
        <div className="border rounded divide-y max-h-32 overflow-y-auto">
          <div className="grid grid-cols-4 px-2 py-1 text-[9px] font-semibold text-slate-400 uppercase">
            <span>Item</span><span>Operation</span><span className="text-right">Time(m)</span><span></span>
          </div>
          {existingOps.map(op => (
            <OpRow key={op.id} op={op} onDelete={handleDelete} onUpdate={handleUpdate} />
          ))}
        </div>
      )}

      {/* Toggle Add Form */}
      <Button
        size="sm" variant="outline"
        className="w-full text-xs"
        onClick={() => setShowAddForm(v => !v)}
      >
        <Plus className="w-3 h-3 mr-1" />
        {showAddForm ? "Κλείσιμο Φόρμας" : "Προσθήκη Operations (Profile)"}
      </Button>

      {/* Add Form */}
      {showAddForm && (
        <div className="border rounded p-3 space-y-2 bg-slate-50">
          {/* Operation Profile */}
          <div>
            <p className="text-[10px] font-semibold text-slate-500 mb-1">Operation Profile *</p>
            <Select
              value={formData.operation_profile_id}
              onValueChange={v => setFormData(f => ({ ...f, operation_profile_id: v }))}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Επίλεξε profile" />
              </SelectTrigger>
              <SelectContent>
                {departmentProfiles.map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Item Code */}
          <div>
            <p className="text-[10px] font-semibold text-slate-500 mb-1">
              Item Code *
              {selectedItemQtyProcessed !== null && (
                <span className="text-slate-400 font-normal ml-1">(Processed: {selectedItemQtyProcessed})</span>
              )}
            </p>
            <Select
              value={formData.item_code}
              onValueChange={v => setFormData(f => ({ ...f, item_code: v }))}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Επίλεξε item code" />
              </SelectTrigger>
              <SelectContent>
                {itemCodes.map(code => (
                  <SelectItem key={code} value={code} className="text-xs">{code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Existing ops for this item */}
          {formData.item_code && existingOps.filter(o => o.item_code === formData.item_code).length > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded p-2 text-[10px] text-blue-700 space-y-0.5">
              <p className="font-semibold">Υπάρχουσες Operations για {formData.item_code}:</p>
              {existingOps.filter(o => o.item_code === formData.item_code).map(op => (
                <div key={op.id} className="flex gap-2">
                  <span className="font-medium">{op.operation || "(καμία)"}</span>
                  <span>Qty: {op.qty_operation}</span>
                  <span>Time: {op.operation_time_min?.toFixed(1)}m</span>
                </div>
              ))}
            </div>
          )}

          {/* Operations for profile */}
          {formData.operation_profile_id && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-semibold text-slate-500">Operations από Profile *</p>
                <button
                  className="text-[10px] text-blue-600 hover:underline"
                  onClick={() => {
                    const all = {};
                    operationsForProfile.forEach(op => { all[op.id] = selectedItemQtyProcessed ?? 1; });
                    setSelectedOperations(all);
                  }}
                >
                  Επιλογή Όλων
                </button>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {operationsForProfile.length === 0 ? (
                  <p className="text-xs text-slate-400">Δεν υπάρχουν operations σε αυτό το profile</p>
                ) : operationsForProfile.map(op => {
                  const stdLine = stdSetLines.find(sl => sl.item_code === formData.item_code && sl.operation === op.name);
                  const stdMinPc = stdLine?.std_min_per_pc || 0;
                  const qty = selectedOperations[op.id] || 0;
                  const opTime = qty * stdMinPc;
                  const isOver = selectedItemQtyProcessed !== null && qty > selectedItemQtyProcessed;
                  return (
                    <div key={op.id} className={`flex items-center gap-2 p-2 bg-white rounded border text-xs ${isOver ? "border-red-300" : ""}`}>
                      <Checkbox
                        checked={qty > 0}
                        onCheckedChange={checked => {
                          if (checked) {
                            setSelectedOperations(prev => ({ ...prev, [op.id]: selectedItemQtyProcessed ?? 1 }));
                          } else {
                            const { [op.id]: _, ...rest } = selectedOperations;
                            setSelectedOperations(rest);
                          }
                        }}
                      />
                      <span className="flex-1 font-medium truncate">
                        {op.name}
                        {!stdLine && <span className="text-red-400 ml-1">(⚠ no std)</span>}
                      </span>
                      <input
                        type="number" min="0" step="0.01"
                        value={selectedOperations[op.id] || ""}
                        onChange={e => {
                          const val = e.target.value;
                          if (val) {
                            setSelectedOperations(prev => ({ ...prev, [op.id]: parseFloat(val) || 0 }));
                          } else {
                            const { [op.id]: _, ...rest } = selectedOperations;
                            setSelectedOperations(rest);
                          }
                        }}
                        disabled={!selectedOperations[op.id] && qty === 0}
                        placeholder="Qty"
                        className={`w-16 border rounded px-1 py-0.5 text-[10px] outline-none focus:border-blue-400 ${isOver ? "border-red-400 bg-red-50" : ""}`}
                      />
                      <span className="text-slate-400 w-20 text-right">{opTime.toFixed(1)}m</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Button size="sm" className="w-full text-xs bg-blue-600 hover:bg-blue-700"
            onClick={handleAdd} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
            Προσθήκη
          </Button>
        </div>
      )}

      {/* Sync Button */}
      <Button size="sm" variant="outline" className="w-full text-xs" onClick={handleSync} disabled={isSyncing}>
        {isSyncing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
        Sync από Batch Lines ({processedCount} items)
      </Button>

      {/* Continue */}
      <Button size="sm" className="w-full text-xs bg-green-600 hover:bg-green-700"
        onClick={() => onNext("⏭ Operations – Συνέχεια...")}>
        <CheckCircle2 className="w-3 h-3 mr-1" /> Συνέχεια → Team Time - Persons
      </Button>
    </div>
  );
}