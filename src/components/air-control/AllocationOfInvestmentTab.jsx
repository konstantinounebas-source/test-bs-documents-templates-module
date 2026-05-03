import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (val) => {
    if (val === null || val === undefined || val === '') return '';
    const n = parseFloat(String(val).replace(/,/g, ''));
    if (isNaN(n)) return '';
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parseNum = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    const n = parseFloat(String(val).replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
};

// ── Cell Components ───────────────────────────────────────────────────────────
// Editable number cell: formatted display, raw on focus
const EditCell = ({ value, onChange }) => {
    const [focused, setFocused] = useState(false);
    const [raw, setRaw] = useState('');

    return (
        <td className="border border-slate-300 p-0">
            <input
                type="text"
                className="h-8 w-full text-right text-sm px-3 bg-white focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-400"
                value={focused ? raw : fmt(value)}
                onFocus={() => { setRaw(value === 0 ? '' : String(value)); setFocused(true); }}
                onChange={e => setRaw(e.target.value)}
                onBlur={() => { setFocused(false); onChange(parseNum(raw)); }}
            />
        </td>
    );
};

const CalcCell = ({ value, bold }) => (
    <td className={`border border-slate-300 px-3 py-2 text-right text-sm bg-slate-50 ${bold ? 'font-bold' : ''}`}>
        {fmt(value)}
    </td>
);

const LabelCell = ({ children, bold, colSpan, sub }) => (
    <td colSpan={colSpan} className={`border border-slate-300 px-3 py-2 text-sm
        ${bold ? 'font-bold' : ''}
        ${sub ? 'text-xs text-blue-600 bg-slate-50 italic' : ''}`}>
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

const EmptyCell = () => <td className="border border-slate-300 bg-white" />;

// ── Main Component ────────────────────────────────────────────────────────────
export default function AllocationOfInvestmentTab() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [allocRecordId, setAllocRecordId] = useState(null);

    // Editable investment inputs
    const [inv, setInv] = useState({
        pm_labour: 350000,
        material: 252908.13,
        assets: 450000,
        asset_depr_pct: 25,
    });

    // Read-only values from other modules
    const [totalValueOfWork, setTotalValueOfWork] = useState(0);
    const [expectedIncome, setExpectedIncome] = useState(0);

    // Notes column
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

            // ── 1. Total Value of Work Performed (from IncomeCalculation summary)
            // SDK returns entity fields flat at top level AND also inside .data
            // DB: record.data.data.data.total_value_of_work_performed
            const summaryRecord = incomeRecords.find(r =>
                r.section === 'summary' || r.data?.section === 'summary'
            );
            // Try all possible nesting levels the SDK might return
            const tvwp = parseNum(
                summaryRecord?.data?.data?.data?.total_value_of_work_performed ||
                summaryRecord?.data?.data?.total_value_of_work_performed ||
                summaryRecord?.data?.total_value_of_work_performed ||
                summaryRecord?.total_value_of_work_performed
            );
            setTotalValueOfWork(tvwp);

            // ── 2. Expected Total Project Income (from ProjectMasterData)
            // The base44 SDK returns entity object-type fields FLAT at the record root level
            // e.g. record.project_total_profit = { income: 20294790.46 }
            if (masterRecords.length > 0) {
                const m = masterRecords[0];
                // SDK flat access — object fields are at root, NOT under .data
                const income = parseNum(m.project_total_profit?.income);
                console.log('[AllocationTab] masterRecord keys:', Object.keys(m));
                console.log('[AllocationTab] project_total_profit:', m.project_total_profit);
                console.log('[AllocationTab] parsed income:', income);
                if (income > 0) setExpectedIncome(income);
            }

            // ── 3. Saved allocation notes + investment values
            const allocRecord = incomeRecords.find(r => (r.data?.section || r.section) === 'allocation_notes');
            if (allocRecord) {
                setAllocRecordId(allocRecord.id);
                const saved = allocRecord.data?.data || {};
                if (saved.investment) {
                    setInv(prev => ({ ...prev, ...saved.investment }));
                }
                if (saved.notes) {
                    setNotes(prev => ({ ...prev, ...saved.notes }));
                }
            }
        } catch (err) {
            console.error('AllocationOfInvestmentTab load error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                data: {
                    section: 'allocation_notes',
                    data: { investment: inv, notes },
                }
            };
            if (allocRecordId) {
                await base44.entities.IncomeCalculation.update(allocRecordId, payload);
            } else {
                const rec = await base44.entities.IncomeCalculation.create(payload);
                setAllocRecordId(rec.id);
            }
        } catch (err) {
            console.error('AllocationOfInvestmentTab save error:', err);
        } finally {
            setSaving(false);
        }
    };

    const setField = (key, val) => setInv(prev => ({ ...prev, [key]: val }));
    const setNote  = (key, val) => setNotes(prev => ({ ...prev, [key]: val }));

    // ── Derived calculations ──────────────────────────────────────────────────
    const totalInvestment  = parseNum(inv.pm_labour) + parseNum(inv.material) + parseNum(inv.assets);
    const assetAfterDepr   = parseNum(inv.assets) * (parseNum(inv.asset_depr_pct) / 100);
    const allocationPct    = expectedIncome > 0
        ? ((totalInvestment - assetAfterDepr) / expectedIncome) * 100
        : 0;
    const allocatedCost    = (allocationPct / 100) * totalValueOfWork;

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

                        {/* ── Section: Capital Expenditure ── */}
                        <tr className="bg-slate-50">
                            <LabelCell bold>Capital Expenditure</LabelCell>
                            <EmptyCell /><EmptyCell />
                        </tr>
                        <tr>
                            <LabelCell>PM &amp; Labour Intensive</LabelCell>
                            <EditCell value={inv.pm_labour}      onChange={v => setField('pm_labour', v)} />
                            <NoteCell value={notes.pm_labour}    onChange={v => setNote('pm_labour', v)} />
                        </tr>
                        <tr>
                            <LabelCell>Material</LabelCell>
                            <EditCell value={inv.material}       onChange={v => setField('material', v)} />
                            <NoteCell value={notes.material}     onChange={v => setNote('material', v)} />
                        </tr>
                        <tr>
                            <LabelCell>Assets</LabelCell>
                            <EditCell value={inv.assets}         onChange={v => setField('assets', v)} />
                            <NoteCell value={notes.assets}       onChange={v => setNote('assets', v)} />
                        </tr>
                        <tr className="bg-slate-100">
                            <LabelCell bold>Total Investment</LabelCell>
                            <CalcCell value={totalInvestment} bold />
                            <td className="border border-slate-300 px-3 py-1 text-xs text-slate-400 italic bg-slate-100">= PM &amp; Labour + Material + Assets</td>
                        </tr>

                        {/* ── Section: Πίνακας 9 ── */}
                        <tr>
                            <LabelCell colSpan={3} sub>Πίνακας 9 — Allocated Investment Cost</LabelCell>
                        </tr>
                        <tr>
                            <LabelCell>Total Investment</LabelCell>
                            <CalcCell value={totalInvestment} />
                            <EmptyCell />
                        </tr>
                        <tr>
                            <LabelCell>Asset Value after Depreciation %</LabelCell>
                            <EditCell value={inv.asset_depr_pct}      onChange={v => setField('asset_depr_pct', v)} />
                            <NoteCell value={notes.asset_depr_pct}    onChange={v => setNote('asset_depr_pct', v)} />
                        </tr>
                        <tr>
                            <LabelCell>Asset Value after Depreciation</LabelCell>
                            <CalcCell value={assetAfterDepr} />
                            <td className="border border-slate-300 px-3 py-1 text-xs text-slate-400 italic">= Assets × Depreciation %</td>
                        </tr>
                        <tr>
                            <LabelCell>Total Value of Work Performed</LabelCell>
                            <CalcCell value={totalValueOfWork} />
                            <NoteCell value={notes.total_value_work}  onChange={v => setNote('total_value_work', v)} />
                        </tr>
                        <tr>
                            <LabelCell>Expected Total Project Income</LabelCell>
                            <CalcCell value={expectedIncome} />
                            <NoteCell value={notes.expected_income}   onChange={v => setNote('expected_income', v)} />
                        </tr>
                        <tr>
                            <LabelCell>Allocation %</LabelCell>
                            <CalcCell value={allocationPct} />
                            <NoteCell value={notes.allocation_pct}    onChange={v => setNote('allocation_pct', v)} />
                        </tr>
                        <tr className="bg-slate-100">
                            <LabelCell bold>Allocated Investment Cost</LabelCell>
                            <CalcCell value={allocatedCost} bold />
                            <td className="border border-slate-300 px-3 py-1 text-xs text-slate-400 italic bg-slate-100">= (Allocation % / 100) × Total Value of Work Performed</td>
                        </tr>

                    </tbody>
                </table>
            </div>
        </div>
    );
}