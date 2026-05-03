import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const fmt = (val) => {
    if (val === null || val === undefined || val === '') return '—';
    return Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtInput = (val) => {
    const n = parseFloat(String(val).replace(/,/g, ''));
    if (isNaN(n)) return '';
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parseNum = (val) => {
    const n = parseFloat(String(val).replace(/,/g, ''));
    return isNaN(n) ? '' : n;
};

// Formatted number input: shows formatted on blur, raw on focus
function NumInput({ value, onChange, className = '' }) {
    const [focused, setFocused] = React.useState(false);
    const [raw, setRaw] = React.useState(String(value ?? ''));

    React.useEffect(() => {
        if (!focused) setRaw(String(value ?? ''));
    }, [value, focused]);

    return (
        <input
            type="text"
            className={`h-7 text-right text-sm w-full bg-transparent outline-none focus:ring-1 focus:ring-slate-300 rounded px-2 ${className}`}
            value={focused ? raw : fmtInput(value)}
            onFocus={() => { setFocused(true); setRaw(String(value ?? '')); }}
            onBlur={() => { setFocused(false); onChange(parseNum(raw)); }}
            onChange={e => setRaw(e.target.value)}
        />
    );
}

const TD = ({ children, bold = false, className = '' }) => (
    <td className={`border border-slate-300 px-3 py-2 ${bold ? 'font-bold' : ''} ${className}`}>
        {children}
    </td>
);

const CalcCell = ({ value, className = '' }) => (
    <td className={`border border-slate-300 px-3 py-2 text-right font-semibold text-slate-800 bg-slate-50 ${className}`}>
        {fmt(value)}
    </td>
);

export default function ProjectSummaryTab() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [recordId, setRecordId] = useState(null);
    const [expectedMissingInvoice, setExpectedMissingInvoice] = useState('');
    const [missingInvoiceNote, setMissingInvoiceNote] = useState('Εξω Υποψία 250K');
    const [stockMaterial, setStockMaterial] = useState('28500');
    const [notes, setNotes] = useState({
        totalValueOfWorkPerformed: '',
        totalOutcome: '',
        totalInvestment: '',
        allocatedInvestmentCost: '',
        stockMaterial: '',
        profitLoss: '',
    });
    const [data, setData] = useState({
        totalValueOfWorkPerformed: 0,
        totalOutcome: 0,
        totalInvestment: 0,
        allocatedInvestmentCost: 0,
        stockMaterial: 0,
        totalIncomeReceived: 0,
        netCashFlow: 0,
    });

    useEffect(() => {
        loadProjectData();
    }, []);

    const loadProjectData = async () => {
        try {
            // Load Income Calculation summary
            const incomeRecords = await base44.entities.IncomeCalculation.list();
            const incomeMap = {};
            incomeRecords.forEach(r => { incomeMap[r.section] = r; });

            const totalValueOfWorkPerformed = incomeMap.summary?.data?.total_value_of_work_performed || 0;
            const totalIncomeReceived = incomeMap.summary?.data?.total_income_received || 0;

            // Load AllocationOfInvestment data - compute allocatedCost the same way AllocationOfInvestmentTab does
            // totalInvestment in P&L = Allocated Investment Cost from Allocation of Investment tab
            let totalInvestment = 0;
            let allocatedInvestmentCost = 0;

            // Default investment values (same as AllocationOfInvestmentTab defaults)
            let inv_pm_labour = 350000.00;
            let inv_material = 252908.13;
            let inv_assets = 450000.00;
            let inv_asset_depr_pct = 25;
            let inv_expected_income = 20294790.48;
            const inv_total_value_work = parseFloat(incomeMap.summary?.data?.total_value_of_work_performed) || 3273500.96;

            if (incomeMap.summary?.data?.expected_total_project_income) {
                inv_expected_income = parseFloat(incomeMap.summary.data.expected_total_project_income);
            }

            const inv_totalInvestment = inv_pm_labour + inv_material + inv_assets;
            const inv_assetAfterDepr = inv_assets * (inv_asset_depr_pct / 100);
            const inv_allocationPct = ((inv_totalInvestment - inv_assetAfterDepr) / inv_expected_income) * 100;
            const allocatedCost = (inv_allocationPct / 100) * inv_total_value_work;

            // P&L "Total Investment" = PM Labour + Material + Assets (same as Allocation of Investment tab)
            totalInvestment = inv_totalInvestment;
            allocatedInvestmentCost = allocatedCost;

            // Load Outcome Calculation - sum total outcome (from_software + not_in_software) per category
            const outcomeRecords = await base44.entities.OutcomeCalculation.list();
            let totalOutcome = 0;
            outcomeRecords.forEach(r => {
                // Total outcome = (from_software + not_in_software) for each category
                totalOutcome += ((parseFloat(r.pm_from_software) || 0) + (parseFloat(r.pm_not_in_software) || 0)) +
                               ((parseFloat(r.labour_from_software) || 0) + (parseFloat(r.labour_not_in_software) || 0)) +
                               ((parseFloat(r.assets_from_software) || 0) + (parseFloat(r.assets_not_in_software) || 0)) +
                               ((parseFloat(r.materials_from_software) || 0) + (parseFloat(r.materials_not_in_software) || 0)) +
                               ((parseFloat(r.other_from_software) || 0) + (parseFloat(r.other_not_in_software) || 0));
            });

            // Load saved editable fields from IncomeCalculation entity
            const summaryExtra = incomeMap['project_summary_extra'];
            if (summaryExtra?.data) {
                setExpectedMissingInvoice(summaryExtra.data.expected_missing_invoice ?? '');
                setMissingInvoiceNote(summaryExtra.data.missing_invoice_note ?? 'Εξω Υποψία 250K');
                setStockMaterial(summaryExtra.data.stock_material ?? '28500');
                setNotes(summaryExtra.data.notes ?? {
                    totalValueOfWorkPerformed: '',
                    totalOutcome: '',
                    totalInvestment: '',
                    allocatedInvestmentCost: '',
                    stockMaterial: '',
                    profitLoss: '',
                });
                setRecordId(summaryExtra.id);
            }

            // Calculate derived values
            const profitLoss = totalValueOfWorkPerformed - totalInvestment - totalOutcome;
            const netCashFlow = totalIncomeReceived + totalOutcome;

            setData({
                totalValueOfWorkPerformed,
                totalOutcome,
                totalInvestment,
                allocatedInvestmentCost,
                totalIncomeReceived,
                netCashFlow,
                profitLoss,
            });
        } catch (error) {
            console.error('Failed to load project data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const saveData = {
                section: 'project_summary_extra',
                data: {
                    expected_missing_invoice: expectedMissingInvoice,
                    missing_invoice_note: missingInvoiceNote,
                    stock_material: stockMaterial,
                    notes: notes,
                }
            };
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

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
    );

    return (
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">Project Summary</h2>
                <Button onClick={handleSave} disabled={saving} size="sm">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    Save Changes
                </Button>
            </div>

            {/* P&L Item */}
            <div>
                <h3 className="text-sm font-bold text-slate-700 mb-3">P&L Item</h3>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr>
                                <th className="border border-slate-300 px-3 py-2 bg-slate-100 font-semibold text-slate-700 text-left">Item</th>
                                <th className="border border-slate-300 px-3 py-2 bg-slate-100 font-semibold text-slate-700 text-right">Amount</th>
                                <th className="border border-slate-300 px-3 py-2 bg-slate-100 font-semibold text-slate-700 text-left">Note</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <TD bold>Total Value of Work Performed</TD>
                                <CalcCell value={data.totalValueOfWorkPerformed} />
                                <td className="border border-slate-300 px-2 py-1"><Input className="h-7 text-xs border-0 focus-visible:ring-1 w-full text-slate-500" value={notes.totalValueOfWorkPerformed} onChange={e => setNotes({...notes, totalValueOfWorkPerformed: e.target.value})} /></td>
                            </tr>
                            <tr>
                                <TD bold>Total Outcome</TD>
                                <CalcCell value={data.totalOutcome} />
                                <td className="border border-slate-300 px-2 py-1"><Input className="h-7 text-xs border-0 focus-visible:ring-1 w-full text-slate-500" value={notes.totalOutcome} onChange={e => setNotes({...notes, totalOutcome: e.target.value})} /></td>
                            </tr>
                            <tr>
                                <TD bold>Total Investment</TD>
                                <CalcCell value={data.totalInvestment} />
                                <td className="border border-slate-300 px-2 py-1"><Input className="h-7 text-xs border-0 focus-visible:ring-1 w-full text-slate-500" value={notes.totalInvestment} onChange={e => setNotes({...notes, totalInvestment: e.target.value})} /></td>
                            </tr>
                            <tr>
                                <TD bold>Allocated Investment Cost</TD>
                                <CalcCell value={data.allocatedInvestmentCost} />
                                <td className="border border-slate-300 px-2 py-1"><Input className="h-7 text-xs border-0 focus-visible:ring-1 w-full text-slate-500" value={notes.allocatedInvestmentCost} onChange={e => setNotes({...notes, allocatedInvestmentCost: e.target.value})} /></td>
                            </tr>
                            <tr>
                                <TD bold>Expected Missing Invoice</TD>
                                <td className="border border-slate-300 px-2 py-1">
                                    <NumInput value={expectedMissingInvoice} onChange={setExpectedMissingInvoice} />
                                </td>
                                <td className="border border-slate-300 px-2 py-1">
                                    <Input
                                        type="text"
                                        className="h-7 text-xs border-0 focus-visible:ring-1 w-full text-slate-500"
                                        value={missingInvoiceNote}
                                        onChange={e => setMissingInvoiceNote(e.target.value)}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <TD bold>Stock Material</TD>
                                <td className="border border-slate-300 px-2 py-1">
                                    <NumInput value={stockMaterial} onChange={setStockMaterial} />
                                </td>
                                <td className="border border-slate-300 px-2 py-1"><Input className="h-7 text-xs border-0 focus-visible:ring-1 w-full text-slate-500" value={notes.stockMaterial} onChange={e => setNotes({...notes, stockMaterial: e.target.value})} /></td>
                            </tr>
                            <tr className="bg-blue-50">
                                <TD bold>Profit / Loss</TD>
                                <CalcCell value={data.profitLoss} className="bg-blue-50" />
                                <td className="border border-slate-300 px-2 py-1 bg-blue-50"><Input className="h-7 text-xs border-0 focus-visible:ring-1 w-full text-slate-500 bg-blue-50" value={notes.profitLoss} onChange={e => setNotes({...notes, profitLoss: e.target.value})} /></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Cash Flow */}
            <div>
                <h3 className="text-sm font-bold text-slate-700 mb-3">Πίνακας 10 — Cash Flow</h3>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr>
                                <th className="border border-slate-300 px-3 py-2 bg-slate-100 font-semibold text-slate-700 text-left">Category</th>
                                <th className="border border-slate-300 px-3 py-2 bg-slate-100 font-semibold text-slate-700 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <TD>Total Income Received</TD>
                                <CalcCell value={data.totalIncomeReceived} />
                            </tr>
                            <tr>
                                <TD>Total Outcome</TD>
                                <CalcCell value={data.totalOutcome} />
                            </tr>
                            <tr className="bg-slate-100 font-bold">
                                <TD bold>Net Cash Flow</TD>
                                <CalcCell value={data.netCashFlow} className="font-bold" />
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}