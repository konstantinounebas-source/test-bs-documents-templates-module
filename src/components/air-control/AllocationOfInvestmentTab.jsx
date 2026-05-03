import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';

const fmt = (val) => {
    if (val === null || val === undefined || val === '') return '';
    return Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parseNum = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    const n = parseFloat(String(val).replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
};

// Editable input cell — shows formatted on blur, raw on focus
const EditCell = ({ value, onChange }) => {
    const [editing, setEditing] = useState(false);
    const [raw, setRaw] = useState('');
    const inputRef = useRef(null);

    const handleFocus = () => {
        setRaw(value === 0 ? '' : String(value));
        setEditing(true);
    };

    const handleBlur = () => {
        setEditing(false);
        onChange(parseNum(raw));
    };

    return (
        <td className="border border-slate-300 p-0">
            <input
                ref={inputRef}
                type="text"
                className="h-8 w-full text-right text-sm px-3 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                value={editing ? raw : fmt(value)}
                onFocus={handleFocus}
                onChange={e => setRaw(e.target.value)}
                onBlur={handleBlur}
            />
        </td>
    );
};

const CalcCell = ({ value, bold = false }) => (
    <td className={`border border-slate-300 px-3 py-2 text-right text-sm bg-slate-50 ${bold ? 'font-bold' : ''}`}>
        {fmt(value)}
    </td>
);

const LabelCell = ({ children, bold = false, colSpan, sub = false }) => (
    <td colSpan={colSpan} className={`border border-slate-300 px-3 py-2 text-sm ${bold ? 'font-bold' : ''} ${sub ? 'text-xs text-slate-500 bg-slate-50' : ''}`}>
        {children}
    </td>
);

const NoteCell = ({ value, onChange }) => (
    <td className="border border-slate-300 px-2 py-1">
        <Input
            className="h-7 text-xs border-0 shadow-none focus-visible:ring-1 w-full text-slate-500"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
        />
    </td>
);

const EmptyCell = () => <td className="border border-slate-300" />;

export default function AllocationOfInvestmentTab() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [recordId, setRecordId] = useState(null);

    const [inv, setInv] = useState({
        pm_labour: 350000,
        material: 252908.13,
        assets: 450000,
        asset_depr_pct: 25,
        total_value_work: 0,
        expected_income: 20294790.46,
    });

    const [notes, setNotes] = useState({
        pm_labour: '', material: '', assets: '', total_investment: '',
        asset_depr_pct: '', asset_after_depr: '', total_value_work: '',
        expected_income: '', allocation_pct: '', allocated_cost: '',
    });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [incomeRecords, masterRecords] = await Promise.all([
                base44.entities.IncomeCalculation.list(),
                base44.entities.ProjectMasterData.list(),
            ]);

            // Build income map by section
            const incomeMap = {};
            incomeRecords.forEach(r => {
                const section = r.data?.section || r.section;
                if (section) incomeMap[section] = r;
            });

            // Total Value of Work Performed from saved summary
            const summaryData = incomeMap.summary?.data?.data || {};
            const totalValueOfWork = parseNum(summaryData.total_value_of_work_performed);

            // Expected Total Project Income from ProjectMasterData
            // The entity stores object fields inside `data` — SDK returns them flat at top level
            // but the actual stored value is in data.project_total_profit.income
            let expectedIncome = 20294790.46; // fallback
            if (masterRecords.length > 0) {
                const m = masterRecords[0];
                // SDK returns entity data fields at top level (flat), not under .data
                const ptp = m.project_total_profit;
                const income = parseNum(ptp?.income);
                if (income > 0) expectedIncome = income;
            }

            // Load saved investment values + notes
            const alloc = incomeMap['allocation_notes'];
            let savedInv = {};
            let savedNotes = {};
            if (alloc) {
                const d = alloc.data?.data || alloc.data || {};
                if (d.investment) savedInv = d.investment;
                if (d.notes) savedNotes = d.notes;
                setRecordId(alloc.id);
            }

            setInv(prev => ({
                ...prev,
                ...savedInv,
                ...(totalValueOfWork > 0 ? { total_value_work: totalValueOfWork } : {}),
                expected_income: expectedIncome,
            }));
            setNotes(prev => ({ ...prev, ...savedNotes }));

        } catch (err) {
            console.error('Load failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const saveData = {
                data: {
                    section: 'allocation_notes',
                    data: {
                        investment: {
                            pm_labour: inv.pm_labour,
                            material: inv.material,
                            assets: inv.assets,
                            asset_depr_pct: inv.asset_depr_pct,
                        },
                        notes,
                    }
                }
            };
            if (recordId) {
                await base44.entities.IncomeCalculation.update(recordId, saveData);
            } else {
                const rec = await base44.entities.IncomeCalculation.create(saveData);
                setRecordId(rec.id);
            }
        } catch (err) {
            console.error('Save failed:', err);
        } finally {
            setSaving(false);
        }
    };

    const setNote = (key, val) => setNotes(prev => ({ ...prev, [key]: val }));
    const setField = (key, val) => setInv(prev => ({ ...prev, [key]: val }));

    // ── Derived calculations ──────────────────────────────────────────────────
    const totalInvestment = parseNum(inv.pm_labour) + parseNum(inv.material) + parseNum(inv.assets);
    const assetAfterDepr = parseNum(inv.assets) * (parseNum(inv.asset_depr_pct) / 100);
    const investedMinusDepr = totalInvestment - assetAfterDepr;
    const allocationPct = inv.expected_income > 0
        ? (investedMinusDepr / parseNum(inv.expected_income)) * 100
        : 0;
    const allocatedCost = (allocationPct / 100) * parseNum(inv.total_value_work);

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
    );

    return (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800">Allocation of Investment</h2>
                <Button onClick={handleSave} disabled={saving} size="sm">
                    {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                    Save Changes
                </Button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm table-fixed">
                    <colgroup>
                        <col style={{ width: '35%' }} />
                        <col style={{ width: '20%' }} />
                        <col style={{ width: '45%' }} />
                    </colgroup>
                    <thead>
                        <tr>
                            <th className="border border-slate-300 px-3 py-2 bg-slate-100 font-semibold text-slate-700 text-xs text-left">Investment Type</th>
                            <th className="border border-slate-300 px-3 py-2 bg-slate-100 font-semibold text-slate-700 text-xs text-right">Cost</th>
                            <th className="border border-slate-300 px-3 py-2 bg-slate-100 font-semibold text-slate-700 text-xs text-left">Note</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* ── Capital Expenditure section ── */}
                        <tr className="bg-slate-50">
                            <LabelCell bold>Capital Expenditure</LabelCell>
                            <EmptyCell /><EmptyCell />
                        </tr>
                        <tr>
                            <LabelCell>PM &amp; Labour Intensive</LabelCell>
                            <EditCell value={inv.pm_labour} onChange={v => setField('pm_labour', v)} />
                            <NoteCell value={notes.pm_labour} onChange={v => setNote('pm_labour', v)} />
                        </tr>
                        <tr>
                            <LabelCell>Material</LabelCell>
                            <EditCell value={inv.material} onChange={v => setField('material', v)} />
                            <NoteCell value={notes.material} onChange={v => setNote('material', v)} />
                        </tr>
                        <tr>
                            <LabelCell>Assets</LabelCell>
                            <EditCell value={inv.assets} onChange={v => setField('assets', v)} />
                            <NoteCell value={notes.assets} onChange={v => setNote('assets', v)} />
                        </tr>
                        <tr className="bg-slate-100">
                            <LabelCell bold>Total Investment</LabelCell>
                            <CalcCell value={totalInvestment} bold />
                            <NoteCell value={notes.total_investment} onChange={v => setNote('total_investment', v)} />
                        </tr>

                        {/* ── Πίνακας 9 separator ── */}
                        <tr>
                            <LabelCell colSpan={3} sub>Πίνακας 9 — Allocated Investment Cost</LabelCell>
                        </tr>

                        {/* ── Πίνακας 9 rows ── */}
                        <tr>
                            <LabelCell>Total Investment</LabelCell>
                            <CalcCell value={totalInvestment} />
                            <EmptyCell />
                        </tr>
                        <tr>
                            <LabelCell>Asset Value after Depreciation %</LabelCell>
                            <EditCell value={inv.asset_depr_pct} onChange={v => setField('asset_depr_pct', v)} />
                            <NoteCell value={notes.asset_depr_pct} onChange={v => setNote('asset_depr_pct', v)} />
                        </tr>
                        <tr>
                            <LabelCell>Asset Value after Depreciation</LabelCell>
                            <CalcCell value={assetAfterDepr} />
                            <NoteCell value={notes.asset_after_depr} onChange={v => setNote('asset_after_depr', v)} />
                        </tr>
                        <tr>
                            <LabelCell>Total Value of Work Performed</LabelCell>
                            <CalcCell value={inv.total_value_work} />
                            <NoteCell value={notes.total_value_work} onChange={v => setNote('total_value_work', v)} />
                        </tr>
                        <tr>
                            <LabelCell>Expected Total Project Income</LabelCell>
                            <CalcCell value={inv.expected_income} />
                            <NoteCell value={notes.expected_income} onChange={v => setNote('expected_income', v)} />
                        </tr>
                        <tr>
                            <LabelCell>Allocation %</LabelCell>
                            <CalcCell value={allocationPct} />
                            <NoteCell value={notes.allocation_pct} onChange={v => setNote('allocation_pct', v)} />
                        </tr>
                        <tr className="bg-slate-100">
                            <LabelCell bold>Allocated Investment Cost</LabelCell>
                            <CalcCell value={allocatedCost} bold />
                            <NoteCell value={notes.allocated_cost} onChange={v => setNote('allocated_cost', v)} />
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}