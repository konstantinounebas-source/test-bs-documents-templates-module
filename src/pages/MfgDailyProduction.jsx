import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowRight, ArrowLeft, Save, Edit2, Trash2, ClipboardList, AlertCircle, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

const STEPS = [
  { id: 0, name: "Batch Header", entity: "Batch_Header", fields: ["date", "department", "notes"] },
  { id: 1, name: "Batch Lines", entity: "Batch_Lines", fields: ["item_code", "scheduled_qty", "qty_processed", "qty_out_good"] },
  { id: 2, name: "QC Initial Stock", entity: "QC_Initial_Stock", fields: ["item_code", "qc_type", "qc_level", "qty_affected"] },
  { id: 3, name: "Operations", entity: "Operations", fields: ["item_code", "entry_type", "operation_profile", "operation", "qty_operation"] },
  { id: 4, name: "Team Time Persons", entity: "Team_Time_Persons", fields: ["person_name", "from_time", "to_time"] },
  { id: 5, name: "Team Time Extra", entity: "Team_Time_Extra", fields: ["person_name", "charge_dept", "work_type", "duration_min"] },
  { id: 6, name: "Help In", entity: "Help_In", fields: ["department", "from_department", "help_min"] },
  { id: 7, name: "Consumables Actual", entity: "Consumables_Actual", fields: ["department", "consumable", "actual_qty", "unit"] }
];

export default function MfgDailyProduction() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [currentBatchId, setCurrentBatchId] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  const step = STEPS[currentStep];
  const entityName = step.entity;

  // Fetch reference data
  const { data: departments = [] } = useQuery({
    queryKey: ['Department'],
    queryFn: () => base44.entities.Department.list()
  });

  const { data: workTypes = [] } = useQuery({
    queryKey: ['Work_Type'],
    queryFn: () => base44.entities.Work_Type.list()
  });

  const { data: qcTypes = [] } = useQuery({
    queryKey: ['QC_Type'],
    queryFn: () => base44.entities.QC_Type.list()
  });

  const { data: consumables = [] } = useQuery({
    queryKey: ['Consumable'],
    queryFn: () => base44.entities.Consumable.list()
  });

  const { data: operations = [] } = useQuery({
    queryKey: ['Operation'],
    queryFn: () => base44.entities.Operation.list()
  });

  const { data: batchHeaders = [] } = useQuery({
    queryKey: ['Batch_Header'],
    queryFn: () => base44.entities.Batch_Header.list('-created_date', 10)
  });

  // Fetch items for current entity (filtered by batch if needed)
  const { data: items = [], isLoading } = useQuery({
    queryKey: [entityName, currentBatchId],
    queryFn: async () => {
      if (currentStep === 0) {
        return base44.entities.Batch_Header.list('-created_date', 20);
      } else if (currentBatchId) {
        return base44.entities[entityName].filter({ batch_header_id: currentBatchId });
      }
      return [];
    },
    enabled: !!entityName
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities[entityName].create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries([entityName]);
      if (currentStep === 0) {
        setCurrentBatchId(data.id);
      }
      resetForm();
      toast.success("Created successfully");
    },
    onError: () => toast.error("Failed to create")
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities[entityName].update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries([entityName]);
      resetForm();
      toast.success("Updated successfully");
    },
    onError: () => toast.error("Failed to update")
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities[entityName].delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries([entityName]);
      toast.success("Deleted successfully");
    },
    onError: () => toast.error("Failed to delete")
  });

  const resetForm = () => {
    setFormData({});
    setEditingItem(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    let payload = {};

    if (currentStep === 0) {
      // Batch Header
      if (!formData.date || !formData.department) {
        toast.error("Date and department are required");
        return;
      }
      payload = {
        date: formData.date,
        department: formData.department,
        notes: formData.notes || ""
      };
    } else {
      // All other entities need batch_header_id
      if (!currentBatchId) {
        toast.error("Please create a batch header first");
        return;
      }
      payload = { batch_header_id: currentBatchId, ...formData };
    }

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = async (item) => {
    if (currentStep === 0) {
      // Editing a batch header - load all associated data
      setEditingItem(item);
      setFormData(item);
      setCurrentBatchId(item.id);
      
      // Invalidate all related queries to reload data for this batch
      queryClient.invalidateQueries(['Batch_Lines']);
      queryClient.invalidateQueries(['QC_Initial_Stock']);
      queryClient.invalidateQueries(['Operations']);
      queryClient.invalidateQueries(['Team_Time_Persons']);
      queryClient.invalidateQueries(['Team_Time_Extra']);
      queryClient.invalidateQueries(['Help_In']);
      queryClient.invalidateQueries(['Consumables_Actual']);
      
      toast.success('Batch loaded - navigate through tabs to view/edit all data');
    } else {
      setEditingItem(item);
      setFormData(item);
    }
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this item?")) {
      deleteMutation.mutate(id);
    }
  };

  const canProceedToNext = () => {
    if (currentStep === 0) {
      return currentBatchId !== null;
    }
    return true; // Other steps are optional
  };

  const handleNext = () => {
    if (currentStep === 0 && !canProceedToNext()) {
      toast.error("Please create a batch header before proceeding");
      return;
    }
    
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      resetForm();
    } else {
      toast.success("Daily production entry complete!");
      navigate(createPageUrl("MfgKPIDashboard"));
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      resetForm();
    } else {
      navigate(createPageUrl("MfgPlanningWizard"));
    }
  };

  const handleSelectBatch = (batchId) => {
    setCurrentBatchId(batchId);
    toast.success("Batch selected");
  };

  const renderFormFields = () => {
    switch(currentStep) {
      case 0: // Batch Header
        return (
          <>
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={formData.date || ""}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Department *</Label>
              <Select
                value={formData.department || ""}
                onValueChange={(value) => setFormData({ ...formData, department: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
          </>
        );

      case 1: // Batch Lines
        return (
          <>
            <div>
              <Label>Item Code *</Label>
              <Input
                value={formData.item_code || ""}
                onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Scheduled Qty</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.scheduled_qty || ""}
                  onChange={(e) => setFormData({ ...formData, scheduled_qty: e.target.value })}
                />
              </div>
              <div>
                <Label>Qty Processed</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.qty_processed || ""}
                  onChange={(e) => setFormData({ ...formData, qty_processed: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Qty Out Good</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.qty_out_good || ""}
                  onChange={(e) => setFormData({ ...formData, qty_out_good: e.target.value })}
                />
              </div>
              <div>
                <Label>Qty Scrap</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.qty_scrap || ""}
                  onChange={(e) => setFormData({ ...formData, qty_scrap: e.target.value })}
                />
              </div>
            </div>
          </>
        );

      case 2: // QC Initial Stock
        return (
          <>
            <div>
              <Label>Item Code *</Label>
              <Input
                value={formData.item_code || ""}
                onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>QC Type *</Label>
              <Select
                value={formData.qc_type || ""}
                onValueChange={(value) => setFormData({ ...formData, qc_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select QC type" />
                </SelectTrigger>
                <SelectContent>
                  {qcTypes.map(q => (
                    <SelectItem key={q.id} value={q.name}>{q.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>QC Level *</Label>
                <Select
                  value={formData.qc_level || ""}
                  onValueChange={(value) => setFormData({ ...formData, qc_level: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L1">L1</SelectItem>
                    <SelectItem value="L2">L2</SelectItem>
                    <SelectItem value="L3">L3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Qty Affected *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.qty_affected || ""}
                  onChange={(e) => setFormData({ ...formData, qty_affected: e.target.value })}
                  required
                />
              </div>
            </div>
          </>
        );

      case 3: // Operations
        return (
          <>
            <div>
              <Label>Item Code *</Label>
              <Input
                value={formData.item_code || ""}
                onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Entry Type *</Label>
              <Select
                value={formData.entry_type || ""}
                onValueChange={(value) => setFormData({ ...formData, entry_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROFILE">PROFILE</SelectItem>
                  <SelectItem value="OPERATION">OPERATION</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.entry_type === "OPERATION" && (
              <div>
                <Label>Operation</Label>
                <Select
                  value={formData.operation || ""}
                  onValueChange={(value) => setFormData({ ...formData, operation: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select operation" />
                  </SelectTrigger>
                  <SelectContent>
                    {operations.map(op => (
                      <SelectItem key={op.id} value={op.name}>{op.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Qty Operation</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.qty_operation || ""}
                onChange={(e) => setFormData({ ...formData, qty_operation: e.target.value })}
              />
            </div>
          </>
        );

      case 4: // Team Time Persons
        return (
          <>
            <div>
              <Label>Person Name *</Label>
              <Input
                value={formData.person_name || ""}
                onChange={(e) => setFormData({ ...formData, person_name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>From Time *</Label>
                <Input
                  type="time"
                  value={formData.from_time || ""}
                  onChange={(e) => setFormData({ ...formData, from_time: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>To Time *</Label>
                <Input
                  type="time"
                  value={formData.to_time || ""}
                  onChange={(e) => setFormData({ ...formData, to_time: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
          </>
        );

      case 5: // Team Time Extra
        return (
          <>
            <div>
              <Label>Person Name *</Label>
              <Input
                value={formData.person_name || ""}
                onChange={(e) => setFormData({ ...formData, person_name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Charge Dept *</Label>
              <Select
                value={formData.charge_dept || ""}
                onValueChange={(value) => setFormData({ ...formData, charge_dept: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Work Type *</Label>
              <Select
                value={formData.work_type || ""}
                onValueChange={(value) => setFormData({ ...formData, work_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select work type" />
                </SelectTrigger>
                <SelectContent>
                  {workTypes.map(w => (
                    <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Duration (min) *</Label>
              <Input
                type="number"
                value={formData.duration_min || ""}
                onChange={(e) => setFormData({ ...formData, duration_min: e.target.value })}
                required
              />
            </div>
          </>
        );

      case 6: // Help In
        return (
          <>
            <div>
              <Label>Department *</Label>
              <Select
                value={formData.department || ""}
                onValueChange={(value) => setFormData({ ...formData, department: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Department receiving help" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>From Department *</Label>
              <Select
                value={formData.from_department || ""}
                onValueChange={(value) => setFormData({ ...formData, from_department: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Department providing help" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Help Time (min) *</Label>
              <Input
                type="number"
                value={formData.help_min || ""}
                onChange={(e) => setFormData({ ...formData, help_min: e.target.value })}
                required
              />
            </div>
          </>
        );

      case 7: // Consumables Actual
        return (
          <>
            <div>
              <Label>Department *</Label>
              <Select
                value={formData.department || ""}
                onValueChange={(value) => setFormData({ ...formData, department: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Consumable *</Label>
              <Select
                value={formData.consumable || ""}
                onValueChange={(value) => setFormData({ ...formData, consumable: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select consumable" />
                </SelectTrigger>
                <SelectContent>
                  {consumables.map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Actual Qty *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.actual_qty || ""}
                  onChange={(e) => setFormData({ ...formData, actual_qty: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Unit *</Label>
                <Input
                  value={formData.unit || ""}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="e.g., kg, L"
                  required
                />
              </div>
            </div>
          </>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <ClipboardList className="w-6 h-6 text-blue-600" />
                  Step 4: Daily Production Entry - {step.name}
                </CardTitle>
                <p className="text-sm text-slate-600 mt-2">
                  Step {currentStep + 1} of {STEPS.length}
                </p>
                {currentBatchId && currentStep > 0 && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Batch ID: {currentBatchId}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleNext} disabled={currentStep === 0 && !canProceedToNext()}>
                  {currentStep < STEPS.length - 1 ? "Save & Next" : "Complete & View Dashboard"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6 flex gap-1 overflow-x-auto">
              {STEPS.map((s, idx) => (
                <div key={s.id} className="flex-1 min-w-[100px]">
                  <div className={`h-2 rounded-full ${idx <= currentStep ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
                  <p className={`text-[10px] mt-1 ${idx === currentStep ? 'font-semibold text-blue-600' : 'text-slate-500'}`}>
                    {s.name}
                  </p>
                </div>
              ))}
            </div>

            {currentStep > 0 && !currentBatchId && (
              <Card className="mb-6 bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <p className="font-semibold text-blue-900">Select Existing Batch</p>
                    <div className="grid grid-cols-1 gap-2">
                      {batchHeaders.slice(0, 5).map(batch => (
                        <Button
                          key={batch.id}
                          variant="outline"
                          onClick={() => handleSelectBatch(batch.id)}
                          className="justify-start"
                        >
                          {batch.date} - {batch.department}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Add / Edit {step.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {renderFormFields()}
                    
                    <div className="flex gap-2">
                      {editingItem && (
                        <Button type="button" variant="outline" onClick={resetForm}>
                          Cancel
                        </Button>
                      )}
                      <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                        <Save className="w-4 h-4 mr-2" />
                        {editingItem ? "Update" : "Create"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Existing {step.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8 text-slate-500">Loading...</div>
                  ) : items.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      No records found.
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {currentStep === 0 && (
                              <>
                                <TableHead>Date</TableHead>
                                <TableHead>Dept</TableHead>
                              </>
                            )}
                            {currentStep === 1 && (
                              <>
                                <TableHead>Item</TableHead>
                                <TableHead>Qty</TableHead>
                              </>
                            )}
                            {currentStep === 2 && (
                              <>
                                <TableHead>Item</TableHead>
                                <TableHead>QC Type</TableHead>
                                <TableHead>Qty</TableHead>
                              </>
                            )}
                            {currentStep === 3 && (
                              <>
                                <TableHead>Item</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Qty</TableHead>
                              </>
                            )}
                            {currentStep === 4 && (
                              <>
                                <TableHead>Person</TableHead>
                                <TableHead>Time</TableHead>
                              </>
                            )}
                            {currentStep === 5 && (
                              <>
                                <TableHead>Person</TableHead>
                                <TableHead>Work Type</TableHead>
                                <TableHead>Min</TableHead>
                              </>
                            )}
                            {currentStep === 6 && (
                              <>
                                <TableHead>From</TableHead>
                                <TableHead>To</TableHead>
                                <TableHead>Min</TableHead>
                              </>
                            )}
                            {currentStep === 7 && (
                              <>
                                <TableHead>Consumable</TableHead>
                                <TableHead>Qty</TableHead>
                                <TableHead>Unit</TableHead>
                              </>
                            )}
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map(item => (
                            <TableRow key={item.id}>
                              {currentStep === 0 && (
                                <>
                                  <TableCell>{item.date}</TableCell>
                                  <TableCell>{item.department}</TableCell>
                                </>
                              )}
                              {currentStep === 1 && (
                                <>
                                  <TableCell>{item.item_code}</TableCell>
                                  <TableCell>{item.qty_out_good || item.qty_processed}</TableCell>
                                </>
                              )}
                              {currentStep === 2 && (
                                <>
                                  <TableCell>{item.item_code}</TableCell>
                                  <TableCell>{item.qc_type}</TableCell>
                                  <TableCell>{item.qty_affected}</TableCell>
                                </>
                              )}
                              {currentStep === 3 && (
                                <>
                                  <TableCell>{item.item_code}</TableCell>
                                  <TableCell>{item.entry_type}</TableCell>
                                  <TableCell>{item.qty_operation}</TableCell>
                                </>
                              )}
                              {currentStep === 4 && (
                                <>
                                  <TableCell>{item.person_name}</TableCell>
                                  <TableCell>{item.from_time} - {item.to_time}</TableCell>
                                </>
                              )}
                              {currentStep === 5 && (
                                <>
                                  <TableCell>{item.person_name}</TableCell>
                                  <TableCell>{item.work_type}</TableCell>
                                  <TableCell>{item.duration_min}</TableCell>
                                </>
                              )}
                              {currentStep === 6 && (
                                <>
                                  <TableCell>{item.from_department}</TableCell>
                                  <TableCell>{item.department}</TableCell>
                                  <TableCell>{item.help_min}</TableCell>
                                </>
                              )}
                              {currentStep === 7 && (
                                <>
                                  <TableCell>{item.consumable}</TableCell>
                                  <TableCell>{item.actual_qty}</TableCell>
                                  <TableCell>{item.unit}</TableCell>
                                </>
                              )}
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleDelete(item.id)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {currentStep === 0 && !canProceedToNext() && (
              <Card className="mt-6 bg-orange-50 border-orange-200">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-orange-900">Action Required</p>
                      <p className="text-sm text-orange-700 mt-1">
                        Create a batch header before proceeding to enter production data.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}