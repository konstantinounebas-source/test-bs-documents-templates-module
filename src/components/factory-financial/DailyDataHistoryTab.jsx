import React, { useState, useMemo } from 'react';
import { Package, DollarSign, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function SectionTable({ title, icon: Icon, color, columns, rows, emptyMsg }) {
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const filtered = useMemo(() => {
        return (rows || []).filter(r => {
            if (dateFrom && r.date < dateFrom) return false;
            if (dateTo && r.date > dateTo) return false;
            return true;
        }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }, [rows, dateFrom, dateTo]);

    const colorMap = {
        blue: 'text-blue-700 bg-blue-50 border-blue-200',
        green: 'text-green-700 bg-green-50 border-green-200',
        purple: 'text-purple-700 bg-purple-50 border-purple-200',
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className={`text-sm font-semibold flex items-center gap-2 ${colorMap[color]?.split(' ')[0]}`}>
                        <Icon className="w-4 h-4" />
                        {title}
                        <span className="ml-1 text-xs font-normal text-slate-500">({filtered.length} εγγραφές)</span>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-500">Από:</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={e => setDateFrom(e.target.value)}
                            className="border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                        <label className="text-xs text-slate-500">Έως:</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={e => setDateTo(e.target.value)}
                            className="border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                        {(dateFrom || dateTo) && (
                            <button
                                onClick={() => { setDateFrom(''); setDateTo(''); }}
                                className="text-xs text-slate-400 hover:text-slate-700 underline"
                            >
                                Καθαρισμός
                            </button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {filtered.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">{emptyMsg}</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    {columns.map(col => (
                                        <th key={col.key} className="px-3 py-2 text-left text-xs font-semibold text-slate-600 whitespace-nowrap">
                                            {col.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((row, i) => (
                                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                                        {columns.map(col => (
                                            <td key={col.key} className="px-3 py-2 text-slate-700 whitespace-nowrap">
                                                {col.render ? col.render(row) : (row[col.key] ?? '—')}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function DailyDataHistoryTab({
    dailyProductionEntries,
    dailyRevenueEntries,
    dailyDepartmentHoursEntries,
    busStopTypes,
    departments,
    formatCurrency,
}) {
    const getBusStopTypeName = (id) => {
        const t = (busStopTypes || []).find(b => b.id === id);
        return t ? (t.type_name || t.type_code || id) : id || '—';
    };
    const getDeptName = (id) => {
        const d = (departments || []).find(d => d.id === id);
        return d ? d.department_name : id || '—';
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold text-slate-800">Ιστορικό Daily Data</h2>
                <p className="text-sm text-slate-500">Πλήρες ιστορικό όλων των ημερήσιων εγγραφών, ταξινομημένο από νεότερο προς παλαιότερο.</p>
            </div>

            {/* Production History */}
            <SectionTable
                title="Ιστορικό Παραγωγής"
                icon={Package}
                color="blue"
                emptyMsg="Δεν υπάρχουν εγγραφές παραγωγής."
                rows={dailyProductionEntries}
                columns={[
                    { key: 'date', label: 'Ημερομηνία' },
                    { key: 'bus_stop_type_id', label: 'Τύπος Στάσης', render: r => getBusStopTypeName(r.bus_stop_type_id) },
                    { key: 'label', label: 'Περιγραφή', render: r => r.label || '—' },
                    { key: 'quantity', label: 'Ποσότητα', render: r => parseFloat(r.quantity || 0).toFixed(0) },
                    { key: 'notes', label: 'Σημειώσεις', render: r => r.notes || '—' },
                ]}
            />

            {/* Revenue History */}
            <SectionTable
                title="Ιστορικό Εσόδων"
                icon={DollarSign}
                color="green"
                emptyMsg="Δεν υπάρχουν εγγραφές εσόδων."
                rows={dailyRevenueEntries}
                columns={[
                    { key: 'date', label: 'Ημερομηνία' },
                    { key: 'description', label: 'Περιγραφή', render: r => r.revenue_item || r.description || '—' },
                    { key: 'quantity', label: 'Ποσότητα', render: r => parseFloat(r.quantity || 0).toFixed(0) },
                    { key: 'unit_revenue', label: 'Τιμή Μονάδας', render: r => formatCurrency ? formatCurrency(parseFloat(r.unit_revenue || 0)) : `€${parseFloat(r.unit_revenue || 0).toFixed(2)}` },
                    { key: 'total_revenue', label: 'Σύνολο', render: r => formatCurrency ? formatCurrency(parseFloat(r.total_revenue || 0)) : `€${parseFloat(r.total_revenue || 0).toFixed(2)}` },
                ]}
            />

            {/* Department Hours History */}
            <SectionTable
                title="Ιστορικό Ωρών Τμημάτων"
                icon={Clock}
                color="purple"
                emptyMsg="Δεν υπάρχουν εγγραφές ωρών τμημάτων."
                rows={dailyDepartmentHoursEntries}
                columns={[
                    { key: 'date', label: 'Ημερομηνία' },
                    { key: 'department_id', label: 'Τμήμα', render: r => getDeptName(r.department_id) },
                    { key: 'total_hours', label: 'Συνολικές Ώρες', render: r => parseFloat(r.total_hours || 0).toFixed(1) },
                ]}
            />
        </div>
    );
}