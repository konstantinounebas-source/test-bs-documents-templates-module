import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

const fmt = (val) => {
    if (val === null || val === undefined || val === '') return '—';
    return Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

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
    const [data, setData] = useState({
        totalValueOfWorkPerformed: 0,
        totalOutcome: 0,
        totalInvestment: 0,
        allocatedInvestmentCost: 0,
        expectedMissingInvoice: null,
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

            // Load AllocationOfInvestment data for totalInvestment and allocatedInvestmentCost
            const masterRecords = await base44.entities.ProjectMasterData.list();
            let totalInvestment = 0;
            let allocatedInvestmentCost = 0;
            
            if (masterRecords.length > 0) {
                const master = masterRecords[0];
                totalInvestment = (parseFloat(master.tender_budget?.pm) || 0) +
                                (parseFloat(master.tender_budget?.labour) || 0) +
                                (parseFloat(master.tender_budget?.assets) || 0) +
                                (parseFloat(master.tender_budget?.materials) || 0) +
                                (parseFloat(master.tender_budget?.other) || 0);
                allocatedInvestmentCost = (parseFloat(master.tender_budget?.allocated_cost) || 0);
            }

            // Load Outcome Calculation - sum all NOT in software columns
            const outcomeRecords = await base44.entities.OutcomeCalculation.list();
            let totalOutcome = 0;
            outcomeRecords.forEach(r => {
                if (r.data) {
                    totalOutcome += (parseFloat(r.data.pm_not_in_software) || 0) +
                                   (parseFloat(r.data.labour_not_in_software) || 0) +
                                   (parseFloat(r.data.assets_not_in_software) || 0) +
                                   (parseFloat(r.data.materials_not_in_software) || 0) +
                                   (parseFloat(r.data.other_not_in_software) || 0);
                }
            });

            // Calculate derived values
            const stockMaterial = 28500.00;
            const profitLoss = totalValueOfWorkPerformed - totalInvestment - totalOutcome;
            const netCashFlow = totalIncomeReceived + totalOutcome;

            setData({
                totalValueOfWorkPerformed,
                totalOutcome,
                totalInvestment,
                allocatedInvestmentCost,
                expectedMissingInvoice: null,
                stockMaterial,
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

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
    );

    return (
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-8">
            <h2 className="text-lg font-semibold text-slate-800">Project Summary</h2>

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
                                <TD></TD>
                            </tr>
                            <tr>
                                <TD bold>Total Outcome</TD>
                                <CalcCell value={data.totalOutcome} />
                                <TD></TD>
                            </tr>
                            <tr>
                                <TD bold>Total Investment</TD>
                                <CalcCell value={data.totalInvestment} />
                                <TD></TD>
                            </tr>
                            <tr>
                                <TD bold>Allocated Investment Cost</TD>
                                <CalcCell value={data.allocatedInvestmentCost} />
                                <TD></TD>
                            </tr>
                            <tr>
                                <TD bold>Expected Missing Invoice</TD>
                                <CalcCell value={data.expectedMissingInvoice || '—'} />
                                <TD className="text-xs text-slate-500">Εξω Υποψία 250K</TD>
                            </tr>
                            <tr className="bg-yellow-50">
                                <TD bold>Stock Material</TD>
                                <CalcCell value={data.stockMaterial} className="bg-yellow-50" />
                                <TD></TD>
                            </tr>
                            <tr className="bg-blue-50">
                                <TD bold>Profit / Loss</TD>
                                <CalcCell value={data.profitLoss} className="bg-blue-50" />
                                <TD></TD>
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