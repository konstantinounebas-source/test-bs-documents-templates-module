import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Clock, AlertTriangle } from 'lucide-react';
import { calculateDepartmentAverageHourlyRate } from '../utils/labourCostCalculations';

export default function DepartmentLabourHoursSection({ departmentLabourHours, departments, onHours, labourResources }) {
    const safeEntries = departmentLabourHours || [];

    const addEntry = () => {
        onHours([...safeEntries, { department_id: '', total_hours: 0, notes: '' }]);
    };

    const updateEntry = (idx, field, value) => {
        onHours(safeEntries.map((e, i) => i === idx ? { ...e, [field]: value } : e));
    };

    const removeEntry = (idx) => {
        onHours(safeEntries.filter((_, i) => i !== idx));
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
                {safeEntries.length === 0 ? (
                    <div className="text-center py-8 text-sm text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        Δεν υπάρχουν εγγραφές ωρών. Πατήστε "Προσθήκη Τμήματος".
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-12 gap-2 px-2 pb-1">
                            <div className="col-span-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Τμήμα</div>
                            <div className="col-span-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Σύνολο Ωρών</div>
                            <div className="col-span-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Σημειώσεις</div>
                            <div className="col-span-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Κατάσταση</div>
                            <div className="col-span-1" />
                        </div>
                        {safeEntries.map((entry, idx) => {
                            const avgRate = calculateDepartmentAverageHourlyRate(labourResources || [], entry.department_id);
                            const hours = parseFloat(entry.total_hours) || 0;
                            const warnNoRate = entry.department_id && hours > 0 && avgRate === 0;
                            const warnNoHours = entry.department_id && avgRate > 0 && hours === 0;

                            return (
                                <div key={idx} className={`grid grid-cols-12 gap-2 items-center rounded-lg px-3 py-2 border ${warnNoRate || warnNoHours ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}>
                                    <div className="col-span-4">
                                        <Select
                                            value={entry.department_id || ''}
                                            onValueChange={v => updateEntry(idx, 'department_id', v)}
                                        >
                                            <SelectTrigger className="h-8 text-sm">
                                                <SelectValue placeholder="Επιλέξτε τμήμα..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(departments || []).map(d => (
                                                    <SelectItem key={d.id} value={d.id}>{d.department_name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="col-span-2">
                                        <Input
                                            type="number"
                                            value={entry.total_hours || ''}
                                            onChange={e => updateEntry(idx, 'total_hours', parseFloat(e.target.value) || 0)}
                                            className="h-8 text-sm"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <Input
                                            value={entry.notes || ''}
                                            onChange={e => updateEntry(idx, 'notes', e.target.value)}
                                            className="h-8 text-sm"
                                            placeholder="Σημειώσεις..."
                                        />
                                    </div>
                                    <div className="col-span-2 flex items-center gap-1">
                                        {warnNoRate && (
                                            <div className="flex items-center gap-1 text-xs text-amber-600" title="Δεν βρέθηκε μέσο ωριαίο κόστος για αυτό το τμήμα">
                                                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                                <span>Χωρίς ρυθμό</span>
                                            </div>
                                        )}
                                        {warnNoHours && (
                                            <div className="flex items-center gap-1 text-xs text-amber-600" title="Υπάρχει ωριαίο κόστος αλλά 0 ώρες">
                                                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                                <span>0 ώρες</span>
                                            </div>
                                        )}
                                        {!warnNoRate && !warnNoHours && entry.department_id && (
                                            <span className="text-xs text-emerald-600">✓</span>
                                        )}
                                    </div>
                                    <div className="col-span-1 flex justify-center">
                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeEntry(idx)}>
                                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}
            </CardContent>
        </Card>
    );
}