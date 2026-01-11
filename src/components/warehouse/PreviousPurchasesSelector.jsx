import React, { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { History } from "lucide-react";

export default function PreviousPurchasesSelector({ 
  productId, 
  onSelect, 
  disabled = false,
  vendors = [],
  companies = [],
  invoiceCategories = []
}) {
  const [previousPurchases, setPreviousPurchases] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (productId) {
      loadPreviousPurchases();
    } else {
      setPreviousPurchases([]);
    }
  }, [productId]);

  const loadPreviousPurchases = async () => {
    setIsLoading(true);
    try {
      // Φόρτωση των τελευταίων 20 IN movements για το προϊόν
      const allMovements = await base44.entities.StockMovement.list("-created_date");
      const movements = allMovements
        .filter(m => m.product_id === productId && m.movement_type === "IN")
        .slice(0, 20);

      // Φιλτράρισμα για μοναδικούς συνδυασμούς (vendor + unit_cost + vendor_product_code)
      const uniquePurchases = [];
      const seen = new Set();

      for (const movement of movements) {
        // Skip if reference_id or unit_cost is missing or empty
        if (!movement.reference_id || movement.reference_id === '' || !movement.unit_cost) continue;
        
        const key = `${movement.reference_id}_${movement.unit_cost}_${movement.vendor_product_code || ''}`;
        
        if (!seen.has(key)) {
          seen.add(key);
          uniquePurchases.push(movement);
          
          if (uniquePurchases.length >= 5) break;
        }
      }

      setPreviousPurchases(uniquePurchases);
    } catch (error) {
      console.error("Error loading previous purchases:", error);
      setPreviousPurchases([]);
    }
    setIsLoading(false);
  };

  const handleSelect = (movementId) => {
    if (movementId === "none") {
      onSelect(null);
      return;
    }

    const movement = previousPurchases.find(m => String(m.id).trim() === movementId);
    if (movement && onSelect) {
      onSelect({
        vendor_id: movement.reference_id,
        unit_cost: movement.unit_cost,
        bundle_quantity: movement.bundle_quantity,
        vendor_product_code: movement.vendor_product_code,
        invoice_category_id: movement.invoice_category_id,
        company_id: movement.company_id
      });
    }
  };

  const getVendorName = (vendorId) => {
    const vendor = vendors.find(v => v.id === vendorId);
    return vendor?.name || vendorId;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('el-GR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (!productId) return null;

  return (
    <div>
      <Label className="flex items-center gap-2 mb-2">
        <History className="w-4 h-4" />
        Επιλογή από Παλιές Αγορές
      </Label>
      <Select onValueChange={handleSelect} disabled={disabled || isLoading || previousPurchases.length === 0}>
        <SelectTrigger>
          <SelectValue placeholder={
            isLoading ? "Φόρτωση..." : 
            previousPurchases.length === 0 ? "Δεν υπάρχουν προηγούμενες αγορές" :
            "Επιλέξτε παλιά αγορά..."
          } />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">-- Νέα Αγορά --</SelectItem>
          {previousPurchases.filter(m => {
            if (!m.id) return false;
            const idStr = String(m.id).trim();
            return idStr.length > 0;
          }).map((movement) => {
            const valueStr = String(movement.id || '').trim();
            const finalValue = valueStr && valueStr.length > 0 ? valueStr : `fallback-${Date.now()}-${Math.random()}`;
            return (
            <SelectItem key={movement.id} value={finalValue}>
              <div className="flex flex-col py-1">
                <div className="font-medium">
                  {formatDate(movement.created_date)} - {getVendorName(movement.reference_id)}
                </div>
                <div className="text-xs text-slate-600">
                  {movement.quantity} μον. @ €{parseFloat(movement.unit_cost).toFixed(4)}
                  {movement.vendor_product_code && ` - Κωδ: ${movement.vendor_product_code}`}
                  {movement.bundle_quantity && ` (${movement.bundle_quantity} pcs)`}
                </div>
              </div>
            </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {previousPurchases.length > 0 && (
        <p className="text-xs text-slate-500 mt-1">
          Επιλέξτε μια παλιά αγορά για αυτόματη συμπλήρωση των πεδίων
        </p>
      )}
    </div>
  );
}