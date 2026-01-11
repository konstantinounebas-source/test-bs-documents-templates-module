import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Package, Badge } from "lucide-react";
import VendorSearchCombobox from "@/components/warehouse/VendorSearchCombobox";
import CreateEditVendorDialog from "@/components/warehouse/CreateEditVendorDialog";
import PreviousPurchasesSelector from "@/components/warehouse/PreviousPurchasesSelector";
import { base44 } from "@/api/base44Client";

export default function EditMovementDialog({ open, onClose, movement, onSave, vendors = [], productVendors = [], products = [], categories = [], companies = [] }) {
  const [formData, setFormData] = useState({
    notes: '',
    waybill_number: '',
    reference_type: '',
    reference_id: '',
    unit_cost: '',
    input_unit_subtype: '',
    conversion_rate: '',
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
  const [validationErrors, setValidationErrors] = useState({});
  const [purchaseOrders, setPurchaseOrders] = useState([]);

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
      const currentProduct = products.find(p => p.id === movement.product_id);
      
      let conversionRate = '';
      let vendorUnitCost = movement.unit_cost || '';
      let vendorProdCode = movement.vendor_product_code || '';
      let inputUnitSubtype = movement.input_unit_of_measure || currentProduct?.unit_of_measure || 'piece';

      if (movement.reference_id && movement.product_id) {
        const pv = productVendors.find(
          pv => pv.product_id === movement.product_id && pv.vendor_id === movement.reference_id
        );
        if (pv) {
          if (pv.conversion_rate) {
            conversionRate = String(pv.conversion_rate);
          } else if (pv.bundle_quantity) {
            conversionRate = String(pv.bundle_quantity);
          }
          if (!vendorUnitCost && pv.unit_cost) {
            vendorUnitCost = String(pv.unit_cost);
          }
          if (!vendorProdCode && pv.vendor_product_code) {
            vendorProdCode = pv.vendor_product_code;
          }
        }
      }

      // For OUT movements without unit_cost, use product's current unit_cost
      if (movement.movement_type === 'OUT' && (!vendorUnitCost || parseFloat(vendorUnitCost) === 0)) {
        if (currentProduct && currentProduct.unit_cost) {
          vendorUnitCost = String(currentProduct.unit_cost);
        }
      }

      setFormData({
        notes: movement.notes || '',
        waybill_number: movement.waybill_number || '',
        reference_type: movement.reference_type || '',
        reference_id: movement.reference_id || '',
        unit_cost: vendorUnitCost,
        input_unit_subtype: inputUnitSubtype,
        conversion_rate: conversionRate || '1',
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
    
    // Validation for IN movements
    const errors = {};
    if (isInMovement) {
      if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
        errors.quantity = 'Η ποσότητα είναι υποχρεωτική';
      }
      if (!formData.conversion_rate || parseFloat(formData.conversion_rate) <= 0) {
        errors.conversion_rate = 'Ο συντελεστής μετατροπής είναι υποχρεωτικός';
      }
      if (!formData.reference_id) {
        errors.reference_id = 'Ο προμηθευτής είναι υποχρεωτικός';
      }
      if (formData.cost_input_method === 'unit') {
        if (!formData.unit_cost || parseFloat(formData.unit_cost) <= 0) {
          errors.unit_cost = 'Το κόστος ανά μονάδα είναι υποχρεωτικό';
        }
      } else {
        if (!formData.total_item_cost || parseFloat(formData.total_item_cost) <= 0) {
          errors.total_item_cost = 'Το συνολικό κόστος είναι υποχρεωτικό';
        }
      }
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setValidationErrors({});
    setIsSaving(true);
    try {
      const quantity = parseFloat(formData.quantity) || 0;
      const conversionRate = parseFloat(formData.conversion_rate) || 1;
      const unitCost = parseFloat(formData.unit_cost) || 0;

      const baseQuantity = quantity * conversionRate;
      const baseUnitCost = unitCost / conversionRate;

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
        input_unit_of_measure: formData.input_unit_subtype,
        conversion_rate: conversionRate,
        base_quantity: baseQuantity,
        unit_cost: unitCost,
        base_unit_cost: baseUnitCost,
        vendor_product_code: formData.vendor_product_code || null,
        invoice_category_id: formData.invoice_category_id || null
      };
      
      console.log('Saving movement with data:', updateData);

      // If IN movement and vendor/cost provided, update ProductVendor
      if (movement.movement_type === 'IN' && formData.reference_id && unitCost) {
        if (!isNaN(unitCost) && unitCost > 0) {
          const existingPVs = await base44.entities.ProductVendor.filter({
            product_id: movement.product_id,
            vendor_id: formData.reference_id
          });

          const pvData = {
            unit_cost: unitCost,
            is_active: true,
            conversion_rate: conversionRate,
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
  const conversionRate = parseFloat(formData.conversion_rate) || 1;
  const costPerBaseUnit = unitCost > 0 && conversionRate > 0 ? (unitCost / conversionRate).toFixed(4) : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Επεξεργασία Κίνησης</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Product Info Box */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <Package className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base text-blue-900">{product?.name || 'N/A'}</p>
                    </div>
                    <Badge className="bg-blue-600 text-white flex-shrink-0">Matched ✓</Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-blue-700 font-mono">
                      <span className="font-semibold">SKU:</span> {product?.sku || 'N/A'}
                    </p>
                    <p className="text-sm text-blue-600">
                      <span className="font-semibold">Βασική Μονάδα:</span> {product?.unit_of_measure || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {isInMovement && (
              <>
                <PreviousPurchasesSelector
                  productId={movement?.product_id}
                  vendors={vendors}
                  companies={companies}
                  invoiceCategories={invoiceCategories}
                  onSelect={(data) => {
                    if (data) {
                      setFormData(prev => ({
                        ...prev,
                        reference_type: 'Vendor',
                        reference_id: data.vendor_id || '',
                        unit_cost: data.unit_cost ? String(data.unit_cost) : '',
                        conversion_rate: data.conversion_rate ? String(data.conversion_rate) : (data.bundle_quantity ? String(data.bundle_quantity) : ''),
                        input_unit_subtype: data.input_unit_of_measure || '',
                        vendor_product_code: data.vendor_product_code || '',
                        invoice_category_id: data.invoice_category_id || '',
                        company_id: data.company_id || ''
                      }));
                    }
                  }}
                />

                {/* Warehouse Location */}
                <div className="border-t pt-4">
                  <Label htmlFor="warehouse_location">Θέση Αποθήκης</Label>
                  <Input
                    id="warehouse_location"
                    value={formData.warehouse_location || ''}
                    onChange={(e) => setFormData({ ...formData, warehouse_location: e.target.value })}
                    placeholder="π.χ. Ράφι A1"
                  />
                </div>

                {/* Company & Invoice Category */}
                <div className="grid grid-cols-2 gap-3 border-t pt-4">
                  <div>
                    <Label>Εταιρεία *</Label>
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
                    <Label htmlFor="invoice_category">Κατηγορία Τιμολόγησης *</Label>
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
                          <SelectItem key={ic.id} value={ic.id}>
                            <div>
                              <div className="font-medium">{ic.name}</div>
                              {ic.description && (
                                <div className="text-xs text-slate-500">{ic.description}</div>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Vendor Information */}
                <div className="space-y-3 border-t pt-4">
                  <p className="text-sm font-semibold text-slate-700">Στοιχεία Προμηθευτή</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Προμηθευτής *</Label>
                      <div className="flex gap-2">
                        <div className={`flex-1 ${validationErrors.reference_id ? 'border-2 border-red-500 rounded-md' : ''}`}>
                          <VendorSearchCombobox
                            vendors={localVendors}
                            vendorProductIds={vendorProductIds}
                            value={formData.reference_id}
                            onValueChange={(val) => {
                              setFormData({
                                ...formData,
                                reference_type: 'Vendor',
                                reference_id: val
                              });
                              if (validationErrors.reference_id) {
                                setValidationErrors({ ...validationErrors, reference_id: undefined });
                              }
                            }}
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
                      {validationErrors.reference_id && (
                        <p className="text-xs text-red-600 mt-1">{validationErrors.reference_id}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="vendor_product_code">Κωδικός Προϊόντος Προμηθευτή *</Label>
                      <Input
                        id="vendor_product_code"
                        value={formData.vendor_product_code}
                        onChange={(e) => setFormData({ ...formData, vendor_product_code: e.target.value })}
                        placeholder="Κωδικός προμηθευτή"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="invoice-number">Αριθμός Τιμολογίου</Label>
                      <Input
                        id="invoice-number"
                        value={formData.invoice_number || ''}
                        onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                        placeholder="π.χ. INV-2025-001"
                      />
                    </div>
                    <div>
                      <Label htmlFor="po-number">Αριθμός PO</Label>
                      <Input
                        id="po-number"
                        value={formData.po_number || ''}
                        onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                        placeholder="π.χ. PO-2025-001"
                      />
                    </div>
                  </div>
                </div>

                {/* Quantity & Cost */}
                <div className="space-y-3 border-t pt-4">
                  <p className="text-sm font-semibold text-slate-700">Ποσότητα & Κόστος</p>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="quantity">Ποσότητα *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={formData.quantity}
                        onChange={(e) => {
                          setFormData({ ...formData, quantity: e.target.value });
                          if (validationErrors.quantity) {
                            setValidationErrors({ ...validationErrors, quantity: undefined });
                          }
                        }}
                        placeholder="0.00"
                        required
                        className={validationErrors.quantity ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      />
                      {validationErrors.quantity && (
                        <p className="text-xs text-red-600 mt-1">{validationErrors.quantity}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="input_unit_subtype">Μονάδα Εισαγ.</Label>
                      <Select
                        value={formData.input_unit_subtype || product?.unit_of_measure}
                        onValueChange={(val) => {
                          let newConversionRate = formData.conversion_rate;
                          if (product?.unit_of_measure === 'kg') {
                            if (val === 'g') newConversionRate = '0.001';
                            else if (val === 'kg') newConversionRate = '1';
                            else if (val === 'ton') newConversionRate = '1000';
                          } else if (product?.unit_of_measure === 'liter') {
                            if (val === 'ml') newConversionRate = '0.001';
                            else if (val === 'liter') newConversionRate = '1';
                          } else if (product?.unit_of_measure === 'meter') {
                            if (val === 'cm') newConversionRate = '0.01';
                            else if (val === 'mm') newConversionRate = '0.001';
                            else if (val === 'meter') newConversionRate = '1';
                          } else if (product?.unit_of_measure === 'piece') {
                            if (val === 'piece') newConversionRate = '1';
                          }
                          setFormData({ ...formData, input_unit_subtype: val, conversion_rate: newConversionRate });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Επιλέξτε υπομονάδα" />
                        </SelectTrigger>
                        <SelectContent>
                          {product?.unit_of_measure === 'kg' && (
                            <>
                              <SelectItem value="g">Γραμμάρια (g)</SelectItem>
                              <SelectItem value="kg">Κιλά (kg)</SelectItem>
                              <SelectItem value="ton">Τόνοι (ton)</SelectItem>
                            </>
                          )}
                          {product?.unit_of_measure === 'liter' && (
                            <>
                              <SelectItem value="ml">Χιλιοστόλιτρα (ml)</SelectItem>
                              <SelectItem value="liter">Λίτρα (L)</SelectItem>
                            </>
                          )}
                          {product?.unit_of_measure === 'meter' && (
                            <>
                              <SelectItem value="mm">Χιλιοστόμετρα (mm)</SelectItem>
                              <SelectItem value="cm">Εκατοστόμετρα (cm)</SelectItem>
                              <SelectItem value="meter">Μέτρα (m)</SelectItem>
                            </>
                          )}
                          {product?.unit_of_measure === 'piece' && (
                            <>
                              <SelectItem value="piece">Τεμάχια</SelectItem>
                              <SelectItem value="box">Κουτιά</SelectItem>
                              <SelectItem value="pallet">Παλέτες</SelectItem>
                            </>
                          )}
                          {!['kg', 'liter', 'meter', 'piece'].includes(product?.unit_of_measure) && (
                            <SelectItem value={product?.unit_of_measure}>{product?.unit_of_measure}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="bundle_qty">Pcs/Qty</Label>
                      <Input
                        id="bundle_qty"
                        type="number"
                        min="1"
                        step="1"
                        value={formData.bundle_quantity || ''}
                        onChange={(e) => setFormData({ ...formData, bundle_quantity: e.target.value })}
                        placeholder="π.χ. 100"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="conversion_rate">
                        {formData.input_unit_subtype || product?.unit_of_measure} ανά {product?.unit_of_measure} *
                      </Label>
                      <Input
                        id="conversion_rate"
                        type="number"
                        min="0.0001"
                        step="0.0001"
                        value={formData.conversion_rate}
                        onChange={(e) => {
                          setFormData({ ...formData, conversion_rate: e.target.value });
                          if (validationErrors.conversion_rate) {
                            setValidationErrors({ ...validationErrors, conversion_rate: undefined });
                          }
                        }}
                        placeholder="Συντελεστής"
                        className={validationErrors.conversion_rate ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      />
                      {validationErrors.conversion_rate && (
                        <p className="text-xs text-red-600 mt-1">{validationErrors.conversion_rate}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        (π.χ. αν 1 {formData.input_unit_subtype || product?.unit_of_measure} = 0.001 {product?.unit_of_measure})
                      </p>
                    </div>
                    {costPerBaseUnit && unitCost > 0 && (
                      <div>
                        <Label>Κόστος ανά {product?.unit_of_measure || 'μονάδα'}</Label>
                        <div className="flex items-center h-10 px-3 bg-slate-100 rounded-md border">
                          <span className="text-sm font-medium">€{costPerBaseUnit}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Υπολογιζόμενο κόστος βασικής μονάδας
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 mt-1">
                      Ποσότητα στην βασική μονάδα: {(parseFloat(formData.quantity) * parseFloat(formData.conversion_rate) || 0).toFixed(2)} {product?.unit_of_measure || 'μονάδες'}
                    </p>
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
                      <Label htmlFor="unit_cost">Κόστος ανά μονάδα (€) *</Label>
                      <Input
                        id="unit_cost"
                        type="number"
                        step="0.0001"
                        min="0"
                        value={formData.unit_cost}
                        onChange={(e) => {
                          setFormData({ ...formData, unit_cost: e.target.value });
                          if (validationErrors.unit_cost) {
                            setValidationErrors({ ...validationErrors, unit_cost: undefined });
                          }
                        }}
                        placeholder="0.0000"
                        className={validationErrors.unit_cost ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      />
                      {validationErrors.unit_cost ? (
                        <p className="text-xs text-red-600 mt-1">{validationErrors.unit_cost}</p>
                      ) : (
                        <p className="text-xs text-slate-500 mt-1">
                          Κόστος ανά {product?.unit_of_measure || 'μονάδα'}
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <div>
                        <Label htmlFor="total_item_cost">Συνολικό Κόστος Προϊόντος (€) *</Label>
                        <Input
                          id="total_item_cost"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.total_item_cost}
                          onChange={(e) => {
                            setFormData({ ...formData, total_item_cost: e.target.value });
                            if (validationErrors.total_item_cost) {
                              setValidationErrors({ ...validationErrors, total_item_cost: undefined });
                            }
                          }}
                          placeholder="0.00"
                          className={validationErrors.total_item_cost ? 'border-red-500 focus-visible:ring-red-500' : ''}
                        />
                        {validationErrors.total_item_cost ? (
                          <p className="text-xs text-red-600 mt-1">{validationErrors.total_item_cost}</p>
                        ) : (
                          <p className="text-xs text-slate-500 mt-1">
                            Το συνολικό κόστος για {formData.quantity || 0} {product?.unit_of_measure || 'μονάδες'} πριν την έκπτωση
                          </p>
                        )}
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

                      {/* Additional Details */}
                      <div className="space-y-3 border-t pt-4">
                      <p className="text-sm font-semibold text-slate-700">Πρόσθετα Στοιχεία</p>

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
                      </div>
                      </>
                      )}

                      {/* Common fields for all movement types */}
                      {!isInMovement && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="quantity-common">Ποσότητα *</Label>
                  <Input
                    id="quantity-common"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Ποσότητα σε {product?.unit_of_measure || 'μονάδες'}
                  </p>
                </div>

                <div>
                  <Label htmlFor="waybill-common">Αριθμός Waybill</Label>
                  <Input
                    id="waybill-common"
                    value={formData.waybill_number}
                    onChange={(e) => setFormData({ ...formData, waybill_number: e.target.value })}
                    placeholder="π.χ. WB-2025-001"
                  />
                </div>

                <div>
                  <Label htmlFor="notes-common">Σημειώσεις</Label>
                  <Textarea
                    id="notes-common"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Προσθέστε σημειώσεις..."
                    rows={4}
                  />
                </div>
              </div>
            )}

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