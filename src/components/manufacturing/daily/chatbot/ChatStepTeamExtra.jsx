import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, SkipForward, Plus, X } from "lucide-react";
import { toast } from "sonner";

export default function ChatStepTeamExtra({ batchId, onNext, onSkip }) {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ person_names: [], charge_dept: "", work_type: "", duration_min: "" });
  const [searchTerm, setSearchTerm] = useState("");

  const { data: persons = [] } = useQuery({
    queryKey: ["Person"],
    queryFn: () => base44.entities.Person.filter({ is_active: true }),
    staleTime: Infinity
  });
  const { data: departments = [] } = useQuery({
    queryKey: ["Department"],
    queryFn: () => base44.entities.Department.list(),
    staleTime: Infinity
  });
  const { data: workTypes = [] } = useQuery({
    queryKey: ["Work_Type"],
    queryFn: () => base44.entities.Work_Type.list(),
    staleTime: Infinity
  });
  const { data: lines = [] } = useQuery({
    queryKey: ["Team_Time_Extra", batchId],
    queryFn: () => base44.entities.Team_Time_Extra.filter({ batch_header_id: batchId }),
    enabled: !!batchId, staleTime: 0
  });

  const filteredPersons = persons.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const togglePerson = (name) => {
    setForm(f => ({
      ...f,
      person_names: f.person_names.includes(name)
        ? f.person_names.filter(n => n !== name)
        : [...f.person_names, name]
    }));
  };

  const handleAdd = async () => {
    if (!form.person_names.length || !form.charge_dept || !form.work_type || !form.duration_min) {
      toast.error("Συμπλήρωσε όλα τα πεδία"); return;
    }
    setIsSaving(true);
    try {
      for (const pn of form.person_names) {
        await base44.entities.Team_Time_Extra.create({
          batch_header_id: batchId, person_name: pn,
          charge_dept: form.charge_dept, work_type: form.work_type,
          duration_min: parseFloat(form.duration_min)
        });
      }
      queryClient.invalidateQueries(["Team_Time_Extra", batchId]);
      toast.success(`✅ Προστέθηκαν ${form.person_names.length} εγγραφές`);
      setForm(f => ({ ...f, person_names: [], duration_min: "" }));
    } catch { toast.error("Σφάλμα αποθήκευσης"); }
    setIsSaving(false);
  };

  return (
    <div className="border-t p-3 space-y-3 overflow-y-auto max-h-96">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-700">Team Time - Extra</p>
        <Button variant="ghost" size="sm" className="text-xs h-6 text-slate-400" onClick={onSkip}>
          <SkipForward className="w-3 h-3 mr-1" /> Παράλειψη
        </Button>
      </div>

      {lines.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-700">
          ✅ {lines.length} εγγραφές extra time
        </div>
      )}

      <div className="grid grid-cols-2 gap-1">
        <div>
          <p className="text-[10px] text-slate-500 mb-0.5">Charge Dept</p>
          <Select value={form.charge_dept} onValueChange={v => setForm(f => ({ ...f, charge_dept: v }))}>
            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Τμήμα..." /></SelectTrigger>
            <SelectContent>
              {departments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 mb-0.5">Work Type</p>
          <Select value={form.work_type} onValueChange={v => setForm(f => ({ ...f, work_type: v }))}>
            <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Τύπος..." /></SelectTrigger>
            <SelectContent>
              {workTypes.map(w => <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <p className="text-[10px] text-slate-500 mb-0.5">Διάρκεια (min)</p>
        <input type="number" min="0" placeholder="0" value={form.duration_min}
          onChange={e => setForm(f => ({ ...f, duration_min: e.target.value }))}
          className="w-full text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400"
        />
      </div>

      <input type="text" placeholder="Αναζήτηση ατόμου..." value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="w-full text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400"
      />

      {form.person_names.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {form.person_names.map(n => (
            <span key={n} className="flex items-center gap-1 bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full">
              {n}
              <button onClick={() => togglePerson(n)}><X className="w-2.5 h-2.5" /></button>
            </span>
          ))}
        </div>
      )}

      <div className="border rounded max-h-28 overflow-y-auto">
        {filteredPersons.map(p => (
          <button key={p.id} onClick={() => togglePerson(p.name)}
            className={`w-full text-left text-xs px-2 py-1.5 hover:bg-slate-50 flex items-center gap-2
              ${form.person_names.includes(p.name) ? "bg-blue-50 text-blue-700" : "text-slate-700"}`}>
            <span className={`w-3 h-3 rounded border flex-shrink-0 ${form.person_names.includes(p.name) ? "bg-blue-500 border-blue-500" : "border-slate-300"}`} />
            {p.name}
          </button>
        ))}
      </div>

      <Button size="sm" className="w-full text-xs bg-blue-600 hover:bg-blue-700"
        onClick={handleAdd} disabled={isSaving || !form.person_names.length}>
        {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
        Προσθήκη ({form.person_names.length})
      </Button>

      <Button size="sm" className="w-full text-xs bg-green-600 hover:bg-green-700"
        onClick={() => onNext("⏭ Team Time Extra – Συνέχεια...")}>
        <CheckCircle2 className="w-3 h-3 mr-1" /> Συνέχεια → Help In
      </Button>
    </div>
  );
}