import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, ArrowLeft, Loader2, CheckCircle, Package, Plus, X, Upload, ImageIcon, ShoppingCart, TrendingUp, TrendingDown, Move, Activity, Calculator, Edit } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import PreviousPurchasesSelector from "./PreviousPurchasesSelector";

import CreateEditVendorDialog from "./CreateEditVendorDialog";
import PersonSearchCombobox from "./PersonSearchCombobox";
import { Badge } from "@/components/ui/badge";

export default function BarcodeInputStepper({
  open,
  onClose,
  matchedProduct,
  movementType: initialMovementType,
  onMovementSubmit,
  isProcessing,
  scanResult,
  products,
  stockItems,
  locations,
  purchaseOrders,
  systemUsers,
  appUsers,
  vendors,
  productVendors,
  companies,
  invoiceCategories,
  currentUser,
  scannedBarcode,
  getAvailableStockAtLocation,
  getAvailableLocationsForProduct,
  handlePhotoUpload,
  removePhoto,
  uploadedPhotos,
  isUploadingPhoto,
  photoInputRef,
  setScanResult,
  loadData,
  getProductStock
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    movementType: initialMovementType,
    quantity: "1",
    fromLocation: "",
    toLocation: "",
    selectedPO: "",
    associateWithPO: false,
    invoiceNumber: "",
    waybillNumber: "",
    chargedToPerson: "",
    selectedVendor: "",
    selectedCompany: "",
    vendorProductCode: "",
    selectedInvoiceCategory: "",
    costInputMethod: "total",
    unitCost: "",
    totalItemCost: "",
    discount: "0",
    bundleQuantity: "",
    inputUnitSubtype: "",
    conversionRate: "1",
    notes: "",
  });

  const [poItemInfo, setPOItemInfo] = useState(null);
  const [showCreateVendorDialog, setShowCreateVendorDialog] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);

  useEffect(() => {
    if (open) {
      // Determine default inputUnitSubtype based on product's unit_of_measure
      const defaultInputUnitSubtype = matchedProduct?.unit_of_measure === 'piece' || matchedProduct?.unit_of_measure === 'box' || matchedProduct?.unit_of_measure === 'pallet' ? 'piece' : matchedProduct?.unit_of_measure;

      setCurrentStep(1);
      setFormData({
        movementType: initialMovementType,
        quantity: "1",
        fromLocation: "",
        toLocation: "",
        selectedPO: "",
        associateWithPO: false,
        invoiceNumber: "",
        waybillNumber: "",
        chargedToPerson: "",
        selectedVendor: "",
        selectedCompany: "",
        vendorProductCode: "",
        selectedInvoiceCategory: "",
        costInputMethod: "total",
        unitCost: "",
        totalItemCost: "",
        discount: "0",
        bundleQuantity: "1",
        inputUnitSubtype: defaultInputUnitSubtype || "",
        conversionRate: "1",
        notes: "",
      });
      setPOItemInfo(null);
    }
  }, [open, initialMovementType, matchedProduct]);

  useEffect(() => {
    if (formData.selectedPO && matchedProduct && formData.movementType === "IN") {
      const po = purchaseOrders.find(p => p.id === formData.selectedPO);
      if (po) {
        handleFormChange('selectedVendor', po.vendor_id);

        const poItem = po.items.find(item => item.product_id === matchedProduct.id);
        if (poItem) {
          const quantityOrdered = poItem.quantity_ordered;
          const quantityReceived = poItem.quantity_received || 0;
          const quantityRemaining = quantityOrdered - quantityReceived;

          setPOItemInfo({
            quantityOrdered,
            quantityReceived,
            quantityRemaining,
            unitCost: poItem.unit_cost,
            bundleQuantity: poItem.bundle_quantity
          });

          setFormData(prev => ({
            ...prev,
            unitCost: String(poItem.unit_cost),
            bundleQuantity: String(poItem.bundle_quantity || ''),
            vendorProductCode: poItem.vendor_product_code || ''
          }));

          if (quantityRemaining > 0 && parseInt(formData.quantity) > quantityRemaining) {
            handleFormChange('quantity', String(quantityRemaining));
          }
        } else {
          setPOItemInfo(null);
        }
      }
    } else {
      setPOItemInfo(null);
    }
  }, [formData.selectedPO, matchedProduct, formData.movementType, purchaseOrders, formData.quantity]);

  useEffect(() => {
    if (formData.movementType === "IN" && formData.selectedVendor && matchedProduct && !formData.selectedPO) {
      const pv = productVendors.find(
        pv => pv.product_id === matchedProduct.id && pv.vendor_id === formData.selectedVendor && pv.is_active
      );
      if (pv && pv.unit_cost) {
        setFormData(prev => ({
          ...prev,
          unitCost: String(pv.unit_cost),
          bundleQuantity: String(pv.bundle_quantity || '')
        }));
      }
    }
  }, [formData.selectedVendor, matchedProduct, formData.movementType, formData.selectedPO, productVendors]);

  useEffect(() => {
    if (formData.costInputMethod === 'total' && formData.movementType === "IN" && !formData.selectedPO) {
      const qty = parseFloat(formData.quantity) || 0;
      const totalCost = parseFloat(formData.totalItemCost) || 0;
      const discountVal = parseFloat(formData.discount) || 0;

      if (qty > 0 && totalCost > 0) {
        const adjustedTotalCost = totalCost * (1 - discountVal / 100);
        setFormData(prev => ({ ...prev, unitCost: String((adjustedTotalCost / qty).toFixed(4)) }));
      }
    }
  }, [formData.costInputMethod, formData.quantity, formData.totalItemCost, formData.discount, formData.movementType, formData.selectedPO]);

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    const actualSteps = getStepsForMovementType();
    const currentIndex = actualSteps.indexOf(currentStep);
    const nextStep = actualSteps[currentIndex + 1];
    
    let isValid = true;
    let errorMessage = "";

    // Validate current step
    if (currentStep === 1) {
      // Movement type already selected from main screen
    } else if (currentStep === 2) {
      if (formData.movementType === "OUT" && !formData.fromLocation) {
        isValid = false;
        errorMessage = "Παρακαλώ επιλέξτε Από Θέση για εξαγωγή.";
      }
      if (formData.movementType === "TRANSFER" && !formData.fromLocation) {
        isValid = false;
        errorMessage = "Παρακαλώ επιλέξτε Από Θέση για μεταφορά.";
      }
      if (!formData.toLocation && (formData.movementType === "TRANSFER" || formData.movementType === "IN" || formData.movementType === "ADJUSTMENT")) {
        isValid = false;
        errorMessage = "Παρακαλώ επιλέξτε Θέση Αποθήκης.";
      }
      if (formData.associateWithPO && !formData.selectedPO) {
        isValid = false;
        errorMessage = "Παρακαλώ επιλέξτε ένα PO.";
      }
      if (formData.associateWithPO && poItemInfo && poItemInfo.quantityRemaining <= 0) {
        isValid = false;
        errorMessage = "Το προϊόν έχει ήδη παραληφθεί πλήρως για αυτό το PO.";
      }
      if (formData.associateWithPO && formData.selectedPO && !poItemInfo) {
        isValid = false;
        errorMessage = "Το προϊόν δεν περιλαμβάνεται στο επιλεγμένο PO.";
      }
    } else if (currentStep === 3) {
      if (formData.movementType === "IN" && !formData.associateWithPO) {
        if (!formData.selectedVendor) {
          isValid = false;
          errorMessage = "Παρακαλώ επιλέξτε Προμηθευτή.";
        }
        if (!formData.vendorProductCode.trim()) {
          isValid = false;
          errorMessage = "Παρακαλώ εισάγετε Κωδικό Προϊόντος Προμηθευτή.";
        }
      } else if (formData.movementType === "OUT" && !formData.chargedToPerson) {
        isValid = false;
        errorMessage = "Παρακαλώ επιλέξτε σε ποιον θα χρεωθεί το υλικό.";
      }
    } else if (currentStep === 4) {
      if (formData.movementType === "IN") {
        if (!formData.selectedCompany) {
          isValid = false;
          errorMessage = "Παρακαλώ επιλέξτε Εταιρεία.";
        }
        if (!formData.selectedInvoiceCategory) {
          isValid = false;
          errorMessage = "Παρακαλώ επιλέξτε Κατηγορία Τιμολόγησης.";
        }
      }
    } else if (currentStep === 5) {
      const qtyNum = parseInt(formData.quantity);
      if (!qtyNum || qtyNum < 1) {
        isValid = false;
        errorMessage = "Παρακαλώ εισάγετε έγκυρη ποσότητα (τουλάχιστον 1).";
      }
      if (formData.movementType === "IN") {
        if (formData.costInputMethod === "unit" && (!formData.unitCost || isNaN(parseFloat(formData.unitCost)) || parseFloat(formData.unitCost) < 0)) {
          isValid = false;
          errorMessage = "Παρακαλώ εισάγετε έγκυρο Κόστος ανά μονάδα.";
        }
        if (formData.costInputMethod === "total" && (!formData.totalItemCost || isNaN(parseFloat(formData.totalItemCost)) || parseFloat(formData.totalItemCost) < 0)) {
          isValid = false;
          errorMessage = "Παρακαλώ εισάγετε έγκυρο Συνολικό Κόστος Προϊόντος.";
        }
        if (formData.selectedPO && poItemInfo && qtyNum > poItemInfo.quantityRemaining) {
          isValid = false;
          errorMessage = `Δεν μπορείτε να παραλάβετε ${qtyNum} μονάδες. Μόνο ${poItemInfo.quantityRemaining} παραμένουν στο PO.`;
        }
      }
      if ((formData.movementType === "OUT" || formData.movementType === "TRANSFER") && formData.fromLocation) {
        const availableStock = getAvailableStockAtLocation(matchedProduct.id, formData.fromLocation);
        if (availableStock < qtyNum) {
          isValid = false;
          errorMessage = `Ανεπαρκές απόθεμα στην τοποθεσία "${formData.fromLocation}". Διαθέσιμα: ${availableStock}.`;
        }
      }
    }

    if (!isValid) {
      setScanResult({ type: 'error', message: errorMessage });
      return;
    }

    setScanResult(null);
    if (nextStep) {
      setCurrentStep(nextStep);
    }
  };

  const handleBack = () => {
    setScanResult(null);
    const actualSteps = getStepsForMovementType();
    const currentIndex = actualSteps.indexOf(currentStep);
    const prevStep = actualSteps[currentIndex - 1];
    if (prevStep) {
      setCurrentStep(prevStep);
    }
  };

  const handleSubmit = async () => {
    if (isProcessing) return;
    await onMovementSubmit(formData);
  };

  const handleVendorCreated = async (newVendor) => {
    await loadData();
    setFormData(prev => ({ ...prev, selectedVendor: newVendor.id }));
    setShowCreateVendorDialog(false);
    setEditingVendor(null);
  };

  const handleEditVendor = () => {
    if (formData.selectedVendor) {
      const vendor = vendors.find(v => v.id === formData.selectedVendor);
      if (vendor) {
        setEditingVendor(vendor);
        setShowCreateVendorDialog(true);
      }
    }
  };

  const getStepsForMovementType = () => {
    if (formData.movementType === "IN") {
      if (formData.associateWithPO) {
        return [1, 2, 4, 5, 6, 7]; // Include step 4 (company/invoice cat + vendor code) even with PO
      }
      return [1, 2, 3, 4, 5, 6, 7]; // All steps for IN without PO, add summary
    } else if (formData.movementType === "OUT") {
      return [1, 2, 3, 5, 6, 7]; // No invoice/company for OUT, add summary
    } else if (formData.movementType === "TRANSFER" || formData.movementType === "ADJUSTMENT") {
      return [1, 2, 5, 6, 7]; // No vendor/company for TRANSFER/ADJUSTMENT, add summary
    }
    return [1, 2, 5, 6, 7];
  };

  const getAvailablePOs = () => {
    return purchaseOrders
      .filter(po => {
        if (!matchedProduct) return true;
        return po.items.some(item => item.product_id === matchedProduct.id && (item.quantity_ordered - (item.quantity_received || 0)) > 0);
      })
      .map(po => {
        const vendor = vendors.find(v => v.id === po.vendor_id);
        const totalRemaining = po.items.reduce((sum, item) =>
          sum + (item.quantity_ordered - (item.quantity_received || 0)), 0
        );
        return {
          id: po.id,
          po_number: po.po_number,
          vendor_name: vendor?.name || 'N/A',
          total_remaining: totalRemaining
        };
      });
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <Label className="text-xs mb-1 block text-blue-700">Προϊόν</Label>
                  <p className="font-bold text-lg text-blue-900">{matchedProduct?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-blue-600 font-medium">SKU</p>
                  <p className="text-sm text-blue-900 font-mono font-bold">{matchedProduct?.sku}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-xs text-blue-600 font-medium mb-1">Τρέχον Απόθεμα</p>
                <p className="text-lg font-bold text-blue-900">
                  {getProductStock(matchedProduct?.id)} {matchedProduct?.unit_of_measure}
                </p>
              </div>
            </div>

            <div>
              <Label>Τύπος Κίνησης *</Label>
              <Select value={formData.movementType} onValueChange={(val) => handleFormChange('movementType', val)}>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">
                    <div className="flex items-center gap-2 py-1">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="font-medium">Εισαγωγή (IN)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="OUT">
                    <div className="flex items-center gap-2 py-1">
                      <TrendingDown className="w-4 h-4 text-red-600" />
                      <span className="font-medium">Εξαγωγή (OUT)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="TRANSFER">
                    <div className="flex items-center gap-2 py-1">
                      <Move className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">Μεταφορά (TRANSFER)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="ADJUSTMENT">
                    <div className="flex items-center gap-2 py-1">
                      <Activity className="w-4 h-4 text-orange-600" />
                      <span className="font-medium">Διόρθωση (ADJUSTMENT)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            {(formData.movementType === "TRANSFER" || formData.movementType === "OUT") && (
              <div>
                <Label>Από Θέση *</Label>
                <Select value={formData.fromLocation || 'none'} onValueChange={(val) => handleFormChange('fromLocation', val === 'none' ? '' : val)}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Επιλέξτε θέση" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Επιλέξτε --</SelectItem>
                    {getAvailableLocationsForProduct().filter(locName => locName && locName.trim() !== '').map(locName => (
                      <SelectItem key={locName} value={locName}>
                        {locName} ({getAvailableStockAtLocation(matchedProduct.id, locName)} διαθέσιμα)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(formData.movementType === "TRANSFER" || formData.movementType === "IN" || formData.movementType === "ADJUSTMENT") && (
              <div>
                <Label>Θέση Αποθήκης *</Label>
                <Select value={formData.toLocation || 'none'} onValueChange={(val) => handleFormChange('toLocation', val === 'none' ? '' : val)}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Επιλέξτε θέση" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Επιλέξτε --</SelectItem>
                    {locations.filter(loc => loc.id && loc.name && loc.name.trim() !== '' && loc.name !== formData.fromLocation).map(loc => (
                      <SelectItem key={loc.id} value={loc.name}>
                        {loc.name} {loc.warehouse && `- ${loc.warehouse}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.movementType === "IN" && (
              <div className="space-y-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="associate-po"
                    checked={formData.associateWithPO}
                    onChange={(e) => {
                      handleFormChange('associateWithPO', e.target.checked);
                      if (!e.target.checked) {
                        handleFormChange('selectedPO', '');
                        setPOItemInfo(null);
                      }
                    }}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="associate-po" className="text-sm font-medium">
                    Συσχέτιση με PO (Purchase Order)
                  </label>
                </div>

                {formData.associateWithPO && (
                  <div>
                    <Label htmlFor="po-select">Ανοικτά PO *</Label>
                    <Select value={formData.selectedPO || 'none'} onValueChange={(val) => handleFormChange('selectedPO', val === 'none' ? '' : val)}>
                      <SelectTrigger id="po-select" className="h-11">
                        <SelectValue placeholder="Επιλέξτε PO" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Χωρίς PO --</SelectItem>
                        {getAvailablePOs().map(po => (
                          <SelectItem key={po.id} value={po.id}>
                            {po.po_number} - {po.vendor_name} ({po.total_remaining} items)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.selectedPO && poItemInfo && (
                      <div className="mt-2 p-3 bg-blue-100 border border-blue-200 rounded-md text-sm">
                        <p className="text-blue-900 font-semibold">Πληροφορίες PO:</p>
                        <p className="text-blue-800 mt-1">Παραγγελθέντα: {poItemInfo.quantityOrdered}</p>
                        <p className="text-blue-800">Παραληφθέντα: {poItemInfo.quantityReceived}</p>
                        <p className="text-orange-700 font-semibold">Υπόλοιπο: {poItemInfo.quantityRemaining}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            {formData.movementType === "IN" && !formData.associateWithPO && (
              <>
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <Label className="text-sm font-semibold mb-2 block">Επιλογή από παλιές αγορές</Label>
                  <PreviousPurchasesSelector
                    productId={matchedProduct?.id}
                    vendors={vendors}
                    companies={companies}
                    invoiceCategories={invoiceCategories}
                    onSelect={(data) => {
                      if (data) {
                        setFormData(prev => ({
                          ...prev,
                          selectedVendor: data.vendor_id || '',
                          unitCost: data.unit_cost ? String(data.unit_cost) : '',
                          bundleQuantity: data.bundle_quantity ? String(data.bundle_quantity) : '',
                          conversionRate: data.conversion_rate ? String(data.conversion_rate) : (data.bundle_quantity ? String(data.bundle_quantity) : '1'),
                          inputUnitSubtype: data.input_unit_of_measure || '',
                          vendorProductCode: data.vendor_product_code || '',
                          selectedInvoiceCategory: data.invoice_category_id || '',
                          selectedCompany: data.company_id || ''
                        }));
                      }
                    }}
                  />
                </div>

                <Separator />

                <div>
                  <Label>Προμηθευτής *</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Select 
                        value={formData.selectedVendor || 'none'} 
                        onValueChange={(val) => handleFormChange('selectedVendor', val === 'none' ? '' : val)}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Επιλέξτε προμηθευτή" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- Επιλέξτε Προμηθευτή --</SelectItem>
                          {vendors
                            .filter(v => v.is_active)
                            .sort((a, b) => {
                              const aIsPreferred = productVendors.some(
                                pv => pv.product_id === matchedProduct?.id && pv.vendor_id === a.id && pv.is_active
                              );
                              const bIsPreferred = productVendors.some(
                                pv => pv.product_id === matchedProduct?.id && pv.vendor_id === b.id && pv.is_active
                              );
                              if (aIsPreferred && !bIsPreferred) return -1;
                              if (!aIsPreferred && bIsPreferred) return 1;
                              return (a.name || '').localeCompare(b.name || '');
                            })
                            .map(vendor => {
                              const isPreferred = productVendors.some(
                                pv => pv.product_id === matchedProduct?.id && pv.vendor_id === vendor.id && pv.is_active
                              );
                              return (
                                <SelectItem key={vendor.id} value={vendor.id}>
                                  {isPreferred ? '⭐ ' : ''}{vendor.name} {vendor.code ? `(${vendor.code})` : ''}
                                </SelectItem>
                              );
                            })}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleEditVendor}
                      disabled={!formData.selectedVendor}
                      title="Επεξεργασία προμηθευτή"
                    >
                      <Package className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setEditingVendor(null);
                        setShowCreateVendorDialog(true);
                      }}
                      title="Προσθήκη νέου προμηθευτή"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Κωδικός Προϊόντος Προμηθευτή *</Label>
                  <Input
                    value={formData.vendorProductCode}
                    onChange={(e) => handleFormChange('vendorProductCode', e.target.value)}
                    placeholder="Κωδικός προμηθευτή"
                    className="h-11"
                  />
                </div>
              </>
            )}

            {formData.movementType === "OUT" && (
              <div>
                <Label>Χρέωση σε Άτομο *</Label>
                <PersonSearchCombobox
                  systemUsers={systemUsers}
                  appUsers={appUsers}
                  value={formData.chargedToPerson}
                  onValueChange={(val) => handleFormChange('chargedToPerson', val)}
                />
              </div>
            )}

            {formData.movementType === "TRANSFER" && (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <p className="text-sm text-slate-600">Δεν απαιτούνται επιπλέον στοιχεία για μεταφορά.</p>
                <p className="text-xs text-slate-500 mt-1">Πατήστε "Επόμενο" για να συνεχίσετε.</p>
              </div>
            )}

            {formData.movementType === "ADJUSTMENT" && (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <p className="text-sm text-slate-600">Δεν απαιτούνται επιπλέον στοιχεία για διόρθωση.</p>
                <p className="text-xs text-slate-500 mt-1">Πατήστε "Επόμενο" για να συνεχίσετε.</p>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            {formData.movementType === "IN" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="invoice-number">Αριθμός Τιμολογίου</Label>
                    <Input
                      id="invoice-number"
                      value={formData.invoiceNumber}
                      onChange={(e) => handleFormChange('invoiceNumber', e.target.value)}
                      placeholder="π.χ. INV-2025-001"
                      className="h-11"
                    />
                  </div>
                  <div>
                    <Label htmlFor="waybill-in">Αριθμός Waybill</Label>
                    <Input
                      id="waybill-in"
                      value={formData.waybillNumber}
                      onChange={(e) => handleFormChange('waybillNumber', e.target.value)}
                      placeholder="π.χ. WB-2025-001"
                      className="h-11"
                    />
                  </div>
                </div>

                <div>
                  <Label>Κωδικός Προϊόντος Προμηθευτή</Label>
                  <Input
                    value={formData.vendorProductCode}
                    onChange={(e) => handleFormChange('vendorProductCode', e.target.value)}
                    placeholder="Κωδικός προμηθευτή"
                    className="h-11"
                  />
                </div>

                <div>
                  <Label>Εταιρεία *</Label>
                  <Select value={formData.selectedCompany || 'none'} onValueChange={(val) => handleFormChange('selectedCompany', val === 'none' ? '' : val)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Επιλέξτε εταιρεία" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Χωρίς Εταιρεία --</SelectItem>
                      {companies.map(comp => (
                        <SelectItem key={comp.id} value={comp.id}>{comp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Κατηγορία Τιμολόγησης *</Label>
                  <Select value={formData.selectedInvoiceCategory || 'none'} onValueChange={(val) => handleFormChange('selectedInvoiceCategory', val === 'none' ? '' : val)}>
                    <SelectTrigger className="h-11">
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
              </>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Ποσότητα *</Label>
                <Input
                  id="quantity"
                  type="text"
                  inputMode="numeric"
                  value={formData.quantity}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d+$/.test(value)) {
                      handleFormChange('quantity', value);
                    }
                  }}
                  onBlur={(e) => {
                    const val = parseInt(e.target.value);
                    if (isNaN(val) || val < 1) {
                      handleFormChange('quantity', "1");
                    }
                  }}
                  onFocus={(e) => e.target.select()}
                  className="h-11"
                />
              </div>

              <div>
                <Label>Μονάδα Εισαγ.</Label>
                <Select
                  value={formData.inputUnitSubtype || ''}
                  onValueChange={(val) => {
                    handleFormChange('inputUnitSubtype', val);
                    // Reset bundleQuantity to '1' if the selected unit is not 'box'
                    if (val !== 'box') {
                      handleFormChange('bundleQuantity', '1');
                    }
                  }}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      const uom = matchedProduct?.unit_of_measure;
                      const options = [];
                      options.push(<SelectItem key="null" value={null}>-</SelectItem>);
                      if (uom === 'kg') {
                        options.push(<SelectItem key="g" value="g">g</SelectItem>);
                        options.push(<SelectItem key="kg" value="kg">kg</SelectItem>);
                        options.push(<SelectItem key="ton" value="ton">ton</SelectItem>);
                      } else if (uom === 'liter') {
                        options.push(<SelectItem key="ml" value="ml">ml</SelectItem>);
                        options.push(<SelectItem key="liter" value="liter">L</SelectItem>);
                      } else if (uom === 'meter') {
                        options.push(<SelectItem key="mm" value="mm">mm</SelectItem>);
                        options.push(<SelectItem key="cm" value="cm">cm</SelectItem>);
                        options.push(<SelectItem key="meter" value="meter">m</SelectItem>);
                      } else if (uom === 'piece') {
                        options.push(<SelectItem key="piece" value="piece">pcs</SelectItem>);
                        options.push(<SelectItem key="box" value="box">box</SelectItem>);
                        options.push(<SelectItem key="pallet" value="pallet">pallet</SelectItem>);
                      } else {
                        options.push(<SelectItem key={uom} value={uom}>{uom}</SelectItem>);
                      }
                      return options;
                    })()}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Pcs/Qty</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={formData.bundleQuantity || ''}
                  onChange={(e) => handleFormChange('bundleQuantity', e.target.value)}
                  placeholder="π.χ. 100"
                  className="h-11"
                  disabled={formData.inputUnitSubtype !== 'box'}
                />
                {formData.unitCost && formData.bundleQuantity && parseFloat(formData.bundleQuantity) > 0 && (
                  <p className="text-xs text-slate-700 mt-1">
                    <strong>Κόστος/τεμ:</strong> €{(parseFloat(formData.unitCost) / parseFloat(formData.bundleQuantity)).toFixed(4)}
                  </p>
                )}
              </div>
            </div>

            {formData.movementType === "IN" && (
              <>
                <div>
                  <Label>Μέθοδος Εισαγωγής Κόστους</Label>
                  <Select
                    value={formData.costInputMethod}
                    onValueChange={(val) => {
                      handleFormChange('costInputMethod', val);
                      if (val === 'unit') {
                        handleFormChange('totalItemCost', "");
                        handleFormChange('discount', "0");
                      } else {
                        handleFormChange('unitCost', "");
                      }
                    }}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unit">Ανά Μονάδα</SelectItem>
                      <SelectItem value="total">Συνολικό Κόστος + Έκπτωση</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.costInputMethod === 'unit' ? (
                  <div>
                    <Label>Κόστος ανά μονάδα (€) *</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={formData.unitCost}
                      onChange={(e) => handleFormChange('unitCost', e.target.value)}
                      placeholder="0.0000"
                      className="h-11"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Κόστος ανά {matchedProduct?.unit_of_measure}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Συνολικό Κόστος Προϊόντος (€) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.totalItemCost}
                          onChange={(e) => handleFormChange('totalItemCost', e.target.value)}
                          placeholder="0.00"
                          className="h-11"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Το συνολικό κόστος πριν την έκπτωση
                        </p>
                      </div>
                      <div>
                        <Label>Έκπτωση (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={formData.discount}
                          onChange={(e) => handleFormChange('discount', e.target.value)}
                          placeholder="0"
                          className="h-11"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Ποσοστό έκπτωσης επί του συνολικού κόστους
                        </p>
                      </div>
                    </div>
                    {formData.unitCost && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-900">
                          <strong>Υπολογιζόμενο Κόστος ανά Μονάδα:</strong> €{parseFloat(formData.unitCost).toFixed(4)}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            <p className="text-xs text-slate-500">
              Ποσότητα στη βασική μονάδα ({matchedProduct?.unit_of_measure}): {(() => {
                const qty = parseFloat(formData.quantity) || 0;
                const convRate = parseFloat(formData.conversionRate) || 1;
                const bundleQty = parseFloat(formData.bundleQuantity) || null;
                return bundleQty ? (qty * convRate * bundleQty).toFixed(2) : (qty * convRate).toFixed(2);
              })()}
            </p>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <div>
              <Label>Σημειώσεις (προαιρετικό)</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => handleFormChange('notes', e.target.value)}
                placeholder="Προσθέστε επιπλέον σημειώσεις..."
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label>Φωτογραφίες (προαιρετικό)</Label>
              <div className="flex gap-2">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="w-full h-11"
                >
                  {isUploadingPhoto ? (
                    <>
                      <Upload className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Upload Photos
                    </>
                  )}
                </Button>
              </div>
              {uploadedPhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {uploadedPhotos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo.url}
                        alt={photo.filename}
                        className="w-full h-24 object-cover rounded-lg border border-slate-200"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removePhoto(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="text-base font-bold text-green-900 mb-3">Σύνοψη Κίνησης</h4>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-600 font-medium">Προϊόν:</p>
                    <p className="font-semibold text-slate-900">{matchedProduct?.name}</p>
                    <p className="text-xs text-slate-600 font-mono">SKU: {matchedProduct?.sku}</p>
                  </div>
                  <div>
                    <p className="text-slate-600 font-medium">Τύπος Κίνησης:</p>
                    <Badge className={
                      formData.movementType === 'IN' ? 'bg-green-600' :
                      formData.movementType === 'OUT' ? 'bg-red-600' :
                      formData.movementType === 'TRANSFER' ? 'bg-blue-600' :
                      'bg-orange-600'
                    }>
                      {formData.movementType}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {formData.fromLocation && (
                    <div>
                      <p className="text-slate-600 font-medium">Από Θέση:</p>
                      <p className="font-semibold text-slate-900">{formData.fromLocation}</p>
                    </div>
                  )}
                  {formData.toLocation && (
                    <div>
                      <p className="text-slate-600 font-medium">Θέση Αποθήκης:</p>
                      <p className="font-semibold text-slate-900">{formData.toLocation}</p>
                    </div>
                  )}
                </div>

                {formData.movementType === "IN" && (
                  <>
                    <Separator />
                    <div className="space-y-2 text-sm">
                      {formData.selectedPO && (
                        <div>
                          <p className="text-slate-600 font-medium">Purchase Order:</p>
                          <p className="font-semibold text-slate-900">
                            {purchaseOrders.find(po => po.id === formData.selectedPO)?.po_number || '-'}
                          </p>
                        </div>
                      )}
                      {formData.selectedVendor && (
                        <div>
                          <p className="text-slate-600 font-medium">Προμηθευτής:</p>
                          <p className="font-semibold text-slate-900">
                            {vendors.find(v => v.id === formData.selectedVendor)?.name || '-'}
                          </p>
                        </div>
                      )}
                      {formData.vendorProductCode && (
                        <div>
                          <p className="text-slate-600 font-medium">Κωδικός Προμηθευτή:</p>
                          <p className="font-semibold text-slate-900">{formData.vendorProductCode}</p>
                        </div>
                      )}
                      {formData.selectedCompany && (
                        <div>
                          <p className="text-slate-600 font-medium">Εταιρεία:</p>
                          <p className="font-semibold text-slate-900">
                            {companies.find(c => c.id === formData.selectedCompany)?.name || '-'}
                          </p>
                        </div>
                      )}
                      {formData.selectedInvoiceCategory && (
                        <div>
                          <p className="text-slate-600 font-medium">Κατηγορία Τιμολόγησης:</p>
                          <p className="font-semibold text-slate-900">
                            {invoiceCategories.find(ic => ic.id === formData.selectedInvoiceCategory)?.name || '-'}
                          </p>
                        </div>
                      )}
                      {formData.invoiceNumber && (
                        <div>
                          <p className="text-slate-600 font-medium">Αριθμός Τιμολογίου:</p>
                          <p className="font-semibold text-slate-900">{formData.invoiceNumber}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {formData.movementType === "OUT" && formData.chargedToPerson && (
                  <>
                    <Separator />
                    <div className="text-sm">
                      <p className="text-slate-600 font-medium">Χρέωση σε:</p>
                      <p className="font-semibold text-slate-900">
                        {systemUsers.find(u => u.id === formData.chargedToPerson || u.email === formData.chargedToPerson)?.full_name ||
                         appUsers.find(u => u.id === formData.chargedToPerson)?.full_name ||
                         formData.chargedToPerson}
                      </p>
                    </div>
                  </>
                )}

                <Separator />

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-600 font-medium">Ποσότητα:</p>
                    <p className="font-bold text-lg text-slate-900">{formData.quantity} {formData.inputUnitSubtype || matchedProduct?.unit_of_measure}</p>
                  </div>
                  {formData.movementType === "IN" && formData.unitCost && (
                    <div>
                      <p className="text-slate-600 font-medium">Κόστος Μονάδας:</p>
                      <p className="font-bold text-lg text-green-900">€{parseFloat(formData.unitCost).toFixed(4)}</p>
                    </div>
                  )}
                </div>

                {formData.bundleQuantity && parseFloat(formData.bundleQuantity) > 0 && (
                  <div className="text-sm">
                    <p className="text-slate-600 font-medium">Pcs/Qty:</p>
                    <p className="font-semibold text-slate-900">{formData.bundleQuantity} τεμάχια</p>
                    {formData.unitCost && (
                      <p className="text-xs text-slate-600 mt-1">
                        Κόστος/τεμάχιο: €{(parseFloat(formData.unitCost) / parseFloat(formData.bundleQuantity)).toFixed(4)}
                      </p>
                    )}
                  </div>
                )}

                {formData.movementType === "IN" && formData.costInputMethod === 'total' && formData.totalItemCost && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm">
                    <p className="text-slate-600">Συνολικό Κόστος Προϊόντος: <strong>€{parseFloat(formData.totalItemCost).toFixed(2)}</strong></p>
                    {formData.discount !== "0" && parseFloat(formData.discount) > 0 && (
                      <p className="text-slate-600">Έκπτωση: <strong>{formData.discount}%</strong></p>
                    )}
                  </div>
                )}

                {formData.waybillNumber && (
                  <div className="text-sm">
                    <p className="text-slate-600 font-medium">Waybill:</p>
                    <p className="font-semibold text-slate-900">{formData.waybillNumber}</p>
                  </div>
                )}

                {formData.notes && (
                  <div className="text-sm">
                    <p className="text-slate-600 font-medium">Σημειώσεις:</p>
                    <p className="font-semibold text-slate-900">{formData.notes}</p>
                  </div>
                )}

                {uploadedPhotos.length > 0 && (
                  <div className="text-sm">
                    <p className="text-slate-600 font-medium">Φωτογραφίες:</p>
                    <p className="font-semibold text-green-600">{uploadedPhotos.length} φωτογραφία/ες επισυνάπτονται</p>
                  </div>
                )}

                <div className="pt-3 border-t">
                  <p className="text-xs text-slate-500">
                    Ποσότητα στη βασική μονάδα ({matchedProduct?.unit_of_measure}): <strong>{(() => {
                      const qty = parseFloat(formData.quantity) || 0;
                      const convRate = parseFloat(formData.conversionRate) || 1;
                      const bundleQty = parseFloat(formData.bundleQuantity) || null;
                      return bundleQty ? (qty * convRate * bundleQty).toFixed(2) : (qty * convRate).toFixed(2);
                    })()}</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const actualSteps = getStepsForMovementType();
  const currentActualStepIndex = actualSteps.indexOf(currentStep);
  const totalActualSteps = actualSteps.length;
  const displayStep = currentActualStepIndex + 1;
  const isLastStep = currentStep === actualSteps[actualSteps.length - 1];

  const getStepTitle = (step) => {
    switch (step) {
      case 1: return "Τύπος Κίνησης";
      case 2: return "Θέση Αποθήκης";
      case 3: return formData.movementType === "IN" ? "Στοιχεία Προμηθευτή" : "Χρέωση";
      case 4: return "Τιμολόγιο & Εταιρεία";
      case 5: return "Ποσότητα & Κόστος";
      case 6: return "Πρόσθετα";
      case 7: return "Σύνοψη & Επιβεβαίωση";
      default: return `Βήμα ${step}`;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(val) => {
        if (!val) {
          onClose();
        }
      }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              {getStepTitle(currentStep)}
            </DialogTitle>
            <DialogDescription className="flex items-center justify-between">
              <span>Προϊόν: <strong>{matchedProduct?.name}</strong></span>
              <Badge variant="outline">
                Βήμα {displayStep} / {totalActualSteps}
              </Badge>
            </DialogDescription>
          </DialogHeader>

          <Separator />

          <div className="py-4">
            {renderStep()}
          </div>

          {scanResult && scanResult.type === 'error' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
              {scanResult.message}
            </div>
          )}

          <DialogFooter className="flex justify-between items-center mt-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === actualSteps[0]}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Πίσω
            </Button>

            {isLastStep ? (
              <Button
                onClick={handleSubmit}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Επεξεργασία...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Ολοκλήρωση
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={handleNext}>
                Επόμενο
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateEditVendorDialog
        open={showCreateVendorDialog}
        onClose={() => {
          setShowCreateVendorDialog(false);
          setEditingVendor(null);
        }}
        onVendorSaved={handleVendorCreated}
        vendor={editingVendor}
      />
    </>
  );
}