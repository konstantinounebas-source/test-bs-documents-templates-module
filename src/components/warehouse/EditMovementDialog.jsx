import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import VendorSearchCombobox from "@/components/warehouse/VendorSearchCombobox";
import CreateEditVendorDialog from "@/components/warehouse/CreateEditVendorDialog";
import { base44 } from "@/api/base44Client";

export default function EditMovementDialog({ open, onClose, movement, onSave, vendors = [], productVendors = [], products = [], categories = [] }) {
  const [formData, setFormData] = useState({
    notes: '',
    waybill_number: '',
    reference_type: '',
    reference_id: '',
    unit_cost: '',
    bundle_quantity: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showCreateVendorDialog, setShowCreateVendorDialog] = useState(false);
  const [localVendors, setLocalVendors] = useState(vendors);

  useEffect(() => {
    setLocalVendors(vendors);
  }, [vendors]);

  useEffect(() => {
    if (movement) {
      // Try to get bundle_quantity from ProductVendor if available
      let bundleQty = '';
      if (movement.reference_id && movement.product_id) {
        const pv = productVendors.find(
          pv => pv.product_id === movement.product_id && pv.vendor_id === movement.reference_id
        );
        if (pv && pv.bundle_quantity) {
          bundleQty = String(pv.bundle_quantity);
        }
      }

      setFormData({
        notes: movement.notes || '',
        waybill_number: movement.waybill_number || '',
        reference_type: movement.reference_type || '',
        reference_id: movement.reference_id || '',
        unit_cost: movement.unit_cost || '',
        bundle_quantity: bundleQty
      });
    }
  }, [movement, productVendors]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // If IN movement and vendor/cost provided, update ProductVendor
      if (movement.movement_type === 'IN' && formData.reference_id && formData.unit_cost) {
        const cost = parseFloat(formData.unit_cost);
        if (!isNaN(cost) && cost > 0) {
          const existingPVs = await base44.entities.ProductVendor.filter({
            product_id: movement.product_id,
            vendor_id: formData.reference_id
          });
          
          const pvData = {
            unit_cost: cost,
            is_active: true,
            bundle_quantity: formData.bundle_quantity ? parseFloat(formData.bundle_quantity) : null
          };
          
          if (existingPVs.length === 0) {
            await base44.entities.ProductVendor.create({
              product_id: movement.product_id,
              vendor_id: formData.reference_id,
              is_preferred: false,
              ...pvData
            });
          } else {
            await base44.entities.ProductVendor.update(existingPVs[0].id, pvData);
          }
        }
      }

      await onSave(movement.id, formData);
      onClose();
    } catch (error) {
      console.error("Error saving movement:", error);
    }
    setIsSaving(false);
  };

  const handleVendorCreated = async () => {
    setShowCreateVendorDialog(false);
    const vendorsData = await base44.entities.Vendor.filter({ is_active: true });
    setLocalVendors(vendorsData);
  };

  if (!movement) return null;

  const isInMovement = movement.movement_type === 'IN';
  const product = products.find(p => p.id === movement.product_id);
  const category = product ? categories.find(c => c.id === product.category_id) : null;
  const vendorProductIds = productVendors
    .filter(pv => pv.product_id === movement.product_id && pv.is_active)
    .map(pv => pv.vendor_id);

  const unitCost = parseFloat(formData.unit_cost) || 0;
  const bundleQty = parseFloat(formData.bundle_quantity) || 0;
  const costPerPiece = unitCost > 0 && bundleQty > 0 ? (unitCost / bundleQty).toFixed(4) : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Επεξεργασία Κίνησης</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isInMovement && (
              <>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-2">
                  <p className="text-sm text-blue-900">
                    <strong>Προϊόν:</strong> {product?.name || 'N/A'}
                  </p>
                  <p className="text-sm text-blue-700 font-mono">
                    <strong>SKU:</strong> {product?.sku || 'N/A'}
                  </p>
                  {category && (
                    <p className="text-sm text-blue-700">
                      <strong>Κατηγορία:</strong> {category.name}
                    </p>
                  )}
                  <p className="text-sm text-blue-700">
                    <strong>Μονάδα Μέτρησης:</strong> {product?.unit_of_measure || 'N/A'}
                  </p>
                </div>

                <div>
                  <Label>Προμηθευτής</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <VendorSearchCombobox
                        vendors={localVendors}
                        vendorProductIds={vendorProductIds}
                        value={formData.reference_id}
                        onValueChange={(val) => setFormData({
                          ...formData,
                          reference_type: 'Vendor',
                          reference_id: val
                        })}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowCreateVendorDialog(true)}
                      title="Προσθήκη νέου προμηθευτή"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="unit_cost">Κόστος ανά μονάδα (€)</Label>
                  <Input
                    id="unit_cost"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={formData.unit_cost}
                    onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                    placeholder="0.0000"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Κόστος ανά {product?.unit_of_measure || 'μονάδα'} από αυτόν τον προμηθευτή
                  </p>
                </div>

                <div>
                  <Label htmlFor="bundle_quantity">Pcs/Qty (προαιρετικό)</Label>
                  <Input
                    id="bundle_quantity"
                    type="number"
                    min="1"
                    step="1"
                    value={formData.bundle_quantity}
                    onChange={(e) => setFormData({ ...formData, bundle_quantity: e.target.value })}
                    placeholder="π.χ. 100 τεμ."
                  />
                  {costPerPiece && (
                    <p className="text-xs text-slate-700 mt-1">
                      <strong>Κόστος ανά τεμάχιο:</strong> €{costPerPiece}
                    </p>
                  )}
                </div>
              </>
            )}

            <div>
              <Label htmlFor="waybill">Αριθμός Waybill</Label>
              <Input
                id="waybill"
                value={formData.waybill_number}
                onChange={(e) => setFormData({ ...formData, waybill_number: e.target.value })}
                placeholder="π.χ. WB-2025-001"
              />
            </div>

            <div>
              <Label htmlFor="notes">Σημειώσεις</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Προσθέστε σημειώσεις..."
                rows={4}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Ακύρωση
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Αποθήκευση
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CreateEditVendorDialog
        open={showCreateVendorDialog}
        onClose={() => setShowCreateVendorDialog(false)}
        onVendorSaved={handleVendorCreated}
      />
    </>
  );
}