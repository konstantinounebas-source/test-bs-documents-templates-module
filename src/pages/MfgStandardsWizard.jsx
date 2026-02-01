import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowRight, ArrowLeft, Save, Edit2, Trash2, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

const STEPS = [
  { id: 0, name: "Standards Sets", entity: "Std_Set", requiresDept: true },
  { id: 1, name: "Profile Sets", entity: "Profile_Set", requiresDept: true },
  { id: 2, name: "QC Sets", entity: "QC_Set", requiresDept: false },
  { id: 3, name: "Consumables Standards Sets", entity: "Consumables_Standards_Set", requiresDept: false },
  { id: 4, name: "KPI & Metrics Definitions", entity: "KPI_Def_Set", requiresDept: false }
];

export default function MfgStandardsWizard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    department: "",
    version_no: "",
    status: "DRAFT",
    notes: ""
  });

  const step = STEPS[currentStep];
  const entityName = step.entity;

  // Fetch departments if needed
  const { data: departments = [] } = useQuery({
    queryKey: ['Department'],
    queryFn: () => base44.entities.Department.list(),
    enabled: step.requiresDept
  });

  // Fetch items for current step
  const { data: items = [], isLoading } = useQuery({
    queryKey: [entityName],
    queryFn: () => base44.entities[entityName].list('-created_date'),
    enabled: !!entityName
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities[entityName].create(data),
    onSuccess: () => {
      queryClient.invalidateQueries([entityName]);
      resetForm();
      toast.success("Created successfully");
    },
    onError: (error) => {
      console.error("Create error:", error);
      toast.error("Failed to create: " + (error?.message || "Unknown error"));
    }
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
      department: "",
      version_no: "",
      status: "DRAFT",
      notes: ""
    });
    setEditingItem(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.version_no.trim()) {
      toast.error("Version number is required");
      return;
    }

    if (step.requiresDept && !formData.department) {
      toast.error("Department is required");
      return;
    }

    const payload = step.requiresDept 
      ? formData 
      : { version_no: formData.version_no, status: formData.status, notes: formData.notes };

    console.log("Submitting payload:", payload, "to entity:", entityName);

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      department: item.department || "",
      version_no: item.version_no,
      status: item.status,
      notes: item.notes || ""
    });
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this item?")) {
      deleteMutation.mutate(id);
    }
  };

  const canProceedToNext = () => {
    // At least one ACTIVE set should exist
    const activeItems = items.filter(item => item.status === 'ACTIVE');
    return activeItems.length > 0;
  };

  const handleNext = () => {
    if (!canProceedToNext()) {
      toast.error("Please create and activate at least one set before proceeding");
      return;
    }
    
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      resetForm();
    } else {
      toast.success("Standards setup complete!");
      navigate(createPageUrl("MfgPlanning"));
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      resetForm();
    } else {
      navigate(createPageUrl("MfgReferenceDataWizard"));
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
                  <FileText className="w-6 h-6 text-blue-600" />
                  Step 2: Standards Management - {step.name}
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
            {/* Progress Indicator */}
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
              {/* Form Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Add / Edit {step.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {step.requiresDept && (
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
                    
                    <div>
                      <Label htmlFor="version">Version Number *</Label>
                      <Input
                        id="version"
                        value={formData.version_no}
                        onChange={(e) => setFormData({ ...formData, version_no: e.target.value })}
                        placeholder="e.g., 1.0.0"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="status">Status *</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DRAFT">Draft</SelectItem>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="ARCHIVED">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Optional notes"
                        rows={3}
                      />
                    </div>

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

              {/* List Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Existing {step.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8 text-slate-500">Loading...</div>
                  ) : items.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      No {step.name.toLowerCase()} found. Create your first one.
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {step.requiresDept && <TableHead>Department</TableHead>}
                            <TableHead>Version</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map(item => (
                            <TableRow key={item.id}>
                              {step.requiresDept && <TableCell>{item.department}</TableCell>}
                              <TableCell className="font-medium">{item.version_no}</TableCell>
                              <TableCell>
                                {item.status === 'ACTIVE' ? (
                                  <Badge className="bg-green-100 text-green-700">Active</Badge>
                                ) : item.status === 'DRAFT' ? (
                                  <Badge variant="outline">Draft</Badge>
                                ) : (
                                  <Badge variant="secondary">Archived</Badge>
                                )}
                              </TableCell>
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
                        Create at least one {step.name} with status "ACTIVE" before proceeding.
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