import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export default function ProductVendorsManager({ product, vendors, onUpdate }) {
  const [recentMovements, setRecentMovements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (product?.id) {
      loadProductVendors();
    }
  }, [product?.id]);

  const loadProductVendors = async () => {
    setIsLoading(true);
    try {
      // Load recent IN movements for this product (latest 10)
      const movements = await base44.entities.StockMovement.filter({
        product_id: product.id,
        movement_type: 'IN'
      });
      
      // Get latest 10 movements
      const latestMovements = movements
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
        .slice(0, 10);
      
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
            <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
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
                    recentMovements.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell>
                          <div className="text-sm font-medium">
                            {movement.reference_type === 'Vendor' && movement.reference_id 
                              ? getVendorName(movement.reference_id) 
                              : (movement.reference_type || 'Manual Entry')}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {movement.waybill_number || '-'}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {movement.unit_cost && movement.unit_cost > 0 ? (
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
                        <TableCell className="text-right text-xs text-slate-600">
                          {new Date(movement.created_date).toLocaleDateString('el-GR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </TableCell>
                      </TableRow>
                    ))
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