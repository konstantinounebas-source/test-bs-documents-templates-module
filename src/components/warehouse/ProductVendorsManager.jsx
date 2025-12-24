import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Star, StarOff, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ProductVendorsManager({ product, vendors, onUpdate }) {
  const [recentMovements, setRecentMovements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    vendor_id: null, // Changed from '' to null for better Select component behavior (placeholder display)
    vendor_product_code: '',
    unit_cost: 0,
    lead_time_days: 14,
    is_preferred: false,
    minimum_order_quantity: 1,
    notes: '',
    is_active: true
  });

  useEffect(() => {
    if (product?.id) {
      loadProductVendors();
    }
  }, [product?.id]);

  const loadProductVendors = async () => {
    setIsLoading(true);
    try {
      // Load recent IN movements for this product (latest 10)
      const movements = await base44.entities.StockMovement.filter({
        product_id: product.id,
        movement_type: 'IN'
      });
      
      // Get latest 10 movements
      const latestMovements = movements
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
        .slice(0, 10);
      
      setRecentMovements(latestMovements);
    } catch (error) {
      console.error("Error loading IN movements:", error);
    }
    setIsLoading(false);
  };

  const handleAdd = () => {
    setEditingPV(null);
    setFormData({
      vendor_id: null, // Changed from '' to null
      vendor_product_code: '',
      unit_cost: 0,
      lead_time_days: 14,
      is_preferred: false,
      minimum_order_quantity: 1,
      notes: '',
      is_active: true
    });
    setShowDialog(true);
  };

  const handleEdit = (pv) => {
    setEditingPV(pv);
    setFormData({
      vendor_id: pv.vendor_id,
      vendor_product_code: pv.vendor_product_code || '',
      unit_cost: pv.unit_cost || 0,
      lead_time_days: pv.lead_time_days || 14,
      is_preferred: pv.is_preferred || false,
      minimum_order_quantity: pv.minimum_order_quantity || 1,
      notes: pv.notes || '',
      is_active: pv.is_active !== undefined ? pv.is_active : true
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    try {
      const dataToSave = {
        ...formData,
        product_id: product.id
      };
      
      if (editingPV) {
        await base44.entities.ProductVendor.update(editingPV.id, dataToSave);
      } else {
        await base44.entities.ProductVendor.create(dataToSave);
      }
      
      await loadProductVendors();
      setShowDialog(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error saving product vendor:", error);
    }
  };

  const handleTogglePreferred = async (pv) => {
    try {
      // If setting as preferred, unset all others first
      if (!pv.is_preferred) {
        const updates = productVendors
          .filter(p => p.is_preferred && p.id !== pv.id)
          .map(p => base44.entities.ProductVendor.update(p.id, { is_preferred: false }));
        await Promise.all(updates);
      }
      
      await base44.entities.ProductVendor.update(pv.id, { is_preferred: !pv.is_preferred });
      await loadProductVendors();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error toggling preferred vendor:", error);
    }
  };

  const handleDelete = async () => {
    if (!pvToDelete) return;
    try {
      await base44.entities.ProductVendor.delete(pvToDelete.id);
      await loadProductVendors();
      setShowDeleteDialog(false);
      setPvToDelete(null);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error deleting product vendor:", error);
    }
  };

  const getVendorName = (vendorId) => {
    const vendor = vendors.find(v => v.id === vendorId);
    return vendor?.name || 'Unknown';
  };

  if (!product) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Vendors & Pricing</CardTitle>
          <Button onClick={handleAdd} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Vendor
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading vendors...</p>
        ) : productVendors.length === 0 ? (
          <p className="text-sm text-slate-500">No vendors configured for this product.</p>
        ) : (
          <div className="space-y-4">
            {/* Average Cost Section - Always Show */}
            <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-900">Μέσος Όρος Κόστους (από IN κινήσεις)</p>
                  <p className="text-xs text-blue-700 mt-1">
                    {product.unit_cost && product.unit_cost > 0 ? (
                      <>Υπολογισμένος από {product.total_quantity_purchased || 0} {product.unit_of_measure} συνολικά</>
                    ) : (
                      <>Δεν υπάρχουν IN κινήσεις με κόστος ακόμα</>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-900">
                    {product.unit_cost && product.unit_cost > 0 ? (
                      <>€{product.unit_cost.toFixed(4)}</>
                    ) : (
                      <span className="text-slate-400">€0.00</span>
                    )}
                  </p>
                  {product.last_unit_cost && product.last_unit_cost > 0 && (
                    <p className="text-xs text-blue-700">Τελευταία τιμή: €{product.last_unit_cost.toFixed(4)}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Vendor Code</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Lead Time</TableHead>
                    <TableHead>Min Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productVendors.map((pv) => (
                    <TableRow key={pv.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {pv.is_preferred && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                          {getVendorName(pv.vendor_id)}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{pv.vendor_product_code || '-'}</TableCell>
                      <TableCell className="font-semibold">€{pv.unit_cost?.toFixed(2)}</TableCell>
                      <TableCell>{pv.lead_time_days || 0} days</TableCell>
                      <TableCell>{pv.minimum_order_quantity || 1}</TableCell>
                      <TableCell>
                        <Badge className={pv.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {pv.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleTogglePreferred(pv)}
                            title={pv.is_preferred ? "Remove as preferred" : "Set as preferred"}
                          >
                            {pv.is_preferred ? (
                              <StarOff className="w-4 h-4 text-yellow-500" />
                            ) : (
                              <Star className="w-4 h-4 text-gray-400" />
                            )}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(pv)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              setPvToDelete(pv);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {/* Recent IN Movements - Always Show Section */}
                  <TableRow>
                    <TableCell colSpan={7} className="bg-slate-50">
                      <p className="text-xs font-semibold text-slate-600">
                        Πρόσφατες IN Κινήσεις {recentMovements.length > 0 && `(${recentMovements.length})`}
                      </p>
                    </TableCell>
                  </TableRow>
                  {recentMovements.length > 0 ? (
                    recentMovements.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell>
                          <div className="text-sm font-medium">
                            {movement.reference_type === 'Vendor' && movement.reference_id 
                              ? getVendorName(movement.reference_id) 
                              : (movement.reference_type || 'Manual Entry')}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {movement.waybill_number || '-'}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {movement.unit_cost && movement.unit_cost > 0 ? (
                            <>€{Number(movement.unit_cost).toFixed(4)}</>
                          ) : (
                            <span className="text-slate-400">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>-</TableCell>
                        <TableCell className="text-sm text-slate-600">{movement.quantity} {product.unit_of_measure}</TableCell>
                        <TableCell>
                          <Badge className="bg-blue-100 text-blue-800">IN</Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs text-slate-600">
                          {new Date(movement.created_date).toLocaleDateString('el-GR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow className="bg-slate-50/50">
                      <TableCell colSpan={7} className="text-center text-sm text-slate-500 py-4">
                        Δεν υπάρχουν IN κινήσεις για αυτό το προϊόν
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingPV ? 'Edit' : 'Add'} Vendor</DialogTitle>
              <DialogDescription>
                Configure vendor-specific pricing and lead times for this product.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="vendor">Vendor *</Label>
                <Select
                  value={formData.vendor_id || ''} // Ensure Select value is a string, even if null. If it's null, placeholder will show.
                  onValueChange={(value) => setFormData({...formData, vendor_id: value})}
                  disabled={!!editingPV}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.filter(v => v.id && v.is_active).map((vendor) => ( // Added v.id check for robustness
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vendor_product_code">Vendor Product Code</Label>
                  <Input
                    id="vendor_product_code"
                    value={formData.vendor_product_code}
                    onChange={(e) => setFormData({...formData, vendor_product_code: e.target.value})}
                    placeholder="Code from vendor's catalog"
                  />
                </div>

                <div>
                  <Label htmlFor="unit_cost">Unit Cost (€) *</Label>
                  <Input
                    id="unit_cost"
                    type="number"
                    step="0.01"
                    value={formData.unit_cost}
                    onChange={(e) => setFormData({...formData, unit_cost: parseFloat(e.target.value) || 0})}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lead_time_days">Lead Time (days)</Label>
                  <Input
                    id="lead_time_days"
                    type="number"
                    value={formData.lead_time_days}
                    onChange={(e) => setFormData({...formData, lead_time_days: parseInt(e.target.value) || 0})}
                  />
                </div>

                <div>
                  <Label htmlFor="minimum_order_quantity">Minimum Order Quantity</Label>
                  <Input
                    id="minimum_order_quantity"
                    type="number"
                    value={formData.minimum_order_quantity}
                    onChange={(e) => setFormData({...formData, minimum_order_quantity: parseInt(e.target.value) || 1})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_preferred"
                    checked={formData.is_preferred}
                    onCheckedChange={(checked) => setFormData({...formData, is_preferred: checked})}
                  />
                  <Label htmlFor="is_preferred">Preferred Vendor</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!formData.vendor_id || !formData.unit_cost}>
                {editingPV ? 'Update' : 'Add'} Vendor
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Vendor Relationship</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove this vendor from this product? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}