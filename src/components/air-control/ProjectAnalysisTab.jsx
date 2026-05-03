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
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const records = await base44.entities.ProjectMasterData.list();
            if (records.length > 0) {
                setData(records[0]);
            }
        } catch (error) {
            console.error('Failed to load ProjectMasterData:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
        );
    }

    // Safe parsing
    const tenderBudget = data?.tender_budget || {};
    const fabricationBudget = data?.fabrication_budget || {};
    const tenderJVProfit = data?.tender_jv_profit || {};
    const projectBudgetCorrection = data?.project_budget_correction || {};
    const projectTotalProfit = data?.project_total_profit || {};

    // Tender calculations
    const tenderIncomeTotal = parseNum(tenderBudget.pm) + parseNum(tenderBudget.labour) + parseNum(tenderBudget.assets) + 
                              parseNum(tenderBudget.materials) + parseNum(tenderBudget.other) + parseNum(tenderBudget.road_marking) + 
                              parseNum(tenderBudget.options) + parseNum(tenderBudget.maintenance);
    const tenderCostTotal = parseNum(tenderBudget.pm_cost) + parseNum(tenderBudget.labour_cost) + parseNum(tenderBudget.assets_cost) + 
                            parseNum(tenderBudget.materials_cost) + parseNum(tenderBudget.other_cost) + parseNum(tenderBudget.road_marking_cost) + 
                            parseNum(tenderBudget.options_cost) + parseNum(tenderBudget.maintenance_cost);
    const tenderProfitFromIncomeCost = tenderIncomeTotal - tenderCostTotal;
    const tenderJVProfitShare = parseNum(tenderJVProfit.total_jv) || 0;
    const tenderExpectedProfit = tenderProfitFromIncomeCost + tenderJVProfitShare;

    // Project calculations
    const fabricationIncomeTotal = parseNum(fabricationBudget.pm) + parseNum(fabricationBudget.labour) + parseNum(fabricationBudget.setup_cost_asset) + 
                                   parseNum(fabricationBudget.materials) + parseNum(fabricationBudget.other) + parseNum(fabricationBudget.profit);
    const fabricationCostTotal = parseNum(fabricationBudget.pm_cost) + parseNum(fabricationBudget.labour_cost) + parseNum(fabricationBudget.setup_cost_cost) + 
                                 parseNum(fabricationBudget.materials_cost) + parseNum(fabricationBudget.other_cost) + parseNum(fabricationBudget.profit_cost);

    const projectIncomeTotal = parseNum(projectBudgetCorrection.pm) + parseNum(projectBudgetCorrection.pm_allocation) + parseNum(projectBudgetCorrection.labour) + 
                               parseNum(projectBudgetCorrection.labour_allocation) + parseNum(projectBudgetCorrection.assets) + parseNum(projectBudgetCorrection.materials) + 
                               parseNum(projectBudgetCorrection.other) + parseNum(projectBudgetCorrection.road_marking) + parseNum(projectBudgetCorrection.sealour) + 
                               parseNum(projectBudgetCorrection.maintenance);
    const projectCostTotal = parseNum(projectBudgetCorrection.pm_cost) + parseNum(projectBudgetCorrection.pm_allocation_cost) + parseNum(projectBudgetCorrection.labour_cost) + 
                             parseNum(projectBudgetCorrection.labour_allocation_cost) + parseNum(projectBudgetCorrection.assets_cost) + parseNum(projectBudgetCorrection.materials_cost) + 
                             parseNum(projectBudgetCorrection.other_cost) + parseNum(projectBudgetCorrection.road_marking_cost) + parseNum(projectBudgetCorrection.sealour_cost) + 
                             parseNum(projectBudgetCorrection.maintenance_cost);

    const totalProjectIncome = projectIncomeTotal + fabricationIncomeTotal;
    const totalProjectCost = projectCostTotal + fabricationCostTotal;
    const projectProfitFromIncomeCost = totalProjectIncome - totalProjectCost;
    const projectJVProfitShare = parseNum(projectTotalProfit.ac_share) || 0;
    const projectExpectedProfit = projectProfitFromIncomeCost + projectJVProfitShare;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
                {/* Expected Tender Profit */}
                <SummaryCard
                    title="Expected Tender Profit"
                    rows={[
                        { label: 'Income', value: tenderIncomeTotal },
                        { label: 'Cost', value: tenderCostTotal },
                        { label: 'Profit from Income - Cost', value: tenderProfitFromIncomeCost },
                        { label: 'JV Profit', value: tenderJVProfitShare },
                        { label: 'Expected Profit', value: tenderExpectedProfit, isBold: true },
                    ]}
                />

                {/* Expected Project Profit */}
                <SummaryCard
                    title="Expected Project Profit"
                    rows={[
                        { label: 'Income', value: totalProjectIncome },
                        { label: 'Cost', value: totalProjectCost },
                        { label: 'Profit from Income - Cost', value: projectProfitFromIncomeCost },
                        { label: 'JV Profit', value: projectJVProfitShare },
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