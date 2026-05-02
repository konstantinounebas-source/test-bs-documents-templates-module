import React, { useState } from 'react';
import { usePageAccess } from "@/components/lib/usePageAccess";
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = [
    { key: 'project_summary', label: 'Project Summary' },
    { key: 'project_projections', label: 'Project Projections' },
    { key: 'outcome_calculation', label: 'Outcome Calculation' },
    { key: 'income_summary_calculation', label: 'Income Summary Calculation' },
    { key: 'income_calculation', label: 'Income Calculation' },
    { key: 'allocation_of_investment', label: 'Allocation of Investment' },
    { key: 'fabrication_calculation', label: 'Fabrication Calculation' },
    { key: 'annexes', label: 'Annexes' },
];

export default function ProjectMasterData() {
    const { hasAccess, isLoading: accessLoading } = usePageAccess('ProjectMasterData');
    const [activeTab, setActiveTab] = useState('project_summary');

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
            <div className="max-w-full mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Project Master Data</h1>
                    <p className="text-slate-600 mt-1">Manage project financial data and calculations</p>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-100 p-1 rounded-lg">
                        {TABS.map(tab => (
                            <TabsTrigger
                                key={tab.key}
                                value={tab.key}
                                className="text-xs px-3 py-1.5 whitespace-nowrap"
                            >
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {TABS.map(tab => (
                        <TabsContent key={tab.key} value={tab.key} className="mt-4">
                            <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-400">
                                <p className="text-lg font-medium">{tab.label}</p>
                                <p className="text-sm mt-1">Content coming soon</p>
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            </div>
        </div>
    );
}