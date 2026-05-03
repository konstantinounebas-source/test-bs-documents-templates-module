import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const INNER_TABS = [
    { key: 'project_master_data', label: 'Project Master Data' },
    { key: 'budget_overview', label: 'Budget Overview' },
    { key: 'budget_runway', label: 'Budget Runway' },
    { key: 'capacity_scenarios', label: 'Capacity Scenarios' },
];

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
                        <div className="bg-white rounded-lg border border-slate-200 p-8 min-h-[500px] flex items-center justify-center">
                            <p className="text-slate-400 text-sm">
                                {tab.key === 'project_master_data' && 'Project Master Data content will be loaded here'}
                                {tab.key === 'budget_overview' && 'Budget Overview content will be loaded here'}
                                {tab.key === 'budget_runway' && 'Budget Runway content will be loaded here'}
                                {tab.key === 'capacity_scenarios' && 'Capacity Scenarios content will be loaded here'}
                            </p>
                        </div>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}