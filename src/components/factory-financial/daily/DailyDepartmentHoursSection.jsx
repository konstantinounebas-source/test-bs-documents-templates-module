import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Clock } from 'lucide-react';
import { calculateDailyDepartmentHoursTotal } from "@/components/factory-financial/utils/dailyOperationsCalculations";

const EMPTY_ROW = { date: '', department_id: '', total_hours: 0, notes: '' };

export default function DailyDepartmentHoursSection({ entries, departments, onAdd, onRemove, onUpdate }) {
    const total = calculateDailyDepartmentHoursTotal(entries);

    const handleUpdate = (idx, field, value) => {
        const updated = [...entries];
        updated[idx] = { ...updated[idx], [field]: value };
        onUpdate(updated);
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-purple-600" />
                        <CardTitle className="text-base font-semibold text-slate-800">
                            C. Daily Department Hours
                        </CardTitle>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-500">
                            Σύνολο: <strong className="text-slate-800">{total.toLocaleString('el-GR')} ώρες</strong>
                        </span>
                        <Button size="sm" variant="outline" onClick={() => onAdd(EMPTY_ROW)} className="gap-1">
                            <Plus className="w-3.5 h-3.5" /> Προσθήκη
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {entries.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">Δεν υπάρχουν εγγραφές ωραρίου. Κάντε κλικ στο «Προσθήκη».</p>
                ) : (
                    <div className="space-y-2">
                        {/* Header */}
                        <div className="hidden md:grid grid-cols-[120px_1fr_100px_1fr_36px] gap-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            <span>Ημερομηνία</span>
                            <span>Τμήμα</span>
                            <span>Ώρες</span>
                            <span>Σημειώσεις</span>
                            <span />
                        </div>
                        {entries.map((row, idx) => (
                            <div key={idx} className="grid grid-cols-1 md:grid-cols-[120px_1fr_100px_1fr_36px] gap-2 items-center bg-slate-50 rounded-lg p-2">
                                <Input
                                    type="date"
                                    value={row.date}
                                    onChange={e => handleUpdate(idx, 'date', e.target.value)}
                                    className="text-sm h-8"
                                />
                                <Select
                                    value={row.department_id || '__none__'}
                                    onValueChange={val => handleUpdate(idx, 'department_id', val === '__none__' ? '' : val)}
                                >
                                    <SelectTrigger className="h-8 text-sm">
                                        <SelectValue placeholder="Επιλογή τμήματος..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">— Επιλογή τμήματος —</SelectItem>
                                        {(departments || []).map(d => (
                                            <SelectItem key={d.id} value={d.id}>
                                                {d.department_name || d.id}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={row.total_hours}
                                    onChange={e => handleUpdate(idx, 'total_hours', parseFloat(e.target.value) || 0)}
                                    className="text-sm h-8"
                                    placeholder="0"
                                />
                                <Input
                                    value={row.notes}
                                    onChange={e => handleUpdate(idx, 'notes', e.target.value)}
                                    className="text-sm h-8"
                                    placeholder="Σημειώσεις"
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onRemove(idx)}
                                    className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}