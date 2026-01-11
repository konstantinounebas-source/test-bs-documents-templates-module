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
      const movementData = {
        product_id: product.id,
        movement_type: movementType,
        quantity: numericQuantity,
        from_location: fromLocation || undefined,
        to_location: toLocation || undefined,
        charged_to_person: chargedToPerson || undefined,
        reference_type: "Manual",
        performed_by: currentUser?.email || currentUser?.id,
        notes: notes || undefined,
        unit_cost: movementType === "OUT" ? (product.unit_cost || 0) : undefined
      };

      await base44.entities.StockMovement.create(movementData);

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