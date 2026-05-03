import React, { useState, useEffect } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';

// ── Helpers ───────────────────────────────────────────────────────────
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

// ── Cell Components ───────────────────────────────────────────────────
const CalcCell = ({ value }) => (
    <td className="border border-slate-300 px-3 py-2 text-right text-sm bg-slate-50 font-semibold text-slate-800">
        {fmt(value)}
    </td>
);

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

const LabelCell = ({ children, bold, sub, colSpan }) => (
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

// ── Main Component ────────────────────────────────────────────────────
export default function IncomeSummaryTab() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [summaryRecordId, setSummaryRecordId] = useState(null);

    // Editable values
    const [summaryData, setSummaryData] = useState({
        certified_works: 0,
        advance_payment: 0,
    });

    // Calculated values pulled from IncomeCalculation
    const [calcValues, setCalcValues] = useState({
        totalIncomeReceived: 0,
        totalIncomeNotEarned: 0,
        totalValueOfWorkPerformed: 0,
        certifiedNotPaid: 0,
        totalNotCertified: 0,
        fabricationIncome: 0,
        extraWorksNotApproved: 0,
        advancePaymentRemaining: 0,
    });

    // Notes
    const [notes, setNotes] = useState({
        certified_works: '',
        total_income_received: '',
        income_not_earned_certified: '',
        income_not_earned_not_certified: '',
        income_not_earned_fabrication: '',
        income_not_earned_extra: '',
        total_income_not_earned: '',
        total_value_work: '',
    });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const incomeRecords = await base44.entities.IncomeCalculation.list();

            // Load summary record
            const summaryRecord = incomeRecords.find(r => (r.data?.section || r.section) === 'summary');
            if (summaryRecord) {
                setSummaryRecordId(summaryRecord.id);
                const saved = summaryRecord.data?.data || {};
                if (saved.investment) {
                    setSummaryData(prev => ({ ...prev, ...saved.investment }));
                }
                if (saved.notes) {
                    setNotes(prev => ({ ...prev, ...saved.notes }));
                }
            }

            // Load calculated values from IncomeCalculation summary
            const summaryData = incomeRecords.find(r => (r.data?.section || r.section) === 'summary');
            if (summaryData?.data?.data) {
                const d = summaryData.data.data;
                setCalcValues({
                    totalIncomeReceived: parseNum(d.total_income_received || 0),
                    totalIncomeNotEarned: parseNum(d.total_income_not_earned || 0),
                    totalValueOfWorkPerformed: parseNum(d.total_value_of_work_performed || 0),
                    certifiedNotPaid: parseNum(d.certified_not_paid || 0),
                    totalNotCertified: parseNum(d.total_not_certified || 0),
                    fabricationIncome: parseNum(d.fabrication_income || 0),
                    extraWorksNotApproved: parseNum(d.extra_works_not_approved || 0),
                    advancePaymentRemaining: parseNum(d.advance_payment_remaining || 0),
                });
            }
        } catch (err) {
            console.error('IncomeSummaryTab load error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                data: {
                    section: 'income_summary',
                    data: { investment: summaryData, notes },
                }
            };
            if (summaryRecordId) {
                await base44.entities.IncomeCalculation.update(summaryRecordId, payload);
            } else {
                const rec = await base44.entities.IncomeCalculation.create(payload);
                setSummaryRecordId(rec.id);
            }
        } catch (err) {
            console.error('IncomeSummaryTab save error:', err);
        } finally {
            setSaving(false);
        }
    };

    const setField = (key, val) => setSummaryData(prev => ({ ...prev, [key]: val }));
    const setNote = (key, val) => setNotes(prev => ({ ...prev, [key]: val }));

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
    );

    return (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800">Income Summary</h2>
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
                            <th className="border border-slate-300 px-3 py-2 bg-slate-100 font-semibold text-slate-700 text-xs text-left">Category</th>
                            <th className="border border-slate-300 px-3 py-2 bg-slate-100 font-semibold text-slate-700 text-xs text-right">Amount</th>
                            <th className="border border-slate-300 px-3 py-2 bg-slate-100 font-semibold text-slate-700 text-xs text-left">Note</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* ── Income Section ── */}
                        <tr className="bg-slate-50">
                            <LabelCell bold>Income</LabelCell>
                            <EmptyCell /><EmptyCell />
                        </tr>
                        <tr>
                            <LabelCell>Certified Works</LabelCell>
                            <EditCell value={summaryData.certified_works} onChange={v => setField('certified_works', v)} />
                            <NoteCell value={notes.certified_works} onChange={v => setNote('certified_works', v)} />
                        </tr>
                        <tr>
                            <LabelCell>Advance Payment (Remaining)</LabelCell>
                            <CalcCell value={calcValues.advancePaymentRemaining} />
                            <NoteCell value={notes.total_income_received} onChange={v => setNote('total_income_received', v)} />
                        </tr>
                        <tr className="bg-blue-50">
                            <LabelCell bold>Total Income Received</LabelCell>
                            <CalcCell value={calcValues.totalIncomeReceived} />
                            <td className="border border-slate-300 px-3 py-1 text-xs text-slate-400 italic bg-blue-50">= Certified Works + Advance Payment</td>
                        </tr>

                        {/* ── Income Not Earned Type ── */}
                        <tr>
                            <LabelCell colSpan={3} sub>Income Not Earned Type</LabelCell>
                        </tr>

                        <tr>
                            <LabelCell>Certified – As per Contract but Not Paid</LabelCell>
                            <CalcCell value={calcValues.certifiedNotPaid} />
                            <NoteCell value={notes.income_not_earned_certified} onChange={v => setNote('income_not_earned_certified', v)} />
                        </tr>

                        <tr>
                            <LabelCell>Not Certified – As per Contract</LabelCell>
                            <CalcCell value={calcValues.totalNotCertified} />
                            <td className="border border-slate-300 px-3 py-1 text-xs text-slate-400 italic">= Not Delivered + Other Works Not Claimed + Retention 5%</td>
                        </tr>

                        <tr>
                            <LabelCell>Fabrication Income</LabelCell>
                            <CalcCell value={calcValues.fabricationIncome} />
                            <NoteCell value={notes.income_not_earned_fabrication} onChange={v => setNote('income_not_earned_fabrication', v)} />
                        </tr>

                        <tr>
                            <LabelCell>Extra Works Income – Not Approved</LabelCell>
                            <CalcCell value={calcValues.extraWorksNotApproved} />
                            <NoteCell value={notes.income_not_earned_extra} onChange={v => setNote('income_not_earned_extra', v)} />
                        </tr>

                        <tr className="bg-blue-50">
                            <LabelCell bold>Total Income Not Earned</LabelCell>
                            <CalcCell value={calcValues.totalIncomeNotEarned} />
                            <td className="border border-slate-300 px-3 py-1 text-xs text-slate-400 italic bg-blue-50">= Sum of above categories</td>
                        </tr>

                        {/* ── Total Value of Work Performed ── */}
                        <tr className="bg-green-50">
                            <LabelCell bold>Total Value of Work Performed</LabelCell>
                            <CalcCell value={calcValues.totalValueOfWorkPerformed} />
                            <td className="border border-slate-300 px-3 py-1 text-xs text-slate-400 italic bg-green-50">= Total Income Received + Total Income Not Earned</td>
                        </tr>

                    </tbody>
                </table>
            </div>
        </div>
    );
}