import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, TrendingUp } from 'lucide-react';
import { calculateDailyRevenueTotal } from "@/components/factory-financial/utils/dailyOperationsCalculations";

const EMPTY_ROW = { date: '', revenue_item: '', quantity: 0, unit_revenue: 0, total_revenue: 0, notes: '' };

export default function DailyRevenueSection({ entries, formatCurrency, onAdd, onRemove, onUpdate }) {
    const total = calculateDailyRevenueTotal(entries);

    const handleUpdate = (idx, field, value) => {
        const updated = [...entries];
        updated[idx] = { ...updated[idx], [field]: value };
        // Auto-calculate total_revenue
        if (field === 'quantity' || field === 'unit_revenue') {
            const qty = parseFloat(field === 'quantity' ? value : updated[idx].quantity) || 0;
            const unit = parseFloat(field === 'unit_revenue' ? value : updated[idx].unit_revenue) || 0;
            updated[idx].total_revenue = qty * unit;
        }
        onUpdate(updated);
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        <CardTitle className="text-base font-semibold text-slate-800">
                            B. Daily Revenue
                        </CardTitle>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-500">
                            Σύνολο: <strong className="text-green-700">{formatCurrency(total)}</strong>
                        </span>
                        <Button size="sm" variant="outline" onClick={() => onAdd(EMPTY_ROW)} className="gap-1">
                            <Plus className="w-3.5 h-3.5" /> Προσθήκη
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {entries.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">Δεν υπάρχουν εγγραφές εσόδων. Κάντε κλικ στο «Προσθήκη».</p>
                ) : (
                    <div className="space-y-2">
                        {/* Header */}
                        <div className="hidden md:grid grid-cols-[110px_1fr_70px_100px_110px_1fr_36px] gap-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            <span>Ημερομηνία</span>
                            <span>Στοιχείο Εσόδου</span>
                            <span>Ποσότητα</span>
                            <span>Μον. Αξία</span>
                            <span>Σύνολο</span>
                            <span>Σημειώσεις</span>
                            <span />
                        </div>
                        {entries.map((row, idx) => (
                            <div key={idx} className="grid grid-cols-1 md:grid-cols-[110px_1fr_70px_100px_110px_1fr_36px] gap-2 items-center bg-slate-50 rounded-lg p-2">
                                <Input
                                    type="date"
                                    value={row.date}
                                    onChange={e => handleUpdate(idx, 'date', e.target.value)}
                                    className="text-sm h-8"
                                />
                                <Input
                                    value={row.revenue_item}
                                    onChange={e => handleUpdate(idx, 'revenue_item', e.target.value)}
                                    className="text-sm h-8"
                                    placeholder="π.χ. Κόστρα Α, Παραλαβή..."
                                />
                                <Input
                                    type="number"
                                    min="0"
                                    value={row.quantity}
                                    onChange={e => handleUpdate(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                    className="text-sm h-8"
                                    placeholder="0"
                                />
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={row.unit_revenue}
                                    onChange={e => handleUpdate(idx, 'unit_revenue', parseFloat(e.target.value) || 0)}
                                    className="text-sm h-8"
                                    placeholder="0.00"
                                />
                                <div className="flex items-center h-8 px-3 bg-green-50 border border-green-200 rounded-md text-sm font-semibold text-green-700">
                                    {formatCurrency(row.total_revenue || 0)}
                                </div>
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