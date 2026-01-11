import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import PreviousPurchasesSelector from "@/components/warehouse/PreviousPurchasesSelector";
import VendorSearchCombobox from "@/components/warehouse/VendorSearchCombobox";

export default function SimpleStockMovementDialog({ open, onClose, product, onStockUpdated }) {
  const [movementType, setMovementType] = useState("IN");
  const [quantity, setQuantity] = useState("");
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [chargedToPerson, setChargedToPerson] = useState("");
  const [notes, setNotes] = useState("");
  const [inputUnitSubtype, setInputUnitSubtype] = useState("");
  const [conversionRate, setConversionRate] = useState("1");
  const [locations, setLocations] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);
  const [appUsers, setAppUsers] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [validationError, setValidationError] = useState("");
  const [relatedPO, setRelatedPO] = useState("");
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [hideCompletedPOs, setHideCompletedPOs] = useState(true);
  const [vendors, setVendors] = useState([]);
  const [productVendors, setProductVendors] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [invoiceCategories, setInvoiceCategories] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [bundleQuantity, setBundleQuantity] = useState("");
  const [vendorProductCode, setVendorProductCode] = useState("");

  useEffect(() => {
    if (open && product) {
      loadData();
      setMovementType("IN");
      setQuantity("");
      setFromLocation("");
      setToLocation("");
      setChargedToPerson("");
      setNotes("");
      setInputUnitSubtype("");
      setConversionRate("1");
      setValidationError("");
      setRelatedPO("");
      setHideCompletedPOs(true);
      setSelectedVendor("");
      setUnitCost("");
      setBundleQuantity("");
      setVendorProductCode("");
    }
  }, [open, product]);

  const loadData = async () => {
    if (!product) return;
    setIsProcessing(true);
    setValidationError("");

    try {
      const [locationsData, user, sysUsers, aUsers, poData, vendorsData, pvData, companiesData, invoiceCatsData] = await Promise.all([
        base44.entities.WarehouseLocation.filter({ is_active: true }),
        base44.auth.me(),
        base44.entities.User.list().catch(() => []),
        base44.entities.AppUser.list().catch(() => []),
        base44.entities.PurchaseOrder.filter({ status: ["Confirmed", "Partially Received", "Received"] }).catch(() => []),
        base44.entities.Vendor.filter({ is_active: true }).catch(() => []),
        base44.entities.ProductVendor.list().catch(() => []),
        base44.entities.Company.filter({ is_active: true }).catch(() => []),
        base44.entities.InvoiceCategory.filter({ is_active: true }).catch(() => [])
      ]);
      
      setLocations(locationsData);
      setCurrentUser(user);
      setSystemUsers(sysUsers);
      setAppUsers(aUsers);
      const relevantPOs = poData.filter(po => 
        po.items && po.items.some(item => item.product_id === product.id)
      );
      setPurchaseOrders(relevantPOs);
      setVendors(vendorsData);
      setProductVendors(pvData);
      setCompanies(companiesData);
      setInvoiceCategories(invoiceCatsData);
    } catch (error) {
      console.error("Error loading data:", error);
      setValidationError("Failed to load necessary data. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError("");
    
    const numericQuantity = parseFloat(quantity);

    if (isNaN(numericQuantity) || numericQuantity <= 0) {
      setValidationError("Please enter a valid quantity (a number greater than 0)");
      return;
    }

    if (movementType === "IN" && !toLocation) {
      setValidationError("Please select a destination warehouse location for 'IN' movement.");
      return;
    }

    if (movementType === "OUT" && !fromLocation) {
      setValidationError("Please select a source location for 'OUT' movement.");
      return;
    }

    if (movementType === "TRANSFER" && (!fromLocation || !toLocation)) {
      setValidationError("Please select both source and destination locations for 'TRANSFER' movement.");
      return;
    }

    if (movementType === "TRANSFER" && fromLocation === toLocation) {
      setValidationError("Source and destination locations cannot be the same for 'TRANSFER' movement.");
      return;
    }
    
    setIsProcessing(true);

    try {
      const parsedConversionRate = parseFloat(conversionRate) || 1;
      const baseQuantity = numericQuantity * parsedConversionRate;
      const baseUnitCost = product.unit_cost && parsedConversionRate > 0 ? product.unit_cost / parsedConversionRate : undefined;

      const parsedUnitCost = unitCost ? parseFloat(unitCost) : undefined;
      const baseUnitCost2 = parsedUnitCost && parsedConversionRate > 0 ? parsedUnitCost / parsedConversionRate : undefined;

      const movementData = {
        product_id: product.id,
        movement_type: movementType,
        quantity: numericQuantity,
        input_unit_of_measure: inputUnitSubtype || product.unit_of_measure,
        conversion_rate: parsedConversionRate,
        base_quantity: baseQuantity,
        from_location: fromLocation || undefined,
        to_location: toLocation || undefined,
        charged_to_person: chargedToPerson || undefined,
        reference_type: relatedPO ? "PurchaseOrder" : (selectedVendor ? "Vendor" : "Manual"),
        reference_id: relatedPO || selectedVendor || undefined,
        performed_by: currentUser?.email || currentUser?.id,
        notes: notes || undefined,
        unit_cost: movementType === "OUT" ? (product.unit_cost || 0) : parsedUnitCost,
        base_unit_cost: movementType === "OUT" ? baseUnitCost : baseUnitCost2,
        vendor_product_code: movementType === "IN" && vendorProductCode ? vendorProductCode : undefined,
        bundle_quantity: movementType === "IN" && bundleQuantity ? parseFloat(bundleQuantity) : undefined
      };

      await base44.entities.StockMovement.create(movementData);

      // If linked to a PO, update the quantity_received
      if (movementType === "IN" && relatedPO) {
        const po = purchaseOrders.find(p => p.id === relatedPO);
        if (po) {
          const updatedItems = po.items.map(item => {
            if (item.product_id === product.id) {
              const newQuantityReceived = (item.quantity_received || 0) + numericQuantity;
              return {
                ...item,
                quantity_received: Math.min(newQuantityReceived, item.quantity_ordered)
              };
            }
            return item;
          });

          const allItemsFullyReceived = updatedItems.every(item => 
            item.quantity_received >= item.quantity_ordered
          );
          
          const anyItemReceived = updatedItems.some(item => 
            (item.quantity_received || 0) > 0
          );

          let newStatus = po.status;
          if (allItemsFullyReceived) {
            newStatus = "Received";
          } else if (anyItemReceived) {
            newStatus = "Partially Received";
          } else {
            newStatus = "Confirmed";
          }
          
          await base44.entities.PurchaseOrder.update(relatedPO, {
            items: updatedItems,
            status: newStatus,
            ...(allItemsFullyReceived ? { actual_delivery_date: new Date().toISOString().split('T')[0] } : {})
          });
        }
      }

      // Update ProductVendor if IN movement with cost
      if (movementType === "IN" && selectedVendor && parsedUnitCost) {
        const existingPVs = await base44.entities.ProductVendor.filter({
          product_id: product.id,
          vendor_id: selectedVendor
        });
        
        if (existingPVs.length === 0) {
          await base44.entities.ProductVendor.create({
            product_id: product.id,
            vendor_id: selectedVendor,
            unit_cost: parsedUnitCost,
            is_preferred: false,
            is_active: true,
            conversion_rate: parsedConversionRate,
            bundle_quantity: bundleQuantity ? parseFloat(bundleQuantity) : null
          });
        } else {
          await base44.entities.ProductVendor.update(existingPVs[0].id, {
            unit_cost: parsedUnitCost,
            is_active: true,
            conversion_rate: parsedConversionRate,
            bundle_quantity: bundleQuantity ? parseFloat(bundleQuantity) : null
          });
        }
      }

      // Update stock items using base_quantity
      if (movementType === "IN") {
        const existingStock = await base44.entities.StockItem.filter({
          product_id: product.id,
          warehouse_location: toLocation
        });

        if (existingStock.length > 0) {
          const stock = existingStock[0];
          await base44.entities.StockItem.update(stock.id, {
            quantity_on_hand: (stock.quantity_on_hand || 0) + baseQuantity,
            last_counted_date: new Date().toISOString().split('T')[0]
          });
        } else {
          await base44.entities.StockItem.create({
            product_id: product.id,
            warehouse_location: toLocation,
            quantity_on_hand: baseQuantity,
            quantity_reserved: 0,
            last_counted_date: new Date().toISOString().split('T')[0]
          });
        }
      } else if (movementType === "OUT") {
        const stock = await base44.entities.StockItem.filter({
          product_id: product.id,
          warehouse_location: fromLocation
        });

        if (stock.length > 0) {
          const currentQuantity = stock[0].quantity_on_hand || 0;
          if (currentQuantity < baseQuantity) {
            setValidationError(`Cannot move out ${baseQuantity} units. Only ${currentQuantity} units available at ${fromLocation}.`);
            setIsProcessing(false);
            return;
          }

          await base44.entities.StockItem.update(stock[0].id, {
            quantity_on_hand: currentQuantity - baseQuantity,
            last_counted_date: new Date().toISOString().split('T')[0]
          });
        } else {
          setValidationError(`No stock found for this product at location ${fromLocation} to move out.`);
          setIsProcessing(false);
          return;
        }
      } else if (movementType === "TRANSFER") {
        const fromStock = await base44.entities.StockItem.filter({
          product_id: product.id,
          warehouse_location: fromLocation
        });

        if (fromStock.length > 0) {
          const currentQuantity = fromStock[0].quantity_on_hand || 0;
          if (currentQuantity < baseQuantity) {
            setValidationError(`Cannot transfer ${baseQuantity} units. Only ${currentQuantity} units available at ${fromLocation}.`);
            setIsProcessing(false);
            return;
          }

          await base44.entities.StockItem.update(fromStock[0].id, {
            quantity_on_hand: currentQuantity - baseQuantity,
            last_counted_date: new Date().toISOString().split('T')[0]
          });
        } else {
          setValidationError(`No stock found for this product at source location ${fromLocation} to transfer.`);
          setIsProcessing(false);
          return;
        }

        const toStock = await base44.entities.StockItem.filter({
          product_id: product.id,
          warehouse_location: toLocation
        });

        if (toStock.length > 0) {
          await base44.entities.StockItem.update(toStock[0].id, {
            quantity_on_hand: (toStock[0].quantity_on_hand || 0) + baseQuantity,
            last_counted_date: new Date().toISOString().split('T')[0]
          });
        } else {
          await base44.entities.StockItem.create({
            product_id: product.id,
            warehouse_location: toLocation,
            quantity_on_hand: baseQuantity,
            quantity_reserved: 0,
            last_counted_date: new Date().toISOString().split('T')[0]
          });
        }
      }

      onStockUpdated();
      onClose();
    } catch (error) {
      console.error("Error processing stock movement:", error);
      setValidationError("Failed to process stock movement. Please try again. " + (error.message || ""));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setValidationError("");
    onClose();
  };

  if (!product) return null;

  const allUsers = [
    ...(systemUsers || []).map(u => ({ id: u.email, name: u.email })),
    ...(appUsers || []).map(u => ({ id: u.email, name: u.email }))
  ].filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Perform Stock Movement - {product.name}</DialogTitle>
          <DialogDescription>
            Record a stock movement (in, out, or transfer) for {product.name}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              This dialog allows you to record physical movements of stock. Changes made here will update
              the "Quantity On Hand" for this product in specific locations.
            </AlertDescription>
          </Alert>

          {validationError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Movement Type</Label>
              <RadioGroup value={movementType} onValueChange={setMovementType} className="flex space-x-4 mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="IN" id="r1" />
                  <Label htmlFor="r1">IN</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="OUT" id="r2" />
                  <Label htmlFor="r2">OUT</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="TRANSFER" id="r3" />
                  <Label htmlFor="r3">TRANSFER</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
                step="any"
                required
                className={validationError && (!quantity || parseFloat(quantity) <= 0) ? 'border-red-500' : ''}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="input_unit_subtype">Μονάδα Εισαγωγής (Βάση: {product?.unit_of_measure})</Label>
              <Select
                value={inputUnitSubtype || product.unit_of_measure}
                onValueChange={(val) => {
                  setInputUnitSubtype(val);
                  if (product.unit_of_measure === 'kg') {
                    if (val === 'g') setConversionRate('0.001');
                    else if (val === 'kg') setConversionRate('1');
                    else if (val === 'ton') setConversionRate('1000');
                  } else if (product.unit_of_measure === 'liter') {
                    if (val === 'ml') setConversionRate('0.001');
                    else if (val === 'liter') setConversionRate('1');
                  } else if (product.unit_of_measure === 'meter') {
                    if (val === 'cm') setConversionRate('0.01');
                    else if (val === 'mm') setConversionRate('0.001');
                    else if (val === 'meter') setConversionRate('1');
                  } else if (product.unit_of_measure === 'piece') {
                    if (val === 'piece') setConversionRate('1');
                    else setConversionRate('1');
                  }
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
              <Label htmlFor="conversion_rate">Συντελεστής Μετατροπής</Label>
              <Input
                id="conversion_rate"
                type="number"
                min="0.0001"
                step="0.0001"
                value={conversionRate}
                onChange={(e) => setConversionRate(e.target.value)}
                placeholder="Αυτόματα"
              />
              <p className="text-xs text-slate-500 mt-1">
                Ποσότητα βασικής μονάδας: {(parseFloat(quantity) * parseFloat(conversionRate) || 0).toFixed(4)} {product?.unit_of_measure || 'μονάδες'}
              </p>
            </div>
          </div>

          {movementType === "IN" && (
            <>
              <PreviousPurchasesSelector
                productId={product?.id}
                vendors={vendors}
                companies={companies}
                invoiceCategories={invoiceCategories}
                onSelect={(data) => {
                  if (data) {
                    setSelectedVendor(data.vendor_id || '');
                    setUnitCost(data.unit_cost ? String(data.unit_cost) : '');
                    setBundleQuantity(data.bundle_quantity ? String(data.bundle_quantity) : '');
                    setConversionRate(data.conversion_rate ? String(data.conversion_rate) : (data.bundle_quantity ? String(data.bundle_quantity) : '1'));
                    setInputUnitSubtype(data.input_unit_of_measure || '');
                    setVendorProductCode(data.vendor_product_code || '');
                  }
                }}
              />

              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="related_po">Linked Purchase Order (Optional)</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hide-completed-pos"
                      checked={hideCompletedPOs}
                      onCheckedChange={setHideCompletedPOs}
                    />
                    <label
                      htmlFor="hide-completed-pos"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Hide Completed POs
                    </label>
                  </div>
                </div>
                <Select value={relatedPO} onValueChange={(value) => {
                  setRelatedPO(value === "no-po" ? "" : value);
                  if (value !== "no-po") {
                    const po = purchaseOrders.find(p => p.id === value);
                    if (po) {
                      setSelectedVendor(po.vendor_id || '');
                      const poItem = po.items.find(item => item.product_id === product.id);
                      if (poItem) {
                        setUnitCost(String(poItem.unit_cost || ''));
                        setBundleQuantity(String(poItem.bundle_quantity || ''));
                      }
                    }
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select PO (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-po">No PO</SelectItem>
                    {purchaseOrders
                      .filter(po => !hideCompletedPOs || po.status !== 'Received')
                      .map((po) => (
                      <SelectItem key={po.id} value={po.id}>
                        {po.po_number} - {po.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="vendor_id">Προμηθευτής</Label>
                <VendorSearchCombobox
                  vendors={vendors}
                  vendorProductIds={productVendors
                    .filter(pv => pv.product_id === product?.id && pv.is_active)
                    .map(pv => pv.vendor_id)}
                  value={selectedVendor}
                  onValueChange={setSelectedVendor}
                />
              </div>

              <div>
                <Label htmlFor="vendor_product_code">Κωδικός Προϊόντος Προμηθευτή</Label>
                <Input
                  id="vendor_product_code"
                  value={vendorProductCode}
                  onChange={(e) => setVendorProductCode(e.target.value)}
                  placeholder="Κωδικός προμηθευτή"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="unit_cost">Κόστος ανά Μονάδα (€)</Label>
                  <Input
                    id="unit_cost"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    placeholder="0.0000"
                  />
                </div>

                <div>
                  <Label htmlFor="bundle_quantity">Pcs/Qty</Label>
                  <Input
                    id="bundle_quantity"
                    type="number"
                    min="1"
                    step="1"
                    value={bundleQuantity}
                    onChange={(e) => setBundleQuantity(e.target.value)}
                    placeholder="π.χ. 100"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="to_location">Warehouse Location (Destination) *</Label>
                <Select value={toLocation} onValueChange={setToLocation}>
                  <SelectTrigger className={validationError && !toLocation ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select destination location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.name}>
                        {loc.name} {loc.warehouse && `- ${loc.warehouse}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {movementType === "OUT" && (
            <>
              <div>
                <Label htmlFor="from_location">Warehouse Location (Source) *</Label>
                <Select value={fromLocation} onValueChange={setFromLocation}>
                  <SelectTrigger className={validationError && !fromLocation ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select source location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.name}>
                        {loc.name} {loc.warehouse && `- ${loc.warehouse}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="charged_to_person">Charged To (Optional)</Label>
                <Select value={chargedToPerson || "none"} onValueChange={(val) => setChargedToPerson(val === "none" ? "" : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select person (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- None --</SelectItem>
                    {allUsers.filter(user => user.id && String(user.id).trim().length > 0).map((user) => (
                      <SelectItem key={user.id} value={String(user.id)}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {movementType === "TRANSFER" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="from_location">From Location *</Label>
                <Select value={fromLocation} onValueChange={setFromLocation}>
                  <SelectTrigger className={validationError && !fromLocation ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select source location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.name}>
                        {loc.name} {loc.warehouse && `- ${loc.warehouse}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="to_location">To Location *</Label>
                <Select value={toLocation} onValueChange={setToLocation}>
                  <SelectTrigger className={validationError && !toLocation ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select destination location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.name}>
                        {loc.name} {loc.warehouse && `- ${loc.warehouse}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input
              id="notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any relevant notes"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button type="submit" disabled={isProcessing}>
              {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Record Movement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}