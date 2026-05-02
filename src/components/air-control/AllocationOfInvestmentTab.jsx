import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
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

const TD = ({ children, bold = false, className = '' }) => (
    <td className={`border border-slate-300 px-3 py-1 ${bold ? 'font-bold' : ''} ${className}`}>
        {children}
    </td>
);

const InputCell = ({ value, onChange }) => {
    const numValue = parseNum(value);
    return (
        <td className="border border-slate-300 px-1 py-1">
            <input
                type="text"
                className="h-7 text-right text-xs border-0 focus-visible:ring-1 w-full px-2"
                value={fmt(numValue)}
                onChange={e => onChange(e.target.value)}
            />
        </td>
    );
};

const CalcCell = ({ value, className = '' }) => (
    <td className={`border border-slate-300 px-3 py-1 text-right text-slate-800 bg-slate-50 ${className}`}>
        {fmt(value)}
    </td>
);

export default function AllocationOfInvestmentTab() {
    const [investment, setInvestment] = useState({
        pm_labour: 350000.00,
        material: 252908.13,
        assets: 450000.00,
        asset_after_depr: 112500.00,
        total_value_work: 3273500.96,
        expected_income: 20294790.48,
    });

    useEffect(() => {
        loadProjectData();
    }, []);

    const loadProjectData = async () => {
        try {
            const incomeRecords = await base44.entities.IncomeCalculation.list();
            const incomeMap = {};
            incomeRecords.forEach(r => { incomeMap[r.section] = r; });

            let totalValueOfWorkPerformed = investment.total_value_work;
            
            if (incomeMap.assumptions?.data && incomeMap.certified?.data && incomeMap.advance?.data && incomeMap.not_paid?.data) {
                const assumptions = incomeMap.assumptions.data;
                const pct60 = parseNum(assumptions.pct_60);
                const retentionPct = parseNum(assumptions.retention_pct) || 0.05;
                const advAdjPct = parseNum(assumptions.advance_adj_pct) || 0.35;
                
                const certPayments = incomeMap.certified.data.payments || [];
                const advPayments = incomeMap.advance.data.payments || [];
                const notPaidPayments = incomeMap.not_paid.data.payments || [];
                
                // 1. Income Received
                const incomeAdvancePayment = advPayments.reduce((s, p) => s + parseNum(p.aircontrol), 0);
                const incomeCertifiedWorks = certPayments.reduce((s, p) => s + parseNum(p.ac100) + parseNum(p.ac60), 0);
                const totalIncomeReceived = incomeAdvancePayment + incomeCertifiedWorks;
                
                // 2. Advance remaining
                const certWorksAC60 = certPayments.reduce((s, p) => s + parseNum(p.ac60), 0);
                const certAdjustment = (certWorksAC60 / (pct60 || 1)) * advAdjPct;
                const advancePaymentRemaining = incomeAdvancePayment - certAdjustment;
                
                // 3. Income Not Earned (simplified - includes certified not paid + retention)
                const certifiedNotPaid = notPaidPayments.reduce((s, p) => s + parseNum(p.ac100) + parseNum(p.ac60), 0);
                const totalRetention5 = (certWorksAC60 / (pct60 || 1)) * retentionPct;
                
                // Get fabrication income from income calc
                const shelterData = incomeMap.shelter_types?.data?.types || [];
                const totalFabricationIncome = shelterData
                    .filter(t => ['type_a', 'type_b', 'type_c'].includes(t.key))
                    .reduce((s, t) => s + (parseNum(t.total_qty) * parseNum(t.jv_rate)), 0);
                
                const totalIncomeNotEarned = certifiedNotPaid + totalRetention5 + totalFabricationIncome;
                
                // 4. Total Value of Work Performed
                totalValueOfWorkPerformed = totalIncomeReceived + totalIncomeNotEarned - advancePaymentRemaining;
            }

            setInvestment(prev => ({
                ...prev,
                total_value_work: totalValueOfWorkPerformed
            }));
        } catch (error) {
            console.error('Failed to load project data:', error);
        }
    };

    const totalInvestment = parseNum(investment.pm_labour) + parseNum(investment.material) + parseNum(investment.assets);
    const allocationPct = ((totalInvestment - parseNum(investment.asset_after_depr)) / parseNum(investment.expected_income)) * 100;
    const allocatedCost = (allocationPct / 100) * parseNum(investment.total_value_work);

    return (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Allocation of Investment</h2>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr>
                            <TH className="text-left">Investment Type</TH>
                            <TH>Cost</TH>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <TD bold>Capital Expenditure</TD>
                            <TD></TD>
                        </tr>
                        <tr>
                            <TD>PM & Labour Intensive</TD>
                            <InputCell value={fmt(investment.pm_labour)} onChange={v => setInvestment({...investment, pm_labour: parseNum(v)})} />
                        </tr>
                        <tr>
                            <TD>Material</TD>
                            <InputCell value={fmt(investment.material)} onChange={v => setInvestment({...investment, material: parseNum(v)})} />
                        </tr>
                        <tr>
                            <TD>Assets</TD>
                            <InputCell value={fmt(investment.assets)} onChange={v => setInvestment({...investment, assets: parseNum(v)})} />
                        </tr>
                        <tr className="bg-slate-100 font-bold">
                            <TD bold>Total Investment</TD>
                            <CalcCell value={totalInvestment} className="font-bold" />
                        </tr>
                        <tr>
                            <TD colSpan={2} className="text-xs text-slate-500">Πίνακας 9 — Allocated Investment Cost</TD>
                        </tr>
                        <tr>
                            <TD>Total Investment</TD>
                            <CalcCell value={totalInvestment} />
                        </tr>
                        <tr>
                            <TD>Asset value after Depreciation</TD>
                            <InputCell value={fmt(investment.asset_after_depr)} onChange={v => setInvestment({...investment, asset_after_depr: parseNum(v)})} />
                        </tr>
                        <tr>
                            <TD>Total Value of Work Performed</TD>
                            <InputCell value={fmt(investment.total_value_work)} onChange={v => setInvestment({...investment, total_value_work: parseNum(v)})} />
                        </tr>
                        <tr>
                            <TD>Expected Total Project Income</TD>
                            <InputCell value={fmt(investment.expected_income)} onChange={v => setInvestment({...investment, expected_income: parseNum(v)})} />
                        </tr>
                        <tr>
                            <TD>Allocation %</TD>
                            <CalcCell value={allocationPct} className="text-right" />
                        </tr>
                        <tr>
                            <TD colSpan={2} className="text-right text-sm">%</TD>
                        </tr>
                        <tr className="bg-slate-100 font-bold">
                            <TD bold>Allocated Investment Cost</TD>
                            <CalcCell value={allocatedCost} className="font-bold" />
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}