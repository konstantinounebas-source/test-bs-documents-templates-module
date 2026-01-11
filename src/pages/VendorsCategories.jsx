import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Search, Truck, FolderTree, MapPin, Tag, Briefcase, Building2, FileText, Users, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import VendorsTable from "../components/warehouse/VendorsTable";
import CategoriesTable from "../components/warehouse/CategoriesTable";
import LocationsTable from "../components/warehouse/LocationsTable";
import VendorCategoriesTable from "../components/warehouse/VendorCategoriesTable";
import VendorServicesTable from "../components/warehouse/VendorServicesTable";
import CompaniesTable from "../components/warehouse/CompaniesTable";
import InvoiceCategoriesTable from "../components/warehouse/InvoiceCategoriesTable";
import TeamsTable from "../components/warehouse/TeamsTable";
import MaterialCategoriesTable from "../components/warehouse/MaterialCategoriesTable";
import CreateEditVendorDialog from "../components/warehouse/CreateEditVendorDialog";
import CreateEditCategoryDialog from "../components/warehouse/CreateEditCategoryDialog";
import CreateEditLocationDialog from "../components/warehouse/CreateEditLocationDialog";
import CreateEditVendorCategoryDialog from "../components/warehouse/CreateEditVendorCategoryDialog";
import CreateEditVendorServiceDialog from "../components/warehouse/CreateEditVendorServiceDialog";
import CreateEditCompanyDialog from "../components/warehouse/CreateEditCompanyDialog";
import CreateEditInvoiceCategoryDialog from "../components/warehouse/CreateEditInvoiceCategoryDialog";
import CreateEditTeamDialog from "../components/warehouse/CreateEditTeamDialog";
import CreateEditMaterialCategoryDialog from "../components/warehouse/CreateEditMaterialCategoryDialog";
import ImportVendorsDialog from "../components/warehouse/ImportVendorsDialog";
import PaginationControls from "../components/warehouse/PaginationControls";

// Helper function to add delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default function VendorsCategoriesPage() {
  const [vendors, setVendors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [vendorCategories, setVendorCategories] = useState([]);
  const [vendorServices, setVendorServices] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [invoiceCategories, setInvoiceCategories] = useState([]);
  const [teams, setTeams] = useState([]);
  const [materialCategories, setMaterialCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showVendorDialog, setShowVendorDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [showVendorCategoryDialog, setShowVendorCategoryDialog] = useState(false);
  const [showVendorServiceDialog, setShowVendorServiceDialog] = useState(false);
  const [showCompanyDialog, setShowCompanyDialog] = useState(false);
  const [showInvoiceCategoryDialog, setShowInvoiceCategoryDialog] = useState(false);
  const [showTeamDialog, setShowTeamDialog] = useState(false);
  const [showMaterialCategoryDialog, setShowMaterialCategoryDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("vendors");
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Pagination states for Vendors
  const [vendorsCurrentPage, setVendorsCurrentPage] = useState(1);
  const [vendorsItemsPerPage, setVendorsItemsPerPage] = useState("10");

  // Pagination states for Categories
  const [categoriesCurrentPage, setCategoriesCurrentPage] = useState(1);
  const [categoriesItemsPerPage, setCategoriesItemsPerPage] = useState("10");

  // Pagination states for Locations
  const [locationsCurrentPage, setLocationsCurrentPage] = useState(1);
  const [locationsItemsPerPage, setLocationsItemsPerPage] = useState("10");

  // Pagination states for Vendor Categories
  const [vendorCategoriesCurrentPage, setVendorCategoriesCurrentPage] = useState(1);
  const [vendorCategoriesItemsPerPage, setVendorCategoriesItemsPerPage] = useState("10");

  // Pagination states for Vendor Services
  const [vendorServicesCurrentPage, setVendorServicesCurrentPage] = useState(1);
  const [vendorServicesItemsPerPage, setVendorServicesItemsPerPage] = useState("10");

  // Pagination states for Companies
  const [companiesCurrentPage, setCompaniesCurrentPage] = useState(1);
  const [companiesItemsPerPage, setCompaniesItemsPerPage] = useState("10");

  // Pagination states for Invoice Categories
  const [invoiceCategoriesCurrentPage, setInvoiceCategoriesCurrentPage] = useState(1);
  const [invoiceCategoriesItemsPerPage, setInvoiceCategoriesItemsPerPage] = useState("10");

  // Pagination states for Teams
  const [teamsCurrentPage, setTeamsCurrentPage] = useState(1);
  const [teamsItemsPerPage, setTeamsItemsPerPage] = useState("10");

  // Pagination states for Material Categories
  const [materialCategoriesCurrentPage, setMaterialCategoriesCurrentPage] = useState(1);
  const [materialCategoriesItemsPerPage, setMaterialCategoriesItemsPerPage] = useState("10");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load data sequentially with delays to avoid rate limiting
      const vendorsData = await base44.entities.Vendor.list("-updated_date");
      setVendors(vendorsData);
      
      await delay(300);
      const categoriesData = await base44.entities.ProductCategory.list("-updated_date");
      setCategories(categoriesData);
      
      await delay(300);
      const locationsData = await base44.entities.WarehouseLocation.list("-updated_date");
      setLocations(locationsData);
      
      await delay(300);
      const vendorCatsData = await base44.entities.VendorCategory.list("-updated_date");
      setVendorCategories(vendorCatsData);
      
      await delay(300);
      const vendorServsData = await base44.entities.VendorService.list("-updated_date");
      setVendorServices(vendorServsData);
      
      await delay(300);
      const companiesData = await base44.entities.Company.list("-updated_date");
      setCompanies(companiesData);
      
      await delay(300);
      const invoiceCatsData = await base44.entities.InvoiceCategory.list("-updated_date");
      setInvoiceCategories(invoiceCatsData);
      
      await delay(300);
      const teamsData = await base44.entities.Team.list("-updated_date");
      setTeams(teamsData);
      
      await delay(300);
      const materialCatsData = await base44.entities.MaterialCategory.list("-updated_date");
      setMaterialCategories(materialCatsData);
      
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const filteredVendors = vendors.filter(v =>
    searchTerm === "" || 
    v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCategories = categories.filter(c =>
    searchTerm === "" || 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLocations = locations.filter(l =>
    searchTerm === "" || 
    l.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.warehouse?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredVendorCategories = vendorCategories.filter(vc =>
    searchTerm === "" ||
    vc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vc.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredVendorServices = vendorServices.filter(vs =>
    searchTerm === "" ||
    vs.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vs.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCompanies = companies.filter(c =>
    searchTerm === "" ||
    c.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredInvoiceCategories = invoiceCategories.filter(ic =>
    searchTerm === "" ||
    ic.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTeams = teams.filter(t =>
    searchTerm === "" ||
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMaterialCategories = materialCategories.filter(mc =>
    searchTerm === "" ||
    mc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mc.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mc.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Vendors Pagination
  const paginatedVendors = vendorsItemsPerPage === "all" 
    ? filteredVendors 
    : filteredVendors.slice(
        (vendorsCurrentPage - 1) * parseInt(vendorsItemsPerPage),
        vendorsCurrentPage * parseInt(vendorsItemsPerPage)
      );

  // Categories Pagination
  const paginatedCategories = categoriesItemsPerPage === "all" 
    ? filteredCategories 
    : filteredCategories.slice(
        (categoriesCurrentPage - 1) * parseInt(categoriesItemsPerPage),
        categoriesCurrentPage * parseInt(categoriesItemsPerPage)
      );

  // Locations Pagination
  const paginatedLocations = locationsItemsPerPage === "all" 
    ? filteredLocations 
    : filteredLocations.slice(
        (locationsCurrentPage - 1) * parseInt(locationsItemsPerPage),
        locationsCurrentPage * parseInt(locationsItemsPerPage)
      );

  // Vendor Categories Pagination
  const paginatedVendorCategories = vendorCategoriesItemsPerPage === "all" 
    ? filteredVendorCategories 
    : filteredVendorCategories.slice(
        (vendorCategoriesCurrentPage - 1) * parseInt(vendorCategoriesItemsPerPage),
        vendorCategoriesCurrentPage * parseInt(vendorCategoriesItemsPerPage)
      );

  // Vendor Services Pagination
  const paginatedVendorServices = vendorServicesItemsPerPage === "all" 
    ? filteredVendorServices 
    : filteredVendorServices.slice(
        (vendorServicesCurrentPage - 1) * parseInt(vendorServicesItemsPerPage),
        vendorServicesCurrentPage * parseInt(vendorServicesItemsPerPage)
      );

  // Companies Pagination
  const paginatedCompanies = companiesItemsPerPage === "all" 
    ? filteredCompanies 
    : filteredCompanies.slice(
        (companiesCurrentPage - 1) * parseInt(companiesItemsPerPage),
        companiesCurrentPage * parseInt(companiesItemsPerPage)
      );

  // Invoice Categories Pagination
  const paginatedInvoiceCategories = invoiceCategoriesItemsPerPage === "all" 
    ? filteredInvoiceCategories 
    : filteredInvoiceCategories.slice(
        (invoiceCategoriesCurrentPage - 1) * parseInt(invoiceCategoriesItemsPerPage),
        invoiceCategoriesCurrentPage * parseInt(invoiceCategoriesItemsPerPage)
      );

  // Teams Pagination
  const paginatedTeams = teamsItemsPerPage === "all" 
    ? filteredTeams 
    : filteredTeams.slice(
        (teamsCurrentPage - 1) * parseInt(teamsItemsPerPage),
        teamsCurrentPage * parseInt(teamsItemsPerPage)
      );

  // Material Categories Pagination
  const paginatedMaterialCategories = materialCategoriesItemsPerPage === "all" 
    ? filteredMaterialCategories 
    : filteredMaterialCategories.slice(
        (materialCategoriesCurrentPage - 1) * parseInt(materialCategoriesItemsPerPage),
        materialCategoriesCurrentPage * parseInt(materialCategoriesItemsPerPage)
      );

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Vendors, Categories & Locations</h1>
            <p className="text-slate-600 mt-1">Manage your suppliers, product categorization and warehouse locations</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-9 gap-4">
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-600">Total Vendors</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{vendors.length}</p>
                </div>
                <div className="p-2 rounded-full bg-blue-500">
                  <Truck className="w-4 h-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-600">Active Vendors</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {vendors.filter(v => v.is_active).length}
                  </p>
                </div>
                <div className="p-2 rounded-full bg-green-500">
                  <Truck className="w-4 h-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-600">Product Categories</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{categories.length}</p>
                </div>
                <div className="p-2 rounded-full bg-purple-500">
                  <FolderTree className="w-4 h-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-600">Vendor Categories</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{vendorCategories.length}</p>
                </div>
                <div className="p-2 rounded-full bg-indigo-500">
                  <Tag className="w-4 h-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-600">Vendor Services</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{vendorServices.length}</p>
                </div>
                <div className="p-2 rounded-full bg-teal-500">
                  <Briefcase className="w-4 h-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-600">Εταιρείες</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{companies.length}</p>
                </div>
                <div className="p-2 rounded-full bg-cyan-500">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-600">Κατηγορίες Τιμολόγησης</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{invoiceCategories.length}</p>
                </div>
                <div className="p-2 rounded-full bg-pink-500">
                  <FileText className="w-4 h-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-600">Ομάδες</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{teams.length}</p>
                </div>
                <div className="p-2 rounded-full bg-amber-500">
                  <Users className="w-4 h-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-600">Κατηγορίες Υλικών</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{materialCategories.length}</p>
                </div>
                <div className="p-2 rounded-full bg-violet-500">
                  <Layers className="w-4 h-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder={
                activeTab === "vendors" ? "Search vendors..." : 
                activeTab === "categories" ? "Search product categories..." : 
                activeTab === "vendorCategories" ? "Search vendor categories..." :
                activeTab === "vendorServices" ? "Search vendor services..." :
                activeTab === "companies" ? "Αναζήτηση εταιρειών..." :
                activeTab === "invoiceCategories" ? "Αναζήτηση κατηγοριών τιμολόγησης..." :
                activeTab === "teams" ? "Αναζήτηση ομάδων..." :
                activeTab === "materialCategories" ? "Αναζήτηση κατηγοριών υλικών..." :
                "Search locations..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-50 border-slate-200"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="vendors">Vendors</TabsTrigger>
              <TabsTrigger value="vendorCategories">Vendor Categories</TabsTrigger>
              <TabsTrigger value="vendorServices">Vendor Services</TabsTrigger>
              <TabsTrigger value="categories">Product Categories</TabsTrigger>
              <TabsTrigger value="locations">Locations</TabsTrigger>
              <TabsTrigger value="companies">Εταιρείες</TabsTrigger>
              <TabsTrigger value="invoiceCategories">Κατηγορίες Τιμολόγησης</TabsTrigger>
              <TabsTrigger value="teams">Ομάδες</TabsTrigger>
              <TabsTrigger value="materialCategories">Κατηγορίες Υλικών</TabsTrigger>
            </TabsList>
            
            <div className="flex gap-2">
              {activeTab === "vendors" && (
                <>
                  <Button 
                    onClick={() => setShowImportDialog(true)}
                    variant="outline"
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Import CSV
                  </Button>
                  <Button 
                    onClick={() => setShowVendorDialog(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Vendor
                  </Button>
                </>
              )}
              {activeTab === "vendorCategories" && (
                <Button 
                  onClick={() => setShowVendorCategoryDialog(true)}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Vendor Category
                </Button>
              )}
              {activeTab === "vendorServices" && (
                <Button 
                  onClick={() => setShowVendorServiceDialog(true)}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Vendor Service
                </Button>
              )}
              {activeTab === "categories" && (
                <Button 
                  onClick={() => setShowCategoryDialog(true)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product Category
                </Button>
              )}
              {activeTab === "locations" && (
                <Button 
                  onClick={() => setShowLocationDialog(true)}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Location
                </Button>
              )}
              {activeTab === "companies" && (
                <Button 
                  onClick={() => setShowCompanyDialog(true)}
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Νέα Εταιρεία
                </Button>
              )}
              {activeTab === "invoiceCategories" && (
                <Button 
                  onClick={() => setShowInvoiceCategoryDialog(true)}
                  className="bg-pink-600 hover:bg-pink-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Νέα Κατηγορία Τιμολόγησης
                </Button>
              )}
              {activeTab === "teams" && (
                <Button 
                  onClick={() => setShowTeamDialog(true)}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Νέα Ομάδα
                </Button>
              )}
              {activeTab === "materialCategories" && (
                <Button 
                  onClick={() => setShowMaterialCategoryDialog(true)}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Νέα Κατηγορία Υλικού
                </Button>
              )}
            </div>
          </div>

          <TabsContent value="vendors" className="mt-0">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <VendorsTable
                vendors={paginatedVendors}
                vendorCategories={vendorCategories}
                vendorServices={vendorServices}
                isLoading={isLoading}
                onVendorSaved={loadData}
              />
              <PaginationControls
                currentPage={vendorsCurrentPage}
                totalItems={filteredVendors.length}
                itemsPerPage={vendorsItemsPerPage}
                onPageChange={setVendorsCurrentPage}
                onItemsPerPageChange={(value) => {
                  setVendorsItemsPerPage(value);
                  setVendorsCurrentPage(1); // Reset to first page when items per page changes
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="vendorCategories" className="mt-0">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <VendorCategoriesTable
                vendorCategories={paginatedVendorCategories}
                isLoading={isLoading}
                onVendorCategorySaved={loadData}
              />
              <PaginationControls
                currentPage={vendorCategoriesCurrentPage}
                totalItems={filteredVendorCategories.length}
                itemsPerPage={vendorCategoriesItemsPerPage}
                onPageChange={setVendorCategoriesCurrentPage}
                onItemsPerPageChange={(value) => {
                  setVendorCategoriesItemsPerPage(value);
                  setVendorCategoriesCurrentPage(1);
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="vendorServices" className="mt-0">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <VendorServicesTable
                vendorServices={paginatedVendorServices}
                isLoading={isLoading}
                onVendorServiceSaved={loadData}
              />
              <PaginationControls
                currentPage={vendorServicesCurrentPage}
                totalItems={filteredVendorServices.length}
                itemsPerPage={vendorServicesItemsPerPage}
                onPageChange={setVendorServicesCurrentPage}
                onItemsPerPageChange={(value) => {
                  setVendorServicesItemsPerPage(value);
                  setVendorServicesCurrentPage(1);
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="categories" className="mt-0">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <CategoriesTable
                categories={paginatedCategories}
                allCategories={categories}
                isLoading={isLoading}
                onCategorySaved={loadData}
              />
              <PaginationControls
                currentPage={categoriesCurrentPage}
                totalItems={filteredCategories.length}
                itemsPerPage={categoriesItemsPerPage}
                onPageChange={setCategoriesCurrentPage}
                onItemsPerPageChange={(value) => {
                  setCategoriesItemsPerPage(value);
                  setCategoriesCurrentPage(1);
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="locations" className="mt-0">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <LocationsTable
                locations={paginatedLocations}
                isLoading={isLoading}
                onLocationSaved={loadData}
              />
              <PaginationControls
                currentPage={locationsCurrentPage}
                totalItems={filteredLocations.length}
                itemsPerPage={locationsItemsPerPage}
                onPageChange={setLocationsCurrentPage}
                onItemsPerPageChange={(value) => {
                  setLocationsItemsPerPage(value);
                  setLocationsCurrentPage(1);
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="companies" className="mt-0">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <CompaniesTable
                companies={paginatedCompanies}
                isLoading={isLoading}
                onCompanySaved={loadData}
              />
              <PaginationControls
                currentPage={companiesCurrentPage}
                totalItems={filteredCompanies.length}
                itemsPerPage={companiesItemsPerPage}
                onPageChange={setCompaniesCurrentPage}
                onItemsPerPageChange={(value) => {
                  setCompaniesItemsPerPage(value);
                  setCompaniesCurrentPage(1);
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="invoiceCategories" className="mt-0">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <InvoiceCategoriesTable
                invoiceCategories={paginatedInvoiceCategories}
                isLoading={isLoading}
                onInvoiceCategorySaved={loadData}
              />
              <PaginationControls
                currentPage={invoiceCategoriesCurrentPage}
                totalItems={filteredInvoiceCategories.length}
                itemsPerPage={invoiceCategoriesItemsPerPage}
                onPageChange={setInvoiceCategoriesCurrentPage}
                onItemsPerPageChange={(value) => {
                  setInvoiceCategoriesItemsPerPage(value);
                  setInvoiceCategoriesCurrentPage(1);
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="teams" className="mt-0">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <TeamsTable
                teams={paginatedTeams}
                isLoading={isLoading}
                onTeamSaved={loadData}
              />
              <PaginationControls
                currentPage={teamsCurrentPage}
                totalItems={filteredTeams.length}
                itemsPerPage={teamsItemsPerPage}
                onPageChange={setTeamsCurrentPage}
                onItemsPerPageChange={(value) => {
                  setTeamsItemsPerPage(value);
                  setTeamsCurrentPage(1);
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="materialCategories" className="mt-0">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <MaterialCategoriesTable
                materialCategories={paginatedMaterialCategories}
                isLoading={isLoading}
                onMaterialCategorySaved={loadData}
              />
              <PaginationControls
                currentPage={materialCategoriesCurrentPage}
                totalItems={filteredMaterialCategories.length}
                itemsPerPage={materialCategoriesItemsPerPage}
                onPageChange={setMaterialCategoriesCurrentPage}
                onItemsPerPageChange={(value) => {
                  setMaterialCategoriesItemsPerPage(value);
                  setMaterialCategoriesCurrentPage(1);
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <CreateEditVendorDialog
        open={showVendorDialog}
        onClose={() => setShowVendorDialog(false)}
        onVendorSaved={loadData}
      />

      <CreateEditCategoryDialog
        open={showCategoryDialog}
        onClose={() => setShowCategoryDialog(false)}
        onCategorySaved={loadData}
        categories={categories}
      />

      <CreateEditLocationDialog
        open={showLocationDialog}
        onClose={() => setShowLocationDialog(false)}
        onLocationSaved={loadData}
      />

      <CreateEditVendorCategoryDialog
        open={showVendorCategoryDialog}
        onClose={() => setShowVendorCategoryDialog(false)}
        onVendorCategorySaved={loadData}
      />

      <CreateEditVendorServiceDialog
        open={showVendorServiceDialog}
        onClose={() => setShowVendorServiceDialog(false)}
        onVendorServiceSaved={loadData}
      />

      <ImportVendorsDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onVendorsImported={loadData}
      />

      <CreateEditCompanyDialog
        open={showCompanyDialog}
        onClose={() => setShowCompanyDialog(false)}
        onCompanySaved={loadData}
      />

      <CreateEditInvoiceCategoryDialog
        open={showInvoiceCategoryDialog}
        onClose={() => setShowInvoiceCategoryDialog(false)}
        onInvoiceCategorySaved={loadData}
      />

      <CreateEditTeamDialog
        open={showTeamDialog}
        onClose={() => setShowTeamDialog(false)}
        onTeamSaved={loadData}
      />

      <CreateEditMaterialCategoryDialog
        open={showMaterialCategoryDialog}
        onClose={() => setShowMaterialCategoryDialog(false)}
        onMaterialCategorySaved={loadData}
      />
    </div>
  );
}