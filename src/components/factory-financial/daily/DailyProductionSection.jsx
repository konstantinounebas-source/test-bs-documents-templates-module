import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Package } from 'lucide-react';
import { calculateDailyProductionTotal } from "@/components/factory-financial/utils/dailyOperationsCalculations";

const EMPTY_ROW = { date: '', bus_stop_type_id: '', product_label: '', quantity: 0, notes: '' };

export default function DailyProductionSection({ entries, busStopTypes, onAdd, onRemove, onUpdate }) {
    const total = calculateDailyProductionTotal(entries);

    const handleUpdate = (idx, field, value) => {
        const updated = [...entries];
        updated[idx] = { ...updated[idx], [field]: value };
        // Sync product_label when bus_stop_type_id changes
        if (field === 'bus_stop_type_id') {
            const found = busStopTypes.find(t => t.id === value);
            updated[idx].product_label = found ? (found.type_name || found.type_code || '') : '';
        }
        onUpdate(updated);
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-600" />
                        <CardTitle className="text-base font-semibold text-slate-800">
                            A. Daily Production
                        </CardTitle>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-500">
                            Σύνολο: <strong className="text-slate-800">{total.toLocaleString('el-GR')} τεμ.</strong>
                        </span>
                        <Button size="sm" variant="outline" onClick={() => onAdd(EMPTY_ROW)} className="gap-1">
                            <Plus className="w-3.5 h-3.5" /> Προσθήκη
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {entries.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">Δεν υπάρχουν εγγραφές παραγωγής. Κάντε κλικ στο «Προσθήκη».</p>
                ) : (
                    <div className="space-y-2">
                        {/* Header */}
                        <div className="hidden md:grid grid-cols-[120px_1fr_80px_1fr_36px] gap-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            <span>Ημερομηνία</span>
                            <span>Τύπος / Προϊόν</span>
                            <span>Ποσότητα</span>
                            <span>Σημειώσεις</span>
                            <span />
                        </div>
                        {entries.map((row, idx) => (
                            <div key={idx} className="grid grid-cols-1 md:grid-cols-[120px_1fr_80px_1fr_36px] gap-2 items-center bg-slate-50 rounded-lg p-2">
                                <Input
                                    type="date"
                                    value={row.date}
                                    onChange={e => handleUpdate(idx, 'date', e.target.value)}
                                    className="text-sm h-8"
                                />
                                <Select
                                    value={row.bus_stop_type_id || '__manual__'}
                                    onValueChange={val => handleUpdate(idx, 'bus_stop_type_id', val === '__manual__' ? '' : val)}
                                >
                                    <SelectTrigger className="h-8 text-sm">
                                        <SelectValue placeholder="Επιλογή τύπου..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__manual__">— Χειροκίνητη εισαγωγή —</SelectItem>
                                        {(busStopTypes || []).map(t => (
                                            <SelectItem key={t.id} value={t.id}>
                                                {t.type_name || t.type_code || t.id}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Input
                                    type="number"
                                    min="0"
                                    value={row.quantity}
                                    onChange={e => handleUpdate(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                    className="text-sm h-8"
                                    placeholder="0"
                                />
                                <Input
                                    value={row.notes}
                                    onChange={e => handleUpdate(idx, 'notes', e.target.value)}
                                    className="text-sm h-8"
                                    placeholder="Σημειώσεις (προαιρετικό)"
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