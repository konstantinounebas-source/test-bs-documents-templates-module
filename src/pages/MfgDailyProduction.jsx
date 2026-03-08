import React, { useState, useMemo, useEffect } from "react";
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
import DailyProductionCalendarSelector from "@/components/manufacturing/daily/DailyProductionCalendarSelector";
import BatchHeaderTab from "@/components/manufacturing/daily/BatchHeaderTab";
import BatchLinesTab from "@/components/manufacturing/daily/BatchLinesTab";
import QCInitialStockTab from "@/components/manufacturing/daily/QCInitialStockTab";
import OperationsTab from "@/components/manufacturing/daily/OperationsTab";
import TeamTimePersonsTab from "@/components/manufacturing/daily/TeamTimePersonsTab";
import TeamTimeExtraTab from "@/components/manufacturing/daily/TeamTimeExtraTab";
import HelpInTab from "@/components/manufacturing/daily/HelpInTab";
import ConsumablesActualTab from "@/components/manufacturing/daily/ConsumablesActualTab";
import AttachmentsPanel from "@/components/manufacturing/daily/AttachmentsPanel";
import DailyProductionChatbot from "@/components/manufacturing/daily/DailyProductionChatbot";

export default function MfgDailyProduction() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("batch_lines");
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [pendingAutoOpen, setPendingAutoOpen] = useState(false);

  // Read URL params
  const urlParams = new URLSearchParams(window.location.search);
  const urlDate = urlParams.get('date') || '';
  const urlDept = urlParams.get('department') || '';

  const [selectedDepartment, setSelectedDepartment] = useState(urlDept);
  const [selectedDate, setSelectedDate] = useState(urlDate);

  const { data: departments = [] } = useQuery({
    queryKey: ['Department'],
    queryFn: () => base44.entities.Department.list(),
    staleTime: Infinity
  });

  const { data: batchHeaders = [], refetch: refetchBatchHeaders } = useQuery({
    queryKey: ['BatchHeader', selectedDepartment],
    queryFn: () => selectedDepartment
      ? base44.entities.BatchHeader.filter({ department: selectedDepartment })
      : [],
    enabled: !!selectedDepartment,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1
  });

  const { data: allBundles = [] } = useQuery({
    queryKey: ['StandardsBundle-All'],
    queryFn: () => base44.entities.StandardsBundle.list(),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1
  });

  const { data: dailyStandardsAssignments = [] } = useQuery({
    queryKey: ['DailyStandardsAssignment', selectedDepartment],
    queryFn: () => base44.entities.DailyStandardsAssignment.filter({ department_id: selectedDepartment }),
    enabled: !!selectedDepartment,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1
  });

  // Resolve the effective bundle: DailyStandardsAssignment > BatchHeader.bundle_id
  const selectedBundle = useMemo(() => {
    if (!selectedBatch) return null;
    const batchDate = selectedBatch.date;
    const dept = selectedBatch.department;

    // 1. Check DailyStandardsAssignment
    const dailyAssignment = dailyStandardsAssignments.find(
      a => a.assignment_date === batchDate && a.department_id === dept
    );
    if (dailyAssignment?.standards_bundle_id) {
      const found = allBundles.find(b => b.id === dailyAssignment.standards_bundle_id);
      if (found) return found;
    }

    // 2. Fallback to batch's own bundle_id
    if (selectedBatch.bundle_id) {
      return allBundles.find(b => b.id === selectedBatch.bundle_id) || null;
    }
    return null;
  }, [selectedBatch, allBundles, dailyStandardsAssignments]);

  // When coming from schedule with a date+dept, auto-select existing batch or flag to open create dialog
  useEffect(() => {
    if (urlDate && urlDept && batchHeaders.length >= 0) {
      const existingBatch = batchHeaders.find(b => b.date === urlDate && b.department === urlDept);
      if (existingBatch) {
        handleBatchSelect(existingBatch);
        setPendingAutoOpen(false);
      } else {
        // No batch yet - signal BatchHeaderTab to open create dialog
        setPendingAutoOpen(true);
      }
    }
  }, [batchHeaders, urlDate, urlDept]);

  const handleBatchSelect = (batch) => {
    setSelectedBatch(batch);
    setActiveTab('batch_lines');
    toast.success('Batch selected');
  };

  const handleBatchCreated = (newBatch) => {
    setSelectedBatch(newBatch);
    setActiveTab("batch_lines");
    queryClient.invalidateQueries({ queryKey: ['BatchHeader', selectedDepartment] });
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
          <div className="flex gap-2">
            <Button onClick={() => navigate(createPageUrl("MfgKPIDashboard"))}>
              View Dashboard
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Production Data Entry</CardTitle>
            {selectedBatch && (
             <div className="flex items-center gap-3 flex-wrap mt-1">
               <p className="text-sm text-slate-600">
                 Selected Batch: {selectedBatch.date} - {selectedBatch.department}
               </p>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => navigate(createPageUrl("MfgPlanningWizard") + `?date=${selectedBatch.date}&department=${encodeURIComponent(selectedBatch.department)}`)}
                 className="bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100"
               >
                 <Clock className="w-3.5 h-3.5 mr-1.5" />
                 View Schedule
               </Button>
               {selectedBundle ? (
                 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 border border-indigo-200">
                   📦 Bundle: {selectedBundle.version_no} ({selectedBundle.status})
                 </span>
               ) : (
                 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                   ⚠ No bundle assigned
                 </span>
               )}
             </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-sm font-semibold">Select Department</Label>
              <Select value={selectedDepartment} onValueChange={(val) => { setSelectedDepartment(val); setSelectedBatch(null); setSelectedDate(''); }}>
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

            {selectedDepartment && !selectedBatch && (
              <BatchHeaderTab 
                batchHeaders={batchHeaders}
                selectedBatch={selectedBatch}
                selectedDepartment={selectedDepartment}
                onBatchSelect={handleBatchSelect}
                onBatchCreated={handleBatchCreated}
                hideHeader={true}
                autoOpenDate={pendingAutoOpen ? urlDate : null}
                onAutoOpenHandled={() => setPendingAutoOpen(false)}
              />
            )}

            {selectedDepartment && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3">
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
                        {activeTab === 'batch_lines' && (
                          <BatchLinesTab batchId={selectedBatch?.id} department={selectedBatch?.department} selectedBundle={selectedBundle} />
                        )}
                        {activeTab === 'qc_initial' && (
                          <QCInitialStockTab batchId={selectedBatch?.id} department={selectedBatch?.department} />
                        )}
                        {activeTab === 'operations' && (
                          <OperationsTab batchId={selectedBatch?.id} department={selectedBatch?.department} />
                        )}
                        {activeTab === 'team_persons' && (
                          <TeamTimePersonsTab batchId={selectedBatch?.id} />
                        )}
                        {activeTab === 'team_extra' && (
                          <TeamTimeExtraTab batchId={selectedBatch?.id} />
                        )}
                        {activeTab === 'help_in' && (
                          <HelpInTab batchId={selectedBatch?.id} department={selectedBatch?.department} />
                        )}
                        {activeTab === 'consumables' && (
                          <ConsumablesActualTab batchId={selectedBatch?.id} />
                        )}
                      </div>
                    </Tabs>
                  )}
                </div>
                <div className="lg:col-span-1 h-fit sticky top-20">
                  {selectedBatch && <AttachmentsPanel batchHeaderId={selectedBatch?.id} department={selectedBatch?.department} />}
                  
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Floating AI Chatbot */}
      <DailyProductionChatbot departments={departments} />
    </div>
  );
}