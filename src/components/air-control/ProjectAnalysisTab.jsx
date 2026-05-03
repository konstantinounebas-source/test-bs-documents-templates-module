import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from '@/api/base44Client';

const INNER_TABS = [
    { key: 'project_master_data', label: 'Project Master Data' },
    { key: 'budget_overview', label: 'Budget Overview' },
    { key: 'budget_runway', label: 'Budget Runway' },
    { key: 'capacity_scenarios', label: 'Capacity Scenarios' },
];

const fmt = (val) => {
    if (val === null || val === undefined || val === '') return '0.00';
    const num = Number(val);
    return isNaN(num) ? '0.00' : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parseNum = (val) => {
    const n = parseFloat(String(val).replace(/,/g, ''));
    return isNaN(n) ? 0 : n;
};

const SummaryCard = ({ title, rows }) => (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
                <thead>
                    <tr>
                        <th className="border border-slate-300 px-3 py-2 bg-slate-100 font-semibold text-slate-700 text-xs text-left">Description</th>
                        <th className="border border-slate-300 px-3 py-2 bg-slate-100 font-semibold text-slate-700 text-xs text-right">Value</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, idx) => (
                        <tr key={idx} className={row.isBold ? 'bg-slate-100 font-bold' : ''}>
                            <td className="border border-slate-300 px-3 py-2 text-slate-700">{row.label}</td>
                            <td className={`border border-slate-300 px-3 py-2 text-right ${row.isBold ? 'font-bold' : 'bg-slate-50'}`}>
                                {fmt(row.value)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const KPICard = ({ label, value, isPercentage }) => (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
        <p className="text-sm text-slate-600 mb-2">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{isPercentage ? `${value}%` : value}</p>
    </div>
);

function BudgetOverviewContent() {
    const [data, setData] = useState(null);
    const [outcomeData, setOutcomeData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const loadData = async () => {
            try {
                const masterRecords = await base44.entities.ProjectMasterData.list();
                const outcomeRecords = await base44.entities.OutcomeCalculation.list();
                
                if (isMounted) {
                    setData(masterRecords.length > 0 ? masterRecords[0] : null);
                    setOutcomeData(outcomeRecords);
                }
            } catch (error) {
                console.error('Failed to load Budget Overview data:', error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadData();

        // Subscribe to changes
        const unsubscribeProjectMasterData = base44.entities.ProjectMasterData.subscribe(() => {
            if (isMounted) {
                base44.entities.ProjectMasterData.list().then(records => {
                    if (isMounted && records.length > 0) {
                        setData(records[0]);
                    }
                });
            }
        });

        const unsubscribeOutcome = base44.entities.OutcomeCalculation.subscribe(() => {
            if (isMounted) {
                base44.entities.OutcomeCalculation.list().then(records => {
                    if (isMounted) {
                        setOutcomeData(records);
                    }
                });
            }
        });

        return () => {
            isMounted = false;
            unsubscribeProjectMasterData();
            unsubscribeOutcome();
        };
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
        );
    }

    // Extract budget values from ProjectMasterData
    const projectBudgetData = data?.project_budget_correction || {};
    const pmBudget = parseNum(projectBudgetData.pm);
    const labourBudget = parseNum(projectBudgetData.labour);
    const assetsBudget = parseNum(projectBudgetData.assets);
    const materialsBudget = parseNum(projectBudgetData.materials);
    const otherBudget = parseNum(projectBudgetData.other);

    // Extract outcome values - use baseline period
    const baselinePeriod = outcomeData.find(o => o.period_type === 'baseline');
    const pmOutcome = parseNum(baselinePeriod?.pm_from_software) + parseNum(baselinePeriod?.pm_not_in_software);
    const labourOutcome = parseNum(baselinePeriod?.labour_from_software) + parseNum(baselinePeriod?.labour_not_in_software);
    const assetsOutcome = parseNum(baselinePeriod?.assets_from_software) + parseNum(baselinePeriod?.assets_not_in_software);
    const materialsOutcome = parseNum(baselinePeriod?.materials_from_software) + parseNum(baselinePeriod?.materials_not_in_software);
    const otherOutcome = parseNum(baselinePeriod?.other_from_software) + parseNum(baselinePeriod?.other_not_in_software);

    // Calculate totals
    const totalBudget = pmBudget + labourBudget + assetsBudget + materialsBudget + otherBudget;
    const totalOutcome = pmOutcome + labourOutcome + assetsOutcome + materialsOutcome + otherOutcome;
    const remainingBudget = totalBudget - totalOutcome;
    const consumedPercent = totalBudget > 0 ? ((totalOutcome / totalBudget) * 100).toFixed(2) : 0;

    // Category data for table
    const categories = [
        { name: 'PM', budget: pmBudget, outcome: pmOutcome },
        { name: 'Labour', budget: labourBudget, outcome: labourOutcome },
        { name: 'Assets', budget: assetsBudget, outcome: assetsOutcome },
        { name: 'Materials', budget: materialsBudget, outcome: materialsOutcome },
        { name: 'Other', budget: otherBudget, outcome: otherOutcome },
    ];

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-4">
                <KPICard label="Total Budget" value={fmt(totalBudget)} />
                <KPICard label="Total Outcome" value={fmt(totalOutcome)} />
                <KPICard label="Remaining Budget" value={fmt(remainingBudget)} />
                <KPICard label="Consumed %" value={consumedPercent} isPercentage />
            </div>

            {/* Budget Table */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr>
                                <th className="border border-slate-300 px-4 py-3 bg-slate-100 font-semibold text-slate-700 text-xs text-left">Category</th>
                                <th className="border border-slate-300 px-4 py-3 bg-slate-100 font-semibold text-slate-700 text-xs text-right">Total Budget</th>
                                <th className="border border-slate-300 px-4 py-3 bg-slate-100 font-semibold text-slate-700 text-xs text-right">Total Outcome</th>
                                <th className="border border-slate-300 px-4 py-3 bg-slate-100 font-semibold text-slate-700 text-xs text-right">Remaining Budget</th>
                                <th className="border border-slate-300 px-4 py-3 bg-slate-100 font-semibold text-slate-700 text-xs text-right">Consumed %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map((cat, idx) => {
                                const remaining = cat.budget - cat.outcome;
                                const consumed = cat.budget > 0 ? ((cat.outcome / cat.budget) * 100).toFixed(2) : 0;
                                return (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="border border-slate-300 px-4 py-3 text-slate-700 font-medium">{cat.name}</td>
                                        <td className="border border-slate-300 px-4 py-3 text-right text-slate-700 bg-slate-50">{fmt(cat.budget)}</td>
                                        <td className="border border-slate-300 px-4 py-3 text-right text-slate-700 bg-slate-50">{fmt(cat.outcome)}</td>
                                        <td className="border border-slate-300 px-4 py-3 text-right text-slate-700 bg-slate-50">{fmt(remaining)}</td>
                                        <td className="border border-slate-300 px-4 py-3 text-right text-slate-700 bg-slate-50">{consumed}%</td>
                                    </tr>
                                );
                            })}
                            <tr className="bg-slate-100 font-bold">
                                <td className="border border-slate-300 px-4 py-3 text-slate-800">Total</td>
                                <td className="border border-slate-300 px-4 py-3 text-right text-slate-800">{fmt(totalBudget)}</td>
                                <td className="border border-slate-300 px-4 py-3 text-right text-slate-800">{fmt(totalOutcome)}</td>
                                <td className="border border-slate-300 px-4 py-3 text-right text-slate-800">{fmt(remainingBudget)}</td>
                                <td className="border border-slate-300 px-4 py-3 text-right text-slate-800">{consumedPercent}%</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function ProjectMasterDataContent() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        // Load initial data
        const loadData = async () => {
            try {
                const records = await base44.entities.ProjectMasterData.list();
                if (isMounted && records.length > 0) {
                    setData(records[0]);
                }
            } catch (error) {
                console.error('Failed to load ProjectMasterData:', error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadData();

        // Subscribe to changes
        const unsubscribe = base44.entities.ProjectMasterData.subscribe((event) => {
            if (!isMounted) return;
            
            // Reload data on any change
            base44.entities.ProjectMasterData.list().then(records => {
                if (isMounted && records.length > 0) {
                    setData(records[0]);
                }
            });
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
                <p className="text-slate-500">No project data available</p>
            </div>
        );
    }

    // Read pre-calculated values from ProjectMasterData
    const tender = data?.total_tender_profit || {};
    const tenderIncome = parseNum(tender.income);
    const tenderCost = parseNum(tender.cost);
    const tenderIncomeMinusCost = tenderIncome - tenderCost;
    const tenderJVProfit = parseNum(tender.ac_share);
    const tenderExpectedProfit = parseNum(tender.expected);

    const project = data?.project_total_profit || {};
    const projectIncome = parseNum(project.income);
    const projectCost = parseNum(project.cost);
    const projectIncomeMinusCost = projectIncome - projectCost;
    const projectJVProfit = parseNum(project.ac_share);
    const projectExpectedProfit = parseNum(project.expected);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
                {/* Expected Tender Profit */}
                <SummaryCard
                    title="Expected Tender Profit"
                    rows={[
                        { label: 'Income', value: tenderIncome },
                        { label: 'Cost', value: tenderCost },
                        { label: 'Income - Cost', value: tenderIncomeMinusCost },
                        { label: 'JV Profit', value: tenderJVProfit },
                        { label: 'Expected Profit', value: tenderExpectedProfit, isBold: true },
                    ]}
                />

                {/* Expected Project Profit */}
                <SummaryCard
                    title="Expected Project Profit"
                    rows={[
                        { label: 'Income', value: projectIncome },
                        { label: 'Cost', value: projectCost },
                        { label: 'Income - Cost', value: projectIncomeMinusCost },
                        { label: 'JV Profit', value: projectJVProfit },
                        { label: 'Expected Profit', value: projectExpectedProfit, isBold: true },
                    ]}
                />
            </div>
        </div>
    );
}

export default function ProjectAnalysisTab() {
    const [activeInnerTab, setActiveInnerTab] = useState('project_master_data');

    return (
        <div className="space-y-4">
            <Tabs value={activeInnerTab} onValueChange={setActiveInnerTab}>
                <TabsList className="flex flex-wrap gap-1 h-auto">
                    {INNER_TABS.map(tab => (
                        <TabsTrigger key={tab.key} value={tab.key} className="text-sm">
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {INNER_TABS.map(tab => (
                    <TabsContent key={tab.key} value={tab.key}>
                        {tab.key === 'project_master_data' ? (
                            <ProjectMasterDataContent />
                        ) : tab.key === 'budget_overview' ? (
                            <BudgetOverviewContent />
                        ) : (
                            <div className="bg-white rounded-lg border border-slate-200 p-8 min-h-[500px] flex items-center justify-center">
                                <p className="text-slate-400 text-sm">
                                    {tab.key === 'budget_runway' && 'Budget Runway content will be loaded here'}
                                    {tab.key === 'capacity_scenarios' && 'Capacity Scenarios content will be loaded here'}
                                </p>
                            </div>
                        )}
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}