import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, ClipboardList, Plus, Edit2, Trash2, Save, Loader2, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import BatchHeaderTab from "../components/manufacturing/daily/BatchHeaderTab";
import BatchLinesTab from "../components/manufacturing/daily/BatchLinesTab";
import QCInitialStockTab from "../components/manufacturing/daily/QCInitialStockTab";
import OperationsTab from "../components/manufacturing/daily/OperationsTab";
import OperationsTimeTab from "../components/manufacturing/daily/OperationsTimeTab";
import QCActionsTab from "../components/manufacturing/daily/QCActionsTab";
import TeamTimePersonsTab from "../components/manufacturing/daily/TeamTimePersonsTab";
import TeamTimeExtraTab from "../components/manufacturing/daily/TeamTimeExtraTab";
import HelpInTab from "../components/manufacturing/daily/HelpInTab";
import ConsumablesActualTab from "../components/manufacturing/daily/ConsumablesActualTab";

export default function MfgDailyProduction() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("batch_header");
  const [selectedBatch, setSelectedBatch] = useState(null);

  const { data: batchHeaders = [] } = useQuery({
    queryKey: ['Batch_Header'],
    queryFn: () => base44.entities.Batch_Header.list('-created_date', 20)
  });

  // Calculate grand totals from all tabs
  const { data: opsData = [] } = useQuery({
    queryKey: ['Operations', selectedBatch?.id],
    queryFn: () => base44.entities.Operations.filter({ batch_header_id: selectedBatch.id }),
    enabled: !!selectedBatch?.id,
    staleTime: 0
  });

  const { data: batchLines = [] } = useQuery({
    queryKey: ['Batch_Lines', selectedBatch?.id],
    queryFn: () => base44.entities.Batch_Lines.filter({ batch_header_id: selectedBatch.id }),
    enabled: !!selectedBatch?.id,
    staleTime: 0
  });

  const { data: batchHeader } = useQuery({
    queryKey: ['Batch_Header', selectedBatch?.id],
    queryFn: () => base44.entities.Batch_Header.filter({ id: selectedBatch.id }),
    enabled: !!selectedBatch?.id,
    select: (data) => data?.[0]
  });

  const { data: stdSetLines = [] } = useQuery({
    queryKey: ['StdSetLines', batchHeader?.bundle_id],
    queryFn: () => base44.entities.StdSetLines.filter({ bundle_id: batchHeader.bundle_id }),
    enabled: !!batchHeader?.bundle_id,
    staleTime: 0
  });

  const { data: profileNames = [] } = useQuery({
    queryKey: ['OperationProfileName'],
    queryFn: () => base44.entities.OperationProfileName.list()
  });

  const { data: qcLines = [] } = useQuery({
    queryKey: ['QC_Actions', selectedBatch?.id],
    queryFn: () => base44.entities.QC_Initial_Stock.filter({ batch_header_id: selectedBatch.id }),
    enabled: !!selectedBatch?.id,
    staleTime: 0
  });

  const { data: qcSetLines = [] } = useQuery({
    queryKey: ['QCSetLines', batchHeader?.bundle_id],
    queryFn: () => base44.entities.QCSetLines.filter({ bundle_id: batchHeader.bundle_id }),
    enabled: !!batchHeader?.bundle_id,
    staleTime: 0
  });

  // Calculate ops hours
  const opsHours = useMemo(() => {
    let totalMinutes = 0;
    batchLines.forEach(line => {
      const profile = profileNames.find(p => 
        opsData.find(op => op.item_code === line.item_code && op.operation_profile === p.name)
      );
      
      if (profile) {
        const profileOps = profile.operations_required || [];
        let lineMinutes = 0;
        profileOps.forEach(opId => {
          const stdLine = stdSetLines.find(
            sl => sl.item_code === line.item_code && sl.operation_id === opId
          );
          if (stdLine && stdLine.time_per_unit) {
            lineMinutes += parseFloat(stdLine.time_per_unit);
          }
        });
        totalMinutes += lineMinutes * (parseFloat(line.scheduled_qty) || 0);
      }
    });
    return (totalMinutes / 60).toFixed(2);
  }, [batchLines, profileNames, opsData, stdSetLines]);

  // Calculate QC hours
  const qcHours = useMemo(() => {
    let totalMinutes = 0;
    qcLines.forEach(line => {
      const qcRule = qcSetLines.find(
        ql => ql.item_code === line.item_code && 
             ql.qc_type === line.qc_type && 
             ql.qc_level === line.qc_level
      );
      if (qcRule && qcRule.time_per_unit) {
        totalMinutes += parseFloat(qcRule.time_per_unit) * (parseFloat(line.qty_affected) || 0);
      }
    });
    return (totalMinutes / 60).toFixed(2);
  }, [qcLines, qcSetLines]);

  const grandTotalHours = useMemo(() => {
    return (parseFloat(opsHours || 0) + parseFloat(qcHours || 0)).toFixed(2);
  }, [opsHours, qcHours]);

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
    queryClient.invalidateQueries(['Batch_Header']);
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
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-8 w-full">
                <TabsTrigger value="batch_header">Batch Header</TabsTrigger>
                <TabsTrigger value="batch_lines" disabled={!selectedBatch}>Batch Lines</TabsTrigger>
                <TabsTrigger value="qc_initial" disabled={!selectedBatch}>QC Initial Stock</TabsTrigger>
                <TabsTrigger value="operations" disabled={!selectedBatch}>Operations</TabsTrigger>
                <TabsTrigger value="team_persons" disabled={!selectedBatch}>Team Time Persons</TabsTrigger>
                <TabsTrigger value="team_extra" disabled={!selectedBatch}>Team Time Extra</TabsTrigger>
                <TabsTrigger value="help_in" disabled={!selectedBatch}>Help In</TabsTrigger>
                <TabsTrigger value="consumables" disabled={!selectedBatch}>Consumables</TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <TabsContent value="batch_header">
                  <BatchHeaderTab 
                    batchHeaders={batchHeaders}
                    selectedBatch={selectedBatch}
                    onBatchSelect={handleBatchSelect}
                    onBatchCreated={handleBatchCreated}
                  />
                </TabsContent>

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
                  <HelpInTab batchId={selectedBatch?.id} />
                </TabsContent>

                <TabsContent value="consumables">
                  <ConsumablesActualTab batchId={selectedBatch?.id} />
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}