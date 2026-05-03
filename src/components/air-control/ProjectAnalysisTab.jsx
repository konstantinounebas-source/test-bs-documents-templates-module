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
                        { label: 'Income', value: fmt(tenderIncome) },
                        { label: 'Cost', value: fmt(tenderCost) },
                        { label: 'Income - Cost', value: fmt(tenderIncomeMinusCost) },
                        { label: 'JV Profit', value: fmt(tenderJVProfit) },
                        { label: 'Expected Profit', value: fmt(tenderExpectedProfit), isBold: true },
                    ]}
                />

                {/* Expected Project Profit */}
                <SummaryCard
                    title="Expected Project Profit"
                    rows={[
                        { label: 'Income', value: fmt(projectIncome) },
                        { label: 'Cost', value: fmt(projectCost) },
                        { label: 'Income - Cost', value: fmt(projectIncomeMinusCost) },
                        { label: 'JV Profit', value: fmt(projectJVProfit) },
                        { label: 'Expected Profit', value: fmt(projectExpectedProfit), isBold: true },
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