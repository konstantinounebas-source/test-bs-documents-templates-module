import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Star, Edit } from "lucide-react";

export default function ProductVendorsManager({ product, vendors, onUpdate, onEditMovement }) {
  const [recentMovements, setRecentMovements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [productVendors, setProductVendors] = useState([]);
  const [calculatedAverage, setCalculatedAverage] = useState({ cost: 0, quantity: 0 });

  useEffect(() => {
    if (product?.id) {
      loadProductVendors();
    }
  }, [product?.id]);

  const loadProductVendors = async () => {
    setIsLoading(true);
    try {
      // Load ProductVendors for preferred vendor info
      const pvData = await base44.entities.ProductVendor.filter({ product_id: product.id });
      setProductVendors(pvData);
      
      // Load ALL IN movements for this product to calculate true average
      const movements = await base44.entities.StockMovement.filter({
        product_id: product.id,
        movement_type: 'IN'
      });
      
      // Calculate true average from all movements
      let totalCost = 0;
      let totalQty = 0;
      
      movements.forEach(movement => {
        if (movement.unit_cost && movement.unit_cost > 0 && movement.quantity > 0) {
          totalCost += movement.quantity * movement.unit_cost;
          totalQty += movement.quantity;
        }
      });
      
      const averageUnitCost = totalQty > 0 ? totalCost / totalQty : 0;
      setCalculatedAverage({ cost: averageUnitCost, quantity: totalQty });
      
      // Get latest 10 movements for display
      const latestMovements = movements
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
        .slice(0, 10);
      
      console.log('Loaded movements:', latestMovements);
      setRecentMovements(latestMovements);
    } catch (error) {
      console.error("Error loading IN movements:", error);
    }
    setIsLoading(false);
  };



  const getVendorName = (vendorId) => {
    const vendor = vendors.find(v => v.id === vendorId);
    return vendor?.name || 'Unknown';
  };
  
  const getVendorFromMovement = (movement) => {
    // If reference_type is 'Vendor', use reference_id to find vendor
    if (movement.reference_type === 'Vendor' && movement.reference_id) {
      return {
        vendorId: movement.reference_id,
        vendorName: getVendorName(movement.reference_id)
      };
    }
    
    // If reference_type is 'Invoice', try to find vendor from waybill or reference_id
    // For now, check if reference_id matches a vendor ID
    if (movement.reference_id) {
      const vendor = vendors.find(v => v.id === movement.reference_id);
      if (vendor) {
        return {
          vendorId: vendor.id,
          vendorName: vendor.name
        };
      }
    }
    
    return null;
  };

  const isPreferredVendor = (vendorId) => {
    return productVendors.some(pv => pv.vendor_id === vendorId && pv.is_preferred);
  };

  // Removed - average cost is now calculated automatically, not selected via star

  const handleSelectPreferredVendor = async (e, movement) => {
    e.stopPropagation();
    const vendorInfo = getVendorFromMovement(movement);
    if (!vendorInfo) return;

    const unitCost = movement.unit_cost;
    if (!unitCost || unitCost <= 0) {
      console.error("Movement has no valid unit cost");
      return;
    }

    try {
      // Update or create ProductVendor with the unit cost from this movement
      const existingPVs = await base44.entities.ProductVendor.filter({
        product_id: product.id,
        vendor_id: vendorInfo.vendorId
      });

      const pvData = {
        unit_cost: unitCost,
        is_preferred: true,
        is_active: true
      };

      if (existingPVs.length === 0) {
        await base44.entities.ProductVendor.create({
          product_id: product.id,
          vendor_id: vendorInfo.vendorId,
          ...pvData
        });
      } else {
        await base44.entities.ProductVendor.update(existingPVs[0].id, pvData);
      }

      // Set all other ProductVendors for this product as not preferred
      const allPVs = await base44.entities.ProductVendor.filter({ product_id: product.id });
      for (const pv of allPVs) {
        if (pv.vendor_id !== vendorInfo.vendorId && pv.is_preferred) {
          await base44.entities.ProductVendor.update(pv.id, { is_preferred: false });
        }
      }

      // Set the vendor as preferred in Product (does NOT affect unit_cost)
      await base44.entities.Product.update(product.id, {
        preferred_vendor_id: vendorInfo.vendorId
      });

      // Notify parent to reload ALL data
      if (onUpdate) {
        await onUpdate();
        // Then reload local data
        await loadProductVendors();
      }
    } catch (error) {
      console.error("Error selecting preferred vendor:", error);
    }
  };

  if (!product) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Vendors & Pricing</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Average Cost Display - Non-interactive */}
            <div className="p-4 rounded-lg bg-blue-50 border-2 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-900">Μέσος Όρος Κόστους (από IN κινήσεις)</p>
                  <p className="text-xs text-blue-700 mt-1">
                    {calculatedAverage.cost > 0 ? (
                      <>Υπολογισμένος από {calculatedAverage.quantity} {product.unit_of_measure} συνολικά</>
                    ) : (
                      <>Δεν υπάρχουν IN κινήσεις με κόστος ακόμα</>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-900">
                    {calculatedAverage.cost > 0 ? (
                      <>€{calculatedAverage.cost.toFixed(4)}</>
                    ) : (
                      <span className="text-slate-400">€0.00</span>
                    )}
                  </p>
                  {product.last_unit_cost && product.last_unit_cost > 0 && (
                    <p className="text-xs text-blue-700">Τελευταία τιμή: €{product.last_unit_cost.toFixed(4)}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Waybill</TableHead>
                    <TableHead>Vendor Code</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Lead Time</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentMovements.length > 0 ? (
                    recentMovements.map((movement) => {
                      const vendorInfo = getVendorFromMovement(movement);
                      const hasVendor = vendorInfo !== null;
                      const needsVendor = !hasVendor && movement.reference_type === 'Invoice';

                      // Check if this specific movement's vendor is preferred AND has matching unit_cost in ProductVendor
                      let isPreferred = false;
                      if (vendorInfo && product.preferred_vendor_id === vendorInfo.vendorId) {
                        const matchingPV = productVendors.find(pv => 
                          pv.vendor_id === vendorInfo.vendorId && 
                          pv.is_preferred &&
                          Math.abs(pv.unit_cost - movement.unit_cost) < 0.0001
                        );
                        isPreferred = !!matchingPV;
                      }

                      return (
                        <TableRow 
                          key={movement.id}
                          className={isPreferred ? 'bg-yellow-100' : ''}
                        >
                          <TableCell>
                            {hasVendor && movement.unit_cost > 0 ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-7 w-7 ${
                                  isPreferred
                                    ? 'text-yellow-600 hover:text-yellow-700'
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                                onClick={(e) => handleSelectPreferredVendor(e, movement)}
                                title={isPreferred ? 'Προτιμώμενος Προμηθευτής' : 'Ορισμός ως προτιμώμενος'}
                              >
                                <Star className={`w-4 h-4 ${isPreferred ? 'fill-yellow-500' : ''}`} />
                              </Button>
                            ) : (
                              <div className="h-7 w-7" />
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">
                              {hasVendor ? (
                                vendorInfo.vendorName
                              ) : needsVendor ? (
                                <span className="text-slate-400">Χωρίς προμηθευτή</span>
                              ) : (
                                'Manual Entry'
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {movement.waybill_number || movement.reference_id || '-'}
                          </TableCell>
                          <TableCell className="font-mono text-sm text-slate-600">
                            {movement.vendor_product_code || '-'}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {(movement.unit_cost !== null && movement.unit_cost !== undefined && movement.unit_cost > 0) ? (
                              <>€{Number(movement.unit_cost).toFixed(4)}</>
                            ) : (
                              <span className="text-slate-400">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>-</TableCell>
                          <TableCell className="text-sm text-slate-600">{movement.quantity} {product.unit_of_measure}</TableCell>
                          <TableCell>
                            <Badge className="bg-blue-100 text-blue-800">IN</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-xs text-slate-600">
                                {new Date(movement.created_date).toLocaleDateString('el-GR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })}
                              </span>
                              {onEditMovement && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditMovement(movement);
                                  }}
                                  title="Επεξεργασία κίνησης"
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-sm text-slate-500 py-4">
                        Δεν υπάρχουν IN κινήσεις για αυτό το προϊόν
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}