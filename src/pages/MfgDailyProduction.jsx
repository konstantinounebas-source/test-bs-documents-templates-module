import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, ClipboardList, Plus, Edit2, Trash2, Save, Loader2, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import DailyProductionCalendarSelector from "../components/manufacturing/daily/DailyProductionCalendarSelector";
import BatchHeaderTab from "../components/manufacturing/daily/BatchHeaderTab";
import BatchLinesTab from "../components/manufacturing/daily/BatchLinesTab";
import QCInitialStockTab from "../components/manufacturing/daily/QCInitialStockTab";
import OperationsTab from "../components/manufacturing/daily/OperationsTab";
import TeamTimePersonsTab from "../components/manufacturing/daily/TeamTimePersonsTab";
import TeamTimeExtraTab from "../components/manufacturing/daily/TeamTimeExtraTab";
import HelpInTab from "../components/manufacturing/daily/HelpInTab";
import ConsumablesActualTab from "../components/manufacturing/daily/ConsumablesActualTab";

export default function MfgDailyProduction() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("batch_lines");
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  const { data: departments = [] } = useQuery({
    queryKey: ['Department'],
    queryFn: () => base44.entities.Department.list(),
    staleTime: Infinity
  });

  const { data: batchHeaders = [] } = useQuery({
    queryKey: ['BatchHeader'],
    queryFn: () => base44.entities.BatchHeader.list('-created_date', 20)
  });



  const handleBatchSelect = (batch) => {
    setSelectedBatch(batch);
    queryClient.invalidateQueries(['Batch_Lines']);
    queryClient.invalidateQueries(['QC_Initial_Stock']);
    queryClient.invalidateQueries(['Operations']);
    queryClient.invalidateQueries(['QC_Actions']);
    queryClient.invalidateQueries(['Team_Time_Persons']);
    queryClient.invalidateQueries(['Team_Time_Extra']);
    queryClient.invalidateQueries(['Help_In']);
    queryClient.invalidateQueries(['Consumables_Actual']);
    toast.success('Batch selected - navigate through tabs to view/edit data');
  };

  const handleBatchCreated = (newBatch) => {
    setSelectedBatch(newBatch);
    setActiveTab("batch_lines");
    queryClient.invalidateQueries(['BatchHeader']);
  };

  const handleDateSelect = (dateStr) => {
    setSelectedDate(dateStr);
    const existingBatch = batchHeaders.find(b => b.date === dateStr && b.department === selectedDepartment);
    if (existingBatch) {
      handleBatchSelect(existingBatch);
    } else {
      setSelectedBatch(null);
    }
  };

  const handleCreateBatch = async (dateStr) => {
    // This will be handled by BatchHeaderTab but we need to pass the department
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate(createPageUrl("MfgPlanningWizard"))}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Planning
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-blue-600" />
              Step 4: Daily Production Entry
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Enter daily production data for manufacturing operations
            </p>
          </div>
          <Button onClick={() => navigate(createPageUrl("MfgKPIDashboard"))}>
            View Dashboard
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Production Data Entry</CardTitle>
            {selectedBatch && (
              <p className="text-sm text-slate-600 mt-1">
                Selected Batch: {selectedBatch.date} - {selectedBatch.department}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-sm font-semibold">Select Department</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedDepartment && (
              <BatchHeaderTab 
                batchHeaders={batchHeaders}
                selectedBatch={selectedBatch}
                selectedDepartment={selectedDepartment}
                onBatchSelect={handleBatchSelect}
                onBatchCreated={handleBatchCreated}
                hideHeader={true}
              />
            )}

            {selectedBatch && (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-7 w-full">
                  <TabsTrigger value="batch_lines">Batch Lines</TabsTrigger>
                  <TabsTrigger value="qc_initial">QC Initial Stock</TabsTrigger>
                  <TabsTrigger value="operations">Operations</TabsTrigger>
                  <TabsTrigger value="team_persons">Team Time Persons</TabsTrigger>
                  <TabsTrigger value="team_extra">Team Time Extra</TabsTrigger>
                  <TabsTrigger value="help_in">Help In</TabsTrigger>
                  <TabsTrigger value="consumables">Consumables</TabsTrigger>
                </TabsList>

                <div className="mt-6">
                  <TabsContent value="batch_lines">
                    <BatchLinesTab batchId={selectedBatch?.id} department={selectedBatch?.department} />
                  </TabsContent>

                  <TabsContent value="qc_initial">
                    <QCInitialStockTab batchId={selectedBatch?.id} department={selectedBatch?.department} />
                  </TabsContent>

                  <TabsContent value="operations">
                    <OperationsTab batchId={selectedBatch?.id} department={selectedBatch?.department} />
                  </TabsContent>

                  <TabsContent value="team_persons">
                    <TeamTimePersonsTab batchId={selectedBatch?.id} />
                  </TabsContent>

                  <TabsContent value="team_extra">
                    <TeamTimeExtraTab batchId={selectedBatch?.id} />
                  </TabsContent>

                  <TabsContent value="help_in">
                    <HelpInTab batchId={selectedBatch?.id} department={selectedBatch?.department} />
                  </TabsContent>

                  <TabsContent value="consumables">
                    <ConsumablesActualTab batchId={selectedBatch?.id} />
                  </TabsContent>
                </div>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}