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

export default function EditMovementDialog({ open, onClose, movement, onSave, vendors = [], productVendors = [], products = [], categories = [], companies = [] }) {
  const [formData, setFormData] = useState({
    notes: '',
    waybill_number: '',
    reference_type: '',
    reference_id: '',
    unit_cost: '',
    bundle_quantity: '',
    vendor_product_code: '',
    invoice_category_id: '',
    company_id: '',
    cost_input_method: 'unit',
    total_item_cost: '',
    discount: '0',
    quantity: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showCreateVendorDialog, setShowCreateVendorDialog] = useState(false);
  const [localVendors, setLocalVendors] = useState(vendors);
  const [invoiceCategories, setInvoiceCategories] = useState([]);

  useEffect(() => {
    setLocalVendors(vendors);
  }, [vendors]);

  useEffect(() => {
    if (open) {
      loadInvoiceCategories();
    }
  }, [open]);

  const loadInvoiceCategories = async () => {
    try {
      const invoiceCatsData = await base44.entities.InvoiceCategory.filter({ is_active: true });
      setInvoiceCategories(invoiceCatsData);
    } catch (error) {
      console.error("Error loading invoice categories:", error);
    }
  };

  useEffect(() => {
    if (movement) {
      // Try to get bundle_quantity, unit_cost and vendor_product_code from ProductVendor if available
      let bundleQty = '';
      let vendorUnitCost = movement.unit_cost || '';
      let vendorProdCode = movement.vendor_product_code || '';

      if (movement.reference_id && movement.product_id) {
        const pv = productVendors.find(
          pv => pv.product_id === movement.product_id && pv.vendor_id === movement.reference_id
        );
        if (pv) {
          if (pv.bundle_quantity) {
            bundleQty = String(pv.bundle_quantity);
          }
          // Auto-fill unit_cost from ProductVendor if not already set in movement
          if (!vendorUnitCost && pv.unit_cost) {
            vendorUnitCost = String(pv.unit_cost);
          }
          // Auto-fill vendor_product_code from ProductVendor if not already set
          if (!vendorProdCode && pv.vendor_product_code) {
            vendorProdCode = pv.vendor_product_code;
          }
        }
      }

      // For OUT movements without unit_cost, use product's current unit_cost
      if (movement.movement_type === 'OUT' && (!vendorUnitCost || parseFloat(vendorUnitCost) === 0)) {
        const product = products.find(p => p.id === movement.product_id);
        if (product && product.unit_cost) {
          vendorUnitCost = String(product.unit_cost);
        }
      }

      const currentProduct = products.find(p => p.id === movement.product_id);
      
      setFormData({
        notes: movement.notes || '',
        waybill_number: movement.waybill_number || '',
        reference_type: movement.reference_type || '',
        reference_id: movement.reference_id || '',
        unit_cost: vendorUnitCost,
        bundle_quantity: bundleQty,
        vendor_product_code: vendorProdCode,
        invoice_category_id: movement.invoice_category_id || '',
        company_id: currentProduct?.company_id || '',
        cost_input_method: 'unit',
        total_item_cost: '',
        discount: '0',
        quantity: movement.quantity ? String(movement.quantity) : ''
      });
    }
  }, [movement, productVendors, products]);

  // Calculate unit cost when using total cost method
  useEffect(() => {
    if (formData.cost_input_method === 'total') {
      const qty = parseFloat(formData.quantity) || 0;
      const totalCost = parseFloat(formData.total_item_cost) || 0;
      const discountVal = parseFloat(formData.discount) || 0;
      
      if (qty > 0 && totalCost > 0) {
        const adjustedTotalCost = totalCost * (1 - discountVal / 100);
        setFormData(prev => ({
          ...prev,
          unit_cost: String((adjustedTotalCost / qty).toFixed(4))
        }));
      }
    }
  }, [formData.cost_input_method, formData.total_item_cost, formData.discount, formData.quantity]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const quantity = formData.quantity ? parseFloat(formData.quantity) : movement.quantity;
      const unitCost = formData.unit_cost ? parseFloat(formData.unit_cost) : null;
      
      // Update product company_id if changed
      const currentProduct = products.find(p => p.id === movement.product_id);
      if (currentProduct && formData.company_id !== currentProduct.company_id) {
        await base44.entities.Product.update(movement.product_id, {
          company_id: formData.company_id || null
        });
      }

      // Prepare update data with quantity and unit_cost as numbers
      const updateData = {
        notes: formData.notes,
        waybill_number: formData.waybill_number,
        reference_type: formData.reference_type || null,
        reference_id: formData.reference_id || null,
        quantity: quantity,
        unit_cost: unitCost,
        bundle_quantity: formData.bundle_quantity ? parseFloat(formData.bundle_quantity) : null,
        vendor_product_code: formData.vendor_product_code || null,
        invoice_category_id: formData.invoice_category_id || null
      };
      
      console.log('Saving movement with data:', updateData);

      // If IN movement and vendor/cost provided, update ProductVendor
      if (movement.movement_type === 'IN' && formData.reference_id && unitCost) {
        if (!isNaN(unitCost) && unitCost > 0) {
          // Update ProductVendor
          const existingPVs = await base44.entities.ProductVendor.filter({
            product_id: movement.product_id,
            vendor_id: formData.reference_id
          });

          const pvData = {
            unit_cost: unitCost,
            is_active: true,
            bundle_quantity: formData.bundle_quantity ? parseFloat(formData.bundle_quantity) : null,
            vendor_product_code: formData.vendor_product_code || null
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

      await onSave(movement.id, updateData);
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
  const company = product ? companies.find(c => c.id === product.company_id) : null;
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
                <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <p className="text-xs text-blue-600 font-semibold uppercase">Προϊόν</p>
                    <p className="text-sm text-blue-900 font-medium">{product?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-semibold uppercase">SKU</p>
                    <p className="text-sm text-blue-700 font-mono">{product?.sku || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-semibold uppercase">Κατηγορία</p>
                    <p className="text-sm text-blue-700">{category?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-semibold uppercase">Μονάδα Μέτρησης</p>
                    <p className="text-sm text-blue-700">{product?.unit_of_measure || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="company_id">Εταιρεία</Label>
                  <Select 
                    value={formData.company_id || 'none'} 
                    onValueChange={(val) => setFormData({ ...formData, company_id: val === 'none' ? '' : val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Επιλέξτε εταιρεία" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Χωρίς Εταιρεία --</SelectItem>
                      {companies.filter(c => c.id && c.is_active !== false).map(comp => (
                        <SelectItem key={comp.id} value={comp.id}>{comp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                  <div>
                    <Label htmlFor="quantity">Ποσότητα *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Ποσότητα σε {product?.unit_of_measure || 'μονάδες'}
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
                  <Label>Μέθοδος Εισαγωγής Κόστους</Label>
                  <Select 
                    value={formData.cost_input_method} 
                    onValueChange={(val) => {
                      setFormData(prev => ({
                        ...prev,
                        cost_input_method: val,
                        total_item_cost: val === 'unit' ? '' : prev.total_item_cost,
                        discount: val === 'unit' ? '0' : prev.discount,
                        unit_cost: val === 'unit' ? prev.unit_cost : ''
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unit">Ανά Μονάδα</SelectItem>
                      <SelectItem value="total">Συνολικό Κόστος + Έκπτωση</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.cost_input_method === 'unit' ? (
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
                ) : (
                  <>
                    <div>
                      <Label htmlFor="total_item_cost">Συνολικό Κόστος Προϊόντος (€)</Label>
                      <Input
                        id="total_item_cost"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.total_item_cost}
                        onChange={(e) => setFormData({ ...formData, total_item_cost: e.target.value })}
                        placeholder="0.00"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Το συνολικό κόστος για {formData.quantity || 0} {product?.unit_of_measure || 'μονάδες'} πριν την έκπτωση
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="discount">Έκπτωση (%)</Label>
                      <Input
                        id="discount"
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={formData.discount}
                        onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                        placeholder="0"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Ποσοστό έκπτωσης επί του συνολικού κόστους
                      </p>
                    </div>
                    {formData.unit_cost && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-900">
                          <strong>Υπολογιζόμενο Κόστος ανά Μονάδα:</strong> €{parseFloat(formData.unit_cost).toFixed(4)}
                        </p>
                      </div>
                    )}
                  </>
                )}

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

                <div>
                  <Label htmlFor="vendor_product_code">Κωδικός Προϊόντος Προμηθευτή</Label>
                  <Input
                    id="vendor_product_code"
                    value={formData.vendor_product_code}
                    onChange={(e) => setFormData({ ...formData, vendor_product_code: e.target.value })}
                    placeholder="Κωδικός προμηθευτή"
                  />
                </div>

                <div>
                  <Label htmlFor="invoice_category">Κατηγορία Τιμολόγησης</Label>
                  <Select 
                    value={formData.invoice_category_id || 'none'} 
                    onValueChange={(val) => setFormData({ ...formData, invoice_category_id: val === 'none' ? '' : val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Επιλέξτε κατηγορία" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Χωρίς Κατηγορία --</SelectItem>
                      {invoiceCategories.map(ic => (
                        <SelectItem key={ic.id} value={ic.id}>{ic.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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