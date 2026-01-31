import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, TrendingUp } from "lucide-react";

export default function MfgKPIDefinitionsPage() {
  const { data: kpiSets = [] } = useQuery({
    queryKey: ['KPI_Def_Set'],
    queryFn: () => base44.entities.KPI_Def_Set.list('-created_date')
  });

  const { data: metricsSets = [] } = useQuery({
    queryKey: ['Metrics_Def_Set'],
    queryFn: () => base44.entities.Metrics_Def_Set.list('-created_date')
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              KPI & Metrics Definitions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="kpi">
              <TabsList>
                <TabsTrigger value="kpi">KPI Definitions</TabsTrigger>
                <TabsTrigger value="metrics">Metrics Definitions</TabsTrigger>
              </TabsList>

              <TabsContent value="kpi" className="mt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">KPI Definition Sets</h3>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Version
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Version</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Activated</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kpiSets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">No KPI definition sets found</TableCell>
                      </TableRow>
                    ) : (
                      kpiSets.map(set => (
                        <TableRow key={set.id}>
                          <TableCell className="font-medium">{set.version_no}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs ${
                              set.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                              set.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {set.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            {set.activated_at ? new Date(set.activated_at).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell>
                            {new Date(set.created_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">View Details</Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="metrics" className="mt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Metrics Definition Sets</h3>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Version
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Version</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Activated</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metricsSets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">No metrics definition sets found</TableCell>
                      </TableRow>
                    ) : (
                      metricsSets.map(set => (
                        <TableRow key={set.id}>
                          <TableCell className="font-medium">{set.version_no}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs ${
                              set.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                              set.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {set.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            {set.activated_at ? new Date(set.activated_at).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell>
                            {new Date(set.created_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">View Details</Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}