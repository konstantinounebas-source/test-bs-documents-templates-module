import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function BOMManager({ busStopTypes, components, products, selectedType, onComponentsUpdated }) {
  const [currentTypeId, setCurrentTypeId] = useState(selectedType?.id || '');
  const [typeComponents, setTypeComponents] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    if (selectedType) {
      setCurrentTypeId(selectedType.id);
    }
  }, [selectedType]);

  useEffect(() => {
    if (currentTypeId) {
      loadComponents();
    }
  }, [currentTypeId, components]);

  const loadComponents = () => {
    const filtered = components
      .filter(c => c.bus_stop_type_id === currentTypeId)
      .map(c => ({
        ...c,
        quantity_required: String(c.quantity_required)
      }));
    setTypeComponents(filtered);
    setCurrentPage(1);
  };

  const handleAddComponent = () => {
    setTypeComponents([...typeComponents, {
      id: null,
      product_id: '',
      quantity_required: "1",
      is_optional: false,
      notes: ''
    }]);
  };

  const handleUpdateComponent = (index, field, value) => {
    const newComponents = [...typeComponents];
    newComponents[index][field] = value;
    setTypeComponents(newComponents);
  };

  const handleRemoveComponent = async (index) => {
    const component = typeComponents[index];
    if (component.id) {
      try {
        await base44.entities.BusStopTypeComponent.delete(component.id);
        onComponentsUpdated();
      } catch (error) {
        console.error("Error deleting component:", error);
      }
    } else {
      const newComponents = typeComponents.filter((_, i) => i !== index);
      setTypeComponents(newComponents);
    }
  };

  const handleSave = async () => {
    if (!currentTypeId) return;
    
    setIsSaving(true);
    try {
      for (const component of typeComponents) {
        if (!component.product_id) continue;
        
        const quantityNum = parseInt(component.quantity_required, 10);
        if (isNaN(quantityNum) || quantityNum < 1) {
          console.warn(`Skipping component with invalid quantity: ${component.product_id}`);
          continue;
        }
        
        const data = {
          bus_stop_type_id: currentTypeId,
          product_id: component.product_id,
          quantity_required: quantityNum,
          is_optional: component.is_optional || false,
          notes: component.notes || ''
        };

        if (component.id) {
          await base44.entities.BusStopTypeComponent.update(component.id, data);
        } else {
          await base44.entities.BusStopTypeComponent.create(data);
        }
      }
      onComponentsUpdated();
    } catch (error) {
      console.error("Error saving components:", error);
    }
    setIsSaving(false);
  };

  const getProductName = (productId) => {
    const product = products.find(p => p.id === productId);
    return product ? `${product.name} (${product.sku})` : 'Unknown Product';
  };

  // Pagination
  const totalPages = Math.ceil(typeComponents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedComponents = typeComponents.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      <div>
        <Label>Select Bus Stop Type</Label>
        <Select value={currentTypeId} onValueChange={setCurrentTypeId}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a bus stop type" />
          </SelectTrigger>
          <SelectContent>
            {busStopTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name} ({type.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {currentTypeId && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">
                Bill of Materials ({typeComponents.length} components)
              </CardTitle>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Items per page:</Label>
                <Select 
                  value={String(itemsPerPage)} 
                  onValueChange={(value) => {
                    setItemsPerPage(parseInt(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="999999">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {typeComponents.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No components added yet. Click "Add Component" to start building the BOM.
                </p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="w-32">Quantity</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="w-24 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedComponents.map((component, index) => {
                        const absoluteIndex = startIndex + index;
                        return (
                          <TableRow key={absoluteIndex}>
                            <TableCell className="font-medium text-slate-500">
                              {absoluteIndex + 1}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={component.product_id}
                                onValueChange={(value) => handleUpdateComponent(absoluteIndex, 'product_id', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select product" />
                                </SelectTrigger>
                                <SelectContent>
                                  {products.map((product) => (
                                    <SelectItem key={product.id} value={product.id}>
                                      {product.name} ({product.sku})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="1"
                                value={component.quantity_required}
                                onChange={(e) => handleUpdateComponent(absoluteIndex, 'quantity_required', e.target.value)}
                                onBlur={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  if (isNaN(val) || val < 1) {
                                    handleUpdateComponent(absoluteIndex, 'quantity_required', "1");
                                  } else {
                                    handleUpdateComponent(absoluteIndex, 'quantity_required', String(val));
                                  }
                                }}
                                className="w-24"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={component.notes || ''}
                                onChange={(e) => handleUpdateComponent(absoluteIndex, 'notes', e.target.value)}
                                placeholder="Installation notes..."
                                className="w-full"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveComponent(absoluteIndex)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4">
                      <p className="text-sm text-slate-600">
                        Showing {startIndex + 1} to {Math.min(endIndex, typeComponents.length)} of {typeComponents.length} components
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Previous
                        </Button>
                        <span className="text-sm text-slate-600">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={handleAddComponent}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Component
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving || typeComponents.length === 0}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save BOM Configuration
            </Button>
          </div>
        </>
      )}
    </div>
  );
}