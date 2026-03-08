import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, SkipForward, Plus, X } from "lucide-react";
import { toast } from "sonner";

export default function ChatStepTeamPersons({ batchId, onNext, onSkip }) {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ person_names: [], from_time: "07:00", to_time: "15:30", break_time_minutes: 45 });
  const [searchTerm, setSearchTerm] = useState("");

  const { data: persons = [] } = useQuery({
    queryKey: ["Person"],
    queryFn: () => base44.entities.Person.filter({ is_active: true }),
    staleTime: Infinity
  });

  const { data: lines = [] } = useQuery({
    queryKey: ["TeamTimePerson", batchId],
    queryFn: () => base44.entities.TeamTimePerson.filter({ batch_header_id: batchId }),
    enabled: !!batchId, staleTime: 0
  });

  const calcAvail = (from, to, brk) => {
    if (!from || !to) return 0;
    const [fh, fm] = from.split(":").map(Number);
    const [th, tm] = to.split(":").map(Number);
    return Math.max(0, (th * 60 + tm) - (fh * 60 + fm) - (brk || 0));
  };

  const totalAvail = lines.reduce((s, l) => s + calcAvail(l.from_time, l.to_time, l.break_time_minutes), 0);

  const filteredPersons = persons.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) && !lines.find(l => l.person_name === p.name)
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
    if (!form.person_names.length) { toast.error("Επίλεξε τουλάχιστον ένα άτομο"); return; }
    setIsSaving(true);
    try {
      for (const pn of form.person_names) {
        await base44.entities.TeamTimePerson.create({
          batch_header_id: batchId, person_name: pn,
          from_time: form.from_time, to_time: form.to_time,
          break_time_minutes: form.break_time_minutes || 0
        });
      }
      queryClient.invalidateQueries(["TeamTimePerson", batchId]);
      toast.success(`✅ Προστέθηκαν ${form.person_names.length} άτομα`);
      setForm(f => ({ ...f, person_names: [] }));
    } catch { toast.error("Σφάλμα αποθήκευσης"); }
    setIsSaving(false);
  };

  return (
    <div className="border-t p-3 space-y-3 overflow-y-auto max-h-96">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-700">Team Time - Persons</p>
        <Button variant="ghost" size="sm" className="text-xs h-6 text-slate-400" onClick={onSkip}>
          <SkipForward className="w-3 h-3 mr-1" /> Παράλειψη
        </Button>
      </div>

      {lines.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-700">
          ✅ {lines.length} άτομα · Σύνολο: {totalAvail} min ({(totalAvail / 60).toFixed(1)} hrs)
        </div>
      )}

      {/* Time inputs */}
      <div className="grid grid-cols-3 gap-1">
        {[["from_time","Από","time"],["to_time","Έως","time"],["break_time_minutes","Διάλ.(min)","number"]].map(([field, label, type]) => (
          <div key={field}>
            <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
            <input type={type} value={form[field]}
              onChange={e => setForm(f => ({ ...f, [field]: type === "number" ? Number(e.target.value) : e.target.value }))}
              className="w-full text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400"
            />
          </div>
        ))}
      </div>

      <p className="text-[10px] text-slate-500">
        Διαθέσιμος χρόνος: <strong>{calcAvail(form.from_time, form.to_time, form.break_time_minutes)} min</strong>
      </p>

      {/* Person search */}
      <input type="text" placeholder="Αναζήτηση ατόμου..." value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="w-full text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400"
      />

      {/* Selected tags */}
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

      {/* Person list */}
      <div className="border rounded max-h-32 overflow-y-auto">
        {filteredPersons.length === 0
          ? <p className="text-[10px] text-slate-400 p-2 text-center">Δεν βρέθηκαν άτομα</p>
          : filteredPersons.map(p => (
            <button key={p.id} onClick={() => togglePerson(p.name)}
              className={`w-full text-left text-xs px-2 py-1.5 hover:bg-slate-50 flex items-center gap-2
                ${form.person_names.includes(p.name) ? "bg-blue-50 text-blue-700" : "text-slate-700"}`}>
              <span className={`w-3 h-3 rounded border flex-shrink-0 ${form.person_names.includes(p.name) ? "bg-blue-500 border-blue-500" : "border-slate-300"}`} />
              {p.name}
            </button>
          ))
        }
      </div>

      <Button size="sm" className="w-full text-xs bg-blue-600 hover:bg-blue-700"
        onClick={handleAdd} disabled={isSaving || !form.person_names.length}>
        {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
        Προσθήκη ({form.person_names.length})
      </Button>

      <Button size="sm" className="w-full text-xs bg-green-600 hover:bg-green-700"
        onClick={() => onNext("⏭ Team Time Persons – Συνέχεια...")}>
        <CheckCircle2 className="w-3 h-3 mr-1" /> Συνέχεια → Team Time - Extra
      </Button>
    </div>
  );
}