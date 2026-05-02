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
            // Load ProjectMasterData
            const pmRecords = await base44.entities.ProjectMasterData.list();
            if (pmRecords.length > 0) {
                const record = pmRecords[0];
                const projectBudgetData = record.project_budget_correction || {};
                const fabricationData = record.fabrication_budget || {};
                
                // Calculate Total Project Income: sum of contract budget income + fabrication income
                const contractBudgetIncome = 
                    parseNum(projectBudgetData.pm) +
                    parseNum(projectBudgetData.pm_allocation) +
                    parseNum(projectBudgetData.labour) +
                    parseNum(projectBudgetData.labour_allocation) +
                    parseNum(projectBudgetData.assets) +
                    parseNum(projectBudgetData.materials) +
                    parseNum(projectBudgetData.other) +
                    parseNum(projectBudgetData.road_marking) +
                    parseNum(projectBudgetData.sealour) +
                    parseNum(projectBudgetData.maintenance);
                
                const fabricationIncome = 
                    parseNum(fabricationData.pm) +
                    parseNum(fabricationData.labour) +
                    parseNum(fabricationData.setup_cost_asset) +
                    parseNum(fabricationData.materials) +
                    parseNum(fabricationData.other) +
                    parseNum(fabricationData.profit);
                
                const totalIncome = contractBudgetIncome + fabricationIncome;
                
                setInvestment(prev => ({
                    ...prev,
                    expected_income: totalIncome || prev.expected_income
                }));
            }
            
            // Load IncomeCalculation to get totalValueOfWorkPerformed
            const incomeRecords = await base44.entities.IncomeCalculation.list();
            if (incomeRecords.length > 0) {
                const incomeMap = {};
                incomeRecords.forEach(r => { incomeMap[r.section] = r; });
                
                // Get the section that contains Value of Work Performed calculation
                // Based on the Income tab, this is calculated as: totalIncomeReceived + totalIncomeNotEarned - advancePaymentRemaining
                // We'll store a placeholder and the component will calculate it from the displayed values
                // Or if stored, retrieve it from the database
                // For now, we'll rely on the manual input field, but we can enhance this later
            }
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
                            <CalcCell value={parseNum(investment.total_value_work)} />
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