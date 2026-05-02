import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';

const CATEGORIES = [
    { key: 'pm', label: 'PM' },
    { key: 'labour', label: 'Labour' },
    { key: 'assets', label: 'Assets' },
    { key: 'materials', label: 'Materials' },
    { key: 'other', label: 'Other' },
];

const fmt = (val) => {
    if (val === null || val === undefined || val === '') return '';
    return Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parseNum = (val) => {
    const n = parseFloat(String(val).replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
};

export default function OutcomeCalculationTab() {
    const [periods, setPeriods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showAddMonth, setShowAddMonth] = useState(false);
    const [newMonthLabel, setNewMonthLabel] = useState('');
    const [editData, setEditData] = useState({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const records = await base44.entities.OutcomeCalculation.list('period_order', 100);
        // Sort by period_order
        const sorted = [...records].sort((a, b) => (a.period_order || 0) - (b.period_order || 0));
        setPeriods(sorted);

        // Initialize editData
        const initial = {};
        sorted.forEach(p => {
            initial[p.id] = {
                pm_from_software: p.pm_from_software ?? '',
                pm_not_in_software: p.pm_not_in_software ?? '',
                labour_from_software: p.labour_from_software ?? '',
                labour_not_in_software: p.labour_not_in_software ?? '',
                assets_from_software: p.assets_from_software ?? '',
                assets_not_in_software: p.assets_not_in_software ?? '',
                materials_from_software: p.materials_from_software ?? '',
                materials_not_in_software: p.materials_not_in_software ?? '',
                other_from_software: p.other_from_software ?? '',
                other_not_in_software: p.other_not_in_software ?? '',
            };
        });
        setEditData(initial);
        setLoading(false);
    };

    const handleCellChange = (periodId, field, value) => {
        setEditData(prev => ({
            ...prev,
            [periodId]: { ...prev[periodId], [field]: value }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        for (const period of periods) {
            const d = editData[period.id] || {};
            const update = {};
            CATEGORIES.forEach(cat => {
                update[`${cat.key}_from_software`] = parseNum(d[`${cat.key}_from_software`]);
                update[`${cat.key}_not_in_software`] = parseNum(d[`${cat.key}_not_in_software`]);
            });
            await base44.entities.OutcomeCalculation.update(period.id, update);
        }
        await loadData();
        setSaving(false);
    };

    const handleAddMonth = async () => {
        if (!newMonthLabel.trim()) return;
        const maxOrder = periods.length > 0 ? Math.max(...periods.map(p => p.period_order || 0)) : 0;
        await base44.entities.OutcomeCalculation.create({
            period_label: newMonthLabel.trim(),
            period_type: 'month',
            period_order: maxOrder + 1,
        });
        setNewMonthLabel('');
        setShowAddMonth(false);
        await loadData();
    };

    const handleDeletePeriod = async (periodId) => {
        await base44.entities.OutcomeCalculation.delete(periodId);
        await loadData();
    };

    // Compute totals per period
    const getPeriodTotal = (periodId) => {
        const d = editData[periodId] || {};
        return CATEGORIES.reduce((sum, cat) => {
            return sum + parseNum(d[`${cat.key}_from_software`]) + parseNum(d[`${cat.key}_not_in_software`]);
        }, 0);
    };

    // Compute grand total per category across all periods
    const getCategoryTotal = (catKey) => {
        return periods.reduce((sum, p) => {
            const d = editData[p.id] || {};
            return sum + parseNum(d[`${catKey}_from_software`]) + parseNum(d[`${catKey}_not_in_software`]);
        }, 0);
    };

    const getGrandTotal = () => {
        return CATEGORIES.reduce((sum, cat) => sum + getCategoryTotal(cat.key), 0);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800">Outcome Calculation</h2>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowAddMonth(true)}>
                        <Plus className="w-4 h-4 mr-1" /> Add Month
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                        Save
                    </Button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="bg-slate-100">
                            <th className="border border-slate-300 px-3 py-2 text-left font-semibold text-slate-700 w-36">
                                Outcome Category
                            </th>
                            {periods.map(p => (
                                <th key={p.id} colSpan={2} className="border border-slate-300 px-3 py-2 text-center font-semibold text-slate-700">
                                    <div className="flex items-center justify-center gap-1">
                                        <span>{p.period_label}</span>
                                        {p.period_type === 'month' && (
                                            <button
                                                onClick={() => handleDeletePeriod(p.id)}
                                                className="text-red-400 hover:text-red-600 ml-1"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                </th>
                            ))}
                            <th className="border border-slate-300 px-3 py-2 text-center font-semibold text-slate-700">
                                Total Outcome
                            </th>
                        </tr>
                        <tr className="bg-slate-50">
                            <th className="border border-slate-300 px-3 py-2"></th>
                            {periods.map(p => (
                                <React.Fragment key={p.id}>
                                    <th className="border border-slate-300 px-3 py-2 text-center text-xs font-medium text-slate-600">
                                        From Software
                                    </th>
                                    <th className="border border-slate-300 px-3 py-2 text-center text-xs font-medium text-slate-600">
                                        Not in Software
                                    </th>
                                </React.Fragment>
                            ))}
                            <th className="border border-slate-300 px-3 py-2"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {CATEGORIES.map(cat => (
                            <tr key={cat.key} className="hover:bg-slate-50">
                                <td className="border border-slate-300 px-3 py-1 font-medium text-slate-700">
                                    {cat.label}
                                </td>
                                {periods.map(p => (
                                    <React.Fragment key={p.id}>
                                        <td className="border border-slate-300 px-1 py-1">
                                            <input
                                                type="text"
                                                className="h-7 text-right text-xs border-0 focus-visible:ring-1 w-full px-2"
                                                value={fmt(parseNum(editData[p.id]?.[`${cat.key}_from_software`] ?? ''))}
                                                onChange={e => handleCellChange(p.id, `${cat.key}_from_software`, e.target.value)}
                                            />
                                        </td>
                                        <td className="border border-slate-300 px-1 py-1">
                                            <input
                                                type="text"
                                                className="h-7 text-right text-xs border-0 focus-visible:ring-1 w-full px-2"
                                                value={fmt(parseNum(editData[p.id]?.[`${cat.key}_not_in_software`] ?? ''))}
                                                onChange={e => handleCellChange(p.id, `${cat.key}_not_in_software`, e.target.value)}
                                            />
                                        </td>
                                    </React.Fragment>
                                ))}
                                <td className="border border-slate-300 px-3 py-1 text-right font-semibold text-slate-800 bg-slate-50">
                                    {fmt(getCategoryTotal(cat.key))}
                                </td>
                            </tr>
                        ))}
                        {/* Total Row */}
                        <tr className="bg-slate-100 font-bold">
                            <td className="border border-slate-300 px-3 py-2 text-slate-800">Total Outcome</td>
                            {periods.map(p => (
                                <React.Fragment key={p.id}>
                                    <td className="border border-slate-300 px-3 py-2 text-right text-slate-800" colSpan={1}>
                                        {fmt(
                                            CATEGORIES.reduce((s, cat) => s + parseNum(editData[p.id]?.[`${cat.key}_from_software`]), 0)
                                        )}
                                    </td>
                                    <td className="border border-slate-300 px-3 py-2 text-right text-slate-800" colSpan={1}>
                                        {fmt(
                                            CATEGORIES.reduce((s, cat) => s + parseNum(editData[p.id]?.[`${cat.key}_not_in_software`]), 0)
                                        )}
                                    </td>
                                </React.Fragment>
                            ))}
                            <td className="border border-slate-300 px-3 py-2 text-right text-slate-800">
                                {fmt(getGrandTotal())}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {periods.length === 0 && (
                    <div className="text-center py-12 text-slate-400 text-sm">
                        No periods yet. Add a month to get started.
                    </div>
                )}
            </div>

            {/* Add Month Dialog */}
            <Dialog open={showAddMonth} onOpenChange={setShowAddMonth}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Add Month</DialogTitle>
                    </DialogHeader>
                    <div className="py-2">
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Period Label</label>
                        <Input
                            placeholder="e.g. Apr-26 or As per 31/3/2026"
                            value={newMonthLabel}
                            onChange={e => setNewMonthLabel(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddMonth()}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddMonth(false)}>Cancel</Button>
                        <Button onClick={handleAddMonth} disabled={!newMonthLabel.trim()}>Add</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}