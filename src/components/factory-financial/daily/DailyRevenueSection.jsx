import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, TrendingUp } from 'lucide-react';
import { calculateDailyRevenueTotal } from "@/components/factory-financial/utils/dailyOperationsCalculations";

const EMPTY_ROW = { date: '', revenue_item: '', quantity: 0, unit_revenue: 0, total_revenue: 0, notes: '' };

/**
 * Build category options from sales_revenue_items (FactoryFinancialData.sales_revenue_items).
 * Schema: { product_identifier, description, quantity_sold, unit_selling_price }
 * unit_selling_price is the correct unit revenue for daily entry pre-fill.
 * Each option: { label: string, unit_revenue: number }
 *
 * NOTE: If sales_revenue_items is empty (no catalog defined yet), the UI falls back
 * to free-text input — no categories will appear and the user can type freely.
 */
function buildRevenueOptions(revenueCategories) {
    if (!Array.isArray(revenueCategories) || revenueCategories.length === 0) return [];
    return revenueCategories
        .filter(item => item && item.description)
        .map(item => ({
            label: item.description,
            unit_revenue: parseFloat(item.unit_selling_price) || 0,
        }));
}

export default function DailyRevenueSection({
    entries,
    selectedDate,
    formatCurrency,
    revenueCategories,
    busStopTypes,
    onAdd,
    onRemove,
    onUpdate,
}) {
    // Filter to selected date only (if provided)
    const visibleEntries = selectedDate
        ? entries.filter(r => r.date === selectedDate)
        : entries;
    // Map visible indices back to original array indices for removal
    const visibleWithIdx = selectedDate
        ? entries.map((r, i) => ({ r, i })).filter(({ r }) => r.date === selectedDate)
        : entries.map((r, i) => ({ r, i }));
    const total = calculateDailyRevenueTotal(visibleEntries);
    const revenueOptions = buildRevenueOptions(revenueCategories);
    const hasCategories = revenueOptions.length > 0;
    const normalizedBusStopTypes = Array.isArray(busStopTypes) ? busStopTypes : [];

    const getBusStopTypeName = (id) => {
        const bst = normalizedBusStopTypes.find(b => b.id === id);
        return bst ? (bst.type_name || bst.type_code || id) : id || '—';
    };

    const handleUpdate = (realIdx, field, value) => {
        const updated = [...entries];
        updated[realIdx] = { ...updated[realIdx], [field]: value };
        // Auto-calculate total_revenue
        if (field === 'quantity' || field === 'unit_revenue') {
            const qty  = parseFloat(field === 'quantity'     ? value : updated[realIdx].quantity)     || 0;
            const unit = parseFloat(field === 'unit_revenue' ? value : updated[realIdx].unit_revenue) || 0;
            updated[realIdx].total_revenue = qty * unit;
        }
        onUpdate(updated);
    };

    const handleCategorySelect = (realIdx, selectedLabel) => {
        const opt = revenueOptions.find(o => o.label === selectedLabel);
        if (!opt) return;
        const updated = [...entries];
        updated[realIdx] = {
            ...updated[realIdx],
            revenue_item: opt.label,
            unit_revenue: opt.unit_revenue,
            total_revenue: (parseFloat(updated[realIdx].quantity) || 0) * opt.unit_revenue,
        };
        onUpdate(updated);
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        <CardTitle className="text-base font-semibold text-slate-800">
                            A. Daily Revenue
                        </CardTitle>
                        {hasCategories && (
                            <span className="text-xs text-slate-400 font-normal">(από κατηγορίες σχεδιασμού)</span>
                        )}
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
                {visibleWithIdx.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">
                        Δεν υπάρχουν εγγραφές εσόδων για {selectedDate || 'αυτή την ημέρα'}. Κάντε κλικ στο «Προσθήκη».
                    </p>
                ) : (
                    <div className="space-y-2">
                        {/* Header */}
                         <div className="hidden md:grid grid-cols-[1fr_120px_70px_100px_110px_1fr_36px] gap-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                             <span>Κατηγορία Εσόδου</span>
                             <span>Τύπος Στάσης</span>
                             <span>Ποσότητα</span>
                             <span>Μον. Αξία</span>
                             <span>Σύνολο</span>
                             <span>Σημειώσεις</span>
                             <span />
                         </div>

                        {visibleWithIdx.map(({ r: row, i: realIdx }) => {
                            const isLegacy = hasCategories &&
                                row.revenue_item &&
                                !revenueOptions.some(o => o.label === row.revenue_item);

                            return (
                            <div
                                key={realIdx}
                                className={`grid grid-cols-1 md:grid-cols-[1fr_120px_70px_100px_110px_1fr_36px] gap-2 items-center rounded-lg p-2 ${isLegacy ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'}`}
                            >
                                {/* Revenue item */}
                                {hasCategories && !isLegacy ? (
                                    <Select
                                        value={row.revenue_item || ''}
                                        onValueChange={val => handleCategorySelect(realIdx, val)}
                                    >
                                        <SelectTrigger className="h-8 text-sm">
                                            <SelectValue placeholder="Επιλέξτε κατηγορία..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {revenueOptions.map(opt => (
                                                <SelectItem key={opt.label} value={opt.label}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="flex flex-col gap-0.5">
                                        <Input
                                            value={row.revenue_item}
                                            onChange={e => handleUpdate(realIdx, 'revenue_item', e.target.value)}
                                            className="text-sm h-8"
                                            placeholder="Στοιχείο Εσόδου"
                                        />
                                        {isLegacy && (
                                            <span className="text-[10px] text-amber-600 leading-none px-1">Legacy / custom</span>
                                        )}
                                    </div>
                                )}

                                {/* Bus Stop Type */}
                                <Select
                                    value={row.bus_stop_type_id || ''}
                                    onValueChange={val => handleUpdate(realIdx, 'bus_stop_type_id', val)}
                                >
                                    <SelectTrigger className="h-8 text-sm">
                                        <SelectValue placeholder="Επιλέξτε τύπο..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={null}>— Κανένας —</SelectItem>
                                        {normalizedBusStopTypes.map(bst => (
                                            <SelectItem key={bst.id} value={bst.id}>
                                                {bst.type_name || bst.type_code || bst.id}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Quantity */}
                                <Input
                                    type="number"
                                    min="0"
                                    value={row.quantity}
                                    onChange={e => handleUpdate(realIdx, 'quantity', parseFloat(e.target.value) || 0)}
                                    className="text-sm h-8"
                                    placeholder="0"
                                />

                                {/* Unit revenue */}
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={row.unit_revenue}
                                    onChange={e => handleUpdate(realIdx, 'unit_revenue', parseFloat(e.target.value) || 0)}
                                    className="text-sm h-8"
                                    placeholder="0.00"
                                />

                                {/* Auto-calculated total */}
                                <div className="flex items-center h-8 px-3 bg-green-50 border border-green-200 rounded-md text-sm font-semibold text-green-700">
                                    {formatCurrency(row.total_revenue || 0)}
                                </div>

                                {/* Notes */}
                                <Input
                                    value={row.notes}
                                    onChange={e => handleUpdate(realIdx, 'notes', e.target.value)}
                                    className="text-sm h-8"
                                    placeholder="Σημειώσεις"
                                />

                                {/* Remove */}
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