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
        certifiedWorks: 0,
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
            console.log('[IncomeSummaryTab] Income records loaded:', incomeRecords);

            // Load summary record
            const summaryRecord = incomeRecords.find(r => (r.data?.section || r.section) === 'income_summary');
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

            // Load calculated values from IncomeCalculation 'summary' section
            const incSummary = incomeRecords.find(r => {
                const section = r.data?.section || r.section;
                return section === 'summary';
            });
            console.log('[IncomeSummaryTab] Full income summary record:', incSummary);
            console.log('[IncomeSummaryTab] incSummary.data:', incSummary?.data);
            console.log('[IncomeSummaryTab] incSummary.data.data:', incSummary?.data?.data);
            
            if (incSummary?.data?.data) {
                const d = incSummary.data.data;
                console.log('[IncomeSummaryTab] Using incSummary.data.data:', d);
                setCalcValues({
                    totalIncomeReceived: parseNum(d.total_income_received || 0),
                    totalIncomeNotEarned: parseNum(d.total_income_not_earned || 0),
                    totalValueOfWorkPerformed: parseNum(d.total_value_of_work_performed || 0),
                    certifiedNotPaid: parseNum(d.certified_not_paid || 0),
                    totalNotCertified: parseNum(d.total_not_certified || 0),
                    fabricationIncome: parseNum(d.fabrication_income || 0),
                    extraWorksNotApproved: parseNum(d.extra_works_not_approved || 0),
                    advancePaymentRemaining: parseNum(d.advance_payment_remaining || 0),
                    certifiedWorks: parseNum(d.certified_works || 0),
                });
            } else {
                console.log('[IncomeSummaryTab] No summary data found');
            }
        } catch (err) {
            console.error('IncomeSummaryTab load error:', err);
        }
        setLoading(false);
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
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr>
                            <th className="border border-slate-300 px-3 py-2 bg-slate-100 font-semibold text-slate-700 text-xs text-left">Category</th>
                            <th className="border border-slate-300 px-3 py-2 bg-slate-100 font-semibold text-slate-700 text-xs text-left">Item</th>
                            <th className="border border-slate-300 px-3 py-2 bg-slate-100 font-semibold text-slate-700 text-xs text-right">Amount</th>
                            <th className="border border-slate-300 px-3 py-2 bg-slate-100 font-semibold text-slate-700 text-xs text-right">Total Amount</th>
                            <th className="border border-slate-300 px-3 py-2 bg-slate-100 font-semibold text-slate-700 text-xs text-left">Note</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* ── Income ── */}
                        <tr className="bg-slate-50">
                            <td colSpan={5} className="border border-slate-300 px-3 py-2 font-bold text-slate-800">Income</td>
                        </tr>
                        <tr>
                            <td className="border border-slate-300 px-3 py-2"></td>
                            <td className="border border-slate-300 px-3 py-2 text-slate-700">Certified Works</td>
                            <td className="border border-slate-300 px-3 py-2 text-right font-semibold">{fmt(calcValues.certifiedWorks)}</td>
                            <td className="border border-slate-300 px-3 py-2 text-right"></td>
                            <td className="border border-slate-300 px-3 py-2 text-xs text-slate-400 italic">From Πίνακας 5</td>
                        </tr>
                        <tr>
                            <td colSpan={3} className="border border-slate-300 px-3 py-2 font-bold text-slate-800">Total Income Received</td>
                            <td className="border border-slate-300 px-3 py-2 text-right font-bold">{fmt(calcValues.certifiedWorks)}</td>
                            <td className="border border-slate-300 px-3 py-2 text-xs text-slate-400 italic">= Certified Works</td>
                        </tr>

                        {/* ── Income Not Earned Type ── */}
                        <tr className="bg-slate-50">
                            <td colSpan={5} className="border border-slate-300 px-3 py-2 font-bold text-slate-800 italic text-slate-600">Income Not Earned Type</td>
                        </tr>

                        <tr>
                            <td className="border border-slate-300 px-3 py-2"></td>
                            <td className="border border-slate-300 px-3 py-2 text-slate-700">Certified - As per Contract but Not Paid</td>
                            <td className="border border-slate-300 px-3 py-2 text-right">{fmt(calcValues.certifiedNotPaid)}</td>
                            <td className="border border-slate-300 px-3 py-2 text-right"></td>
                            <td className="border border-slate-300 px-3 py-2"></td>
                        </tr>

                        <tr>
                            <td className="border border-slate-300 px-3 py-2"></td>
                            <td className="border border-slate-300 px-3 py-2 font-semibold text-slate-700">Not Certified - As per Contract</td>
                            <td className="border border-slate-300 px-3 py-2 text-right font-semibold">{fmt(calcValues.totalNotCertified)}</td>
                            <td className="border border-slate-300 px-3 py-2 text-right"></td>
                            <td className="border border-slate-300 px-3 py-2"></td>
                        </tr>

                        <tr>
                            <td className="border border-slate-300 px-3 py-2"></td>
                            <td className="border border-slate-300 px-3 py-2 text-slate-700">Fabrication Income</td>
                            <td className="border border-slate-300 px-3 py-2 text-right">{fmt(calcValues.fabricationIncome)}</td>
                            <td className="border border-slate-300 px-3 py-2 text-right"></td>
                            <td className="border border-slate-300 px-3 py-2"></td>
                        </tr>

                        <tr>
                            <td className="border border-slate-300 px-3 py-2"></td>
                            <td className="border border-slate-300 px-3 py-2 text-slate-700">Extra Works Income - Not Approved</td>
                            <td className="border border-slate-300 px-3 py-2 text-right">{fmt(calcValues.extraWorksNotApproved)}</td>
                            <td className="border border-slate-300 px-3 py-2 text-right"></td>
                            <td className="border border-slate-300 px-3 py-2"></td>
                        </tr>

                        <tr className="bg-blue-50">
                            <td colSpan={2} className="border border-slate-300 px-3 py-2 font-bold text-slate-800">Total Income Not Earned</td>
                            <td className="border border-slate-300 px-3 py-2 text-right"></td>
                            <td className="border border-slate-300 px-3 py-2 text-right font-bold">{fmt(calcValues.totalIncomeNotEarned)}</td>
                            <td className="border border-slate-300 px-3 py-2 text-xs text-slate-400">= Sum of above categories</td>
                        </tr>

                        <tr className="bg-green-50">
                            <td colSpan={2} className="border border-slate-300 px-3 py-2 font-bold text-slate-800">Total Value of Work Performed</td>
                            <td className="border border-slate-300 px-3 py-2 text-right"></td>
                            <td className="border border-slate-300 px-3 py-2 text-right font-bold">{fmt(calcValues.totalValueOfWorkPerformed)}</td>
                            <td className="border border-slate-300 px-3 py-2 text-xs text-slate-400">= Total Income Received + Total Income Not Earned</td>
                        </tr>

                    </tbody>
                </table>
            </div>
        </div>
    );
}