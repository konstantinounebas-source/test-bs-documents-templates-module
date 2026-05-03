import React, { useState } from 'react';
import { usePageAccess } from "@/components/lib/usePageAccess";
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OutcomeCalculationTab from "@/components/air-control/OutcomeCalculationTab";
import IncomeCalculationTab from "@/components/air-control/IncomeCalculationTab";
import IncomeSummaryTab from "@/components/air-control/IncomeSummaryTab";
import ProjectMasterDataTab from "@/components/air-control/ProjectMasterDataTab";
import AllocationOfInvestmentTab from "@/components/air-control/AllocationOfInvestmentTab";
import ProjectSummaryTab from "@/components/air-control/ProjectSummaryTab";

const TABS = [
    { key: 'master_data', label: 'Project Master Data' },
    { key: 'project_summary', label: 'Project Summary' },
    { key: 'project_projections', label: 'Project Projections' },
    { key: 'outcome_calculation', label: 'Outcome Calculation' },
    { key: 'income_summary', label: 'Income Summary' },
    { key: 'income_calculation', label: 'Income Calculation' },
    { key: 'allocation_investment', label: 'Allocation of Investment' },
    { key: 'annexes', label: 'Annexes' },
];

export default function AirControlCalculations() {
    const { hasAccess, isLoading: accessLoading } = usePageAccess('AirControlCalculations');
    const [activeTab, setActiveTab] = useState('master_data');

    if (accessLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (!hasAccess) return null;

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-900">Air Control Calculations</h1>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="flex flex-wrap gap-1 h-auto mb-6">
                    {TABS.map(tab => (
                        <TabsTrigger key={tab.key} value={tab.key} className="text-xs">
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {TABS.map(tab => (
                    <TabsContent key={tab.key} value={tab.key}>
                        {tab.key === 'master_data' ? (
                            <ProjectMasterDataTab />
                        ) : tab.key === 'project_summary' ? (
                            <ProjectSummaryTab />
                        ) : tab.key === 'outcome_calculation' ? (
                            <OutcomeCalculationTab />
                        ) : tab.key === 'income_summary' ? (
                            <IncomeSummaryTab />
                        ) : tab.key === 'income_calculation' ? (
                            <IncomeCalculationTab />
                        ) : tab.key === 'allocation_investment' ? (
                            <AllocationOfInvestmentTab />
                        ) : (
                            <div className="bg-white rounded-lg border border-slate-200 p-8 min-h-[400px] flex items-center justify-center">
                                <p className="text-slate-400 text-sm">{tab.label}</p>
                            </div>
                        )}
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}