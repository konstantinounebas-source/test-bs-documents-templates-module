import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Clock } from 'lucide-react';

const getEmptyRow = (date) => ({ date, department_id: '', total_hours: 0, notes: '' });

export default function DailyDepartmentHoursSection({ entries, selectedDate, departments, departmentAssignments, labourPersonnel, formatCurrency, onAdd, onRemove, onUpdate }) {
    const visibleWithIdx = selectedDate
        ? entries.map((r, i) => ({ r, i })).filter(({ r }) => r.date === selectedDate)
        : entries.map((r, i) => ({ r, i }));

    // Fallback formatter if not provided
    const formatVal = formatCurrency || ((val) => val?.toFixed(2) || '—');

    const handleUpdate = (realIdx, field, value) => {
        const updated = [...entries];
        updated[realIdx] = { ...updated[realIdx], [field]: value };
        onUpdate(updated);
    };

    const getDeptName = (id) => {
        const d = (departments || []).find(d => d.id === id);
        return d ? (d.department_name || d.name || id) : id || '—';
    };

    const getDeptHourlyCost = (id) => {
        // Find the department assignment block for this department
        const deptBlock = (departmentAssignments || []).find(b => b.department_id === id);
        if (deptBlock && deptBlock.technician_rows && deptBlock.technician_rows.length > 0) {
            // Calculate average hourly cost from technicians in this department
            const validRates = deptBlock.technician_rows
                .map(row => {
                    const person = (labourPersonnel || []).find(p => p.id === row.personnel_id);
                    if (person) {
                        // Use calculated_hourly_cost if available
                        if (person.calculated_hourly_cost) {
                            return person.calculated_hourly_cost;
                        }
                        // Otherwise calculate from daily_rate / hours_per_day
                        if (person.daily_rate) {
                            return person.daily_rate / (person.hours_per_day || 8);
                        }
                    }
                    return null;
                })
                .filter(rate => rate !== null);
            
            if (validRates.length > 0) {
                return validRates.reduce((sum, rate) => sum + rate, 0) / validRates.length;
            }
        }
        // Fallback to department field if no technician_rows exist
        const d = (departments || []).find(d => d.id === id);
        return d ? (parseFloat(d.avg_hourly_cost) || 0) : 0;
    };

    // Calculate total cost across all visible rows
    const totalCost = visibleWithIdx.reduce((sum, { r: row }) => {
        const hourlyRate = getDeptHourlyCost(row.department_id);
        return sum + ((parseFloat(row.total_hours) || 0) * hourlyRate);
    }, 0);

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-purple-600" />
                        <CardTitle className="text-base font-semibold text-slate-800">
                            B. Daily Department Hours
                        </CardTitle>
                    </div>
                    <div className="flex items-center gap-3">
                         <span className="text-sm text-slate-500">
                             Σύνολο: <strong className="text-purple-700">{formatVal(totalCost)}</strong>
                         </span>
                         <Button size="sm" variant="outline" onClick={() => onAdd(getEmptyRow(selectedDate))} className="gap-1">
                             <Plus className="w-3.5 h-3.5" /> Προσθήκη
                         </Button>
                     </div>
                </div>
            </CardHeader>
            <CardContent>
                {visibleWithIdx.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">Δεν υπάρχουν εγγραφές ωραρίου για {selectedDate || 'αυτή την ημέρα'}. Κάντε κλικ στο «Προσθήκη».</p>
                ) : (
                    <div className="space-y-2">
                        {/* Header */}
                        <div className="hidden md:grid grid-cols-[1fr_100px_100px_100px_1fr_36px] gap-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            <span>Τμήμα</span>
                            <span>Ώρες</span>
                            <span>Κόστος/Ώρα</span>
                            <span>Σύνολο Κόστος</span>
                            <span>Σημειώσεις</span>
                            <span />
                        </div>
                        {visibleWithIdx.map(({ r: row, i: realIdx }) => {
                            const hourlyRate = getDeptHourlyCost(row.department_id);
                            const totalCost = (parseFloat(row.total_hours) || 0) * hourlyRate;
                            return (
                            <div key={realIdx} className="grid grid-cols-1 md:grid-cols-[1fr_100px_100px_100px_1fr_36px] gap-2 items-center bg-slate-50 rounded-lg p-2">
                                <Select
                                    value={row.department_id || '__none__'}
                                    onValueChange={val => handleUpdate(realIdx, 'department_id', val === '__none__' ? '' : val)}
                                >
                                    <SelectTrigger className="h-8 text-sm">
                                        <SelectValue placeholder="Επιλογή τμήματος...">
                                            {row.department_id ? getDeptName(row.department_id) : 'Επιλογή τμήματος...'}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">— Επιλογή τμήματος —</SelectItem>
                                        {(departments || []).map(d => (
                                            <SelectItem key={d.id} value={d.id}>
                                                {d.department_name || d.name || d.id}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={row.total_hours}
                                    onChange={e => handleUpdate(realIdx, 'total_hours', parseFloat(e.target.value) || 0)}
                                    className="text-sm h-8"
                                    placeholder="0"
                                />
                                <div className="text-right flex-shrink-0 text-sm font-semibold text-slate-800">
                                    {hourlyRate > 0 ? formatVal(hourlyRate) : '—'}
                                </div>
                                <div className="text-right flex-shrink-0 text-sm font-semibold text-purple-700">
                                    {totalCost > 0 ? formatVal(totalCost) : '—'}
                                </div>
                                <Input
                                    value={row.notes}
                                    onChange={e => handleUpdate(realIdx, 'notes', e.target.value)}
                                    className="text-sm h-8"
                                    placeholder="Σημειώσεις"
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onRemove(realIdx)}
                                    className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}