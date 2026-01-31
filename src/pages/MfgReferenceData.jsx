import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Database } from "lucide-react";
import { toast } from "sonner";

const entities = [
  { key: "Department", label: "Departments", icon: Database },
  { key: "Unit", label: "Units", icon: Database },
  { key: "Operation", label: "Operations", icon: Database },
  { key: "Consumable", label: "Consumables", icon: Database },
  { key: "Work_Type", label: "Work Types", icon: Database },
  { key: "Rate_Type", label: "Rate Types", icon: Database },
  { key: "QC_Type", label: "QC Types", icon: Database },
  { key: "Entry_Type", label: "Entry Types", icon: Database },
  { key: "Target_Profile_Name", label: "Target Profiles", icon: Database },
  { key: "Operation_Profile_Name", label: "Operation Profiles", icon: Database }
];

export default function MfgReferenceDataPage() {
  const [activeTab, setActiveTab] = useState("Department");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: [activeTab],
    queryFn: () => base44.entities[activeTab].list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities[activeTab].create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [activeTab] });
      toast.success("Created successfully");
      handleCloseDialog();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities[activeTab].update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [activeTab] });
      toast.success("Updated successfully");
      handleCloseDialog();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities[activeTab].delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [activeTab] });
      toast.success("Deleted successfully");
    }
  });

  const handleOpenDialog = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({ name: item.name, description: item.description || "" });
    } else {
      setEditingItem(null);
      setFormData({ name: "", description: "" });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setFormData({ name: "", description: "" });
  };

  const handleSave = () => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: { ...formData, is_active: true } });
    } else {
      createMutation.mutate({ ...formData, is_active: true });
    }
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this item?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Database className="w-6 h-6" />
              Manufacturing Reference Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex-wrap h-auto">
                {entities.map(entity => (
                  <TabsTrigger key={entity.key} value={entity.key}>
                    {entity.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {entities.map(entity => (
                <TabsContent key={entity.key} value={entity.key} className="mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">{entity.label}</h3>
                    <Button onClick={() => handleOpenDialog()}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add New
                    </Button>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center">Loading...</TableCell>
                        </TableRow>
                      ) : items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center">No items found</TableCell>
                        </TableRow>
                      ) : (
                        items.map(item => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>{item.description || "-"}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded text-xs ${item.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {item.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit" : "Add New"} {entities.find(e => e.key === activeTab)?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter name"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description (optional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}