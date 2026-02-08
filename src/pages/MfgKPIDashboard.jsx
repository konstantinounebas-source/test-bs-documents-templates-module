import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Lock, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import MetricDefinitionManager from "@/components/manufacturing/metrics/MetricDefinitionManager";
import DailyMetricValuesViewer from "@/components/manufacturing/metrics/DailyMetricValuesViewer";
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
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <BarChart3 className="w-6 h-6" />
              KPI Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Locked At</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kpiRuns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">No KPI runs found</TableCell>
                  </TableRow>
                ) : (
                  kpiRuns.map(run => (
                    <TableRow key={run.id}>
                      <TableCell className="font-medium">
                        {new Date(run.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{run.department}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs flex items-center gap-1 w-fit ${
                          run.status === 'LOCKED' ? 'bg-green-100 text-green-800' :
                          run.status === 'CORRECTED' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {run.status === 'LOCKED' && <Lock className="w-3 h-3" />}
                          {run.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {run.locked_at ? new Date(run.locked_at).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>
                        {new Date(run.created_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <button className="text-blue-600 hover:underline text-sm">View KPIs</button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">KPI Definitions</CardTitle>
          </CardHeader>
          <CardContent>
            <KPIDefinitionsTable />
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
      </div>
    </div>
  );
}