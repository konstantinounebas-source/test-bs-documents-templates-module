import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Search, Download, Package, Upload, X, QrCode, FileSpreadsheet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import ExcelJS from 'exceljs';

import ProductsTable from "../components/warehouse/ProductsTable";
import CreateEditProductDialog from "../components/warehouse/CreateEditProductDialog";
import ImportProductsDialog from "../components/warehouse/ImportProductsDialog";
import PaginationControls from "../components/warehouse/PaginationControls";
import ExportQRCodesDialog from "../components/warehouse/ExportQRCodesDialog";

// Helper function to add delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [productVendors, setProductVendors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [activeFilter, setActiveFilter] = useState("active");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState("10");
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [showExportQRDialog, setShowExportQRDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load data sequentially with delays
      const productsData = await base44.entities.Product.list("-updated_date");
      setProducts(productsData);
      
      await delay(300);
      const categoriesData = await base44.entities.ProductCategory.list();
      setCategories(categoriesData);
      
      await delay(300);
      const vendorsData = await base44.entities.Vendor.list();
      setVendors(vendorsData);
      
      await delay(300);
      const stockData = await base44.entities.StockItem.list();
      setStockItems(stockData);

      await delay(300); // Add delay before fetching product vendors
      const pvData = await base44.entities.ProductVendor.list();
      setProductVendors(pvData);
      
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const filteredProducts = products.filter(p => {
    if (activeFilter === "active" && !p.is_active) return false;
    if (activeFilter === "inactive" && p.is_active) return false;
    
    if (searchTerm !== "" && 
        !p.name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !p.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  // Pagination logic
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
    setCurrentPage(1); // Reset to first page
  };

  const getStockForProduct = (productId) => {
    const items = stockItems.filter(s => s.product_id === productId);
    return items.reduce((sum, item) => sum + (item.quantity_on_hand || 0) - (item.quantity_reserved || 0), 0);
  };

  const handleStatClick = (filter) => {
    if (activeFilter === filter) {
      setActiveFilter("active");
    } else {
      setActiveFilter(filter);
    }
  };

  const getFilterLabel = () => {
    if (activeFilter === "all") return "All Products";
    if (activeFilter === "active") return "Active Products";
    if (activeFilter === "inactive") return "Inactive Products";
    return "";
  };

  const toggleProductSelection = (productId) => {
    setSelectedProductIds(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedProductIds.length === filteredProducts.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredProducts.map(p => p.id));
    }
  };

  const getSelectedProducts = () => {
    return products.filter(p => selectedProductIds.includes(p.id));
  };

  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Products');

      // Define columns
      worksheet.columns = [
        { header: 'SKU', key: 'sku', width: 15 },
        { header: 'Name', key: 'name', width: 30 },
        { header: 'Description', key: 'description', width: 40 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Unit Cost (€)', key: 'unit_cost', width: 12 },
        { header: 'Current Stock', key: 'current_stock', width: 15 },
        { header: 'Minimum Stock', key: 'minimum_stock', width: 15 },
        { header: 'Unit of Measure', key: 'unit_of_measure', width: 15 },
        { header: 'Status', key: 'status', width: 10 },
      ];

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4B5563' }
      };
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      // Add data
      filteredProducts.forEach(product => {
        const category = categories.find(c => c.id === product.category_id);
        const currentStock = getStockForProduct(product.id);
        
        // Get unit cost from preferred vendor or product
        const productVendorsForProduct = productVendors.filter(pv => pv.product_id === product.id && pv.is_active);
        const preferredVendor = productVendorsForProduct.find(pv => pv.is_preferred);
        const unitCost = preferredVendor?.unit_cost || productVendorsForProduct[0]?.unit_cost || product.unit_cost || 0;

        worksheet.addRow({
          sku: product.sku,
          name: product.name,
          description: product.description || '',
          category: category?.name || 'N/A',
          unit_cost: unitCost,
          current_stock: currentStock,
          minimum_stock: product.minimum_stock || 0,
          unit_of_measure: product.unit_of_measure,
          status: product.is_active ? 'Active' : 'Inactive'
        });
      });

      // Auto-fit columns and add borders
      worksheet.eachRow({ includeEmpty: false }, (row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });

      // Generate buffer and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Products_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export to Excel. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Products Management</h1>
            <p className="text-slate-600 mt-1">Manage your warehouse products and inventory</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowImportDialog(true)}
              variant="outline"
              className="shadow-sm"
            >
              <Upload className="w-5 h-5 mr-2" />
              Import CSV
            </Button>
            <Button 
              onClick={handleExportExcel}
              variant="outline"
              className="shadow-sm bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
            >
              <FileSpreadsheet className="w-5 h-5 mr-2" />
              Export Excel
            </Button>
            <Button 
              onClick={() => setShowExportQRDialog(true)}
              variant="outline"
              className="shadow-sm bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
              disabled={selectedProductIds.length === 0}
            >
              <QrCode className="w-5 h-5 mr-2" />
              Export QR ({selectedProductIds.length})
            </Button>
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="bg-blue-600 hover:bg-blue-700 shadow-sm"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card 
            className={`border-slate-200 cursor-pointer transition-all hover:shadow-md ${
              activeFilter === "all" ? "ring-2 ring-blue-500 bg-blue-50" : ""
            }`}
            onClick={() => handleStatClick("all")}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-600">Total Products</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{products.length}</p>
                  {activeFilter === "all" && (
                    <p className="text-xs text-blue-600 mt-1">Currently viewing all</p>
                  )}
                </div>
                <div className={`p-2 rounded-full ${activeFilter === "all" ? "bg-blue-500" : "bg-slate-500"}`}>
                  <Package className="w-4 h-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`border-slate-200 cursor-pointer transition-all hover:shadow-md ${
              activeFilter === "active" ? "ring-2 ring-green-500 bg-green-50" : ""
            }`}
            onClick={() => handleStatClick("active")}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-600">Active Products</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {products.filter(p => p.is_active).length}
                  </p>
                  {activeFilter === "active" && (
                    <p className="text-xs text-green-600 mt-1">Currently viewing active</p>
                  )}
                </div>
                <div className={`p-2 rounded-full ${activeFilter === "active" ? "bg-green-500" : "bg-gray-500"}`}>
                  <Package className="w-4 h-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Active Filter Badge */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search products by name, SKU, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-50 border-slate-200"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="select-all"
                  checked={selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <label 
                  htmlFor="select-all" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer whitespace-nowrap"
                >
                  Επιλογή Όλων
                </label>
              </div>
            </div>
            
            {activeFilter !== "active" && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="flex items-center gap-2 py-1.5 px-3">
                  <span className="font-normal">Filtering by:</span> 
                  <span className="font-semibold">{getFilterLabel()}</span>
                  <button onClick={() => setActiveFilter("active")} className="ml-1 rounded-full hover:bg-slate-300 p-0.5">
                    <X className="w-3 h-3"/>
                  </button>
                </Badge>
              </div>
            )}

            {selectedProductIds.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-100 text-purple-800 py-1.5 px-3">
                  {selectedProductIds.length} προϊόντα επιλεγμένα
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedProductIds([])}
                  className="h-7"
                >
                  Καθαρισμός
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <ProductsTable 
            products={paginatedProducts} 
            categories={categories}
            vendors={vendors}
            stockItems={stockItems}
            productVendors={productVendors}
            isLoading={isLoading}
            onProductSaved={loadData}
            getStockForProduct={getStockForProduct}
            selectedProductIds={selectedProductIds}
            onToggleSelection={toggleProductSelection}
          />
          
          <PaginationControls
            currentPage={currentPage}
            totalItems={filteredProducts.length}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </div>
      </div>

      <CreateEditProductDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onProductSaved={loadData}
        categories={categories}
        vendors={vendors}
      />

      <ImportProductsDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onProductsImported={loadData}
        categories={categories}
        vendors={vendors}
      />

      <ExportQRCodesDialog
        open={showExportQRDialog}
        onClose={() => setShowExportQRDialog(false)}
        selectedProducts={getSelectedProducts()}
      />
    </div>
  );
}