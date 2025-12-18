import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, Package, User, TrendingUp, MapPin, ChevronDown, ChevronUp, Euro, Box } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import PaginationControls from "../components/warehouse/PaginationControls";

export default function ChargedMaterialsReportPage() {
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [productVendors, setProductVendors] = useState([]);
  const [users, setUsers] = useState([]);
  const [appUsers, setAppUsers] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [personFilter, setPersonFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeTab, setActiveTab] = useState("persons");
  const [expandedPersons, setExpandedPersons] = useState(new Set());
  const [expandedLocations, setExpandedLocations] = useState(new Set());
  const [groupBy, setGroupBy] = useState("person"); // "person" or "material"
  const [expandedMaterials, setExpandedMaterials] = useState(new Set());

  // Pagination states for persons tab
  const [personsCurrentPage, setPersonsCurrentPage] = useState(1);
  const [personsItemsPerPage, setPersonsItemsPerPage] = useState("10"); // Default 10 items per page or 'all'

  // Pagination states for locations tab
  const [locationsCurrentPage, setLocationsCurrentPage] = useState(1);
  const [locationsItemsPerPage, setLocationsItemsPerPage] = useState("10"); // Default 10 items per page or 'all'

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [movementsData, productsData, productVendorsData, usersData, appUsersData, stockData] = await Promise.all([
        base44.entities.StockMovement.filter({ movement_type: "OUT" }),
        base44.entities.Product.list(),
        base44.entities.ProductVendor.list().catch(() => []),
        base44.entities.User.list().catch(() => []),
        base44.entities.AppUser.list().catch(() => []),
        base44.entities.StockItem.list().catch(() => [])
      ]);
      
      // Only get OUT movements with charged_to_person
      const chargedMovements = movementsData.filter(m => m.charged_to_person);
      
      setMovements(chargedMovements);
      setProducts(productsData);
      setProductVendors(productVendorsData);
      setUsers(usersData);
      setAppUsers(appUsersData);
      setStockItems(stockData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const getUserName = (identifier) => {
    const sysUser = users.find(u => u.id === identifier || u.email === identifier);
    const appUser = appUsers.find(u => u.id === identifier);
    return sysUser?.full_name || appUser?.full_name || identifier;
  };

  const getProduct = (productId) => {
    return products.find(p => p.id === productId);
  };

  const getProductUnitCost = (productId) => {
    // Get unit cost from preferred vendor, or first active vendor, or product default
    const activeVendors = productVendors.filter(pv => pv.product_id === productId && pv.is_active);
    const preferredVendor = activeVendors.find(pv => pv.is_preferred);
    
    if (preferredVendor && preferredVendor.unit_cost) {
      return preferredVendor.unit_cost;
    }
    
    if (activeVendors.length > 0 && activeVendors[0].unit_cost) {
      return activeVendors[0].unit_cost;
    }
    
    // Fallback to product unit_cost if no vendor cost available
    const product = products.find(p => p.id === productId);
    return product?.unit_cost || 0;
  };

  // Get unique persons from movements
  const uniquePersons = [...new Set(movements.map(m => m.charged_to_person))].map(identifier => ({
    identifier,
    name: getUserName(identifier)
  }));

  // Get unique locations from stock items
  const uniqueLocations = [...new Set(stockItems.map(s => s.warehouse_location))].filter(Boolean);

  const filteredMovements = movements.filter(m => {
    const matchesSearch = !searchTerm || 
      getUserName(m.charged_to_person).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getProduct(m.product_id)?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPerson = personFilter === "all" || m.charged_to_person === personFilter;
    const matchesProduct = productFilter === "all" || m.product_id === productFilter;
    
    const matchesDate = (!startDate || new Date(m.created_date) >= new Date(startDate)) &&
                        (!endDate || new Date(m.created_date) <= new Date(endDate));
    
    return matchesSearch && matchesPerson && matchesProduct && matchesDate;
  });

  // Aggregate by person
  const aggregateByPerson = () => {
    const aggregated = {};
    
    filteredMovements.forEach(movement => {
      const person = movement.charged_to_person;
      if (!aggregated[person]) {
        aggregated[person] = {
          person,
          personName: getUserName(person),
          products: {},
          totalItems: 0,
          totalCost: 0
        };
      }
      
      const product = getProduct(movement.product_id);
      if (!product) return;
      
      const unitCost = getProductUnitCost(movement.product_id);
      const cost = unitCost * movement.quantity;
      
      if (!aggregated[person].products[movement.product_id]) {
        aggregated[person].products[movement.product_id] = {
          product,
          quantity: 0,
          cost: 0
        };
      }
      
      aggregated[person].products[movement.product_id].quantity += movement.quantity;
      aggregated[person].products[movement.product_id].cost += cost;
      aggregated[person].totalItems += movement.quantity;
      aggregated[person].totalCost += cost;
    });
    
    // Sort persons by name
    return Object.values(aggregated).sort((a, b) => 
      a.personName.localeCompare(b.personName)
    );
  };

  // Aggregate by material
  const aggregateByMaterial = () => {
    const aggregated = {};
    
    filteredMovements.forEach(movement => {
      const productId = movement.product_id;
      if (!aggregated[productId]) {
        const product = getProduct(productId);
        if (!product) return;
        
        aggregated[productId] = {
          product,
          persons: {},
          totalQuantity: 0,
          totalCost: 0
        };
      }
      
      const person = movement.charged_to_person;
      const unitCost = getProductUnitCost(productId);
      const cost = unitCost * movement.quantity;
      
      if (!aggregated[productId].persons[person]) {
        aggregated[productId].persons[person] = {
          personName: getUserName(person),
          quantity: 0,
          cost: 0
        };
      }
      
      aggregated[productId].persons[person].quantity += movement.quantity;
      aggregated[productId].persons[person].cost += cost;
      aggregated[productId].totalQuantity += movement.quantity;
      aggregated[productId].totalCost += cost;
    });
    
    // Sort materials by name
    return Object.values(aggregated).sort((a, b) => 
      a.product.name.localeCompare(b.product.name)
    );
  };

  // Aggregate by location
  const aggregateByLocation = () => {
    const aggregated = {};
    
    const filteredStock = locationFilter === "all" 
      ? stockItems 
      : stockItems.filter(s => s.warehouse_location === locationFilter);
    
    const searchFilteredStock = !searchTerm 
      ? filteredStock
      : filteredStock.filter(s => {
          const product = getProduct(s.product_id);
          return (s.warehouse_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 product?.sku.toLowerCase().includes(searchTerm.toLowerCase()));
        });

    searchFilteredStock.forEach(stock => {
      const location = stock.warehouse_location;
      if (!location) return;
      
      if (!aggregated[location]) {
        aggregated[location] = {
          location,
          products: {},
          totalItems: 0,
          totalCost: 0
        };
      }
      
      const product = getProduct(stock.product_id);
      if (!product) return;
      
      const availableQty = (stock.quantity_on_hand || 0) - (stock.quantity_reserved || 0);
      const unitCost = getProductUnitCost(stock.product_id);
      
      // Only include if quantity available is > 0 and product filter matches
      if (availableQty > 0 && (productFilter === "all" || stock.product_id === productFilter)) {
        if (!aggregated[location].products[stock.product_id]) {
          aggregated[location].products[stock.product_id] = {
            product,
            quantityOnHand: 0,
            quantityReserved: 0,
            quantityAvailable: 0,
            cost: 0
          };
        }
        aggregated[location].products[stock.product_id].quantityOnHand += (stock.quantity_on_hand || 0);
        aggregated[location].products[stock.product_id].quantityReserved += (stock.quantity_reserved || 0);
        aggregated[location].products[stock.product_id].quantityAvailable += availableQty;
        aggregated[location].products[stock.product_id].cost += availableQty * unitCost;

        aggregated[location].totalItems += availableQty;
        aggregated[location].totalCost += availableQty * unitCost;
      }
    });
    
    // Sort locations by name and filter out locations with no items after filtering
    return Object.values(aggregated)
      .filter(loc => loc.totalItems > 0)
      .sort((a, b) => a.location.localeCompare(b.location));
  };

  const personAggregates = aggregateByPerson();
  const materialAggregates = aggregateByMaterial();
  const locationAggregates = aggregateByLocation();

  // Persons Pagination
  const paginatedPersons = personsItemsPerPage === "all" 
    ? personAggregates 
    : personAggregates.slice(
        (personsCurrentPage - 1) * parseInt(personsItemsPerPage),
        personsCurrentPage * parseInt(personsItemsPerPage)
      );

  // Locations Pagination
  const paginatedLocations = locationsItemsPerPage === "all" 
    ? locationAggregates 
    : locationAggregates.slice(
        (locationsCurrentPage - 1) * parseInt(locationsItemsPerPage),
        locationsCurrentPage * parseInt(locationsItemsPerPage)
      );


  const togglePersonExpanded = (personId) => {
    const newExpanded = new Set(expandedPersons);
    if (newExpanded.has(personId)) {
      newExpanded.delete(personId);
    } else {
      newExpanded.add(personId);
    }
    setExpandedPersons(newExpanded);
  };

  const toggleLocationExpanded = (location) => {
    const newExpanded = new Set(expandedLocations);
    if (newExpanded.has(location)) {
      newExpanded.delete(location);
    } else {
      newExpanded.add(location);
    }
    setExpandedLocations(newExpanded);
  };

  const toggleMaterialExpanded = (productId) => {
    const newExpanded = new Set(expandedMaterials);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedMaterials(newExpanded);
  };

  // Calculate stats based on active tab
  const stats = activeTab === "persons" ? (
    groupBy === "person" ? {
      totalPersons: personAggregates.length,
      totalMovements: filteredMovements.length,
      totalItemsCharged: filteredMovements.reduce((sum, m) => sum + (m.quantity || 0), 0),
      totalCost: personAggregates.reduce((sum, p) => sum + (p.totalCost || 0), 0)
    } : {
      totalMaterials: materialAggregates.length,
      totalMovements: filteredMovements.length,
      totalItemsCharged: filteredMovements.reduce((sum, m) => sum + (m.quantity || 0), 0),
      totalCost: materialAggregates.reduce((sum, m) => sum + (m.totalCost || 0), 0)
    }
  ) : {
    totalLocations: locationAggregates.length,
    totalProducts: new Set(stockItems.map(s => s.product_id)).size,
    totalItemsInStock: locationAggregates.reduce((sum, loc) => sum + loc.totalItems, 0),
    totalCost: locationAggregates.reduce((sum, loc) => sum + (loc.totalCost || 0), 0)
  };

  const handleExport = () => {
    const csvData = [];
    
    if (activeTab === "persons") {
      if (groupBy === "person") {
        personAggregates.forEach(personData => {
          Object.values(personData.products).forEach(({ product, quantity, cost }) => {
            csvData.push({
              'Person': personData.personName,
              'Product SKU': product.sku,
              'Product Name': product.name,
              'Total Quantity Charged': quantity,
              'Unit Cost (€)': getProductUnitCost(product.id).toFixed(2),
              'Total Cost (€)': cost.toFixed(2),
              'Unit of Measure': product.unit_of_measure,
              'Period': startDate && endDate ? `${format(new Date(startDate), 'dd/MM/yyyy')} - ${format(new Date(endDate), 'dd/MM/yyyy')}` : 'All Time'
            });
          });
        });
      } else {
        materialAggregates.forEach(materialData => {
          Object.values(materialData.persons).forEach(({ personName, quantity, cost }) => {
            csvData.push({
              'Product SKU': materialData.product.sku,
              'Product Name': materialData.product.name,
              'Person': personName,
              'Quantity Charged': quantity,
              'Unit Cost (€)': getProductUnitCost(materialData.product.id).toFixed(2),
              'Total Cost (€)': cost.toFixed(2),
              'Unit of Measure': materialData.product.unit_of_measure,
              'Period': startDate && endDate ? `${format(new Date(startDate), 'dd/MM/yyyy')} - ${format(new Date(endDate), 'dd/MM/yyyy')}` : 'All Time'
            });
          });
        });
      }
    } else {
      locationAggregates.forEach(locationData => {
        Object.values(locationData.products).forEach(({ product, quantityOnHand, quantityReserved, quantityAvailable, cost }) => {
          csvData.push({
            'Location': locationData.location,
            'Product SKU': product.sku,
            'Product Name': product.name,
            'Quantity On Hand': quantityOnHand,
            'Quantity Reserved': quantityReserved,
            'Quantity Available': quantityAvailable,
            'Unit Cost (€)': getProductUnitCost(product.id).toFixed(2),
            'Total Value (€)': cost.toFixed(2),
            'Unit of Measure': product.unit_of_measure
          });
        });
      });
    }

    if (csvData.length === 0) {
      alert("No data to export for the current filters.");
      return;
    }

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => {
        const cell = row[header];
        if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
          // Escape quotes within string and wrap in quotes
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${activeTab}_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Materials Report</h1>
            <p className="text-slate-600 mt-1">View materials charged to persons and stock by location</p>
          </div>
          <Button onClick={handleExport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="persons" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Charged to Persons
            </TabsTrigger>
            <TabsTrigger value="locations" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Stock by Location
            </TabsTrigger>
          </TabsList>

          {/* Stats */}
          <div className={`grid grid-cols-1 gap-4 mt-6 ${activeTab === "persons" ? "md:grid-cols-4" : "md:grid-cols-4"}`}>
            {activeTab === "persons" ? (
              <>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-600">
                          {groupBy === "person" ? "Total Persons" : "Total Materials"}
                        </p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">
                          {groupBy === "person" ? stats.totalPersons : stats.totalMaterials}
                        </p>
                      </div>
                      {groupBy === "person" ? (
                        <User className="w-8 h-8 text-blue-500" />
                      ) : (
                        <Box className="w-8 h-8 text-blue-500" />
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-600">Total Movements</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalMovements}</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-600">Total Items Charged</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalItemsCharged}</p>
                      </div>
                      <Package className="w-8 h-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-600">Total Cost</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">€{stats.totalCost.toFixed(2)}</p>
                      </div>
                      <Euro className="w-8 h-8 text-amber-500" />
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-600">Total Locations</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalLocations}</p>
                      </div>
                      <MapPin className="w-8 h-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-600">Total Products</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalProducts}</p>
                      </div>
                      <Package className="w-8 h-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-600">Items in Stock</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalItemsInStock}</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-600">Total Stock Value</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">€{stats.totalCost.toFixed(2)}</p>
                      </div>
                      <Euro className="w-8 h-8 text-amber-500" />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {activeTab === "persons" && (
                  <div className="flex items-center gap-6 pb-4 border-b">
                    <Label className="text-sm font-semibold">Ομαδοποίηση:</Label>
                    <RadioGroup value={groupBy} onValueChange={setGroupBy} className="flex gap-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="person" id="group-person" />
                        <Label htmlFor="group-person" className="cursor-pointer">Ανά Άτομο</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="material" id="group-material" />
                        <Label htmlFor="group-material" className="cursor-pointer">Ανά Υλικό</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      // Reset pagination when search term changes
                      setPersonsCurrentPage(1);
                      setLocationsCurrentPage(1);
                    }}
                    className="pl-10"
                  />
                </div>

                {activeTab === "persons" && (
                  <>
                    <Select value={personFilter} onValueChange={(value) => {
                      setPersonFilter(value);
                      setPersonsCurrentPage(1); // Reset pagination
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Person" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Persons</SelectItem>
                        {uniquePersons.map((person) => (
                          <SelectItem key={person.identifier} value={person.identifier}>
                            {person.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setPersonsCurrentPage(1); // Reset pagination
                      }}
                      placeholder="Start Date"
                    />

                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setPersonsCurrentPage(1); // Reset pagination
                      }}
                      placeholder="End Date"
                    />
                  </>
                )}

                {activeTab === "locations" && (
                  <Select value={locationFilter} onValueChange={(value) => {
                    setLocationFilter(value);
                    setLocationsCurrentPage(1); // Reset pagination
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {uniqueLocations.map((location) => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Select value={productFilter} onValueChange={(value) => {
                  setProductFilter(value);
                  setPersonsCurrentPage(1); // Reset pagination for both tabs
                  setLocationsCurrentPage(1);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              </div>
            </CardContent>
          </Card>

          {/* Persons Tab Content */}
          <TabsContent value="persons" className="mt-6 space-y-4">
            {groupBy === "person" ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Materials Charged by Person</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {paginatedPersons.map((personData) => {
                        const isExpanded = expandedPersons.has(personData.person);
                        return (
                          <div key={personData.person} className="border rounded-lg overflow-hidden bg-white">
                            <div 
                              className="flex items-center justify-between p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                              onClick={() => togglePersonExpanded(personData.person)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                  <User className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-base">{personData.personName}</h3>
                                  <p className="text-sm text-slate-600">
                                    Total Items: <span className="font-semibold text-slate-900">{personData.totalItems}</span>
                                    {' • '}
                                    {Object.keys(personData.products).length} product{Object.keys(personData.products).length !== 1 ? 's' : ''}
                                    {' • '}
                                    Cost: <span className="font-semibold text-amber-600">€{personData.totalCost.toFixed(2)}</span>
                                  </p>
                                </div>
                              </div>
                              <Button variant="ghost" size="icon">
                                {isExpanded ? (
                                  <ChevronUp className="w-5 h-5" />
                                ) : (
                                  <ChevronDown className="w-5 h-5" />
                                )}
                              </Button>
                            </div>

                            {isExpanded && (
                              <div className="border-t bg-slate-50">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                      <TableHead>Product SKU</TableHead>
                                      <TableHead>Product Name</TableHead>
                                      <TableHead className="text-right">Quantity</TableHead>
                                      <TableHead className="text-right">Unit Cost</TableHead>
                                      <TableHead className="text-right">Total Cost</TableHead>
                                      <TableHead>Unit</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {Object.values(personData.products).map(({ product, quantity, cost }) => (
                                      <TableRow key={product.id}>
                                        <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                                        <TableCell className="font-medium">{product.name}</TableCell>
                                        <TableCell className="text-right font-bold text-lg">{quantity}</TableCell>
                                        <TableCell className="text-right text-slate-600">€{getProductUnitCost(product.id).toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-bold text-amber-600">€{cost.toFixed(2)}</TableCell>
                                        <TableCell>
                                          <Badge variant="outline">{product.unit_of_measure}</Badge>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {paginatedPersons.length === 0 && (
                        <div className="text-center py-12 text-slate-500">
                          No charged materials found for the selected filters.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                {personAggregates.length > 0 && (
                  <PaginationControls
                    currentPage={personsCurrentPage}
                    totalItems={personAggregates.length}
                    itemsPerPage={personsItemsPerPage}
                    onPageChange={setPersonsCurrentPage}
                    onItemsPerPageChange={(value) => {
                      setPersonsItemsPerPage(value);
                      setPersonsCurrentPage(1);
                    }}
                  />
                )}
              </>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Materials Charged by Material Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {materialAggregates.slice(
                        (personsCurrentPage - 1) * parseInt(personsItemsPerPage === "all" ? materialAggregates.length : personsItemsPerPage),
                        personsItemsPerPage === "all" ? materialAggregates.length : personsCurrentPage * parseInt(personsItemsPerPage)
                      ).map((materialData) => {
                        const isExpanded = expandedMaterials.has(materialData.product.id);
                        return (
                          <div key={materialData.product.id} className="border rounded-lg overflow-hidden bg-white">
                            <div 
                              className="flex items-center justify-between p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                              onClick={() => toggleMaterialExpanded(materialData.product.id)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                  <Box className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-base">{materialData.product.name}</h3>
                                  <p className="text-sm text-slate-600">
                                    SKU: <span className="font-mono">{materialData.product.sku}</span>
                                    {' • '}
                                    Total Quantity: <span className="font-semibold text-slate-900">{materialData.totalQuantity}</span>
                                    {' • '}
                                    Cost: <span className="font-semibold text-amber-600">€{materialData.totalCost.toFixed(2)}</span>
                                  </p>
                                </div>
                              </div>
                              <Button variant="ghost" size="icon">
                                {isExpanded ? (
                                  <ChevronUp className="w-5 h-5" />
                                ) : (
                                  <ChevronDown className="w-5 h-5" />
                                )}
                              </Button>
                            </div>

                            {isExpanded && (
                              <div className="border-t bg-slate-50">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                      <TableHead>Person</TableHead>
                                      <TableHead className="text-right">Quantity</TableHead>
                                      <TableHead className="text-right">Unit Cost</TableHead>
                                      <TableHead className="text-right">Total Cost</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {Object.values(materialData.persons).map(({ personName, quantity, cost }) => (
                                      <TableRow key={personName}>
                                        <TableCell className="font-medium">{personName}</TableCell>
                                        <TableCell className="text-right font-bold text-lg">{quantity}</TableCell>
                                        <TableCell className="text-right text-slate-600">€{getProductUnitCost(materialData.product.id).toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-bold text-amber-600">€{cost.toFixed(2)}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {materialAggregates.length === 0 && (
                        <div className="text-center py-12 text-slate-500">
                          No materials found for the selected filters.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                {materialAggregates.length > 0 && (
                  <PaginationControls
                    currentPage={personsCurrentPage}
                    totalItems={materialAggregates.length}
                    itemsPerPage={personsItemsPerPage}
                    onPageChange={setPersonsCurrentPage}
                    onItemsPerPageChange={(value) => {
                      setPersonsItemsPerPage(value);
                      setPersonsCurrentPage(1);
                    }}
                  />
                )}
              </>
            )}
          </TabsContent>

          {/* Locations Tab Content */}
          <TabsContent value="locations" className="mt-6 space-y-4"> {/* Added space-y-4 here */}
            <Card>
              <CardHeader>
                <CardTitle>Stock by Location</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {paginatedLocations.map((locationData) => { // Use paginatedLocations
                    const isExpanded = expandedLocations.has(locationData.location);
                    return (
                      <div key={locationData.location} className="border rounded-lg overflow-hidden bg-white">
                        <div 
                          className="flex items-center justify-between p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                          onClick={() => toggleLocationExpanded(locationData.location)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <MapPin className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                              <h3 className="font-bold text-base">{locationData.location}</h3>
                              <p className="text-sm text-slate-600">
                                Total Available: <span className="font-semibold text-slate-900">{locationData.totalItems}</span>
                                {' • '}
                                {Object.keys(locationData.products).length} product{Object.keys(locationData.products).length !== 1 ? 's' : ''}
                                {' • '}
                                Value: <span className="font-semibold text-amber-600">€{locationData.totalCost.toFixed(2)}</span>
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon">
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </Button>
                        </div>

                        {isExpanded && (
                          <div className="border-t bg-slate-50">
                            <Table>
                              <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                  <TableHead>Product SKU</TableHead>
                                  <TableHead>Product Name</TableHead>
                                  <TableHead className="text-right">On Hand</TableHead>
                                  <TableHead className="text-right">Reserved</TableHead>
                                  <TableHead className="text-right">Available</TableHead>
                                  <TableHead className="text-right">Unit Cost</TableHead>
                                  <TableHead className="text-right">Total Value</TableHead>
                                  <TableHead>Unit</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {Object.values(locationData.products).map(({ product, quantityOnHand, quantityReserved, quantityAvailable, cost }) => (
                                  <TableRow key={product.id}>
                                    <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                                    <TableCell className="font-medium">{product.name}</TableCell>
                                    <TableCell className="text-right font-semibold">{quantityOnHand}</TableCell>
                                    <TableCell className="text-right text-orange-600 font-semibold">{quantityReserved}</TableCell>
                                    <TableCell className="text-right text-green-600 font-bold text-lg">{quantityAvailable}</TableCell>
                                    <TableCell className="text-right text-slate-600">€{getProductUnitCost(product.id).toFixed(2)}</TableCell>
                                    <TableCell className="text-right font-bold text-amber-600">€{cost.toFixed(2)}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline">{product.unit_of_measure}</Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {paginatedLocations.length === 0 && ( // Check paginated length
                    <div className="text-center py-12 text-slate-500">
                      No stock found for the selected filters.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            {locationAggregates.length > 0 && (
              <PaginationControls
                currentPage={locationsCurrentPage}
                totalItems={locationAggregates.length}
                itemsPerPage={locationsItemsPerPage}
                onPageChange={setLocationsCurrentPage}
                onItemsPerPageChange={(value) => {
                  setLocationsItemsPerPage(value);
                  setLocationsCurrentPage(1); // Reset to first page when items per page changes
                }}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}