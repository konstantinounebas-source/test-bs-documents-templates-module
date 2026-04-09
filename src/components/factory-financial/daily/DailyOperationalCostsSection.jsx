import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, DollarSign } from 'lucide-react';

const getEmptyRow = (date) => ({
    date,
    cost_type: 'operational',
    multiplier_days: 1,
    unit_cost: 0,
    total_cost: 0
});

export default function DailyOperationalCostsSection({ entries, selectedDate, unitCost, formatCurrency, onAdd, onRemove, onUpdate }) {
    const visibleWithIdx = selectedDate
        ? entries.map((r, i) => ({ r, i })).filter(({ r }) => r.date === selectedDate && r.cost_type === 'operational')
        : entries.map((r, i) => ({ r, i })).filter(({ r }) => r.cost_type === 'operational');

    const formatVal = formatCurrency || ((val) => val?.toFixed(2) || '—');

    const handleUpdate = (realIdx, field, value) => {
        const updated = [...entries];
        const row = { ...updated[realIdx] };
        
        if (field === 'multiplier_days') {
            row.multiplier_days = parseFloat(value) || 0;
            row.total_cost = row.multiplier_days * row.unit_cost;
        }
        
        updated[realIdx] = row;
        console.log('✅ Updating operational cost row:', updated[realIdx]);
        onUpdate(updated);
    };

    const handleAdd = () => {
        const newRow = {
            ...getEmptyRow(selectedDate),
            cost_type: 'operational',
            unit_cost: parseFloat(unitCost) || 0,
            multiplier_days: 1,
            total_cost: parseFloat(unitCost) || 0
        };
        console.log('✅ Adding operational cost row:', newRow);
        onAdd(newRow);
    };

    const totalCost = visibleWithIdx.reduce((sum, { r }) => sum + (r.total_cost || 0), 0);

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        <CardTitle className="text-base font-semibold text-slate-800">
                            Δ. Λειτουργικά Κόστη (Ημερήσια)
                        </CardTitle>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-500">
                            Ημερήσιο Κόστος: <strong className="text-green-700">{formatVal(unitCost)}</strong>
                        </span>
                        <span className="text-sm text-slate-500">
                            Σύνολο: <strong className="text-green-700">{formatVal(totalCost)}</strong>
                        </span>
                        <Button size="sm" variant="outline" onClick={handleAdd} className="gap-1">
                            <Plus className="w-3.5 h-3.5" /> Προσθήκη
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {visibleWithIdx.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">Δεν υπάρχουν εγγραφές λειτουργικών κοστών για {selectedDate || 'αυτή την ημέρα'}. Κάντε κλικ στο «Προσθήκη».</p>
                ) : (
                    <div className="space-y-2">
                        {/* Header */}
                        <div className="hidden md:grid grid-cols-[1fr_120px_120px_120px_36px] gap-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            <span>Ημερομηνία</span>
                            <span>Ημέρες</span>
                            <span>Τιμή/Ημέρα</span>
                            <span>Σύνολο</span>
                            <span />
                        </div>
                        {visibleWithIdx.map(({ r: row, i: realIdx }) => (
                            <div key={realIdx} className="grid grid-cols-1 md:grid-cols-[1fr_120px_120px_120px_36px] gap-2 items-center bg-slate-50 rounded-lg p-2">
                                <div className="text-sm text-slate-700">
                                    {row.date}
                                </div>
                                <Input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={row.multiplier_days}
                                    onChange={e => handleUpdate(realIdx, 'multiplier_days', parseFloat(e.target.value) || 1)}
                                    className="text-sm h-8"
                                    placeholder="1"
                                />
                                <div className="text-right flex-shrink-0 text-sm font-semibold text-slate-800">
                                    {formatVal(row.unit_cost)}
                                </div>
                                <div className="text-right flex-shrink-0 text-sm font-semibold text-green-700">
                                    {formatVal(row.total_cost)}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onRemove(realIdx)}
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