import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowRight, Save, Plus, Trash2, Edit2, Building2, Wrench, AlertTriangle, Package, Briefcase, Database, Ruler, Tag, FileText, Target, FileCheck, Users, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import PersonManagement from "@/components/manufacturing/PersonManagement";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConsumablesReferenceTab from "@/components/manufacturing/ConsumablesReferenceTab.jsx";

export default function MfgReferenceDataWizard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("departments");
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ name: "", description: "", duration_minutes: "", is_active: true });
  const [selectedDeptIds, setSelectedDeptIds] = useState([]);

  // Fetch departments for Operations tab
  const { data: allDepartments = [] } = useQuery({
    queryKey: ['Department'],
    queryFn: () => base44.entities.Department.filter({ is_active: true })
  });

  const tabs = [
    { id: "departments", label: "Departments", entity: "Department", icon: Building2 },
    { id: "operations", label: "Operations", entity: "Operation", icon: Wrench },
    { id: "qc_types", label: "QC Types", entity: "QC_Type", icon: AlertTriangle },
    { id: "qc_levels", label: "QC Levels", entity: "QCLevel", icon: AlertTriangle },
    { id: "consumables", label: "Consumables", entity: "Consumable", icon: Package, customComponent: true },
    { id: "work_types", label: "Work Types", entity: "Work_Type", icon: Briefcase },
    { id: "units", label: "Units", entity: "Unit", icon: Ruler },
    { id: "rate_types", label: "Rate Types", entity: "Rate_Type", icon: Tag },
    { id: "entry_types", label: "Entry Types", entity: "Entry_Type", icon: FileText },
    { id: "break_times", label: "Break Times", entity: "BreakTime", icon: Clock },
    { id: "target_profiles", label: "Target Profiles", entity: "Target_Profile_Name", icon: Target },
    { id: "operation_profiles", label: "Operation Profiles", entity: "Operation_Profile_Name", icon: FileCheck },
    { id: "persons", label: "Persons", entity: "Person", icon: Users, customComponent: true }
  ];

  const currentEntity = tabs.find(t => t.id === activeTab)?.entity;

  const { data: items = [], isLoading } = useQuery({
    queryKey: [currentEntity],
    queryFn: () => base44.entities[currentEntity].list(),
    enabled: !!currentEntity
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities[currentEntity].create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [currentEntity] });
      setFormData({ name: "", description: "", duration_minutes: "", is_active: true });
      setEditingItem(null);
      setSelectedDeptIds([]);
      toast.success("Item created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create item: " + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities[currentEntity].update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [currentEntity] });
      setFormData({ name: "", description: "", duration_minutes: "", is_active: true });
      setEditingItem(null);
      setSelectedDeptIds([]);
      toast.success("Item updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update item: " + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities[currentEntity].delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [currentEntity] });
      toast.success("Item deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete item: " + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }
    
    if (activeTab === 'break_times' && !formData.duration_minutes) {
      toast.error("Duration is required for break times");
      return;
    }

    const dataToSave = { ...formData };
    if (activeTab === 'operations' || activeTab === 'qc_types' || activeTab === 'qc_levels') {
      dataToSave.department_ids = selectedDeptIds;
    }
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: dataToSave });
    } else {
      createMutation.mutate(dataToSave);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      duration_minutes: item.duration_minutes || "",
      is_active: item.is_active !== false
    });
    if (activeTab === 'operations' || activeTab === 'qc_types' || activeTab === 'qc_levels') {
      setSelectedDeptIds(item.department_ids || []);
    }
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this item?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleCancel = () => {
    setEditingItem(null);
    setFormData({ name: "", description: "", duration_minutes: "", is_active: true });
    setSelectedDeptIds([]);
  };

  const toggleDeptSelection = (deptId) => {
    setSelectedDeptIds(prev =>
      prev.includes(deptId) ? prev.filter(id => id !== deptId) : [...prev, deptId]
    );
  };

  const canProceed = () => {
    const hasDepartments = queryClient.getQueryData(['Department'])?.length > 0;
    const hasOperations = queryClient.getQueryData(['Operation'])?.length > 0;
    return hasDepartments && hasOperations;
  };

  const handleSaveAndNext = () => {
    if (!canProceed()) {
      toast.error("Please add at least one Department and one Operation before proceeding");
      return;
    }
    toast.success("Reference data setup complete!");
    navigate(createPageUrl("MfgStandardsManagement"));
  };

  const CurrentIcon = tabs.find(t => t.id === activeTab)?.icon || Database;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Database className="w-6 h-6 text-blue-600" />
                  Step 1: Reference Data Setup
                </CardTitle>
                <p className="text-sm text-slate-600 mt-2">
                  Setup foundational data for your manufacturing operations
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate(createPageUrl("Manufacturing"))}>
                  Back to Overview
                </Button>
                <Button onClick={handleSaveAndNext} disabled={!canProceed()}>
                  Save & Next Step
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                     <TabsList className="grid grid-cols-6 w-full gap-1 h-auto flex-wrap">
                       {tabs.map(tab => {
                         const TabIcon = tab.icon;
                         const count = queryClient.getQueryData([tab.entity])?.length || 0;
                         return (
                           <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                             <TabIcon className="w-4 h-4" />
                             {tab.label}
                             <Badge variant="secondary">{count}</Badge>
                           </TabsTrigger>
                         );
                       })}
                     </TabsList>

              {tabs.map(tab => (
                <TabsContent key={tab.id} value={tab.id} className="mt-6 space-y-6">
                  {tab.customComponent && tab.id === "consumables" ? (
                    <ConsumablesReferenceTab departments={allDepartments} />
                  ) : tab.customComponent && tab.id === "persons" ? (
                    <PersonManagement />
                  ) : (
                    <>
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <CurrentIcon className="w-5 h-5" />
                            Add / Edit {tab.label}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                      <form onSubmit={handleSubmit} className="space-y-4">
                         <div className="grid grid-cols-2 gap-4">
                           <div>
                             <Label htmlFor="name">Name *</Label>
                             <Input
                               id="name"
                               value={formData.name}
                               onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                               placeholder={`Enter ${tab.label.toLowerCase()} name`}
                               required
                             />
                           </div>
                           <div>
                             <Label htmlFor="description">Description</Label>
                             <Input
                               id="description"
                               value={formData.description}
                               onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                               placeholder="Optional description"
                             />
                           </div>
                         </div>
                         {activeTab === 'break_times' && (
                           <div>
                             <Label htmlFor="duration">Duration (minutes) *</Label>
                             <Input
                               id="duration"
                               type="number"
                               value={formData.duration_minutes}
                               onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || "" })}
                               placeholder="e.g., 15"
                               required={activeTab === 'break_times'}
                             />
                           </div>
                         )}
                         {(activeTab === 'operations' || activeTab === 'qc_types' || activeTab === 'qc_levels') && (
                           <div>
                             <Label>Departments <span className="text-slate-400 font-normal text-xs">(leave empty = applies to all departments)</span></Label>
                             <div className="border rounded-lg p-3 mt-1 flex flex-wrap gap-3 max-h-32 overflow-y-auto">
                               {allDepartments.length === 0 ? (
                                 <p className="text-xs text-slate-400">No departments defined yet</p>
                               ) : allDepartments.map(dept => (
                                 <label key={dept.id} className="flex items-center gap-1.5 cursor-pointer text-sm">
                                   <Checkbox
                                     checked={selectedDeptIds.includes(dept.id)}
                                     onCheckedChange={() => toggleDeptSelection(dept.id)}
                                   />
                                   {dept.name}
                                 </label>
                               ))}
                             </div>
                             {selectedDeptIds.length > 0 && (
                               <p className="text-xs text-blue-600 mt-1">Assigned to {selectedDeptIds.length} department(s)</p>
                             )}
                           </div>
                         )}
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="is_active"
                            checked={formData.is_active}
                            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                          />
                          <Label htmlFor="is_active" className="font-normal cursor-pointer">
                            Active
                          </Label>
                        </div>
                        <div className="flex gap-2">
                          {editingItem && (
                            <Button type="button" variant="outline" onClick={handleCancel}>
                              Cancel
                            </Button>
                          )}
                          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                            <Save className="w-4 h-4 mr-2" />
                            {editingItem ? "Update" : "Add"} {tab.label}
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Existing {tab.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        <div className="text-center py-8 text-slate-500">Loading...</div>
                      ) : items.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                          No {tab.label.toLowerCase()} found. Add your first one above.
                        </div>
                      ) : (
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Description</TableHead>
                                {(tab.id === 'operations' || tab.id === 'qc_types' || tab.id === 'qc_levels') && <TableHead>Departments</TableHead>}
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {items.map(item => (
                                <TableRow key={item.id}>
                                  <TableCell className="font-medium">{item.name}</TableCell>
                                  <TableCell className="text-slate-600">{item.description || '-'}</TableCell>
                                  {(tab.id === 'operations' || tab.id === 'qc_types' || tab.id === 'qc_levels') && (
                                    <TableCell>
                                      {item.department_ids && item.department_ids.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                          {item.department_ids.map(dId => {
                                            const dept = allDepartments.find(d => d.id === dId);
                                            return dept ? <Badge key={dId} variant="outline" className="text-xs">{dept.name}</Badge> : null;
                                          })}
                                        </div>
                                      ) : (
                                        <span className="text-xs text-slate-400">All departments</span>
                                      )}
                                    </TableCell>
                                  )}
                                  <TableCell>
                                    {item.is_active !== false ? (
                                      <Badge className="bg-green-100 text-green-700">Active</Badge>
                                    ) : (
                                      <Badge variant="secondary">Inactive</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => handleEdit(item)}
                                      >
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
                    </>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {!canProceed() && (
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-orange-900">Action Required</p>
                  <p className="text-sm text-orange-700 mt-1">
                    You must add at least one Department and one Operation before proceeding to the next step.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}