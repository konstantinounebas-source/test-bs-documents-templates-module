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
import { ArrowRight, ArrowLeft, Save, Edit2, Trash2, CalendarDays, AlertCircle, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

const STEPS = [
  { id: 0, name: "Daily Targets", entity: "Target_Daily" },
  { id: 1, name: "Scheduled Data", entity: "Scheduled_Data" }
];

export default function MfgPlanningWizard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    date: "",
    department: "",
    item_code: "",
    target_qty: "",
    scheduled_qty: "",
    profile_name: "",
    notes: ""
  });

  const step = STEPS[currentStep];
  const entityName = step.entity;

  const { data: departments = [] } = useQuery({
    queryKey: ['Department'],
    queryFn: () => base44.entities.Department.list()
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['Target_Profile_Name'],
    queryFn: () => base44.entities.Target_Profile_Name.list()
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: [entityName],
    queryFn: () => base44.entities[entityName].list('-date', 50),
    enabled: !!entityName
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities[entityName].create(data),
    onSuccess: () => {
      queryClient.invalidateQueries([entityName]);
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
    setFormData({
      date: "",
      department: "",
      item_code: "",
      target_qty: "",
      scheduled_qty: "",
      profile_name: "",
      notes: ""
    });
    setEditingItem(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.date) {
      toast.error("Date is required");
      return;
    }
    if (!formData.department) {
      toast.error("Department is required");
      return;
    }
    if (!formData.item_code.trim()) {
      toast.error("Item code is required");
      return;
    }

    const payload = currentStep === 0 ? {
      date: formData.date,
      department: formData.department,
      item_code: formData.item_code,
      target_qty: parseFloat(formData.target_qty) || 0,
      notes: formData.notes
    } : {
      date: formData.date,
      item_code: formData.item_code,
      profile_name: formData.profile_name,
      scheduled_qty: parseFloat(formData.scheduled_qty) || 0
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      date: item.date || "",
      department: item.department || "",
      item_code: item.item_code || "",
      target_qty: item.target_qty || "",
      scheduled_qty: item.scheduled_qty || "",
      profile_name: item.profile_name || "",
      notes: item.notes || ""
    });
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this item?")) {
      deleteMutation.mutate(id);
    }
  };

  const canProceedToNext = () => {
    return items.length > 0;
  };

  const handleNext = () => {
    if (!canProceedToNext()) {
      toast.error("Please create at least one record before proceeding");
      return;
    }
    
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      resetForm();
    } else {
      toast.success("Planning setup complete!");
      navigate(createPageUrl("MfgDailyProduction"));
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      resetForm();
    } else {
      navigate(createPageUrl("MfgStandardsWizard"));
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
                  <CalendarDays className="w-6 h-6 text-blue-600" />
                  Step 3: Planning - {step.name}
                </CardTitle>
                <p className="text-sm text-slate-600 mt-2">
                  Step {currentStep + 1} of {STEPS.length}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleNext} disabled={!canProceedToNext()}>
                  {currentStep < STEPS.length - 1 ? "Save & Next" : "Complete & Next Step"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6 flex gap-2">
              {STEPS.map((s, idx) => (
                <div key={s.id} className="flex-1">
                  <div className={`h-2 rounded-full ${idx <= currentStep ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
                  <p className={`text-xs mt-1 ${idx === currentStep ? 'font-semibold text-blue-600' : 'text-slate-500'}`}>
                    {s.name}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Add / Edit {step.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="date">Date *</Label>
                        <Input
                          id="date"
                          type="date"
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          required
                        />
                      </div>
                      
                      {currentStep === 0 && (
                        <div>
                          <Label htmlFor="department">Department *</Label>
                          <Select
                            value={formData.department}
                            onValueChange={(value) => setFormData({ ...formData, department: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                            <SelectContent>
                              {departments.map(dept => (
                                <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {currentStep === 1 && (
                        <div>
                          <Label htmlFor="profile">Profile Name</Label>
                          <Select
                            value={formData.profile_name}
                            onValueChange={(value) => setFormData({ ...formData, profile_name: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select profile" />
                            </SelectTrigger>
                            <SelectContent>
                              {profiles.map(prof => (
                                <SelectItem key={prof.id} value={prof.name}>{prof.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="item_code">Item Code *</Label>
                      <Input
                        id="item_code"
                        value={formData.item_code}
                        onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
                        placeholder="Enter item code"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="qty">
                        {currentStep === 0 ? "Target Quantity *" : "Scheduled Quantity *"}
                      </Label>
                      <Input
                        id="qty"
                        type="number"
                        step="0.01"
                        value={currentStep === 0 ? formData.target_qty : formData.scheduled_qty}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          [currentStep === 0 ? 'target_qty' : 'scheduled_qty']: e.target.value 
                        })}
                        placeholder="Enter quantity"
                        required
                      />
                    </div>

                    {currentStep === 0 && (
                      <div>
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                          id="notes"
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder="Optional notes"
                          rows={2}
                        />
                      </div>
                    )}

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
                  <CardTitle className="text-lg">Recent {step.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8 text-slate-500">Loading...</div>
                  ) : items.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      No {step.name.toLowerCase()} found. Create your first record.
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            {currentStep === 0 && <TableHead>Dept</TableHead>}
                            <TableHead>Item</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map(item => (
                            <TableRow key={item.id}>
                              <TableCell>{item.date}</TableCell>
                              {currentStep === 0 && <TableCell>{item.department}</TableCell>}
                              <TableCell className="font-medium">{item.item_code}</TableCell>
                              <TableCell>{currentStep === 0 ? item.target_qty : item.scheduled_qty}</TableCell>
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

            {!canProceedToNext() && (
              <Card className="mt-6 bg-orange-50 border-orange-200">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-orange-900">Action Required</p>
                      <p className="text-sm text-orange-700 mt-1">
                        Create at least one {step.name} record before proceeding.
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