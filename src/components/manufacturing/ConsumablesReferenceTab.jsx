import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Save, Trash2, Edit2, Package } from "lucide-react";
import { toast } from "sonner";

export default function ConsumablesReferenceTab({ departments = [] }) {
  const queryClient = useQueryClient();
  const [editingItem, setEditingItem] = useState(null);
  const [selectedBusStopTypeId, setSelectedBusStopTypeId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [customName, setCustomName] = useState("");
  const [selectedDeptIds, setSelectedDeptIds] = useState([]);

  // Fetch BusStopTypes (BOM types)
  const { data: busStopTypes = [] } = useQuery({
    queryKey: ["BusStopType"],
    queryFn: () => base44.entities.BusStopType.list(),
  });

  // Fetch BOM components for the selected BusStopType
  const { data: bomComponents = [] } = useQuery({
    queryKey: ["BusStopTypeComponent", selectedBusStopTypeId],
    queryFn: () =>
      base44.entities.BusStopTypeComponent.filter({
        bus_stop_type_id: selectedBusStopTypeId,
      }),
    enabled: !!selectedBusStopTypeId,
  });

  // Fetch all products (for resolving names from BOM)
  const { data: allProducts = [] } = useQuery({
    queryKey: ["Product"],
    queryFn: () => base44.entities.Product.list(),
  });

  // Fetch existing consumables
  const { data: consumables = [], isLoading } = useQuery({
    queryKey: ["Consumable"],
    queryFn: () => base44.entities.Consumable.list(),
  });

  // Resolve BOM components with product details
  const bomProductOptions = bomComponents
    .map((comp) => {
      const product = allProducts.find((p) => p.id === comp.product_id);
      if (!product) return null;
      return { ...product, bom_component_id: comp.id };
    })
    .filter(Boolean);

  const selectedProduct = allProducts.find((p) => p.id === selectedProductId);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Consumable.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["Consumable"]);
      resetForm();
      toast.success("Consumable added successfully");
    },
    onError: () => toast.error("Failed to add consumable"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Consumable.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["Consumable"]);
      resetForm();
      toast.success("Consumable updated successfully");
    },
    onError: () => toast.error("Failed to update consumable"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Consumable.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["Consumable"]);
      toast.success("Consumable deleted");
    },
    onError: () => toast.error("Failed to delete consumable"),
  });

  const resetForm = () => {
    setEditingItem(null);
    setSelectedBusStopTypeId("");
    setSelectedProductId("");
    setCustomName("");
    setSelectedDeptIds([]);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setCustomName(item.name);
    setSelectedDeptIds(item.department_ids || []);
    setSelectedProductId(item.product_id || "");
    setSelectedBusStopTypeId("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = customName.trim() || selectedProduct?.name || "";
    if (!name) {
      toast.error("Please select a product or enter a name");
      return;
    }

    const data = {
      name,
      product_id: selectedProductId || undefined,
      sku: selectedProduct?.sku || undefined,
      unit_of_measure: selectedProduct?.unit_of_measure || undefined,
      description: selectedProduct?.description || undefined,
      department_ids: selectedDeptIds,
      is_active: true,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const toggleDept = (id) => {
    setSelectedDeptIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const handleProductSelect = (productId) => {
    setSelectedProductId(productId);
    const product = allProducts.find((p) => p.id === productId);
    if (product) setCustomName(product.name);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5" />
            {editingItem ? "Edit Consumable" : "Add Consumable"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Step 1: Select BOM Type */}
            {!editingItem && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Step 1: Select BOM Type</Label>
                  <Select value={selectedBusStopTypeId} onValueChange={setSelectedBusStopTypeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a Bus Stop Type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {busStopTypes.map((bst) => (
                        <SelectItem key={bst.id} value={bst.id}>
                          {bst.name} {bst.code ? `(${bst.code})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Step 2: Select Product from BOM */}
                <div>
                  <Label>
                    Step 2: Select Product from BOM
                    {selectedBusStopTypeId && bomProductOptions.length === 0 && (
                      <span className="text-orange-500 text-xs ml-2">(No products in this BOM)</span>
                    )}
                  </Label>
                  <Select
                    value={selectedProductId}
                    onValueChange={handleProductSelect}
                    disabled={!selectedBusStopTypeId || bomProductOptions.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={selectedBusStopTypeId ? "Select a product..." : "Select BOM type first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {bomProductOptions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} {p.sku ? `[${p.sku}]` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Consumable Name */}
            <div>
              <Label>Consumable Name *</Label>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Name (auto-filled from product or enter manually)"
                required
              />
              {selectedProduct && (
                <p className="text-xs text-slate-500 mt-1">
                  SKU: {selectedProduct.sku} | Unit: {selectedProduct.unit_of_measure}
                </p>
              )}
            </div>

            {/* Departments */}
            <div>
              <Label>
                Departments{" "}
                <span className="text-slate-400 font-normal text-xs">
                  (leave empty = applies to all departments)
                </span>
              </Label>
              <div className="border rounded-lg p-3 mt-1 flex flex-wrap gap-3 max-h-32 overflow-y-auto">
                {departments.length === 0 ? (
                  <p className="text-xs text-slate-400">No departments defined yet</p>
                ) : (
                  departments.map((dept) => (
                    <label key={dept.id} className="flex items-center gap-1.5 cursor-pointer text-sm">
                      <Checkbox
                        checked={selectedDeptIds.includes(dept.id)}
                        onCheckedChange={() => toggleDept(dept.id)}
                      />
                      {dept.name}
                    </label>
                  ))
                )}
              </div>
              {selectedDeptIds.length > 0 && (
                <p className="text-xs text-blue-600 mt-1">
                  Assigned to {selectedDeptIds.length} department(s)
                </p>
              )}
            </div>

            <div className="flex gap-2">
              {editingItem && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {editingItem ? "Update" : "Add"} Consumable
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Existing Consumables ({consumables.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : consumables.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No consumables found. Add your first one above.
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Departments</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consumables.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-slate-500 text-sm">{item.sku || "-"}</TableCell>
                      <TableCell className="text-slate-500 text-sm">{item.unit_of_measure || "-"}</TableCell>
                      <TableCell>
                        {item.department_ids && item.department_ids.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {item.department_ids.map((dId) => {
                              const dept = departments.find((d) => d.id === dId);
                              return dept ? (
                                <Badge key={dId} variant="outline" className="text-xs">
                                  {dept.name}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">All departments</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.is_active !== false ? (
                          <Badge className="bg-green-100 text-green-700">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
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
                            className="text-red-600 hover:text-red-700"
                            onClick={() => {
                              if (confirm("Delete this consumable?")) {
                                deleteMutation.mutate(item.id);
                              }
                            }}
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
  );
}