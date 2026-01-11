import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle, Info } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox"; // Added Checkbox import
import { ScrollArea } from "@/components/ui/scroll-area"; // Added ScrollArea import
import PreviousPurchasesSelector from "@/components/warehouse/PreviousPurchasesSelector";

export default function UpdateStockDialog({ open, onClose, product, onStockUpdated }) {
  const [movementType, setMovementType] = useState("IN");
  const [quantity, setQuantity] = useState("");
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [waybillNumber, setWaybillNumber] = useState("");
  const [chargedToPerson, setChargedToPerson] = useState("");
  const [relatedPO, setRelatedPO] = useState("");
  const [relatedPOItem, setRelatedPOItem] = useState(""); // This is product_id from the PO item
  const [notes, setNotes] = useState("");
  const [vendorProductCode, setVendorProductCode] = useState("");
  const [invoiceCategory, setInvoiceCategory] = useState("");
  const [locations, setLocations] = useState([]); // This will hold WarehouseLocation entities
  const [purchaseOrders, setPurchaseOrders] = useState([]); // All relevant POs including 'Received' status
  const [systemUsers, setSystemUsers] = useState([]);
  const [appUsers, setAppUsers] = useState([]);
  const [invoiceCategories, setInvoiceCategories] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [validationError, setValidationError] = useState("");
  const [hideCompletedPOs, setHideCompletedPOs] = useState(true); // New state for PO hide toggle
  const [movementHistory, setMovementHistory] = useState([]); // New state for movement history
  const [vendors, setVendors] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [bundleQuantity, setBundleQuantity] = useState("");
  const [inputUnitSubtype, setInputUnitSubtype] = useState("");
  const [conversionRate, setConversionRate] = useState("1");

  useEffect(() => {
    if (open && product) {
      loadData();
      // Reset form fields when dialog opens
      setMovementType("IN");
      setQuantity("");
      setFromLocation("");
      setToLocation("");
      setWaybillNumber("");
      setChargedToPerson("");
      setRelatedPO("");
      setRelatedPOItem("");
      setNotes("");
      setVendorProductCode("");
      setInvoiceCategory("");
      setValidationError(""); // Clear validation errors
      setHideCompletedPOs(true); // Reset PO hide toggle to default true when dialog opens
      setSelectedVendor("");
      setUnitCost("");
      setBundleQuantity("");
      setInputUnitSubtype("");
      setConversionRate("1");
    }
  }, [open, product]);

  const loadData = async () => {
    if (!product) return;
    setIsProcessing(true); // Using isProcessing for initial data load too
    setValidationError("");

    try {
      const [locationsData, poData, user, sysUsers, aUsers, movementsData, invoiceCatsData, vendorsData, companiesData] = await Promise.all([
        base44.entities.WarehouseLocation.filter({ is_active: true }),
        // Fetch all relevant POs including 'Received' to allow toggling
        base44.entities.PurchaseOrder.filter({ status: ["Confirmed", "Partially Received", "Received"] }).catch(() => []),
        base44.auth.me(),
        base44.entities.User.list().catch(() => []),
        base44.entities.AppUser.list().catch(() => []),
        // Fetch movement history for the current product
        base44.entities.StockMovement.filter({ product_id: product.id, _limit: 10, _sort: '-created_at' }).catch(() => []),
        base44.entities.InvoiceCategory.filter({ is_active: true }).catch(() => []),
        base44.entities.Vendor.filter({ is_active: true }).catch(() => []),
        base44.entities.Company.filter({ is_active: true }).catch(() => [])
      ]);
      
      setLocations(locationsData);
      
      // Filter POs that have this product, regardless of received status for initial load
      const relevantPOsForAllStatuses = poData.filter(po => 
        po.items && po.items.some(item => 
          item.product_id === product.id
        )
      );
      setPurchaseOrders(relevantPOsForAllStatuses);
      
      setCurrentUser(user);
      setSystemUsers(sysUsers);
      setAppUsers(aUsers);
      setMovementHistory(movementsData); // Set movement history
      setInvoiceCategories(invoiceCatsData);
      setVendors(vendorsData);
      setCompanies(companiesData);
    } catch (error) {
      console.error("Error loading data:", error);
      setValidationError("Failed to load necessary data. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getAvailablePOItems = () => {
    if (!relatedPO || !product) return [];
    const po = purchaseOrders.find(p => p.id === relatedPO);
    if (!po || !po.items) return [];
    
    // Filter items related to the current product and that still have quantity pending receipt
    return po.items.filter(item => 
      item.product_id === product.id && item.quantity_received < item.quantity_ordered
    );
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

    if (movementType === "IN" && relatedPO && !relatedPOItem) {
      setValidationError("Please select a specific PO item for this receipt.");
      return;
    }
    
    setIsProcessing(true);

    try {
      const parsedConversionRate = parseFloat(conversionRate) || 1;
      const parsedUnitCost = unitCost ? parseFloat(unitCost) : undefined;
      const baseQuantity = numericQuantity * parsedConversionRate;
      const baseUnitCost = parsedUnitCost && parsedConversionRate > 0 ? parsedUnitCost / parsedConversionRate : undefined;

      const movementData = {
        product_id: product.id,
        movement_type: movementType,
        quantity: numericQuantity,
        input_unit_of_measure: inputUnitSubtype || product.unit_of_measure,
        conversion_rate: parsedConversionRate,
        base_quantity: baseQuantity,
        from_location: fromLocation || undefined,
        to_location: toLocation || undefined,
        waybill_number: waybillNumber || undefined,
        charged_to_person: chargedToPerson || undefined,
        reference_type: relatedPO ? "PurchaseOrder" : (selectedVendor ? "Vendor" : "Manual"),
        reference_id: relatedPO || selectedVendor || undefined,
        performed_by: currentUser?.email || currentUser?.id,
        notes: notes || undefined,
        unit_cost: movementType === "OUT" ? (product.unit_cost || 0) : parsedUnitCost,
        base_unit_cost: baseUnitCost,
        vendor_product_code: movementType === "IN" && vendorProductCode ? vendorProductCode : undefined,
        invoice_category_id: movementType === "IN" && invoiceCategory ? invoiceCategory : undefined,
        bundle_quantity: movementType === "IN" && bundleQuantity ? parseFloat(bundleQuantity) : undefined
        };

      await base44.entities.StockMovement.create(movementData);

      // If linked to a PO, update the quantity_received and PO status
      if (movementType === "IN" && relatedPO && relatedPOItem) {
        const po = purchaseOrders.find(p => p.id === relatedPO);
        if (po) {
          const updatedItems = po.items.map(item => {
            // Update the specific item in the PO that matches the product_id selected
            if (item.product_id === relatedPOItem) { 
              const newQuantityReceived = (item.quantity_received || 0) + numericQuantity;
              // Ensure we don't exceed ordered quantity
              return {
                ...item,
                quantity_received: Math.min(newQuantityReceived, item.quantity_ordered)
              };
            }
            return item;
          });

          // Check if all items in the PO are fully received (considering all items, not just the current product)
          const allItemsFullyReceived = updatedItems.every(item => 
            item.quantity_received >= item.quantity_ordered
          );
          
          // Check if any item has been received at all
          const anyItemReceived = updatedItems.some(item => 
            (item.quantity_received || 0) > 0
          );

          let newStatus = po.status; // Default to current status
          if (allItemsFullyReceived) {
            newStatus = "Received";
          } else if (anyItemReceived) {
            newStatus = "Partially Received";
          } else {
            newStatus = "Confirmed"; // Should not happen if anyItemReceived is true for a PO with items
          }
          
          await base44.entities.PurchaseOrder.update(relatedPO, {
            items: updatedItems,
            status: newStatus,
            ...(allItemsFullyReceived ? { actual_delivery_date: new Date().toISOString().split('T')[0] } : {})
          });
        }
      }

      // Update stock items
      if (movementType === "IN") {
        const existingStock = await base44.entities.StockItem.filter({
          product_id: product.id,
          warehouse_location: toLocation
        });

        if (existingStock.length > 0) {
          const stock = existingStock[0];
          await base44.entities.StockItem.update(stock.id, {
            quantity_on_hand: (stock.quantity_on_hand || 0) + numericQuantity,
            last_counted_date: new Date().toISOString().split('T')[0]
          });
        } else {
          await base44.entities.StockItem.create({
            product_id: product.id,
            warehouse_location: toLocation,
            quantity_on_hand: numericQuantity,
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
          if (currentQuantity < numericQuantity) {
            setValidationError(`Cannot move out ${numericQuantity} units. Only ${currentQuantity} units available at ${fromLocation}.`);
            setIsProcessing(false);
            return;
          }

          await base44.entities.StockItem.update(stock[0].id, {
            quantity_on_hand: currentQuantity - numericQuantity,
            last_counted_date: new Date().toISOString().split('T')[0]
          });
        } else {
          setValidationError(`No stock found for this product at location ${fromLocation} to move out.`);
          setIsProcessing(false);
          return;
        }
      } else if (movementType === "TRANSFER") {
        // Decrease from source
        const fromStock = await base44.entities.StockItem.filter({
          product_id: product.id,
          warehouse_location: fromLocation
        });

        if (fromStock.length > 0) {
          const currentQuantity = fromStock[0].quantity_on_hand || 0;
          if (currentQuantity < numericQuantity) {
            setValidationError(`Cannot transfer ${numericQuantity} units. Only ${currentQuantity} units available at ${fromLocation}.`);
            setIsProcessing(false);
            return;
          }

          await base44.entities.StockItem.update(fromStock[0].id, {
            quantity_on_hand: currentQuantity - numericQuantity,
            last_counted_date: new Date().toISOString().split('T')[0]
          });
        } else {
          setValidationError(`No stock found for this product at source location ${fromLocation} to transfer.`);
          setIsProcessing(false);
          return;
        }

        // Increase at destination
        const toStock = await base44.entities.StockItem.filter({
          product_id: product.id,
          warehouse_location: toLocation
        });

        if (toStock.length > 0) {
          await base44.entities.StockItem.update(toStock[0].id, {
            quantity_on_hand: (toStock[0].quantity_on_hand || 0) + numericQuantity,
            last_counted_date: new Date().toISOString().split('T')[0]
          });
        } else {
          await base44.entities.StockItem.create({
            product_id: product.id,
            warehouse_location: toLocation,
            quantity_on_hand: numericQuantity,
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

  // Combine system and app users for chargedToPerson select
  const allUsers = [
    ...(systemUsers || []).map(u => ({ id: u.email, name: u.email })),
    ...(appUsers || []).map(u => ({ id: u.email, name: u.email }))
  ].filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i); // Deduplicate

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
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
                    setInvoiceCategory(data.invoice_category_id || '');
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
                  setRelatedPOItem("");
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select PO (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-po">No PO</SelectItem>
                    {purchaseOrders
                      .filter(po => !hideCompletedPOs || po.status !== 'Received') // Filter completed POs
                      .map((po) => (
                      <SelectItem key={po.id} value={po.id}>
                        {po.po_number} - {po.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">
                  Select if this receipt is for a specific purchase order.
                </p>
              </div>
              
              {relatedPO && (
                <div>
                  <Label htmlFor="related_po_item">PO Item (Product: {product.name}) *</Label>
                  <Select value={relatedPOItem} onValueChange={setRelatedPOItem}>
                    <SelectTrigger className={validationError && relatedPO && !relatedPOItem ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select PO Item" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailablePOItems().map((item, idx) => (
                        <SelectItem key={item.product_id + '-' + idx} value={item.product_id}>
                          {item.product_name || `Product ID: ${item.product_id}`} - Ordered: {item.quantity_ordered}, Received: {item.quantity_received || 0}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">
                    Select the specific item line in the PO this movement corresponds to.
                  </p>
                </div>
              )}

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
            <Label htmlFor="waybill_number">Waybill / Reference Number (Optional)</Label>
            <Input
              id="waybill_number"
              type="text"
              value={waybillNumber}
              onChange={(e) => setWaybillNumber(e.target.value)}
              placeholder="e.g., WB12345, Invoice 6789"
            />
          </div>

          {movementType === "IN" && (
            <>
              <div>
                <Label htmlFor="vendor_id">Προμηθευτής (Optional)</Label>
                <Select value={selectedVendor || 'none'} onValueChange={(val) => setSelectedVendor(val === 'none' ? '' : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλέξτε προμηθευτή" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Επιλέξτε --</SelectItem>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="vendor_product_code">Κωδικός Προϊόντος Προμηθευτή (Optional)</Label>
                <Input
                  id="vendor_product_code"
                  type="text"
                  value={vendorProductCode}
                  onChange={(e) => setVendorProductCode(e.target.value)}
                  placeholder="Κωδικός προμηθευτή"
                />
              </div>

              <div>
                <Label htmlFor="unit_cost">Κόστος ανά Μονάδα (€) (Optional)</Label>
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
                <Label htmlFor="bundle_quantity">Pcs/Qty (Optional)</Label>
                <Input
                  id="bundle_quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={bundleQuantity}
                  onChange={(e) => setBundleQuantity(e.target.value)}
                  placeholder="π.χ. 100 τεμάχια"
                />
              </div>

              <div>
                <Label htmlFor="invoice_category">Κατηγορία Τιμολόγησης (Optional)</Label>
                <Select value={invoiceCategory || 'none'} onValueChange={(val) => setInvoiceCategory(val === 'none' ? '' : val)}>
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
            <Label htmlFor="charged_to_person">Charged To / Performed By (Optional)</Label>
            <Select value={chargedToPerson} onValueChange={setChargedToPerson}>
              <SelectTrigger>
                <SelectValue placeholder="Select person (optional)" />
              </SelectTrigger>
              <SelectContent>
                {allUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-1">
              Select who initiated this movement or is responsible for it. Defaults to current user for tracking.
            </p>
          </div>

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

          {/* Movement History Section */}
          <div className="space-y-2 pt-4">
            <h3 className="text-lg font-medium">Recent Movements for {product.name}</h3>
            {movementHistory.length === 0 ? (
                <p className="text-sm text-gray-500">No recent movements found for this product.</p>
            ) : (
                <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                    {movementHistory.map((movement) => (
                        <div key={movement.id} className="mb-2 text-sm border-b pb-2 last:mb-0 last:border-b-0">
                            <p>
                                <strong>{movement.movement_type}</strong>: {movement.quantity} units{' '}
                                {movement.from_location && `from ${movement.from_location}`}{' '}
                                {movement.to_location && `to ${movement.to_location}`}
                            </p>
                            <p className="text-xs text-gray-600">
                                {new Date(movement.created_at).toLocaleString()}{' '}
                                {movement.performed_by && `by ${movement.performed_by}`}{' '}
                                {movement.notes && `- ${movement.notes}`}
                            </p>
                            {movement.reference_id && movement.reference_type === 'PurchaseOrder' && (
                                <p className="text-xs text-blue-600 mt-1">Ref: PO {movement.reference_id}</p>
                            )}
                        </div>
                    ))}
                </ScrollArea>
            )}
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