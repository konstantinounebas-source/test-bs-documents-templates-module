import React, { useState, memo } from "react";
import { base44 } from "@/api/base44Client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, AlertTriangle, MapPin, ChevronDown, ChevronRight, Star, DollarSign, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import ViewProductDialog from "./ViewProductDialog";

const StockOverviewTable = memo(function StockOverviewTable({ products, categories, vendors, isLoading, onDataUpdated }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [showViewDialog, setShowViewDialog] = useState(false);

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'N/A';
  };

  const getVendorName = (vendorId) => {
    const vendor = vendors.find(v => v.id === vendorId);
    return vendor?.name || 'N/A';
  };

  const handleViewProduct = (product) => {
    setSelectedProduct(product);
    setShowViewDialog(true);
  };

  const toggleRow = (productId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedRows(newExpanded);
  };

  const renderUnitCost = (product) => {
    const pvs = product.productVendors || [];
    
    // If there's a preferred vendor, show that cost
    if (product.preferred_vendor_id) {
      const preferredPV = pvs.find(pv => pv.vendor_id === product.preferred_vendor_id && pv.is_preferred);
      
      if (preferredPV && preferredPV.unit_cost > 0) {
        return (
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            <span className="font-semibold">€{preferredPV.unit_cost.toFixed(4)}</span>
          </div>
        );
      }
    }
    
    // Otherwise show average cost from IN movements
    if (product.unit_cost && product.unit_cost > 0) {
      return (
        <div>
          <div className="font-semibold">€{product.unit_cost.toFixed(4)}</div>
          <div className="text-xs text-slate-500">Average</div>
        </div>
      );
    }
    
    // No cost data available
    return <span className="text-slate-400">No cost data</span>;
  };

  const renderTotalValue = (product) => {
    const pvs = product.productVendors || [];
    let unitCost = 0;
    
    // If preferred vendor, use that cost
    if (product.preferred_vendor_id) {
      const preferredPV = pvs.find(pv => pv.vendor_id === product.preferred_vendor_id && pv.is_preferred);
      if (preferredPV && preferredPV.unit_cost > 0) {
        unitCost = preferredPV.unit_cost;
      }
    }
    
    // Otherwise use average cost
    if (unitCost === 0) {
      unitCost = product.unit_cost || 0;
    }
    
    if (unitCost === 0) {
      return <span className="text-slate-400">-</span>;
    }
    
    const totalValue = product.available * unitCost;
    
    return (
      <span className="font-semibold">
        €{totalValue.toFixed(2)}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="p-12 text-center">
        <p className="text-slate-500">No products found matching your filters.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-10"></TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Total On Hand</TableHead>
              <TableHead>Reserved</TableHead>
              <TableHead>Available</TableHead>
              <TableHead>Minimum Stock</TableHead>
              <TableHead>Unit Cost</TableHead>
              <TableHead>Total Value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const isNegative = product.available < 0;
              const isLowStock = product.available < (product.minimum_stock || 0) && product.available >= 0;
              const isOutOfStock = product.available === 0;
              const isExpanded = expandedRows.has(product.id);
              const hasMultipleLocations = product.items && product.items.length > 1;
              const hasVendors = product.productVendors && product.productVendors.length > 0;
              const canExpand = hasMultipleLocations || hasVendors;
              
              return (
                <React.Fragment key={product.id}>
                  <TableRow className="hover:bg-slate-50">
                    <TableCell>
                      {canExpand && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => toggleRow(product.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-slate-600">
                      {product.description || '-'}
                    </TableCell>
                    <TableCell>{getCategoryName(product.category_id)}</TableCell>
                    <TableCell>{product.total} {product.unit_of_measure}</TableCell>
                    <TableCell className="text-orange-600">{product.reserved} {product.unit_of_measure}</TableCell>
                    <TableCell>
                      <span className={
                        product.available < 0 
                          ? 'text-red-600 font-bold' 
                          : isLowStock 
                            ? 'text-red-600 font-semibold' 
                            : 'text-green-600 font-semibold'
                      }>
                        {product.available} {product.unit_of_measure}
                      </span>
                    </TableCell>
                    <TableCell>{product.minimum_stock || 0} {product.unit_of_measure}</TableCell>
                    <TableCell>{renderUnitCost(product)}</TableCell>
                    <TableCell>{renderTotalValue(product)}</TableCell>
                    <TableCell>
                      {isNegative ? (
                        <Badge className="bg-red-600 text-white">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Negative Stock
                        </Badge>
                      ) : isOutOfStock ? (
                        <Badge className="bg-red-100 text-red-800">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Out of Stock
                        </Badge>
                      ) : isLowStock ? (
                        <Badge className="bg-orange-100 text-orange-800">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Low Stock
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleViewProduct(product)}
                          title="View Product Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  {/* Expanded Details */}
                  {isExpanded && (
                    <TableRow className="bg-slate-50">
                      <TableCell colSpan={13} className="p-0">
                        <div className="px-12 py-4 space-y-4">
                          {/* Stock by Location */}
                          {hasMultipleLocations && (
                            <div>
                              <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-slate-700">
                                <MapPin className="w-4 h-4" />
                                Stock by Location:
                              </div>
                              <div className="space-y-2">
                                {product.items.map((item, idx) => {
                                  const itemAvailable = (item.quantity_on_hand || 0) - (item.quantity_reserved || 0);
                                  return (
                                    <div 
                                      key={idx} 
                                      className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200"
                                    >
                                      <div className="flex items-center gap-3">
                                        <MapPin className="w-4 h-4 text-slate-400" />
                                        <span className="font-medium text-slate-900">
                                          {item.warehouse_location}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-6 text-sm">
                                        <div>
                                          <span className="text-slate-600">On Hand: </span>
                                          <span className="font-semibold">{item.quantity_on_hand || 0}</span>
                                        </div>
                                        <div>
                                          <span className="text-slate-600">Reserved: </span>
                                          <span className="font-semibold text-orange-600">{item.quantity_reserved || 0}</span>
                                        </div>
                                        <div>
                                          <span className="text-slate-600">Available: </span>
                                          <span className={
                                            itemAvailable < 0 
                                              ? "font-bold text-red-600" 
                                              : "font-semibold text-green-600"
                                          }>
                                            {itemAvailable}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Vendors & Pricing */}
                          {hasVendors && (
                            <div>
                              <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-slate-700">
                                <DollarSign className="w-4 h-4" />
                                Vendors & Pricing:
                              </div>
                              <div className="space-y-2">
                                {product.productVendors.map((pv, idx) => (
                                  <div 
                                    key={idx} 
                                    className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200"
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="font-medium text-slate-900">
                                        {getVendorName(pv.vendor_id)}
                                      </span>
                                      {pv.is_preferred && (
                                        <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
                                          <Star className="w-3 h-3 fill-yellow-600" />
                                          Preferred
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-6 text-sm">
                                      {pv.vendor_product_code && (
                                        <div>
                                          <span className="text-slate-600">Vendor Code: </span>
                                          <span className="font-mono font-semibold text-slate-900">{pv.vendor_product_code}</span>
                                        </div>
                                      )}
                                      <div>
                                        <span className="text-slate-600">Unit Cost: </span>
                                        <span className="font-semibold text-slate-900">€{pv.unit_cost.toFixed(2)}</span>
                                      </div>
                                      {pv.lead_time_days && (
                                        <div>
                                          <span className="text-slate-600">Lead Time: </span>
                                          <span className="font-semibold">{pv.lead_time_days} days</span>
                                        </div>
                                      )}
                                      {pv.minimum_order_quantity && (
                                        <div>
                                          <span className="text-slate-600">Min Order: </span>
                                          <span className="font-semibold">{pv.minimum_order_quantity}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {!hasMultipleLocations && !hasVendors && (
                            <p className="text-sm text-slate-500 text-center py-2">No additional details available</p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ViewProductDialog
        open={showViewDialog}
        onClose={() => {
          setShowViewDialog(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        categories={categories}
        vendors={vendors}
        stockItems={selectedProduct?.items || []}
        onUpdate={onDataUpdated}
      />
      </>
      );
});

export default StockOverviewTable;