import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Search, Download, AlertTriangle, Package, FileSpreadsheet } from "lucide-react";
import * as XLSX from "exceljs";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import StockOverviewTable from "../components/warehouse/StockOverviewTable";
import PaginationControls from "../components/warehouse/PaginationControls";

export default function StockOverviewPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [showInactive, setShowInactive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState("10");

  // Use React Query for data fetching with caching
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.ProductCategory.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: stockItems = [] } = useQuery({
    queryKey: ['stockItems'],
    queryFn: () => base44.entities.StockItem.list(),
    staleTime: 2 * 60 * 1000,
  });

  const { data: stockMovements = [] } = useQuery({
    queryKey: ['stockMovements'],
    queryFn: () => base44.entities.StockMovement.list("-created_date", 50000),
    staleTime: 2 * 60 * 1000,
  });

  const { data: productVendors = [] } = useQuery({
    queryKey: ['productVendors'],
    queryFn: () => base44.entities.ProductVendor.list(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => base44.entities.Vendor.list(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.Company.list(),
    staleTime: 10 * 60 * 1000,
  });

  const isLoading = productsLoading;

  // Optimized data maps for O(1) lookups
  const stockByProductId = useMemo(() => {
    const map = {};
    stockItems.forEach(item => {
      if (!map[item.product_id]) map[item.product_id] = [];
      map[item.product_id].push(item);
    });
    return map;
  }, [stockItems]);

  const vendorsByProductId = useMemo(() => {
    const map = {};
    productVendors.forEach(pv => {
      if (pv.is_active) {
        if (!map[pv.product_id]) map[pv.product_id] = [];
        map[pv.product_id].push(pv);
      }
    });
    return map;
  }, [productVendors]);

  const loadAllData = () => {
    // Invalidate queries to refresh
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['stockItems'] });
  };

  const calculateDisplayQuantity = (movement) => {
    // If base_quantity exists and is valid, use it
    if (movement.base_quantity && movement.base_quantity > 0) {
      return movement.base_quantity;
    }
    
    // Otherwise, calculate it from quantity, conversion_rate, and bundle_quantity
    const quantity = parseFloat(movement.quantity) || 0;
    const conversionRate = parseFloat(movement.conversion_rate) || 1;
    const bundleQuantity = parseFloat(movement.bundle_quantity) || null;
    
    if (bundleQuantity) {
      return quantity * conversionRate * bundleQuantity;
    }
    
    return quantity * conversionRate;
  };

  const getStockForProduct = (productId) => {
    // Calculate stock from movements (single source of truth)
    const productMovements = stockMovements.filter(m => m.product_id === productId);
    
    let total = 0;
    for (const movement of productMovements) {
      const qty = calculateDisplayQuantity(movement);
      
      if (movement.movement_type === 'IN' || movement.movement_type === 'ADJUSTMENT') {
        total += qty;
      } else if (movement.movement_type === 'OUT') {
        total -= qty;
      }
      // TRANSFER doesn't affect total stock
    }
    
    // Reserved stock from StockItems
    const items = stockByProductId[productId] || [];
    const reserved = items.reduce((sum, item) => sum + (item.quantity_reserved || 0), 0);
    const available = total - reserved;
    
    return { total, reserved, available, items };
  };

  const getProductVendorsForProduct = (productId) => {
    return vendorsByProductId[productId] || [];
  };

  // Memoize filtered and enriched products
  const productsWithStock = useMemo(() => {
    const activeProducts = showInactive ? products : products.filter(p => p.is_active);
    
    return activeProducts.map(product => ({
      ...product,
      ...getStockForProduct(product.id),
      productVendors: getProductVendorsForProduct(product.id)
    }));
  }, [products, showInactive, stockByProductId, vendorsByProductId]);

  const filteredProducts = useMemo(() => {
    return productsWithStock.filter(p => {
      const matchesSearch = searchTerm === "" ||
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = categoryFilter === "all" || p.category_id === categoryFilter;
      
      const matchesCompany = companyFilter === "all" || p.company_id === companyFilter;

      const matchesStock = stockFilter === "all" ||
        (stockFilter === "low" && p.available < (p.minimum_stock || 0)) ||
        (stockFilter === "out" && p.available === 0) ||
        (stockFilter === "ok" && p.available >= (p.minimum_stock || 0));

      return matchesSearch && matchesCategory && matchesCompany && matchesStock;
    });
  }, [productsWithStock, searchTerm, categoryFilter, companyFilter, stockFilter]);

  // Pagination logic for the table
  const paginatedProducts = useMemo(() => {
    return itemsPerPage === "all"
      ? filteredProducts
      : filteredProducts.slice(
          (currentPage - 1) * parseInt(itemsPerPage),
          currentPage * parseInt(itemsPerPage)
        );
  }, [filteredProducts, itemsPerPage, currentPage]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const exportToExcel = async () => {
    const workbook = new XLSX.Workbook();
    const sheet = workbook.addWorksheet("Stock Overview");

    sheet.columns = [
      { header: "SKU", key: "sku", width: 18 },
      { header: "Product Name", key: "name", width: 35 },
      { header: "Category", key: "category", width: 20 },
      { header: "Unit", key: "unit", width: 12 },
      { header: "Total Stock", key: "total", width: 14 },
      { header: "Reserved", key: "reserved", width: 14 },
      { header: "Available", key: "available", width: 14 },
      { header: "Min Stock", key: "min_stock", width: 14 },
      { header: "Unit Cost (€)", key: "unit_cost", width: 16 },
      { header: "Stock Value (€)", key: "stock_value", width: 18 },
      { header: "Status", key: "status", width: 14 },
    ];

    // Header row styling
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
    headerRow.alignment = { horizontal: "center" };

    filteredProducts.forEach((p) => {
      const cat = categories.find(c => c.id === p.category_id);
      const status = p.available === 0 ? "Out of Stock" : p.available < (p.minimum_stock || 0) ? "Low Stock" : "OK";
      const row = sheet.addRow({
        sku: p.sku || "",
        name: p.name || "",
        category: cat?.name || "",
        unit: p.unit_of_measure || "",
        total: p.total || 0,
        reserved: p.reserved || 0,
        available: p.available || 0,
        min_stock: p.minimum_stock || 0,
        unit_cost: p.unit_cost || 0,
        stock_value: (p.available || 0) * (p.unit_cost || 0),
        status,
      });
      if (status === "Out of Stock") {
        row.getCell("status").font = { color: { argb: "FFCC0000" }, bold: true };
      } else if (status === "Low Stock") {
        row.getCell("status").font = { color: { argb: "FFD97706" }, bold: true };
      } else {
        row.getCell("status").font = { color: { argb: "FF16A34A" }, bold: true };
      }
    });

    // Number formatting
    ["total", "reserved", "available", "min_stock"].forEach(k => {
      sheet.getColumn(k).numFmt = "#,##0.##";
    });
    ["unit_cost", "stock_value"].forEach(k => {
      sheet.getColumn(k).numFmt = "#,##0.0000";
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `stock_overview_${new Date().toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate stats based on filtered products - memoized
  const stats = useMemo(() => {
    const totalValue = filteredProducts.reduce((sum, p) => {
      const unitCost = p.unit_cost || 0;
      return sum + (p.available * unitCost);
    }, 0);

    const lowStockCount = filteredProducts.filter(p => p.available < (p.minimum_stock || 0)).length;
    const outOfStockCount = filteredProducts.filter(p => p.available === 0).length;

    return { totalValue, lowStockCount, outOfStockCount };
  }, [filteredProducts]);

  const { totalValue, lowStockCount, outOfStockCount } = stats;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Stock Overview</h1>
            <p className="text-slate-600 mt-1">Real-time inventory levels and stock locations</p>
          </div>
          <Button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 text-white">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export to Excel
          </Button>
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
                  <p className="text-2xl font-bold text-slate-900 mt-1">{filteredProducts.length}</p>
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

            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.filter(c => c.is_active).map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
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
            products={paginatedProducts}
            categories={categories}
            vendors={vendors}
            stockMovements={stockMovements}
            isLoading={isLoading}
            onDataUpdated={loadAllData}
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
    </div>
  );
}