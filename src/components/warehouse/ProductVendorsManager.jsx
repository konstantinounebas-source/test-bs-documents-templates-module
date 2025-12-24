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
      
      // Load recent IN movements for this product (latest 10)
      const movements = await base44.entities.StockMovement.filter({
        product_id: product.id,
        movement_type: 'IN'
      });
      
      // Get latest 10 movements
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

  const handleSelectAveragePrice = async (e) => {
    e.stopPropagation();
    
    // Update product's preferred_vendor_id to null (indicating average cost is selected)
    try {
      await base44.entities.Product.update(product.id, {
        preferred_vendor_id: null
      });
      if (onUpdate) await onUpdate();
    } catch (error) {
      console.error("Error selecting average price:", error);
    }
  };

  const handleSelectVendorPrice = async (e, movement) => {
    e.stopPropagation();
    const vendorInfo = getVendorFromMovement(movement);
    if (!vendorInfo) return;
    
    // Set the vendor as preferred
    try {
      await base44.entities.Product.update(product.id, {
        preferred_vendor_id: vendorInfo.vendorId
      });
      if (onUpdate) await onUpdate();
    } catch (error) {
      console.error("Error selecting vendor price:", error);
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
            {/* Average Cost Section - Always Show */}
            <div 
              className={`p-4 rounded-lg cursor-pointer transition-all ${
                !product.preferred_vendor_id && product.unit_cost > 0
                  ? 'bg-yellow-100 border-2 border-yellow-400 shadow-md' 
                  : 'bg-blue-50 border-2 border-blue-200 hover:border-blue-300 hover:shadow'
              }`}
              onClick={handleSelectAveragePrice}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {!product.preferred_vendor_id && product.unit_cost > 0 && (
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Μέσος Όρος Κόστους (από IN κινήσεις)</p>
                    <p className="text-xs text-blue-700 mt-1">
                      {product.unit_cost && product.unit_cost > 0 ? (
                        <>Υπολογισμένος από {product.total_quantity_purchased || 0} {product.unit_of_measure} συνολικά</>
                      ) : (
                        <>Δεν υπάρχουν IN κινήσεις με κόστος ακόμα</>
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-900">
                    {product.unit_cost && product.unit_cost > 0 ? (
                      <>€{product.unit_cost.toFixed(4)}</>
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
                    <TableHead>Vendor</TableHead>
                    <TableHead>Waybill</TableHead>
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
                      const isPreferred = vendorInfo && product.preferred_vendor_id === vendorInfo.vendorId;
                      const hasVendor = vendorInfo !== null;
                      const needsVendor = !hasVendor && movement.reference_type === 'Invoice';

                      return (
                        <TableRow 
                          key={movement.id}
                          className={`${hasVendor ? 'cursor-pointer hover:bg-slate-100' : ''} ${
                            isPreferred ? 'bg-yellow-100 border-l-4 border-yellow-500' : ''
                          }`}
                          onClick={(e) => hasVendor && handleSelectVendorPrice(e, movement)}
                        >
                          <TableCell>
                            <div className="text-sm font-medium flex items-center gap-2">
                              {isPreferred && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
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
                      <TableCell colSpan={7} className="text-center text-sm text-slate-500 py-4">
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