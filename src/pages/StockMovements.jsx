import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Search, Download, Upload, Loader2 } from "lucide-react";

import StockMovementsTable from "../components/warehouse/StockMovementsTable";
import ImportStockMovementsDialog from "../components/warehouse/ImportStockMovementsDialog";
import ViewMovementDialog from "../components/warehouse/ViewMovementDialog";
import EditMovementDialog from "../components/warehouse/EditMovementDialog";
import PaginationControls from "../components/warehouse/PaginationControls";
import ProductMovementsDrawer from "../components/warehouse/ProductMovementsDrawer";

// Helper function to add delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default function StockMovementsPage() {
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [productVendors, setProductVendors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [showImportDialog, setShowImportDialog] = useState(false);

  const [selectedMovement, setSelectedMovement] = useState(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showProductDrawer, setShowProductDrawer] = useState(false);
  const [selectedProductForDrawer, setSelectedProductForDrawer] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState("20");
  const [isFixingCosts, setIsFixingCosts] = useState(false);
  const [totalMovementsCount, setTotalMovementsCount] = useState(0);
  const [allMovementsForStock, setAllMovementsForStock] = useState([]);

  useEffect(() => {
    loadData();
  }, [currentPage, itemsPerPage, searchTerm, typeFilter, locationFilter, productFilter, timeFilter]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // If filters are active or "All" selected, load all movements. Otherwise, use pagination
      const hasFilters = searchTerm || typeFilter !== "all" || locationFilter !== "all" || productFilter !== "all" || timeFilter !== "all";
      const showAll = itemsPerPage === "all";
      const skip = (hasFilters || showAll) ? 0 : (currentPage - 1) * parseInt(itemsPerPage);
      const limit = (hasFilters || showAll) ? 10000 : parseInt(itemsPerPage);
      
      // Load movements + other data in parallel
      const [
        movementsData,
        allMovementsData,
        productsData,
        locationsData,
        systemUsers,
        appUsers,
        vendorsData,
        pvData,
        categoriesData,
        companiesData
      ] = await Promise.all([
        base44.entities.StockMovement.list("-created_date", limit, skip),
        base44.entities.StockMovement.list("-created_date", 50000),
        base44.entities.Product.list(),
        base44.entities.WarehouseLocation.list(),
        base44.entities.User.list().catch(() => []),
        base44.entities.AppUser.list().catch(() => []),
        base44.entities.Vendor.filter({ is_active: true }),
        base44.entities.ProductVendor.list().catch(() => []),
        base44.entities.ProductCategory.filter({ is_active: true }),
        base44.entities.Company.filter({ is_active: true })
      ]);
      
      setTotalMovementsCount(allMovementsData.length);
      setAllMovementsForStock(allMovementsData);
      setMovements(movementsData);
      setProducts(productsData);
      setLocations(locationsData);
      
      // Combine system and app users
      const allUsers = [
        ...systemUsers.map(u => ({ ...u, type: 'system' })),
        ...appUsers.map(u => ({ ...u, type: 'app' }))
      ];
      setUsers(allUsers);
      
      setVendors(vendorsData);
      setProductVendors(pvData);
      setCategories(categoriesData);
      setCompanies(companiesData);
      
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const handleImportComplete = () => {
    setShowImportDialog(false);
    loadData();
  };

  const handleView = (movement) => {
    setSelectedMovement(movement);
    setShowViewDialog(true);
  };

  const handleEdit = (movement) => {
    setSelectedMovement(movement);
    setShowEditDialog(true);
  };

  const handleViewProductMovements = (product) => {
    setSelectedProductForDrawer(product);
    setShowProductDrawer(true);
  };

  const handleSaveEdit = async (movementId, updates) => {
    try {
      await base44.entities.StockMovement.update(movementId, updates);
      await loadData(); // Reload data after successful edit
      setShowEditDialog(false); // Close edit dialog
    } catch (error) {
      console.error("Error updating movement:", error);
      throw error;
    }
  };

  const handleFixOutMovementCosts = async () => {
    if (!window.confirm('Θα ενημερωθούν όλα τα OUT movements που δεν έχουν unit_cost με το τρέχον κόστος μονάδας του προϊόντος. Συνέχεια;')) {
      return;
    }

    setIsFixingCosts(true);
    try {
      // Find all OUT movements without unit_cost
      const outMovements = movements.filter(m => 
        m.movement_type === 'OUT' && (!m.unit_cost || parseFloat(m.unit_cost) === 0)
      );

      let updated = 0;
      for (const movement of outMovements) {
        const product = products.find(p => p.id === movement.product_id);
        if (product && product.unit_cost && product.unit_cost > 0) {
          await base44.entities.StockMovement.update(movement.id, {
            unit_cost: product.unit_cost
          });
          updated++;
        }
        // Add delay to avoid rate limiting
        if (updated % 10 === 0) {
          await delay(500);
        }
      }

      alert(`Ενημερώθηκαν ${updated} από ${outMovements.length} OUT movements.`);
      await loadData();
    } catch (error) {
      console.error("Error fixing OUT movement costs:", error);
      alert('Σφάλμα κατά την ενημέρωση των κινήσεων.');
    }
    setIsFixingCosts(false);
  };

  const exportToCSV = () => {
    const headers = [
      "Date/Time",
      "Type",
      "Product",
      "SKU",
      "Quantity",
      "From Location",
      "To Location",
      "Charged To",
      "Waybill",
      "Performed By",
      "Reference Type",
      "Reference ID",
      "Notes"
    ];

    const rows = filteredMovements.map(movement => {
      const product = products.find(p => p.id === movement.product_id);
      const performedBy = users.find(u => u.id === movement.performed_by || u.email === movement.performed_by);
      const chargedTo = users.find(u => u.id === movement.charged_to_person || u.email === movement.charged_to_person);
      
      return [
        new Date(movement.created_date).toLocaleString('en-GB', { timeZone: 'Europe/Athens' }),
        movement.movement_type,
        product?.name || 'Unknown',
        product?.sku || 'N/A',
        `${calculateDisplayQuantity(movement)} ${product?.unit_of_measure || ''}`,
        movement.from_location || '-',
        movement.to_location || '-',
        chargedTo?.full_name || movement.charged_to_person || '-',
        movement.waybill_number || '-',
        performedBy?.full_name || performedBy?.email || movement.performed_by || 'System',
        movement.reference_type || '-',
        movement.reference_id || '-',
        movement.notes || '-'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `stock_movements_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getTimeFilterDate = () => {
    const now = new Date();
    switch (timeFilter) {
      case 'today':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return weekAgo;
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return monthAgo;
      default:
        return null;
    }
  };

  const filteredMovements = movements.filter(movement => {
    const product = products.find(p => p.id === movement.product_id);
    const performedBy = users.find(u => u.id === movement.performed_by || u.email === movement.performed_by);
    const chargedTo = users.find(u => u.id === movement.charged_to_person);
    
    const matchesSearch = searchTerm === "" || 
      product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product?.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.from_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.to_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      performedBy?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chargedTo?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.notes?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === "all" || movement.movement_type === typeFilter;
    
    const matchesLocation = locationFilter === "all" || 
      movement.from_location === locationFilter ||
      movement.to_location === locationFilter;

    const matchesProduct = productFilter === "all" || movement.product_id === productFilter;

    const matchesTime = (() => {
      if (timeFilter === "all") return true;
      const filterDate = getTimeFilterDate();
      return filterDate && new Date(movement.created_date) >= filterDate;
    })();

    return matchesSearch && matchesType && matchesLocation && matchesProduct && matchesTime;
  });

  // If filters are active or "All" selected, paginate client-side. Otherwise, movements are server-paginated
  const hasFilters = searchTerm || typeFilter !== "all" || locationFilter !== "all" || productFilter !== "all" || timeFilter !== "all";
  const showAll = itemsPerPage === "all";
  const paginatedMovements = (hasFilters || showAll)
    ? (showAll ? filteredMovements : filteredMovements.slice(
        (currentPage - 1) * parseInt(itemsPerPage),
        currentPage * parseInt(itemsPerPage)
      ))
    : filteredMovements;

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const calculateDisplayQuantity = (movement) => {
    if (movement.base_quantity && movement.base_quantity > 0) {
      return movement.base_quantity;
    }
    const quantity = parseFloat(movement.quantity) || 0;
    const conversionRate = parseFloat(movement.conversion_rate) || 1;
    const bundleQuantity = parseFloat(movement.bundle_quantity) || null;
    return bundleQuantity ? quantity * conversionRate * bundleQuantity : quantity * conversionRate;
  };

  const stats = {
    total: movements.length,
    in: movements.filter(m => m.movement_type === 'IN').reduce((sum, m) => sum + calculateDisplayQuantity(m), 0),
    out: movements.filter(m => m.movement_type === 'OUT').reduce((sum, m) => sum + calculateDisplayQuantity(m), 0),
    adjustments: movements.filter(m => m.movement_type === 'ADJUSTMENT').length
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Stock Movements</h1>
            <p className="text-slate-600 mt-1">Track all inventory movements and adjustments</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleFixOutMovementCosts}
              disabled={isFixingCosts}
            >
              {isFixingCosts ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ενημέρωση...
                </>
              ) : (
                'Διόρθωση Κόστους OUT'
              )}
            </Button>
            <Button variant="outline" onClick={() => setShowImportDialog(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
            <Button onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Movements</CardTitle>
              <Activity className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Stock In</CardTitle>
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <Activity className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.in}</div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Stock Out</CardTitle>
              <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                <Activity className="h-4 w-4 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.out}</div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Adjustments</CardTitle>
              <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                <Activity className="h-4 w-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.adjustments}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search movements..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="IN">IN</SelectItem>
                  <SelectItem value="OUT">OUT</SelectItem>
                  <SelectItem value="TRANSFER">TRANSFER</SelectItem>
                  <SelectItem value="ADJUSTMENT">ADJUSTMENT</SelectItem>
                </SelectContent>
              </Select>

              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.filter(l => l.name).map(location => (
                    <SelectItem key={location.id} value={location.name}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={productFilter} onValueChange={setProductFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {products.filter(p => p.name).map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Movements Table */}
        <Card className="border-slate-200">
          <CardContent className="p-0">
            <StockMovementsTable 
             movements={paginatedMovements}
             products={products}
             users={users}
             isLoading={isLoading}
             onView={handleView}
             onEdit={handleEdit}
             onViewProductMovements={handleViewProductMovements}
             allMovements={allMovementsForStock}
            />
            
            <PaginationControls
              currentPage={currentPage}
              totalItems={(hasFilters || itemsPerPage === "all") ? filteredMovements.length : totalMovementsCount}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          </CardContent>
        </Card>
      </div>

      <ImportStockMovementsDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImportComplete={handleImportComplete}
      />

      <ViewMovementDialog
        open={showViewDialog}
        onClose={() => {
          setShowViewDialog(false);
          setSelectedMovement(null);
        }}
        movement={selectedMovement}
        product={selectedMovement ? products.find(p => p.id === selectedMovement.product_id) : null}
        users={users}
        vendors={vendors}
      />

      <EditMovementDialog
        open={showEditDialog}
        onClose={() => {
          setShowEditDialog(false);
          setSelectedMovement(null);
        }}
        movement={selectedMovement}
        products={products}
        vendors={vendors}
        productVendors={productVendors}
        categories={categories}
        companies={companies}
        onSave={handleSaveEdit}
      />

      {selectedProductForDrawer && (
        <ProductMovementsDrawer
          isOpen={showProductDrawer}
          onOpenChange={setShowProductDrawer}
          productId={selectedProductForDrawer.id}
          productName={selectedProductForDrawer.name}
          onEditMovement={handleEdit}
          vendors={vendors}
        />
      )}
    </div>
  );
}