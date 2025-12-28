import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Search, Download, AlertTriangle, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import StockOverviewTable from "../components/warehouse/StockOverviewTable";
import PaginationControls from "../components/warehouse/PaginationControls";
import EditMovementDialog from "../components/warehouse/EditMovementDialog";

export default function StockOverviewPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [productVendors, setProductVendors] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [showInactive, setShowInactive] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState("10"); // Default items per page
  
  // Edit movement dialog
  const [editingMovement, setEditingMovement] = useState(null);
  const [showEditMovementDialog, setShowEditMovementDialog] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [productsData, categoriesData, stockData, pvData, vendorsData] = await Promise.all([
        base44.entities.Product.list(),
        base44.entities.ProductCategory.list(),
        base44.entities.StockItem.list(),
        base44.entities.ProductVendor.list(),
        base44.entities.Vendor.list()
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
      setStockItems(stockData);
      setProductVendors(pvData);
      setVendors(vendorsData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const getStockForProduct = (productId) => {
    const items = stockItems.filter(s => s.product_id === productId);
    const total = items.reduce((sum, item) => sum + (item.quantity_on_hand || 0), 0);
    const reserved = items.reduce((sum, item) => sum + (item.quantity_reserved || 0), 0);
    const available = total - reserved;
    return { total, reserved, available, items };
  };

  const getProductVendorsForProduct = (productId) => {
    return productVendors.filter(pv => pv.product_id === productId && pv.is_active);
  };

  // Filter products by is_active first
  const activeProducts = showInactive ? products : products.filter(p => p.is_active);

  const productsWithStock = activeProducts.map(product => ({
    ...product,
    ...getStockForProduct(product.id),
    productVendors: getProductVendorsForProduct(product.id)
  }));

  const filteredProducts = productsWithStock.filter(p => {
    const matchesSearch = searchTerm === "" ||
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === "all" || p.category_id === categoryFilter;

    const matchesStock = stockFilter === "all" ||
      (stockFilter === "low" && p.available < (p.minimum_stock || 0)) ||
      (stockFilter === "out" && p.available === 0) ||
      (stockFilter === "ok" && p.available >= (p.minimum_stock || 0));

    return matchesSearch && matchesCategory && matchesStock;
  });

  // Pagination logic for the table
  const paginatedProducts = itemsPerPage === "all"
    ? filteredProducts
    : filteredProducts.slice(
        (currentPage - 1) * parseInt(itemsPerPage),
        currentPage * parseInt(itemsPerPage)
      );

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(value);
    setCurrentPage(1); // Reset to first page when items per page changes
  };
  
  const handleEditMovement = (movement) => {
    setEditingMovement(movement);
    setShowEditMovementDialog(true);
  };
  
  const recalculateProductAverages = async (productId) => {
    // Get all IN movements for this product
    const inMovements = await base44.entities.StockMovement.filter({
      product_id: productId,
      movement_type: 'IN'
    });
    
    // Calculate totals from actual movements
    let totalCost = 0;
    let totalQty = 0;
    let lastUnitCost = 0;
    let lastDate = null;
    
    inMovements.forEach(movement => {
      if (movement.unit_cost && movement.unit_cost > 0 && movement.quantity > 0) {
        totalCost += movement.quantity * movement.unit_cost;
        totalQty += movement.quantity;
        
        const movementDate = new Date(movement.created_date);
        if (!lastDate || movementDate > lastDate) {
          lastDate = movementDate;
          lastUnitCost = movement.unit_cost;
        }
      }
    });
    
    const averageUnitCost = totalQty > 0 ? totalCost / totalQty : 0;
    
    // Update product with correct values
    await base44.entities.Product.update(productId, {
      total_cost_paid: totalCost,
      total_quantity_purchased: totalQty,
      unit_cost: averageUnitCost,
      last_unit_cost: lastUnitCost
    });
  };

  const handleSaveMovement = async (movementId, updateData) => {
    await base44.entities.StockMovement.update(movementId, updateData);
    
    // Get the movement to find its product_id
    const movements = await base44.entities.StockMovement.filter({ id: movementId });
    if (movements.length > 0) {
      await recalculateProductAverages(movements[0].product_id);
    }
    
    await loadAllData();
  };

  // Calculate stats only for active products (independent of current page in table)
  const activeProductsWithStock = products
    .filter(p => p.is_active)
    .map(product => ({
      ...product,
      ...getStockForProduct(product.id),
      productVendors: getProductVendorsForProduct(product.id)
    }));

  const totalValue = activeProductsWithStock.reduce((sum, p) => {
    const preferredPV = p.productVendors.find(pv => pv.is_preferred);
    const unitCost = preferredPV?.unit_cost ||
                     (p.productVendors.length > 0
                       ? p.productVendors.reduce((s, pv) => s + pv.unit_cost, 0) / p.productVendors.length
                       : 0);
    return sum + (p.available * unitCost);
  }, 0);

  const lowStockCount = activeProductsWithStock.filter(p => p.available < (p.minimum_stock || 0)).length;
  const outOfStockCount = activeProductsWithStock.filter(p => p.available === 0).length;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Stock Overview</h1>
            <p className="text-slate-600 mt-1">Real-time inventory levels and stock locations</p>
          </div>
        </div>

        {/* Stats - Only for active products */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-600">Total Stock Value</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    €{totalValue.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-2 rounded-full bg-blue-500">
                  <Package className="w-4 h-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-600">Products Tracked</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{activeProductsWithStock.length}</p>
                </div>
                <div className="p-2 rounded-full bg-green-500">
                  <Package className="w-4 h-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-600">Low Stock Alerts</p>
                  <p className="text-2xl font-bold text-orange-600 mt-1">{lowStockCount}</p>
                </div>
                <div className="p-2 rounded-full bg-orange-500">
                  <AlertTriangle className="w-4 h-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-600">Out of Stock</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">{outOfStockCount}</p>
                </div>
                <div className="p-2 rounded-full bg-red-500">
                  <AlertTriangle className="w-4 h-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search products by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-50 border-slate-200"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Stock Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock</SelectItem>
                <SelectItem value="ok">Healthy Stock</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2 px-3 py-2 border border-slate-200 rounded-lg bg-slate-50">
              <Checkbox
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label
                htmlFor="show-inactive"
                className="text-sm font-medium cursor-pointer"
              >
                Show Inactive
              </Label>
            </div>
          </div>
        </div>

        {/* Stock Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <StockOverviewTable
            products={paginatedProducts} // Changed to paginatedProducts
            categories={categories}
            vendors={vendors}
            isLoading={isLoading}
            onDataUpdated={loadAllData}
            onEditMovement={handleEditMovement}
          />

          <PaginationControls
            currentPage={currentPage}
            totalItems={filteredProducts.length} // Total count of filtered items
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </div>
      </div>
      
      <EditMovementDialog
        open={showEditMovementDialog}
        onClose={() => {
          setShowEditMovementDialog(false);
          setEditingMovement(null);
        }}
        movement={editingMovement}
        onSave={handleSaveMovement}
        vendors={vendors}
        productVendors={productVendors}
        products={products}
        categories={categories}
      />
    </div>
  );
}