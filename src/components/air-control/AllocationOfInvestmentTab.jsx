import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';

const fmt = (val) => {
    if (val === null || val === undefined || val === '') return '';
    return Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parseNum = (val) => {
    const n = parseFloat(String(val).replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
};

const TH = ({ children, className = '' }) => (
    <th className={`border border-slate-300 px-3 py-2 bg-slate-100 font-semibold text-slate-700 text-xs ${className}`}>
        {children}
    </th>
);

const TD = ({ children, bold = false, className = '', colSpan }) => (
    <td colSpan={colSpan} className={`border border-slate-300 px-3 py-1 text-sm ${bold ? 'font-bold' : ''} ${className}`}>
        {children}
    </td>
);

const InputCell = ({ value, onChange }) => {
    const numValue = parseNum(value);
    return (
        <td className="border border-slate-300 px-1 py-1">
            <input
                type="text"
                className="h-7 text-right text-sm border-0 focus-visible:ring-1 w-full px-2"
                value={fmt(numValue)}
                onChange={e => onChange(e.target.value)}
            />
        </td>
    );
};

const CalcCell = ({ value, className = '' }) => (
    <td className={`border border-slate-300 px-3 py-1 text-right text-sm text-slate-800 bg-slate-50 ${className}`}>
        {fmt(value)}
    </td>
);

const NoteCell = ({ value, onChange }) => (
    <td className="border border-slate-300 px-2 py-1">
        <Input
            className="h-7 text-xs border-0 focus-visible:ring-1 w-full text-slate-500"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
        />
    </td>
);

export default function AllocationOfInvestmentTab() {
    const [saving, setSaving] = useState(false);
    const [recordId, setRecordId] = useState(null);
    const [investment, setInvestment] = useState({
        pm_labour: 350000.00,
        material: 252908.13,
        assets: 450000.00,
        asset_depr_pct: 25,
        total_value_work: 3273500.96,
        expected_income: 20294790.48,
    });
    const [notes, setNotes] = useState({
        pm_labour: '',
        material: '',
        assets: '',
        total_investment: '',
        asset_depr_pct: '',
        asset_after_depr: '',
        total_value_work: '',
        expected_income: '',
        allocation_pct: '',
        allocated_cost: '',
    });

    useEffect(() => {
        loadProjectData();
    }, []);

    const loadProjectData = async () => {
        try {
            const [incomeRecords, masterRecords] = await Promise.all([
                base44.entities.IncomeCalculation.list(),
                base44.entities.ProjectMasterData.list(),
            ]);

            // Build income map
            const incomeMap = {};
            incomeRecords.forEach(r => {
                const section = r.data?.section || r.section;
                if (section) incomeMap[section] = r;
            });

            // summary data is at r.data.data
            const summaryData = incomeMap.summary?.data?.data || {};
            const totalValueOfWorkPerformed = parseFloat(summaryData.total_value_of_work_performed) || investment.total_value_work;

            // Expected Total Project Income = project_total_profit.income from ProjectMasterData
            let expectedIncome = investment.expected_income;
            if (masterRecords.length > 0) {
                const m = masterRecords[0];
                // Data is stored flat inside m.data
                const projectTotalProfit = m.data?.project_total_profit || m.project_total_profit || {};
                if (projectTotalProfit.income) {
                    expectedIncome = parseNum(projectTotalProfit.income);
                }
            }

            setInvestment(prev => ({
                ...prev,
                total_value_work: totalValueOfWorkPerformed,
                expected_income: expectedIncome,
            }));

            // Load saved notes
            const alloc = incomeMap['allocation_notes'];
            if (alloc) {
                const allocData = alloc.data?.data || alloc.data || {};
                if (allocData.notes) setNotes(prev => ({ ...prev, ...allocData.notes }));
                setRecordId(alloc.id);
            }
        } catch (error) {
            console.error('Failed to load project data:', error);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const saveData = { data: { section: 'allocation_notes', data: { notes } } };
            if (recordId) {
                await base44.entities.IncomeCalculation.update(recordId, saveData);
            } else {
                const rec = await base44.entities.IncomeCalculation.create(saveData);
                setRecordId(rec.id);
            }
        } catch (error) {
            console.error('Save failed:', error);
        } finally {
            setSaving(false);
        }
    };

    const setNote = (key, val) => setNotes(prev => ({ ...prev, [key]: val }));

    const totalInvestment = parseNum(investment.pm_labour) + parseNum(investment.material) + parseNum(investment.assets);
    const assetAfterDepr = parseNum(investment.assets) * (parseNum(investment.asset_depr_pct) / 100);
    const allocationPct = ((totalInvestment - assetAfterDepr) / parseNum(investment.expected_income)) * 100;
    const allocatedCost = (allocationPct / 100) * parseNum(investment.total_value_work);

    return (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800">Allocation of Investment</h2>
                <Button onClick={handleSave} disabled={saving} size="sm">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    Save Changes
                </Button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm table-fixed">
                    <colgroup>
                        <col style={{ width: '30%' }} />
                        <col style={{ width: '20%' }} />
                        <col style={{ width: '50%' }} />
                    </colgroup>
                    <thead>
                        <tr>
                            <TH className="text-left">Investment Type</TH>
                            <TH className="text-right">Cost</TH>
                            <TH className="text-left">Note</TH>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <TD bold>Capital Expenditure</TD>
                            <TD></TD>
                            <TD></TD>
                        </tr>
                        <tr>
                            <TD>PM & Labour Intensive</TD>
                            <InputCell value={fmt(investment.pm_labour)} onChange={v => setInvestment({...investment, pm_labour: parseNum(v)})} />
                            <NoteCell value={notes.pm_labour} onChange={v => setNote('pm_labour', v)} />
                        </tr>
                        <tr>
                            <TD>Material</TD>
                            <InputCell value={fmt(investment.material)} onChange={v => setInvestment({...investment, material: parseNum(v)})} />
                            <NoteCell value={notes.material} onChange={v => setNote('material', v)} />
                        </tr>
                        <tr>
                            <TD>Assets</TD>
                            <InputCell value={fmt(investment.assets)} onChange={v => setInvestment({...investment, assets: parseNum(v)})} />
                            <NoteCell value={notes.assets} onChange={v => setNote('assets', v)} />
                        </tr>
                        <tr className="bg-slate-100 font-bold">
                            <TD bold>Total Investment</TD>
                            <CalcCell value={totalInvestment} className="font-bold" />
                            <NoteCell value={notes.total_investment} onChange={v => setNote('total_investment', v)} />
                        </tr>
                        <tr>
                            <TD colSpan={3} className="text-xs text-slate-500">Πίνακας 9 — Allocated Investment Cost</TD>
                        </tr>
                        <tr>
                            <TD>Total Investment</TD>
                            <CalcCell value={totalInvestment} />
                            <TD></TD>
                        </tr>
                        <tr>
                            <TD>Asset Value after Depreciation %</TD>
                            <InputCell value={fmt(investment.asset_depr_pct)} onChange={v => setInvestment({...investment, asset_depr_pct: parseNum(v)})} />
                            <NoteCell value={notes.asset_depr_pct} onChange={v => setNote('asset_depr_pct', v)} />
                        </tr>
                        <tr>
                            <TD>Asset Value after Depreciation</TD>
                            <CalcCell value={assetAfterDepr} />
                            <NoteCell value={notes.asset_after_depr} onChange={v => setNote('asset_after_depr', v)} />
                        </tr>
                        <tr>
                            <TD>Total Value of Work Performed</TD>
                            <CalcCell value={investment.total_value_work} />
                            <NoteCell value={notes.total_value_work} onChange={v => setNote('total_value_work', v)} />
                        </tr>
                        <tr>
                            <TD>Expected Total Project Income</TD>
                            <CalcCell value={investment.expected_income} />
                            <NoteCell value={notes.expected_income} onChange={v => setNote('expected_income', v)} />
                        </tr>
                        <tr>
                            <TD>Allocation %</TD>
                            <CalcCell value={allocationPct} />
                            <NoteCell value={notes.allocation_pct} onChange={v => setNote('allocation_pct', v)} />
                        </tr>
                        <tr className="bg-slate-100 font-bold">
                            <TD bold>Allocated Investment Cost</TD>
                            <CalcCell value={allocatedCost} className="font-bold" />
                            <NoteCell value={notes.allocated_cost} onChange={v => setNote('allocated_cost', v)} />
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}