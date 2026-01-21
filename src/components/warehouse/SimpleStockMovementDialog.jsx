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

export default function SimpleStockMovementDialog({ open, onClose, product, onStockUpdated }) {
  const [movementType, setMovementType] = useState("IN");
  const [quantity, setQuantity] = useState("");
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [chargedToPerson, setChargedToPerson] = useState("");
  const [notes, setNotes] = useState("");
  const [inputUnitSubtype, setInputUnitSubtype] = useState("");
  const [conversionRate, setConversionRate] = useState("1");
  const [bundleQuantity, setBundleQuantity] = useState("");
  const [locations, setLocations] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);
  const [appUsers, setAppUsers] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [validationError, setValidationError] = useState("");

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
      setBundleQuantity("");
      setValidationError("");
    }
  }, [open, product]);

  const loadData = async () => {
    if (!product) return;
    setIsProcessing(true);
    setValidationError("");

    try {
      const [locationsData, user, sysUsers, aUsers] = await Promise.all([
        base44.entities.WarehouseLocation.filter({ is_active: true }),
        base44.auth.me(),
        base44.entities.User.list().catch(() => []),
        base44.entities.AppUser.list().catch(() => [])
      ]);
      
      setLocations(locationsData);
      setCurrentUser(user);
      setSystemUsers(sysUsers);
      setAppUsers(aUsers);
    } catch (error) {
      console.error("Error loading data:", error);
      setValidationError("Failed to load necessary data. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const recalculateStockForProduct = async (productId) => {
    try {
      const allMovements = await base44.entities.StockMovement.filter({ product_id: productId });
      const stockItems = await base44.entities.StockItem.filter({ product_id: productId });
      
      const locationStocks = {};
      
      allMovements.forEach(mov => {
        const baseQty = mov.base_quantity || 
          (mov.quantity * (mov.conversion_rate || 1) * (mov.bundle_quantity || 1));

        if (mov.movement_type === 'IN' && mov.to_location) {
          locationStocks[mov.to_location] = (locationStocks[mov.to_location] || 0) + baseQty;
        } else if (mov.movement_type === 'OUT' && mov.from_location) {
          locationStocks[mov.from_location] = (locationStocks[mov.from_location] || 0) - baseQty;
        } else if (mov.movement_type === 'TRANSFER') {
          if (mov.from_location) {
            locationStocks[mov.from_location] = (locationStocks[mov.from_location] || 0) - baseQty;
          }
          if (mov.to_location) {
            locationStocks[mov.to_location] = (locationStocks[mov.to_location] || 0) + baseQty;
          }
        } else if (mov.movement_type === 'ADJUSTMENT') {
          const location = mov.to_location || mov.from_location;
          if (location) {
            locationStocks[location] = (locationStocks[location] || 0) + baseQty;
          }
        }
      });
      
      for (const location in locationStocks) {
        const existingStock = stockItems.find(si => si.warehouse_location === location);
        const correctQuantity = Math.max(0, locationStocks[location]);
        
        if (existingStock) {
          await base44.entities.StockItem.update(existingStock.id, {
            quantity_on_hand: correctQuantity,
            last_counted_date: new Date().toISOString().split('T')[0]
          });
        } else if (correctQuantity > 0) {
          await base44.entities.StockItem.create({
            product_id: productId,
            warehouse_location: location,
            quantity_on_hand: correctQuantity,
            quantity_reserved: 0,
            last_counted_date: new Date().toISOString().split('T')[0]
          });
        }
      }

      for (const item of stockItems) {
        if (!locationStocks[item.warehouse_location] || locationStocks[item.warehouse_location] <= 0) {
          await base44.entities.StockItem.delete(item.id);
        }
      }
    } catch (error) {
      console.error('Error recalculating stock:', error);
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
      const parsedBundleQty = bundleQuantity ? parseFloat(bundleQuantity) : null;
      const baseQuantity = parsedBundleQty 
        ? numericQuantity * parsedConversionRate * parsedBundleQty
        : numericQuantity * parsedConversionRate;
      const baseUnitCost = product.unit_cost && parsedConversionRate > 0 
        ? (parsedBundleQty ? product.unit_cost / parsedConversionRate / parsedBundleQty : product.unit_cost / parsedConversionRate)
        : undefined;

      const movementData = {
        product_id: product.id,
        movement_type: movementType,
        quantity: numericQuantity,
        input_unit_of_measure: inputUnitSubtype || product.unit_of_measure,
        conversion_rate: parsedConversionRate,
        base_quantity: baseQuantity,
        bundle_quantity: parsedBundleQty,
        from_location: fromLocation || undefined,
        to_location: toLocation || undefined,
        charged_to_person: chargedToPerson || undefined,
        reference_type: "Manual",
        performed_by: currentUser?.email || currentUser?.id,
        notes: notes || undefined,
        unit_cost: movementType === "OUT" ? (product.unit_cost || 0) : undefined,
        base_unit_cost: baseUnitCost
      };

      await base44.entities.StockMovement.create(movementData);

      // Recalculate stock from all movements
      await recalculateStockForProduct(product.id);

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
              <Label htmlFor="bundle_quantity">Pcs/Qty (προαιρετικό)</Label>
              <Input
                id="bundle_quantity"
                type="number"
                min="1"
                step="1"
                value={bundleQuantity}
                onChange={(e) => setBundleQuantity(e.target.value)}
                placeholder="π.χ. 100"
              />
              <p className="text-xs text-slate-500 mt-1">
                Τεμάχια ανά μονάδα εισαγωγής
              </p>
            </div>
          </div>

          <div className="col-span-2">
            <p className="text-xs text-slate-500">
              Ποσότητα βασικής μονάδας ({product?.unit_of_measure}): {(() => {
                const qty = parseFloat(quantity) || 0;
                const convRate = parseFloat(conversionRate) || 1;
                const bundleQty = parseFloat(bundleQuantity) || null;
                return bundleQty ? (qty * convRate * bundleQty).toFixed(2) : (qty * convRate).toFixed(2);
              })()}
            </p>
          </div>

          {movementType === "IN" && (
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