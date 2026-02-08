import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Lock, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import MetricDefinitionManager from "@/components/manufacturing/metrics/MetricDefinitionManager";
import DailyMetricValuesViewer from "@/components/manufacturing/metrics/DailyMetricValuesViewer";
import DailyKPIValuesViewer from "@/components/manufacturing/kpi/DailyKPIValuesViewer";
import KPIDefinitionsTable from "@/components/manufacturing/KPIDefinitionsTable";

export default function MfgKPIDashboardPage() {
  const [expandedKPIDefinitions, setExpandedKPIDefinitions] = useState(true);

  const { data: kpiRuns = [] } = useQuery({
    queryKey: ['Daily_KPI_Run'],
    queryFn: () => base44.entities.Daily_KPI_Run.list('-date')
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Card>
          <CardContent className="p-0">
            <button
              onClick={() => setExpandedKPIDefinitions(!expandedKPIDefinitions)}
              className="w-full flex items-center gap-2 px-6 py-4 hover:bg-slate-50 transition-colors"
            >
              {expandedKPIDefinitions ? (
                <ChevronDown className="w-5 h-5 text-slate-600" />
              ) : (
                <ChevronRight className="w-5 h-5 text-slate-600" />
              )}
              <span className="text-lg font-semibold">KPI Definitions (Read-only)</span>
            </button>
            {expandedKPIDefinitions && (
              <div className="px-6 pb-6">
                <KPIDefinitionsTable />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Metric Definitions & Values</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <div>
              <MetricDefinitionManager />
            </div>
            <div className="border-t pt-6">
              <DailyMetricValuesViewer />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">KPI Calculation Values</CardTitle>
          </CardHeader>
          <CardContent>
            <DailyKPIValuesViewer />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}