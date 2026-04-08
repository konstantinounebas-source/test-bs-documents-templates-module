import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

export default function DailySupervisorCostSection({ 
    entries, 
    selectedDate, 
    supervisorAllocations,
    labourPersonnel,
    formatCurrency, 
    onAdd, 
    onRemove, 
    onUpdate 
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    
    const visibleWithIdx = selectedDate
        ? entries.map((r, i) => ({ r, i })).filter(({ r }) => r.date === selectedDate)
        : entries.map((r, i) => ({ r, i }));

    const total = visibleWithIdx.reduce((sum, { r }) => sum + (parseFloat(r.daily_cost) || 0), 0);

    const handleAddRow = () => {
        onAdd({
            supervisor_id: '',
            daily_cost: 0,
            notes: '',
            date: selectedDate
        });
    };

    const handleUpdateField = (realIdx, field, value) => {
        const updated = [...entries];
        updated[realIdx][field] = value;
        onUpdate(updated);
    };

    const getSupervisorName = (supervisorId) => {
        const person = (labourPersonnel || []).find(p => p.id === supervisorId);
        return person ? person.person_name : supervisorId;
    };

    const getSupervisorDailyCost = (supervisorId) => {
        const allocation = (supervisorAllocations || []).find(a => a.supervisor_id === supervisorId && a.date === selectedDate);
        return allocation ? parseFloat(allocation.daily_cost) || 0 : 0;
    };

    return (
        <Card className="border-slate-200 shadow-sm">
            <CardHeader 
                className="cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronUp className="w-4 h-4 text-slate-500" />}
                        <div>
                            <CardTitle className="text-lg">Ημερήσιο Κόστος Επιστάρχη</CardTitle>
                            <CardDescription>Καταχώρηση κόστους επιστάρχη ανά ημέρα</CardDescription>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-lg font-semibold text-slate-900">{formatCurrency(total)}</div>
                        <div className="text-xs text-slate-500">{visibleWithIdx.length} εγγραφές</div>
                    </div>
                </div>
            </CardHeader>

            {isExpanded && (
                <CardContent className="space-y-4">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50">
                                    <th className="text-left px-4 py-2 font-semibold text-slate-700">Επιστάρχης</th>
                                    <th className="text-right px-4 py-2 font-semibold text-slate-700">Ημερήσιο Κόστος</th>
                                    <th className="text-left px-4 py-2 font-semibold text-slate-700">Σημειώσεις</th>
                                    <th className="text-center px-4 py-2 font-semibold text-slate-700">Ενέργεια</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleWithIdx.map(({ r, i }) => (
                                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <Select 
                                                value={r.supervisor_id || ''}
                                                onValueChange={(val) => handleUpdateField(i, 'supervisor_id', val)}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Επιλέξτε επιστάρχη" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {(labourPersonnel || []).map(p => (
                                                        <SelectItem key={p.id} value={p.id}>
                                                            {p.person_name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="text-sm font-semibold text-slate-800">
                                                {formatCurrency(parseFloat(r.daily_cost) || 0)}
                                            </div>
                                            {r.supervisor_id && (
                                                <div className="text-xs text-slate-500 mt-1">
                                                    Κατάχ.: {formatCurrency(getSupervisorDailyCost(r.supervisor_id))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Input
                                                type="text"
                                                value={r.notes || ''}
                                                onChange={(e) => handleUpdateField(i, 'notes', e.target.value)}
                                                placeholder="Σημειώσεις..."
                                                className="text-xs"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onRemove(i)}
                                                className="text-red-600 hover:bg-red-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <Button
                        onClick={handleAddRow}
                        variant="outline"
                        className="w-full flex items-center gap-2 border-dashed border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                        <Plus className="w-4 h-4" />
                        Προσθήκη
                    </Button>
                </CardContent>
            )}
        </Card>
    );
}