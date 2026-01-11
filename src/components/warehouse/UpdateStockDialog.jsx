import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle, Info, Search } from "lucide-react";
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
         base44.entities.PurchaseOrder.list().catch(() => []),
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

      // Filter POs that have this product and correct status
      const relevantPOsForAllStatuses = poData.filter(po => 
        (po.status === "Confirmed" || po.status === "Partially Received" || po.status === "Received") &&
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Επεξεργασία Κίνησης</DialogTitle>
          <DialogDescription>
            {product?.name} - SKU: {product?.sku}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {validationError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          {/* Product Info Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm font-semibold text-blue-900 mb-2">ΠΡΟΗΓΟΥΜΕΝΑ ΠΡΟΪΟΝΤΑ</div>
            <div className="text-xs space-y-1">
              <div><strong>{product?.name}</strong></div>
              <div className="text-slate-600">SKU: {product?.sku}</div>
              <div className="text-slate-600">Κατηγορία: {categories?.find(c => c.id === product?.category_id)?.name || 'N/A'}</div>
            </div>
          </div>

          {/* Movement Type */}
          <div>
            <Label className="text-xs font-bold mb-2 block">Ενλογη από Πολλές Αγορές</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Αναζητήστε παλιό προϊόν για αναπρογραμματισμό του πύλου"
                className="pl-10 h-9 text-xs"
              />
            </div>
          </div>

          {/* Θέση Αποθήκης και Εταιρεία */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Θέση Αποθήκης</Label>
              <Select value={toLocation} onValueChange={setToLocation}>
                <SelectTrigger className={`h-9 ${validationError && !toLocation ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="-- Χωρίς Εταιρεία --" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.name}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Εταιρεία *</Label>
              <Select value={selectedVendor || 'none'} onValueChange={(val) => setSelectedVendor(val === 'none' ? '' : val)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Aicontrol" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Σταγία Προμηθευτή και Κωδικός Προϊόντος */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Σταγία Προμηθευτή</Label>
              <Select value={relatedPO} onValueChange={(value) => {
                setRelatedPO(value === "no-po" ? "" : value);
                setRelatedPOItem("");
              }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="★ Test 2 (VEND-128)" />
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
              <Label className="text-xs">Κωδικός Προϊόντος</Label>
              <Input
                value={vendorProductCode}
                onChange={(e) => setVendorProductCode(e.target.value)}
                placeholder="-- Προϊόντος προμηθευτή --"
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Αρθμό Τιμολογίου */}
          <div>
            <Label className="text-xs">Αρθμό Τιμολογίου</Label>
            <Input
              type="text"
              value={waybillNumber}
              onChange={(e) => setWaybillNumber(e.target.value)}
              placeholder="π.χ. INV-2025-001"
              className="h-9 text-xs"
            />
          </div>

          {/* Ποσότητα και Κόστος */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Ποσότητα *</Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
                step="any"
                placeholder="1"
                className={`h-9 text-xs ${validationError && (!quantity || parseFloat(quantity) <= 0) ? 'border-red-500' : ''}`}
              />
            </div>
            <div>
              <Label className="text-xs">Μονάδα Εμπορευσίας (Βάση/ liter)</Label>
              <Select value={inputUnitSubtype || product?.unit_of_measure} onValueChange={setInputUnitSubtype}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Τμήμα (L)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="piece">Τεμάχιο</SelectItem>
                  <SelectItem value="meter">Μέτρο</SelectItem>
                  <SelectItem value="kg">Κιλό</SelectItem>
                  <SelectItem value="liter">Λίτρο</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Κόστος ανά Μονάδα */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Κόστος ανά piece</Label>
              <Input
                type="number"
                step="0.0001"
                min="0"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                placeholder="€14.0000"
                className="h-9 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Κόστος ανά piece</Label>
              <div className="h-9 flex items-center text-xs text-slate-500">
                Υπολογιζόμενος κόστος, βάσιμος μεταφορά.
              </div>
            </div>
          </div>

          {/* Προϊόντων Στοχεία */}
          <div>
            <Label className="text-xs">Προϊόντων Στοχεία</Label>
            <Select value={conversionRate} onValueChange={setConversionRate}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Α/Β Μονάδα" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Κατηγορία Τιμολόγησης */}
          <div>
            <Label className="text-xs">Κατηγορία Τιμολόγησης *</Label>
            <Select value={invoiceCategory || 'none'} onValueChange={(val) => setInvoiceCategory(val === 'none' ? '' : val)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="-- Χωρίς Κατηγορία --" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- Χωρίς Κατηγορία --</SelectItem>
                {invoiceCategories.map(ic => (
                  <SelectItem key={ic.id} value={ic.id}>{ic.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Αρθμό Waybill */}
          <div>
            <Label className="text-xs">Αρθμό Waybill</Label>
            <Input
              type="text"
              placeholder="π.χ. WB-2025-001"
              className="h-9 text-xs"
            />
          </div>

          {/* Σημειώσεις */}
          <div>
            <Label className="text-xs">Σημειώσεις</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Προσθέστε σημειώσεις..."
              className="h-9 text-xs"
            />
          </div>

          {/* Movement History Section */}
          <div className="space-y-1 pt-2 border-t">
            <p className="text-xs font-semibold text-slate-600">Recent Movements</p>
            {movementHistory.length === 0 ? (
                <p className="text-xs text-slate-500">No recent movements.</p>
            ) : (
                <ScrollArea className="h-24 w-full rounded border p-2">
                    <div className="space-y-1">
                      {movementHistory.map((movement) => (
                          <div key={movement.id} className="text-xs border-b pb-1 last:border-b-0">
                              <p className="font-medium">
                                  {movement.movement_type}: {movement.quantity} {movement.from_location && `from ${movement.from_location}`} {movement.to_location && `to ${movement.to_location}`}
                              </p>
                              <p className="text-xs text-slate-500">
                                  {new Date(movement.created_at).toLocaleString()} {movement.performed_by && `by ${movement.performed_by}`}
                              </p>
                          </div>
                      ))}
                    </div>
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