import React, { useState, memo } from "react";
import { base44 } from "@/api/base44Client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, AlertTriangle, MapPin, ChevronDown, ChevronRight, Star, DollarSign, Eye, ArrowUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import ViewProductDialog from "./ViewProductDialog";

const StockOverviewTable = memo(function StockOverviewTable({ products, categories, vendors, stockMovements, isLoading, onDataUpdated }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const calculateDisplayQuantity = (movement) => {
    if (movement.base_quantity && movement.base_quantity > 0) {
      return movement.base_quantity;
    }
    
    const quantity = parseFloat(movement.quantity) || 0;
    const conversionRate = parseFloat(movement.conversion_rate) || 1;
    const bundleQuantity = parseFloat(movement.bundle_quantity) || null;
    
    if (bundleQuantity) {
      return quantity * conversionRate * bundleQuantity;
    }
    
    return quantity * conversionRate;
  };

  const getStockByLocation = (productId) => {
    const productMovements = (stockMovements || []).filter(m => m.product_id === productId);
    const locationStocks = {};
    
    for (const movement of productMovements) {
      const qty = calculateDisplayQuantity(movement);
      let location = null;
      
      if (movement.movement_type === 'IN') {
        location = movement.to_location;
        if (location) {
          locationStocks[location] = (locationStocks[location] || 0) + qty;
        }
      } else if (movement.movement_type === 'OUT') {
        location = movement.from_location;
        if (location) {
          locationStocks[location] = (locationStocks[location] || 0) - qty;
        }
      } else if (movement.movement_type === 'TRANSFER') {
        const fromLoc = movement.from_location;
        const toLoc = movement.to_location;
        if (fromLoc) {
          locationStocks[fromLoc] = (locationStocks[fromLoc] || 0) - qty;
        }
        if (toLoc) {
          locationStocks[toLoc] = (locationStocks[toLoc] || 0) + qty;
        }
      } else if (movement.movement_type === 'ADJUSTMENT') {
        location = movement.to_location;
        if (location) {
          locationStocks[location] = (locationStocks[location] || 0) + qty;
        }
      }
    }
    
    return Object.entries(locationStocks)
      .filter(([_, qty]) => qty !== 0)
      .map(([location, quantity]) => ({
        warehouse_location: location,
        quantity_on_hand: quantity,
        quantity_reserved: 0
      }));
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedProducts = React.useMemo(() => {
    if (!sortConfig.key) return products;
    
    return [...products].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      if (sortConfig.key === 'category_id') {
        aVal = getCategoryName(a.category_id);
        bVal = getCategoryName(b.category_id);
      }
      
      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';
      
      if (typeof aVal === 'string') {
        return sortConfig.direction === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }
      
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [products, sortConfig]);

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
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('sku')} className="font-semibold px-0 h-auto">
                  SKU
                  <ArrowUpDown className={`ml-2 h-4 w-4 ${sortConfig.key === 'sku' ? '' : 'text-gray-400'} ${sortConfig.key === 'sku' && sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('name')} className="font-semibold px-0 h-auto">
                  Product Name
                  <ArrowUpDown className={`ml-2 h-4 w-4 ${sortConfig.key === 'name' ? '' : 'text-gray-400'} ${sortConfig.key === 'name' && sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} />
                </Button>
              </TableHead>
              <TableHead>Description</TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('category_id')} className="font-semibold px-0 h-auto">
                  Category
                  <ArrowUpDown className={`ml-2 h-4 w-4 ${sortConfig.key === 'category_id' ? '' : 'text-gray-400'} ${sortConfig.key === 'category_id' && sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('total')} className="font-semibold px-0 h-auto">
                  Total On Hand
                  <ArrowUpDown className={`ml-2 h-4 w-4 ${sortConfig.key === 'total' ? '' : 'text-gray-400'} ${sortConfig.key === 'total' && sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('reserved')} className="font-semibold px-0 h-auto">
                  Reserved
                  <ArrowUpDown className={`ml-2 h-4 w-4 ${sortConfig.key === 'reserved' ? '' : 'text-gray-400'} ${sortConfig.key === 'reserved' && sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('available')} className="font-semibold px-0 h-auto">
                  Available
                  <ArrowUpDown className={`ml-2 h-4 w-4 ${sortConfig.key === 'available' ? '' : 'text-gray-400'} ${sortConfig.key === 'available' && sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('minimum_stock')} className="font-semibold px-0 h-auto">
                  Minimum Stock
                  <ArrowUpDown className={`ml-2 h-4 w-4 ${sortConfig.key === 'minimum_stock' ? '' : 'text-gray-400'} ${sortConfig.key === 'minimum_stock' && sortConfig.direction === 'desc' ? 'rotate-180' : ''}`} />
                </Button>
              </TableHead>
              <TableHead>Unit Cost</TableHead>
              <TableHead>Total Value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedProducts.map((product) => {
              const isNegative = product.available < 0;
              const isLowStock = product.available < (product.minimum_stock || 0) && product.available >= 0;
              const isOutOfStock = product.available === 0;
              const isExpanded = expandedRows.has(product.id);
              const locationStock = getStockByLocation(product.id);
              const hasMultipleLocations = locationStock.length > 0;
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
                                {locationStock.map((item, idx) => {
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
                                          <span className={
                                            item.quantity_on_hand < 0 
                                              ? "font-bold text-red-600" 
                                              : "font-semibold"
                                          }>
                                            {item.quantity_on_hand?.toFixed(2) || 0}
                                          </span>
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
                                            {itemAvailable?.toFixed(2)}
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