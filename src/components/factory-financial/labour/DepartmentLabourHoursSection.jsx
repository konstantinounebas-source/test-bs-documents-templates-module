import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Clock } from 'lucide-react';

export default function DepartmentLabourHoursSection({ departmentLabourHours, departments, onHours }) {
    const addEntry = () => {
        onHours([...(departmentLabourHours || []), { department_id: '', total_hours: 0, notes: '' }]);
    };

    const updateEntry = (idx, field, value) => {
        onHours((departmentLabourHours || []).map((e, i) => i === idx ? { ...e, [field]: value } : e));
    };

    const removeEntry = (idx) => {
        onHours((departmentLabourHours || []).filter((_, i) => i !== idx));
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-600" />
                        Ώρες Εργασίας ανά Τμήμα
                    </CardTitle>
                    <Button size="sm" variant="outline" onClick={addEntry} className="gap-1 text-xs">
                        <Plus className="w-3 h-3" />
                        Προσθήκη Τμήματος
                    </Button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                    Εισάγετε τις συνολικές ώρες εργασίας ανά τμήμα για την περίοδο αυτή.
                </p>
            </CardHeader>
            <CardContent className="space-y-2">
                {(!departmentLabourHours || departmentLabourHours.length === 0) ? (
                    <div className="text-center py-8 text-sm text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        Δεν υπάρχουν εγγραφές ωρών. Πατήστε "Προσθήκη Τμήματος".
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-12 gap-2 px-2 pb-1">
                            <div className="col-span-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Τμήμα</div>
                            <div className="col-span-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Σύνολο Ωρών</div>
                            <div className="col-span-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Σημειώσεις</div>
                            <div className="col-span-1" />
                        </div>
                        {departmentLabourHours.map((entry, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white border border-slate-200 rounded-lg px-3 py-2">
                                <div className="col-span-4">
                                    <Select
                                        value={entry.department_id || ''}
                                        onValueChange={v => updateEntry(idx, 'department_id', v)}
                                    >
                                        <SelectTrigger className="h-8 text-sm">
                                            <SelectValue placeholder="Επιλέξτε τμήμα..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {departments.map(d => (
                                                <SelectItem key={d.id} value={d.id}>{d.department_name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-3">
                                    <Input
                                        type="number"
                                        value={entry.total_hours || ''}
                                        onChange={e => updateEntry(idx, 'total_hours', parseFloat(e.target.value) || 0)}
                                        className="h-8 text-sm"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="col-span-4">
                                    <Input
                                        value={entry.notes || ''}
                                        onChange={e => updateEntry(idx, 'notes', e.target.value)}
                                        className="h-8 text-sm"
                                        placeholder="Προαιρετικές σημειώσεις..."
                                    />
                                </div>
                                <div className="col-span-1 flex justify-center">
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeEntry(idx)}>
                                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </CardContent>
        </Card>
    );
}