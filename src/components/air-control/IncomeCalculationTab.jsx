import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { fmt, parseNum, sum } from './income/incomeUtils';
import SectionHeader from './income/SectionHeader';
import CellInput from './income/CellInput';

// ─── Defaults ────────────────────────────────────────────────────────────────
const DEFAULT_ASSUMPTIONS = {
    pct_100: 1.0,
    pct_60: 0.6,
    pct_amco_100: 1.0,
    pct_amco_60: 0.6,
    retention_pct: 0.05,
    advance_adj_pct: 0.35,
};

const DEFAULT_CERTIFIED = { payments: [{ description: 'Payment 1', batch: 'Batch 1', total100: '', total60: '', ac100: '', ac60: '', amco100: '', amco60: '' }] };
const DEFAULT_ADVANCE = { payments: [{ description: 'Advance Payment 1', label: 'Advance Payment', total: '' }] };

const DEFAULT_SHELTER_TYPES = [
    { key: 'type_a', label: 'Type A', unit_rate: 1467, total_qty: 109, approved_qty: 0, jv_rate: 314.71, extra_rate: 0, roofing: 0, earthing: 94.78, stickers: 39.10 },
    { key: 'type_b', label: 'Type B', unit_rate: 2117, total_qty: 315, approved_qty: 0, jv_rate: 950.09, extra_rate: 36.72, roofing: 140.40, earthing: 94.78, stickers: 39.10 },
    { key: 'type_c', label: 'Type C', unit_rate: 3561, total_qty: 178, approved_qty: 0, jv_rate: 1707.90, extra_rate: 67.52, roofing: 359.85, earthing: 94.78, stickers: 39.10 },
    { key: 'refurbished', label: 'Refurbished', unit_rate: 2650, total_qty: 130, approved_qty: 0, jv_rate: 0, extra_rate: 0, roofing: 0, earthing: 0, stickers: 0 },
    { key: 'excavation', label: 'Excavation', unit_rate: 1412, total_qty: 90, approved_qty: 0, jv_rate: 0, extra_rate: 0, roofing: 0, earthing: 0, stickers: 0 },
];
const DEFAULT_REMOVAL = { unit_rate: 276, approved_qty: 0 };
const DEFAULT_OTHER_NOT_CLAIMED = { months: 0, monthly_fee: 0, samples: 0, claim_inspections: 0 };

// ─── Table helpers ────────────────────────────────────────────────────────────
const TD = ({ children, className = '', bold = false, bg = '' }) => (
    <td className={`border border-slate-300 px-2 py-1 text-xs ${bold ? 'font-bold' : ''} ${bg} ${className}`}>
        {children}
    </td>
);
const TH = ({ children, className = '' }) => (
    <th className={`border border-slate-300 px-2 py-2 text-xs font-semibold bg-slate-100 text-slate-700 ${className}`}>
        {children}
    </th>
);
const CalcCell = ({ value, className = '', colSpan }) => (
    <td colSpan={colSpan} className={`border border-slate-300 px-2 py-1 text-xs text-right font-semibold text-slate-800 bg-white ${className}`}>
        {fmt(value)}
    </td>
);
const InputCell = ({ value, onChange, className = '', type = 'number', align = 'right' }) => (
    <td className={`border border-slate-300 p-0 ${className}`}>
        <CellInput value={value} onChange={onChange} type={type} align={align} />
    </td>
);

export default function IncomeCalculationTab() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [records, setRecords] = useState({});

    // ── State sections ────────────────────────────────────────────────────────
    const [assumptions, setAssumptions] = useState(DEFAULT_ASSUMPTIONS);
    const [certified, setCertified] = useState(DEFAULT_CERTIFIED);
    const [advance, setAdvance] = useState(DEFAULT_ADVANCE);
    const [shelterTypes, setShelterTypes] = useState(DEFAULT_SHELTER_TYPES);
    const [removal, setRemoval] = useState(DEFAULT_REMOVAL);
    const [otherNotClaimed, setOtherNotClaimed] = useState(DEFAULT_OTHER_NOT_CLAIMED);

    // ── Load ──────────────────────────────────────────────────────────────────
    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        setLoading(true);
        const all = await base44.entities.IncomeCalculation.list();
        const map = {};
        all.forEach(r => { map[r.section] = r; });
        setRecords(map);
        if (map.assumptions?.data) setAssumptions({ ...DEFAULT_ASSUMPTIONS, ...map.assumptions.data });
        if (map.certified?.data) setCertified({ ...DEFAULT_CERTIFIED, ...map.certified.data });
        if (map.advance?.data) setAdvance({ ...DEFAULT_ADVANCE, ...map.advance.data });
        if (map.shelter_types?.data) setShelterTypes(map.shelter_types.data.types || DEFAULT_SHELTER_TYPES);
        if (map.removal?.data) setRemoval({ ...DEFAULT_REMOVAL, ...map.removal.data });
        if (map.other_not_claimed?.data) setOtherNotClaimed({ ...DEFAULT_OTHER_NOT_CLAIMED, ...map.other_not_claimed.data });
        setLoading(false);
    };

    const saveSection = async (section, data) => {
        const existing = records[section];
        if (existing) {
            await base44.entities.IncomeCalculation.update(existing.id, { data });
        } else {
            const created = await base44.entities.IncomeCalculation.create({ section, data });
            setRecords(prev => ({ ...prev, [section]: created }));
        }
    };

    const handleSave = async () => {
        setSaving(true);
        await Promise.all([
            saveSection('assumptions', assumptions),
            saveSection('certified', certified),
            saveSection('advance', advance),
            saveSection('shelter_types', { types: shelterTypes }),
            saveSection('removal', removal),
            saveSection('other_not_claimed', otherNotClaimed),
        ]);
        await loadAll();
        setSaving(false);
    };

    // ── Certified helpers ─────────────────────────────────────────────────────
    const updateCertifiedPayment = (idx, field, val) => {
        setCertified(prev => {
            const payments = [...prev.payments];
            payments[idx] = { ...payments[idx], [field]: val };
            return { ...prev, payments };
        });
    };
    const addCertifiedPayment = () => {
        setCertified(prev => ({
            ...prev,
            payments: [...prev.payments, { description: `Payment ${prev.payments.length + 1}`, batch: '', total100: '', total60: '', ac100: '', ac60: '', amco100: '', amco60: '' }]
        }));
    };
    const removeCertifiedPayment = (idx) => {
        setCertified(prev => ({ ...prev, payments: prev.payments.filter((_, i) => i !== idx) }));
    };

    // ── Advance helpers ───────────────────────────────────────────────────────
    const updateAdvancePayment = (idx, field, val) => {
        setAdvance(prev => {
            const payments = [...prev.payments];
            payments[idx] = { ...payments[idx], [field]: val };
            return { ...prev, payments };
        });
    };
    const addAdvancePayment = () => {
        setAdvance(prev => ({
            ...prev,
            payments: [...prev.payments, { description: `Advance Payment ${prev.payments.length + 1}`, label: 'Advance Payment', total: '' }]
        }));
    };

    // ── Shelter helpers ───────────────────────────────────────────────────────
    const updateShelter = (idx, field, val) => {
        setShelterTypes(prev => {
            const arr = [...prev];
            arr[idx] = { ...arr[idx], [field]: val };
            return arr;
        });
    };

    // ─── DERIVED CALCULATIONS ─────────────────────────────────────────────────

    // Assumptions
    const pct100 = parseNum(assumptions.pct_100);
    const pct60 = parseNum(assumptions.pct_60);
    const retentionPct = parseNum(assumptions.retention_pct);
    const advAdjPct = parseNum(assumptions.advance_adj_pct);

    // 3. JV Payments – Certified Works (all columns manually editable)
    const certPayments = certified.payments.map(p => ({
        ...p,
        total100: parseNum(p.total100),
        total60: parseNum(p.total60),
        ac100: parseNum(p.ac100),
        ac60: parseNum(p.ac60),
        amco100: parseNum(p.amco100),
        amco60: parseNum(p.amco60),
    }));
    const totalCertTotal100 = certPayments.reduce((s, p) => s + p.total100, 0);
    const totalCertTotal60 = certPayments.reduce((s, p) => s + p.total60, 0);
    const totalCertifiedWorks = totalCertTotal100 + totalCertTotal60;
    const grandTotalAC100 = certPayments.reduce((s, p) => s + p.ac100, 0);
    const grandTotalAC60 = certPayments.reduce((s, p) => s + p.ac60, 0);
    const grandTotalAmco100 = certPayments.reduce((s, p) => s + p.amco100, 0);
    const grandTotalAmco60 = certPayments.reduce((s, p) => s + p.amco60, 0);
    const grandTotalAC = grandTotalAC100 + grandTotalAC60;
    const grandTotalAmco = grandTotalAmco100 + grandTotalAmco60;

    // JV Advance Payments
    const advPayments = advance.payments.map(p => ({ ...p, total: parseNum(p.total) }));
    const totalAdvancePayment = advPayments.reduce((s, p) => s + p.total, 0);

    // 1. Income Received
    const incomeAdvancePayment = totalAdvancePayment;
    const incomeCertifiedWorks = grandTotalAC;
    const totalIncomeReceived = incomeAdvancePayment + incomeCertifiedWorks;

    // Advance payment remaining
    const certWorksAC60 = grandTotalAC60; // sum of manually-entered AC 60% column
    const certAdjustment = (certWorksAC60 / (pct60 || 1)) * advAdjPct;
    const advancePaymentRemaining = totalAdvancePayment + certAdjustment;

    // 7. Not Delivered Works
    const removalTotalQty = shelterTypes
        .filter(s => ['type_a', 'type_b', 'type_c', 'excavation'].includes(s.key))
        .reduce((s, t) => s + parseNum(t.total_qty), 0);
    const removalRemainingQty = removalTotalQty - parseNum(removal.approved_qty);
    const removalTotal = removalRemainingQty * parseNum(removal.unit_rate);

    const shelterNotDelivered = shelterTypes.map(t => {
        const remaining = parseNum(t.total_qty) - parseNum(t.approved_qty);
        return { ...t, remaining, notDeliveredTotal: remaining * parseNum(t.unit_rate) };
    });
    const totalNotDeliveredWorks = shelterNotDelivered.reduce((s, t) => s + t.notDeliveredTotal, 0) + removalTotal;

    // 8. Other Works Not Claimed
    const monthlyFees = parseNum(otherNotClaimed.months) * parseNum(otherNotClaimed.monthly_fee);
    const totalOtherNotClaimed = monthlyFees + parseNum(otherNotClaimed.samples) + parseNum(otherNotClaimed.claim_inspections);

    // 6. Retention
    const totalCertWorksAC60 = certWorksAC60; // received only for now (could add unpaid)
    const totalRetention5 = (totalCertWorksAC60 / (pct60 || 1)) * retentionPct;

    // 5. Not Certified as per Contract
    const totalNotCertified = totalRetention5 + totalNotDeliveredWorks + totalOtherNotClaimed;

    // 9. Fabrication Expected Income
    const fabrication = shelterTypes.filter(t => ['type_a', 'type_b', 'type_c'].includes(t.key)).map(t => ({
        ...t,
        fabTotal: parseNum(t.total_qty) * parseNum(t.jv_rate),
    }));
    const totalFabricationIncome = fabrication.reduce((s, t) => s + t.fabTotal, 0);

    // 10. Fabrication Extra Expected Income
    const fabricationExtra = shelterTypes.filter(t => ['type_a', 'type_b', 'type_c'].includes(t.key)).map(t => ({
        ...t,
        extraTotal: parseNum(t.total_qty) * parseNum(t.extra_rate),
    }));
    const totalFabricationExtraIncome = fabricationExtra.reduce((s, t) => s + t.extraTotal, 0);

    // 11. Other Extra Works Income
    const otherExtra = shelterTypes.filter(t => ['type_a', 'type_b', 'type_c'].includes(t.key)).map(t => ({
        ...t,
        otherTotal: parseNum(t.total_qty) * (parseNum(t.roofing) + parseNum(t.earthing) + parseNum(t.stickers)),
    }));
    const totalOtherExtraIncome = otherExtra.reduce((s, t) => s + t.otherTotal, 0);

    const totalExtraWorksNotApproved = totalFabricationExtraIncome + totalOtherExtraIncome;

    // 2. Income Not Earned
    const certifiedNotPaid = 0; // manual for now – can be linked to an unpaid certified section
    const totalIncomeNotEarned = certifiedNotPaid + totalNotCertified + totalFabricationIncome + totalExtraWorksNotApproved;

    // 4. Value of Work Performed
    const totalValueOfWorkPerformed = totalIncomeReceived + totalIncomeNotEarned + advancePaymentRemaining;

    // 12. Control Checks
    const check1OK = Math.abs((grandTotalAC + grandTotalAmco) - (totalAdvancePayment + totalCertifiedWorks)) < 0.01;
    const check2OK = Math.abs(totalIncomeReceived - (incomeAdvancePayment + incomeCertifiedWorks)) < 0.01;
    const check3OK = Math.abs(totalIncomeNotEarned - (certifiedNotPaid + totalNotCertified + totalFabricationIncome + totalExtraWorksNotApproved)) < 0.01;
    const check4OK = Math.abs(totalValueOfWorkPerformed - (totalIncomeReceived + totalIncomeNotEarned + advancePaymentRemaining)) < 0.01;

    const CheckBadge = ({ ok }) => (
        <span className={`px-2 py-0.5 rounded text-xs font-bold ${ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {ok ? 'OK' : 'ERROR'}
        </span>
    );

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
    );

    return (
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">Income Calculation</h2>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                    Save All
                </Button>
            </div>

            {/* ── Assumptions ───────────────────────────────────────────────────── */}
            <div>
                <h3 className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Assumptions / Percentage References</h3>
                <table className="text-sm border-collapse">
                    <thead>
                        <tr>
                            <TH>Parameter</TH>
                            <TH>Value</TH>
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            ['AirControl 100%', 'pct_100'],
                            ['AirControl 60%', 'pct_60'],
                            ['Amco 100%', 'pct_amco_100'],
                            ['Amco 60%', 'pct_amco_60'],
                            ['Retention %', 'retention_pct'],
                            ['Advance Adj %', 'advance_adj_pct'],
                        ].map(([label, key]) => (
                            <tr key={key}>
                                <TD>{label}</TD>
                                <InputCell value={assumptions[key]} onChange={v => setAssumptions(p => ({ ...p, [key]: v }))} />
                            </tr>
                        ))}
                    </tbody>
                </table>
                <p className="text-xs text-slate-400 mt-1">Blue cells = manual input. All formulas reference these values.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* LEFT COLUMN */}
                <div className="space-y-8">

                    {/* ── Section 1: Income Received ───────────────────────────────── */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 mb-2">Πίνακας 5 — Income</h3>
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr><SectionHeader title="Income Type" /></tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <TD>Advance Payment</TD>
                                    <CalcCell value={incomeAdvancePayment} />
                                </tr>
                                <tr>
                                    <TD>Certified Works</TD>
                                    <CalcCell value={incomeCertifiedWorks} />
                                </tr>
                                <tr className="bg-blue-50">
                                    <TD bold>Total Income Received</TD>
                                    <CalcCell value={totalIncomeReceived} className="font-bold bg-blue-50" />
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* ── Section 2: Income Not Earned ─────────────────────────────── */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 mb-2">Πίνακας 6 — Income Not Earned</h3>
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr><SectionHeader title="Income Not Earned Type" /></tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <TD>Certified – As per Contract but Not Paid</TD>
                                    <CalcCell value={certifiedNotPaid} />
                                </tr>
                                <tr>
                                    <TD>Not Certified – As per Contract</TD>
                                    <CalcCell value={totalNotCertified} />
                                </tr>
                                <tr>
                                    <TD>Fabrication</TD>
                                    <CalcCell value={totalFabricationIncome} />
                                </tr>
                                <tr>
                                    <TD>Extra Works – Not Approved</TD>
                                    <CalcCell value={totalExtraWorksNotApproved} />
                                </tr>
                                <tr className="bg-blue-50">
                                    <TD bold>Total Income Not Earned</TD>
                                    <CalcCell value={totalIncomeNotEarned} className="font-bold bg-blue-50" />
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* ── Section 4: Value of Work Performed ───────────────────────── */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 mb-2">Πίνακας 7 — Value of Work Performed</h3>
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr><SectionHeader title="Value of Work Performed" /></tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <TD>Total Income Received</TD>
                                    <CalcCell value={totalIncomeReceived} />
                                </tr>
                                <tr>
                                    <TD>Total Income Not Earned</TD>
                                    <CalcCell value={totalIncomeNotEarned} />
                                </tr>
                                <tr>
                                    <TD>Advance Payment (Remaining)</TD>
                                    <CalcCell value={advancePaymentRemaining} />
                                </tr>
                                <tr className="bg-green-50">
                                    <TD bold>Total Value of Work Performed</TD>
                                    <CalcCell value={totalValueOfWorkPerformed} className="font-bold bg-green-50" />
                                </tr>
                            </tbody>
                        </table>
                        <p className="text-xs text-slate-400 mt-1">
                            Advance Payment Remaining = Total Advance + (Certified Works 60% AirControl / {pct60} × {advAdjPct})
                        </p>
                    </div>

                    {/* ── Section 5: Not Certified As Per Contract ──────────────────── */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 mb-2">Not Certified – As per Contract</h3>
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr><TH className="text-left">Category</TH><TH>Value</TH></tr>
                            </thead>
                            <tbody>
                                <tr><TD>Retention 5%</TD><CalcCell value={totalRetention5} /></tr>
                                <tr><TD>Not Delivered Works</TD><CalcCell value={totalNotDeliveredWorks} /></tr>
                                <tr><TD>Other Works Not Claimed</TD><CalcCell value={totalOtherNotClaimed} /></tr>
                                <tr className="bg-slate-50"><TD bold>Total</TD><CalcCell value={totalNotCertified} className="font-bold" /></tr>
                            </tbody>
                        </table>
                    </div>

                    {/* ── Section 8: Other Works Not Claimed ───────────────────────── */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 mb-2">Other Works Not Claimed</h3>
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr><TH className="text-left">Description</TH><TH>Value</TH></tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <TD>Number of Months</TD>
                                    <InputCell value={otherNotClaimed.months} onChange={v => setOtherNotClaimed(p => ({ ...p, months: v }))} />
                                </tr>
                                <tr>
                                    <TD>Monthly Fee</TD>
                                    <InputCell value={otherNotClaimed.monthly_fee} onChange={v => setOtherNotClaimed(p => ({ ...p, monthly_fee: v }))} />
                                </tr>
                                <tr>
                                    <TD>Monthly Fees (calculated)</TD>
                                    <CalcCell value={monthlyFees} />
                                </tr>
                                <tr>
                                    <TD>Samples</TD>
                                    <InputCell value={otherNotClaimed.samples} onChange={v => setOtherNotClaimed(p => ({ ...p, samples: v }))} />
                                </tr>
                                <tr>
                                    <TD>Claim for Inspections</TD>
                                    <InputCell value={otherNotClaimed.claim_inspections} onChange={v => setOtherNotClaimed(p => ({ ...p, claim_inspections: v }))} />
                                </tr>
                                <tr className="bg-slate-50">
                                    <TD bold>Total Other Works Not Claimed</TD>
                                    <CalcCell value={totalOtherNotClaimed} className="font-bold" />
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* ── Section 6: Retention ─────────────────────────────────────── */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 mb-2">Retention</h3>
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr><TH className="text-left">Description</TH><TH>Value</TH></tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <TD>Total Certified Works 60% AirControl</TD>
                                    <CalcCell value={totalCertWorksAC60} />
                                </tr>
                                <tr>
                                    <TD>Total Retention {(retentionPct * 100).toFixed(0)}%
                                        <span className="text-slate-400 ml-1 text-xs">(÷{pct60}×{retentionPct})</span>
                                    </TD>
                                    <CalcCell value={totalRetention5} />
                                </tr>
                            </tbody>
                        </table>
                    </div>

                </div>

                {/* RIGHT COLUMN */}
                <div className="space-y-8">

                    {/* ── JV Payments – Certified Works ────────────────────────────── */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 mb-2">JV Payments – Certified Works</h3>
                        <div className="overflow-x-auto">
                            <table className="border-collapse text-xs w-full">
                                <thead>
                                    <tr>
                                        <th rowSpan={2} className="border border-slate-300 px-2 py-2 text-xs font-semibold bg-slate-100 text-slate-700 align-middle">Description</th>
                                        <th rowSpan={2} className="border border-slate-300 px-2 py-2 text-xs font-semibold bg-slate-100 text-slate-700 align-middle">Batch</th>
                                        <th colSpan={2} className="border border-slate-300 px-2 py-2 text-xs font-semibold bg-slate-100 text-slate-700 text-center">Total</th>
                                        <th colSpan={2} className="border border-slate-300 px-2 py-2 text-xs font-semibold bg-slate-100 text-slate-700 text-center">AirControl</th>
                                        <th colSpan={2} className="border border-slate-300 px-2 py-2 text-xs font-semibold bg-slate-100 text-slate-700 text-center">Amco</th>
                                        <th rowSpan={2} className="border border-slate-300 px-2 py-2 text-xs font-semibold bg-slate-100 text-slate-700 align-middle"></th>
                                    </tr>
                                    <tr>
                                        <TH>100%</TH><TH>60%</TH>
                                        <TH>100%</TH><TH>60%</TH>
                                        <TH>100%</TH><TH>60%</TH>
                                    </tr>
                                </thead>
                                <tbody>
                                    {certPayments.map((p, idx) => (
                                        <tr key={idx}>
                                            <InputCell value={certified.payments[idx].description} onChange={v => updateCertifiedPayment(idx, 'description', v)} className="min-w-[120px]" type="text" align="left" />
                                            <InputCell value={certified.payments[idx].batch} onChange={v => updateCertifiedPayment(idx, 'batch', v)} type="text" align="left" />
                                            <InputCell value={certified.payments[idx].total100} onChange={v => updateCertifiedPayment(idx, 'total100', v)} />
                                            <InputCell value={certified.payments[idx].total60} onChange={v => updateCertifiedPayment(idx, 'total60', v)} />
                                            <InputCell value={certified.payments[idx].ac100} onChange={v => updateCertifiedPayment(idx, 'ac100', v)} />
                                            <InputCell value={certified.payments[idx].ac60} onChange={v => updateCertifiedPayment(idx, 'ac60', v)} />
                                            <InputCell value={certified.payments[idx].amco100} onChange={v => updateCertifiedPayment(idx, 'amco100', v)} />
                                            <InputCell value={certified.payments[idx].amco60} onChange={v => updateCertifiedPayment(idx, 'amco60', v)} />
                                            <td className="border border-slate-300 px-1 py-1 text-center">
                                                <button onClick={() => removeCertifiedPayment(idx)} className="text-red-400 hover:text-red-600 text-xs font-bold">×</button>
                                            </td>
                                        </tr>
                                    ))}
                                    <tr>
                                        <td colSpan={9} className="border border-slate-300 px-2 py-1">
                                            <button onClick={addCertifiedPayment} className="text-xs text-blue-600 hover:underline">+ Add payment</button>
                                        </td>
                                    </tr>
                                    {/* Total Certified Works — sums all 6 numeric columns */}
                                    <tr className="bg-slate-50 font-bold">
                                        <TD bold colSpan={2}>Total Certified Works</TD>
                                        <CalcCell value={totalCertTotal100} />
                                        <CalcCell value={totalCertTotal60} />
                                        <CalcCell value={grandTotalAC100} />
                                        <CalcCell value={grandTotalAC60} />
                                        <CalcCell value={grandTotalAmco100} />
                                        <CalcCell value={grandTotalAmco60} />
                                        <TD></TD>
                                    </tr>
                                    {/* Grand Total JV = Total 100% + Total 60% — value in col 3 (Total 100%) spanning 2 */}
                                    <tr className="bg-slate-100 font-bold">
                                        <TD bold colSpan={2}>Grand Total JV</TD>
                                        <CalcCell value={totalCertTotal100 + totalCertTotal60} className="font-bold" colSpan={2} />
                                        <TD colSpan={4}></TD>
                                        <TD></TD>
                                    </tr>
                                    {/* Grand Total AirControl = AC100 + AC60 — value in col 5 (AC 100%) spanning 2 */}
                                    <tr className="bg-slate-100 font-bold">
                                        <TD bold colSpan={2}>Grand Total AirControl</TD>
                                        <TD colSpan={2}></TD>
                                        <CalcCell value={grandTotalAC} className="font-bold" colSpan={2} />
                                        <TD colSpan={2}></TD>
                                        <TD></TD>
                                    </tr>
                                    {/* Grand Total Amco = Amco100 + Amco60 — value in col 7 (Amco 100%) spanning 2 */}
                                    <tr className="bg-slate-100 font-bold">
                                        <TD bold colSpan={2}>Grand Total Amco</TD>
                                        <TD colSpan={4}></TD>
                                        <CalcCell value={grandTotalAmco} className="font-bold" colSpan={2} />
                                        <TD></TD>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ── JV Advance Payments ───────────────────────────────────────── */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 mb-2">JV Advance Payments</h3>
                        <div className="overflow-x-auto">
                            <table className="border-collapse text-xs w-full">
                                <thead>
                                    <tr>
                                        <TH>Description</TH><TH>Label</TH><TH>Total</TH>
                                        <TH>AirControl</TH><TH>Amco</TH>
                                    </tr>
                                </thead>
                                <tbody>
                                    {advPayments.map((p, idx) => (
                                        <tr key={idx}>
                                            <InputCell value={p.description} onChange={v => updateAdvancePayment(idx, 'description', v)} />
                                            <InputCell value={p.label} onChange={v => updateAdvancePayment(idx, 'label', v)} />
                                            <InputCell value={p.total} onChange={v => updateAdvancePayment(idx, 'total', v)} />
                                            <CalcCell value={p.total * pct100} />
                                            <CalcCell value={p.total * pct100} />
                                        </tr>
                                    ))}
                                    <tr>
                                        <td colSpan={5} className="border border-slate-300 px-2 py-1">
                                            <button onClick={addAdvancePayment} className="text-xs text-blue-600 hover:underline">+ Add advance payment</button>
                                        </td>
                                    </tr>
                                    <tr className="bg-slate-50 font-bold">
                                        <TD bold colSpan={2}>Total Advance Payment</TD>
                                        <CalcCell value={totalAdvancePayment} />
                                        <CalcCell value={totalAdvancePayment * pct100} />
                                        <CalcCell value={totalAdvancePayment * pct100} />
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        {/* Advance remaining breakdown */}
                        <div className="mt-2 p-3 bg-slate-50 rounded border border-slate-200 text-xs space-y-1">
                            <div className="font-semibold text-slate-700">Advance Payment (Remaining)</div>
                            <div className="flex justify-between"><span>Total Advance Payment</span><span>{fmt(totalAdvancePayment)}</span></div>
                            <div className="flex justify-between"><span>Total Certified Works 60%</span><span>{fmt(certWorksAC60)}</span></div>
                            <div className="flex justify-between text-slate-500 italic"><span>Adjustment (÷{pct60}×{advAdjPct})</span><span>{fmt(certAdjustment)}</span></div>
                            <div className="flex justify-between font-bold border-t border-slate-300 pt-1"><span>Advance Payment (Remaining)</span><span>{fmt(advancePaymentRemaining)}</span></div>
                        </div>
                    </div>

                    {/* ── Section 7: Not Delivered Works ───────────────────────────── */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 mb-2">Not Delivered Works</h3>
                        <div className="overflow-x-auto">
                            <table className="border-collapse text-xs w-full">
                                <thead>
                                    <tr>
                                        <TH>Type</TH>
                                        <TH>Unit Rate</TH>
                                        <TH>Total Qty</TH>
                                        <TH>Approved Qty</TH>
                                        <TH>Remaining Qty</TH>
                                        <TH>Total</TH>
                                    </tr>
                                </thead>
                                <tbody>
                                    {shelterNotDelivered.map((t, idx) => (
                                        <tr key={t.key}>
                                            <TD>{t.label}</TD>
                                            <InputCell value={shelterTypes[idx]?.unit_rate} onChange={v => updateShelter(idx, 'unit_rate', v)} />
                                            <InputCell value={shelterTypes[idx]?.total_qty} onChange={v => updateShelter(idx, 'total_qty', v)} />
                                            <InputCell value={shelterTypes[idx]?.approved_qty} onChange={v => updateShelter(idx, 'approved_qty', v)} />
                                            <CalcCell value={t.remaining} />
                                            <CalcCell value={t.notDeliveredTotal} />
                                        </tr>
                                    ))}
                                    {/* Removal row */}
                                    <tr>
                                        <TD>Removal</TD>
                                        <InputCell value={removal.unit_rate} onChange={v => setRemoval(p => ({ ...p, unit_rate: v }))} />
                                        <CalcCell value={removalTotalQty} />
                                        <InputCell value={removal.approved_qty} onChange={v => setRemoval(p => ({ ...p, approved_qty: v }))} />
                                        <CalcCell value={removalRemainingQty} />
                                        <CalcCell value={removalTotal} />
                                    </tr>
                                    <tr className="bg-slate-50 font-bold">
                                        <TD bold colSpan={5}>Total Not Delivered Works</TD>
                                        <CalcCell value={totalNotDeliveredWorks} className="font-bold" />
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ── Section 9: Fabrication Expected Income ───────────────────── */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 mb-2">Fabrication Expected Income</h3>
                        <table className="border-collapse text-xs w-full">
                            <thead>
                                <tr><TH>Type</TH><TH>QTY</TH><TH>JV Rate</TH><TH>Total</TH></tr>
                            </thead>
                            <tbody>
                                {fabrication.map((t, idx) => {
                                    const stIdx = shelterTypes.findIndex(s => s.key === t.key);
                                    return (
                                        <tr key={t.key}>
                                            <TD>{t.label}</TD>
                                            <CalcCell value={t.total_qty} />
                                            <InputCell value={shelterTypes[stIdx]?.jv_rate} onChange={v => updateShelter(stIdx, 'jv_rate', v)} />
                                            <CalcCell value={t.fabTotal} />
                                        </tr>
                                    );
                                })}
                                <tr className="bg-slate-50 font-bold">
                                    <TD bold colSpan={3}>Total Fabrication Expected Income</TD>
                                    <CalcCell value={totalFabricationIncome} className="font-bold" />
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* ── Section 10: Fabrication Extra Expected Income ─────────────── */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 mb-2">Fabrication Extra Expected Income</h3>
                        <table className="border-collapse text-xs w-full">
                            <thead>
                                <tr><TH>Type</TH><TH>QTY</TH><TH>Extra Rate</TH><TH>Total</TH></tr>
                            </thead>
                            <tbody>
                                {fabricationExtra.map((t, idx) => {
                                    const stIdx = shelterTypes.findIndex(s => s.key === t.key);
                                    return (
                                        <tr key={t.key}>
                                            <TD>{t.label}</TD>
                                            <CalcCell value={t.total_qty} />
                                            <InputCell value={shelterTypes[stIdx]?.extra_rate} onChange={v => updateShelter(stIdx, 'extra_rate', v)} />
                                            <CalcCell value={t.extraTotal} />
                                        </tr>
                                    );
                                })}
                                <tr className="bg-slate-50 font-bold">
                                    <TD bold colSpan={3}>Total Fabrication Extra Expected Income</TD>
                                    <CalcCell value={totalFabricationExtraIncome} className="font-bold" />
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* ── Section 11: Other Extra Works Income ─────────────────────── */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 mb-2">Other Extra Works Income</h3>
                        <table className="border-collapse text-xs w-full">
                            <thead>
                                <tr><TH>Type</TH><TH>QTY</TH><TH>Roofing</TH><TH>Earthing</TH><TH>Stickers</TH><TH>Total</TH></tr>
                            </thead>
                            <tbody>
                                {otherExtra.map((t, idx) => {
                                    const stIdx = shelterTypes.findIndex(s => s.key === t.key);
                                    return (
                                        <tr key={t.key}>
                                            <TD>{t.label}</TD>
                                            <CalcCell value={t.total_qty} />
                                            <InputCell value={shelterTypes[stIdx]?.roofing} onChange={v => updateShelter(stIdx, 'roofing', v)} />
                                            <InputCell value={shelterTypes[stIdx]?.earthing} onChange={v => updateShelter(stIdx, 'earthing', v)} />
                                            <InputCell value={shelterTypes[stIdx]?.stickers} onChange={v => updateShelter(stIdx, 'stickers', v)} />
                                            <CalcCell value={t.otherTotal} />
                                        </tr>
                                    );
                                })}
                                <tr className="bg-slate-50 font-bold">
                                    <TD bold colSpan={5}>Total Other Extra Works Income</TD>
                                    <CalcCell value={totalOtherExtraIncome} className="font-bold" />
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* ── Section 12: Control Checks ───────────────────────────────── */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-700 mb-2">Control Checks</h3>
                        <table className="border-collapse text-xs w-full">
                            <thead>
                                <tr><TH className="text-left">Check</TH><TH>Result</TH></tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <TD>Check 1: AirControl Total + Amco Total = Total Income</TD>
                                    <td className="border border-slate-300 px-2 py-1 text-center"><CheckBadge ok={check1OK} /></td>
                                </tr>
                                <tr>
                                    <TD>Check 2: Total Income Received = Advance + Certified Works</TD>
                                    <td className="border border-slate-300 px-2 py-1 text-center"><CheckBadge ok={check2OK} /></td>
                                </tr>
                                <tr>
                                    <TD>Check 3: Total Income Not Earned = sum of categories</TD>
                                    <td className="border border-slate-300 px-2 py-1 text-center"><CheckBadge ok={check3OK} /></td>
                                </tr>
                                <tr>
                                    <TD>Check 4: Value of Work Performed = Received + Not Earned + Advance Remaining</TD>
                                    <td className="border border-slate-300 px-2 py-1 text-center"><CheckBadge ok={check4OK} /></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                </div>
            </div>
        </div>
    );
}