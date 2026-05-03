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

    // Extract data from ProjectMasterData
    const tenderBudget = data?.tender_budget || {};
    const projectBudgetCorrection = data?.project_budget_correction || {};
    const fabricationBudget = data?.fabrication_budget || {};
    const tenderJVProfit = data?.tender_jv_profit || {};
    const projectTotalProfit = data?.project_total_profit || {};

    // Tender calculations
    const tenderIncomeTotal = (tenderBudget.pm || 0) + (tenderBudget.labour || 0) + (tenderBudget.assets || 0) + 
                              (tenderBudget.materials || 0) + (tenderBudget.other || 0) + (tenderBudget.road_marking || 0) + 
                              (tenderBudget.options || 0) + (tenderBudget.maintenance || 0);
    const tenderCostTotal = (tenderBudget.pm_cost || 0) + (tenderBudget.labour_cost || 0) + (tenderBudget.assets_cost || 0) + 
                            (tenderBudget.materials_cost || 0) + (tenderBudget.other_cost || 0) + (tenderBudget.road_marking_cost || 0) + 
                            (tenderBudget.options_cost || 0) + (tenderBudget.maintenance_cost || 0);
    const tenderIncomeCostDiff = tenderIncomeTotal - tenderCostTotal;
    const tenderJVProfitValue = tenderJVProfit?.total_jv || 0;
    const tenderExpectedProfit = tenderIncomeCostDiff + tenderJVProfitValue;

    // Project calculations
    const projectIncomeTotal = (projectBudgetCorrection.pm || 0) + (projectBudgetCorrection.pm_allocation || 0) + (projectBudgetCorrection.labour || 0) + 
                               (projectBudgetCorrection.labour_allocation || 0) + (projectBudgetCorrection.assets || 0) + (projectBudgetCorrection.materials || 0) + 
                               (projectBudgetCorrection.other || 0) + (projectBudgetCorrection.road_marking || 0) + (projectBudgetCorrection.sealour || 0) + 
                               (projectBudgetCorrection.maintenance || 0);
    const projectCostTotal = (projectBudgetCorrection.pm_cost || 0) + (projectBudgetCorrection.pm_allocation_cost || 0) + (projectBudgetCorrection.labour_cost || 0) + 
                             (projectBudgetCorrection.labour_allocation_cost || 0) + (projectBudgetCorrection.assets_cost || 0) + (projectBudgetCorrection.materials_cost || 0) + 
                             (projectBudgetCorrection.other_cost || 0) + (projectBudgetCorrection.road_marking_cost || 0) + (projectBudgetCorrection.sealour_cost || 0) + 
                             (projectBudgetCorrection.maintenance_cost || 0);

    const fabricationIncomeTotal = (fabricationBudget.pm || 0) + (fabricationBudget.labour || 0) + (fabricationBudget.setup_cost_asset || 0) + 
                                   (fabricationBudget.materials || 0) + (fabricationBudget.other || 0) + (fabricationBudget.profit || 0);
    const fabricationCostTotal = (fabricationBudget.pm_cost || 0) + (fabricationBudget.labour_cost || 0) + (fabricationBudget.setup_cost_cost || 0) + 
                                 (fabricationBudget.materials_cost || 0) + (fabricationBudget.other_cost || 0) + (fabricationBudget.profit_cost || 0);

    const totalProjectIncome = projectIncomeTotal + fabricationIncomeTotal;
    const totalProjectCost = projectCostTotal + fabricationCostTotal;
    const projectIncomeCostDiff = totalProjectIncome - totalProjectCost;
    const projectJVProfit = projectTotalProfit?.ac_share || 0;
    const projectExpectedProfit = projectIncomeCostDiff + projectJVProfit;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
                {/* Expected Tender Profit */}
                <SummaryCard
                    title="Expected Tender Profit"
                    rows={[
                        { label: 'Income', value: tenderIncomeTotal },
                        { label: 'Cost', value: tenderCostTotal },
                        { label: 'Income - Cost', value: tenderIncomeCostDiff },
                        { label: 'JV Profit', value: tenderJVProfitValue },
                        { label: 'Expected Profit', value: tenderExpectedProfit, isBold: true },
                    ]}
                />

                {/* Expected Project Profit */}
                <SummaryCard
                    title="Expected Project Profit"
                    rows={[
                        { label: 'Income', value: totalProjectIncome },
                        { label: 'Cost', value: totalProjectCost },
                        { label: 'Income - Cost', value: projectIncomeCostDiff },
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
                        ) : (
                            <div className="bg-white rounded-lg border border-slate-200 p-8 min-h-[500px] flex items-center justify-center">
                                <p className="text-slate-400 text-sm">
                                    {tab.key === 'budget_overview' && 'Budget Overview content will be loaded here'}
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