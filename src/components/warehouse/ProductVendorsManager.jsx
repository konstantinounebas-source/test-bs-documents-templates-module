import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Star, Edit } from "lucide-react";

export default function ProductVendorsManager({ product, vendors, companies = [], categories = [], onUpdate, onEditMovement }) {
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
      // Load data in parallel - limit movements to latest 50 for performance
      const [pvData, movements] = await Promise.all([
        base44.entities.ProductVendor.filter({ product_id: product.id }),
        base44.entities.StockMovement.filter({ 
          product_id: product.id,
          movement_type: 'IN'
        }, '-created_date', 50) // Only latest 50 movements
      ]);
      
      setProductVendors(pvData);
      
      // Enrich movements with vendor info
      const enrichedMovements = movements.map(movement => {
        let vendorId = null;
        
        // 1. Check if movement has reference_type === 'Vendor'
        if (movement.reference_type === 'Vendor' && movement.reference_id) {
          vendorId = movement.reference_id;
        }
        
        // 2. Check if movement has vendor_id field directly
        if (!vendorId && movement.vendor_id) {
          vendorId = movement.vendor_id;
        }
        
        // 3. Try to match via ProductVendor records
        if (!vendorId) {
          let matchingPV = null;
          
          if (movement.vendor_product_code) {
            matchingPV = pvData.find(pv => 
              pv.vendor_product_code === movement.vendor_product_code
            );
          }
          
          // Fallback: match by unit_cost if not found by code
          if (!matchingPV && movement.unit_cost) {
            matchingPV = pvData.find(pv => 
              Math.abs((pv.unit_cost || 0) - movement.unit_cost) < 0.001
            );
          }
          
          vendorId = matchingPV?.vendor_id || null;
        }
        
        return {
          ...movement,
          enriched_vendor_id: vendorId
        };
      });
      
      // Calculate average - movements already sorted by created_date desc
      const { totalCost, totalQty } = enrichedMovements.reduce((acc, movement) => {
        const baseQty = movement.base_quantity || movement.quantity;
        const baseUnitCost = movement.base_unit_cost || movement.unit_cost;
        
        if (baseUnitCost && baseUnitCost > 0 && baseQty > 0) {
          acc.totalCost += baseQty * baseUnitCost;
          acc.totalQty += baseQty;
        }
        return acc;
      }, { totalCost: 0, totalQty: 0 });
      
      const averageUnitCost = totalQty > 0 ? totalCost / totalQty : 0;
      setCalculatedAverage({ cost: averageUnitCost, quantity: totalQty });
      
      // Latest 10 for display (already sorted)
      setRecentMovements(enrichedMovements.slice(0, 10));
    } catch (error) {
      console.error("Error loading IN movements:", error);
    }
    setIsLoading(false);
  };



  // Memoize vendor lookup for performance
  const vendorMap = useMemo(() => {
    return vendors.reduce((map, vendor) => {
      map[vendor.id] = vendor.name;
      return map;
    }, {});
  }, [vendors]);

  const getVendorName = (vendorId) => {
    return vendorMap[vendorId] || 'Unknown';
  };
  
  const getVendorFromMovement = (movement) => {
    // 1. Use enriched vendor_id from ProductVendor matching
    if (movement.enriched_vendor_id) {
      return {
        vendorId: movement.enriched_vendor_id,
        vendorName: getVendorName(movement.enriched_vendor_id)
      };
    }
    
    // 2. Check reference_type === 'Vendor'
    if (movement.reference_type === 'Vendor' && movement.reference_id) {
      return {
        vendorId: movement.reference_id,
        vendorName: getVendorName(movement.reference_id)
      };
    }
    
    // 3. Check if movement has vendor_id field directly
    if (movement.vendor_id) {
      return {
        vendorId: movement.vendor_id,
        vendorName: getVendorName(movement.vendor_id)
      };
    }
    
    // 4. Try to match reference_id with vendor
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

            <div className="border rounded-lg overflow-hidden overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Waybill</TableHead>
                    <TableHead>Vendor Code</TableHead>
                    <TableHead>Κόστος (Βασική Μονάδα)</TableHead>
                    <TableHead>Κόστος (Μονάδα Εισαγωγής)</TableHead>
                    <TableHead>Ποσότητα (Μονάδα Εισαγωγής)</TableHead>
                    <TableHead>Ποσότητα (Βασική Μονάδα)</TableHead>
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
                              ) : (
                                <span className="text-slate-400">Χειροκίνητη Καταχώρηση</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {movement.waybill_number || movement.reference_id || '-'}
                          </TableCell>
                          <TableCell className="font-mono text-sm text-slate-600">
                            {movement.vendor_product_code || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {movement.base_unit_cost ? (
                                <>
                                  <div>
                                    <p className="font-semibold text-green-700">€{Number(movement.base_unit_cost).toFixed(4)}</p>
                                    <p className="text-xs text-slate-500">/{product.unit_of_measure}</p>
                                  </div>
                                  {movement.unit_cost && movement.input_unit_of_measure && movement.input_unit_of_measure !== product.unit_of_measure && (
                                    <div className="pt-1 border-t border-slate-200">
                                      <p className="text-xs font-medium text-slate-600">€{Number(movement.unit_cost).toFixed(4)}</p>
                                      <p className="text-xs text-slate-400">/{movement.input_unit_of_measure}</p>
                                    </div>
                                  )}
                                </>
                              ) : movement.unit_cost ? (
                                <div>
                                  <p className="font-semibold">€{Number(movement.unit_cost).toFixed(4)}</p>
                                  <p className="text-xs text-slate-500">/{movement.input_unit_of_measure || product.unit_of_measure}</p>
                                </div>
                              ) : (
                                <span className="text-slate-400">N/A</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {movement.unit_cost ? (
                              <div>
                                <p className="font-medium">€{Number(movement.unit_cost).toFixed(4)}</p>
                                <p className="text-xs text-slate-500">/{movement.input_unit_of_measure || 'item'}</p>
                              </div>
                            ) : (
                              <span className="text-slate-400">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{movement.quantity}</p>
                              <p className="text-xs text-slate-500">{movement.input_unit_of_measure || product.unit_of_measure}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const qty = movement.quantity || 0;
                              const convRate = movement.conversion_rate || 1;
                              const bundleQty = movement.bundle_quantity || 1;
                              
                              // If base_quantity exists, use it directly
                              if (movement.base_quantity) {
                                return (
                                  <div>
                                    <p className="font-semibold text-blue-700">{Number(movement.base_quantity).toFixed(2)}</p>
                                    <p className="text-xs text-slate-500">{product.unit_of_measure}</p>
                                  </div>
                                );
                              }
                              
                              // Otherwise calculate: quantity * conversion_rate * bundle_quantity
                              const calculatedBase = qty * convRate * bundleQty;
                              
                              return (
                                <div>
                                  <p className="font-semibold text-blue-700">{Number(calculatedBase).toFixed(2)}</p>
                                  <p className="text-xs text-slate-500">{product.unit_of_measure}</p>
                                </div>
                              );
                            })()}
                          </TableCell>
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
                                    onEditMovement(movement, vendors, productVendors, [product], categories, companies);
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
                      <TableCell colSpan={10} className="text-center text-sm text-slate-500 py-4">
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