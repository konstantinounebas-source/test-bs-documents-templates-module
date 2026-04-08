import React, { useState, useEffect } from "react";
import { BusStopType } from "@/entities/BusStopType";
import { BusStopTypeComponent } from "@/entities/BusStopTypeComponent";
import { Product } from "@/entities/Product";
import { Button } from "@/components/ui/button";
import { Plus, Search, Boxes } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import BusStopTypesTable from "../components/warehouse/BusStopTypesTable";
import BOMManager from "../components/warehouse/BOMManager";
import CreateEditBusStopTypeDialog from "../components/warehouse/CreateEditBusStopTypeDialog";
import PaginationControls from "../components/warehouse/PaginationControls";

export default function BusStopTypesBOMPage() {
  const [busStopTypes, setBusStopTypes] = useState([]);
  const [components, setComponents] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("types");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState("10"); // Default items per page

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [typesData, componentsData, productsData] = await Promise.all([
        BusStopType.list("-updated_date"),
        BusStopTypeComponent.list(),
        Product.list()
      ]);
      setBusStopTypes(typesData);
      setComponents(componentsData);
      setProducts(productsData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const filteredTypes = busStopTypes.filter(t =>
    searchTerm === "" || 
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const paginatedTypes = itemsPerPage === "all" 
    ? filteredTypes 
    : filteredTypes.slice(
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

  const handleManageBOM = (type) => {
    setSelectedType(type);
    setActiveTab("bom");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <style>{`
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
          appearance: textfield;
        }
      `}</style>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Bus Stop Types & BOM</h1>
            <p className="text-slate-600 mt-1">Manage bus stop configurations and bill of materials</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-600">Bus Stop Types</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{busStopTypes.length}</p>
                </div>
                <div className="p-2 rounded-full bg-blue-500">
                  <Boxes className="w-4 h-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-600">Active Types</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {busStopTypes.filter(t => t.is_active).length}
                  </p>
                </div>
                <div className="p-2 rounded-full bg-green-500">
                  <Boxes className="w-4 h-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-600">Total Components</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{components.length}</p>
                </div>
                <div className="p-2 rounded-full bg-purple-500">
                  <Boxes className="w-4 h-4 text-white" />
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
              placeholder="Search bus stop types..."
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
              <TabsTrigger value="types">Bus Stop Types</TabsTrigger>
              <TabsTrigger value="bom">Bill of Materials</TabsTrigger>
            </TabsList>
            
            {activeTab === "types" && (
              <Button 
                onClick={() => setShowTypeDialog(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Bus Stop Type
              </Button>
            )}
          </div>

          <TabsContent value="types">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <BusStopTypesTable
                busStopTypes={paginatedTypes}
                components={components}
                products={products}
                isLoading={isLoading}
                onTypeSaved={loadAllData}
                onManageBOM={handleManageBOM}
              />
              
              <PaginationControls
                currentPage={currentPage}
                totalItems={filteredTypes.length}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            </div>
          </TabsContent>

          <TabsContent value="bom">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <BOMManager
                busStopTypes={busStopTypes}
                components={components}
                products={products}
                selectedType={selectedType}
                onComponentsUpdated={loadAllData}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <CreateEditBusStopTypeDialog
        open={showTypeDialog}
        onClose={() => setShowTypeDialog(false)}
        onTypeSaved={loadAllData}
        busStopTypes={busStopTypes}
      />
    </div>
  );
}