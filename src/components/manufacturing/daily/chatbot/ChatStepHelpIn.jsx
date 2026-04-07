import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, SkipForward, Plus, Trash2, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

export default function ChatStepHelpIn({ batchId, department, onNext, onSkip, onBack }) {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ department: department || "", from_department: "", help_min: "" });
  const [addExpanded, setAddExpanded] = useState(false);

  const { data: departments = [] } = useQuery({
    queryKey: ["Department"],
    queryFn: () => base44.entities.Department.list(),
    staleTime: Infinity
  });

  // Persons from TeamTimePerson for this batch
  const { data: teamPersonLines = [] } = useQuery({
    queryKey: ["TeamTimePerson", batchId],
    queryFn: () => base44.entities.TeamTimePerson.filter({ batch_header_id: batchId }),
    enabled: !!batchId, staleTime: 0
  });

  const { data: lines = [] } = useQuery({
    queryKey: ["Help_In", batchId],
    queryFn: () => base44.entities.Help_In.filter({ batch_header_id: batchId }),
    enabled: !!batchId, staleTime: 0
  });

  const totalHelp = lines.reduce((s, h) => s + (h.help_min || 0), 0);

  const handleAdd = async () => {
    if (!form.department || !form.from_department || !form.help_min) {
      toast.error("Συμπλήρωσε όλα τα πεδία"); return;
    }
    setIsSaving(true);
    try {
      await base44.entities.Help_In.create({
        batch_header_id: batchId, department: form.department,
        from_department: form.from_department, help_min: parseFloat(form.help_min)
      });
      queryClient.invalidateQueries(["Help_In", batchId]);
      toast.success("✅ Help-In προστέθηκε");
      setForm(f => ({ ...f, from_department: "", help_min: "" }));
    } catch { toast.error("Σφάλμα αποθήκευσης"); }
    setIsSaving(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.Help_In.delete(id);
    queryClient.invalidateQueries(["Help_In", batchId]);
    toast.success("Διαγράφηκε");
  };

  return (
    <div className="border-t p-3 space-y-2 overflow-y-auto flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={onBack} className="text-slate-400 hover:text-slate-600 p-0.5"><ChevronLeft className="w-4 h-4" /></button>
          <p className="text-xs font-semibold text-slate-700">Help In</p>
        </div>
        <Button variant="ghost" size="sm" className="text-xs h-6 text-slate-400" onClick={onSkip}>
          <SkipForward className="w-3 h-3 mr-1" /> Παράλειψη
        </Button>
      </div>

      {/* Add form - Collapsible at top */}
      <div className="border border-slate-200 rounded p-2 bg-slate-50 space-y-1">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setAddExpanded(e => !e)}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Προσθήκη</p>
          <span className="text-xs text-slate-400">{addExpanded ? '▼' : '▶'}</span>
        </div>
        {addExpanded && (
          <>
            {[["department","Τμήμα (Λαμβάνει)"],["from_department","Από Τμήμα"]].map(([field, label]) => (
              <div key={field}>
                <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                <Select value={form[field]} onValueChange={v => setForm(f => ({ ...f, [field]: v }))}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Επίλεξε τμήμα..." /></SelectTrigger>
                  <SelectContent>
                    {departments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Help Time (min)</p>
              <input type="number" min="0" placeholder="0" value={form.help_min}
                onChange={e => setForm(f => ({ ...f, help_min: e.target.value }))}
                className="w-full text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400 bg-white"
              />
            </div>
            <Button size="sm" className="w-full text-sm bg-blue-600 hover:bg-blue-700"
              onClick={handleAdd} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
              Προσθήκη
            </Button>
          </>
        )}
      </div>

      {/* Existing entries */}
      {lines.length > 0 && (
        <>
          <div className="bg-green-50 border border-green-200 rounded p-2 text-xs text-green-700">
            ✅ {lines.length} εγγραφές · Σύνολο: {totalHelp} min
          </div>
          <div className="border rounded divide-y flex-1 min-h-0 overflow-y-auto">
            {lines.map(l => (
              <div key={l.id} className="flex items-center gap-1 px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50 group">
                <span className="flex-1 truncate font-medium">{l.department}</span>
                <span className="text-slate-400">← {l.from_department}</span>
                <span className="text-slate-500 w-12 text-right">{l.help_min}m</span>
                <button onClick={() => handleDelete(l.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 ml-1">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <Button size="sm" className="w-full text-sm bg-green-600 hover:bg-green-700"
        onClick={() => onNext("⏭ Help In – Συνέχεια...")}>
        <CheckCircle2 className="w-3 h-3 mr-1" /> Συνέχεια → Consumables
      </Button>
    </div>
  );
}