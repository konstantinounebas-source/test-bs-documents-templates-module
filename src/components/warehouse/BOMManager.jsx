import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Loader2, ChevronLeft, ChevronRight, Calculator } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import ProductCombobox from "./ProductCombobox";

export default function BOMManager({ busStopTypes, components, products, selectedType, onComponentsUpdated }) {
  const [currentTypeId, setCurrentTypeId] = useState(selectedType?.id || '');
  const [typeComponents, setTypeComponents] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [teams, setTeams] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [materialCategories, setMaterialCategories] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [selectedMaterialCategoryFilter, setSelectedMaterialCategoryFilter] = useState("all");
  const [selectedTeamFilter, setSelectedTeamFilter] = useState("all");
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState("all");

  useEffect(() => {
    if (selectedType) {
      setCurrentTypeId(selectedType.id);
    }
  }, [selectedType]);

  useEffect(() => {
    loadAdditionalData();
  }, []);

  const loadAdditionalData = async () => {
    setIsLoadingData(true);
    try {
      const [teamsData, companiesData, materialCatsData] = await Promise.all([
        base44.entities.Team.list(),
        base44.entities.Company.list(),
        base44.entities.MaterialCategory.list()
      ]);
      setTeams(teamsData);
      setCompanies(companiesData);
      setMaterialCategories(materialCatsData);
    } catch (error) {
      console.error("Error loading additional data:", error);
    }
    setIsLoadingData(false);
  };

  useEffect(() => {
    if (currentTypeId) {
      loadComponents();
    }
  }, [currentTypeId, components]);

  const loadComponents = () => {
    const filtered = components
      .filter(c => c.bus_stop_type_id === currentTypeId)
      .map(c => ({
        ...c,
        quantity_required: String(c.quantity_required),
        input_unit_of_measure: c.input_unit_of_measure || '',
        unit_of_measure: c.unit_of_measure || 'pcs',
        team_id: c.team_id || '',
        material_category_id: c.material_category_id || ''
      }));
    setTypeComponents(filtered);
    setCurrentPage(1);
  };

  const handleAddComponent = () => {
    setTypeComponents([...typeComponents, {
      id: null,
      product_id: '',
      quantity_required: "1",
      input_unit_of_measure: '',
      unit_of_measure: 'pcs',
      team_id: '',
      material_category_id: '',
      is_optional: false,
      notes: ''
    }]);
  };

  const handleUpdateComponent = (index, field, value) => {
    const newComponents = [...typeComponents];
    newComponents[index][field] = value;
    setTypeComponents(newComponents);
  };

  const handleRemoveComponent = async (index) => {
    const component = typeComponents[index];
    if (component.id) {
      try {
        await base44.entities.BusStopTypeComponent.delete(component.id);
        onComponentsUpdated();
      } catch (error) {
        console.error("Error deleting component:", error);
      }
    } else {
      const newComponents = typeComponents.filter((_, i) => i !== index);
      setTypeComponents(newComponents);
    }
  };

  const handleSave = async () => {
    if (!currentTypeId) return;
    
    setIsSaving(true);
    try {
      for (const component of typeComponents) {
        if (!component.product_id) continue;
        
        const quantityNum = parseFloat(component.quantity_required);
        if (isNaN(quantityNum) || quantityNum <= 0) {
          console.warn(`Skipping component with invalid quantity: ${component.product_id}`);
          continue;
        }
        
        const data = {
          bus_stop_type_id: currentTypeId,
          product_id: component.product_id,
          quantity_required: quantityNum,
          input_unit_of_measure: component.input_unit_of_measure || null,
          unit_of_measure: component.unit_of_measure || 'pcs',
          team_id: component.team_id || null,
          material_category_id: component.material_category_id || null,
          is_optional: component.is_optional || false,
          notes: component.notes || ''
        };

        if (component.id) {
          await base44.entities.BusStopTypeComponent.update(component.id, data);
        } else {
          await base44.entities.BusStopTypeComponent.create(data);
        }
      }
      onComponentsUpdated();
    } catch (error) {
      console.error("Error saving components:", error);
    }
    setIsSaving(false);
  };

  const getProductName = (productId) => {
    const product = products.find(p => p.id === productId);
    return product ? `${product.name} (${product.sku})` : 'Unknown Product';
  };

  const getProductDetails = (productId) => {
    const product = products.find(p => p.id === productId);
    if (!product) return { name: 'Unknown', company: '-', cost: 0 };
    
    const company = companies.find(c => c.id === product.company_id);
    return {
      name: `${product.name} (${product.sku})`,
      company: company?.name || '-',
      cost: product.unit_cost || 0
    };
  };

  const getTeamName = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team?.name || '-';
  };

  const getFilteredComponents = () => {
    return typeComponents.filter(comp => {
      // Material Category filter
      if (selectedMaterialCategoryFilter !== "all" && comp.material_category_id !== selectedMaterialCategoryFilter) {
        return false;
      }
      
      // Team filter
      if (selectedTeamFilter !== "all" && comp.team_id !== selectedTeamFilter) {
        return false;
      }
      
      // Company filter
      if (selectedCompanyFilter !== "all") {
        const product = products.find(p => p.id === comp.product_id);
        if (!product || product.company_id !== selectedCompanyFilter) {
          return false;
        }
      }
      
      return true;
    });
  };

  const calculateTotalCost = (componentsToCalc = null) => {
    const comps = componentsToCalc || typeComponents;
    let total = 0;
    comps.forEach(comp => {
      const product = products.find(p => p.id === comp.product_id);
      if (product && product.unit_cost) {
        const qty = parseFloat(comp.quantity_required) || 0;
        total += qty * product.unit_cost;
      }
    });
    return total;
  };

  const calculateCostByTeam = (componentsToCalc = null) => {
    const comps = componentsToCalc || typeComponents;
    const costByTeam = {};
    comps.forEach(comp => {
      const product = products.find(p => p.id === comp.product_id);
      if (product && product.unit_cost && comp.team_id) {
        const qty = parseFloat(comp.quantity_required) || 0;
        const cost = qty * product.unit_cost;
        const teamName = getTeamName(comp.team_id);
        costByTeam[teamName] = (costByTeam[teamName] || 0) + cost;
      }
    });
    return costByTeam;
  };

  // Apply filters
  const filteredComponents = getFilteredComponents();

  // Pagination
  const totalPages = Math.ceil(filteredComponents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedComponents = filteredComponents.slice(startIndex, endIndex);

  const totalCost = calculateTotalCost(filteredComponents);
  const costByTeam = calculateCostByTeam(filteredComponents);

  return (
    <div className="space-y-6">
      <div>
        <Label>Select Bus Stop Type</Label>
        <Select value={currentTypeId} onValueChange={setCurrentTypeId}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a bus stop type" />
          </SelectTrigger>
          <SelectContent>
            {busStopTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name} ({type.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {currentTypeId && (
        <>
          {/* Cost Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-blue-700">Συνολικό Κόστος ανά Στάση</p>
                    <p className="text-2xl font-bold text-blue-900 mt-1">€{totalCost.toFixed(2)}</p>
                  </div>
                  <div className="p-2 rounded-full bg-blue-500">
                    <Calculator className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {Object.keys(costByTeam).length > 0 && (
              <>
                {Object.entries(costByTeam).slice(0, 2).map(([teamName, cost]) => (
                  <Card key={teamName} className="border-slate-200">
                    <CardContent className="p-4">
                      <div>
                        <p className="text-xs font-medium text-slate-600">Κόστος {teamName}</p>
                        <p className="text-xl font-bold text-slate-900 mt-1">€{cost.toFixed(2)}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm mb-2 block">Φίλτρο Κατηγορίας Υλικού</Label>
                  <Select value={selectedMaterialCategoryFilter} onValueChange={(value) => {
                    setSelectedMaterialCategoryFilter(value);
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Όλες οι Κατηγορίες" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Όλες οι Κατηγορίες</SelectItem>
                      {materialCategories.filter(mc => mc.is_active).map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Φίλτρο Ομάδας</Label>
                  <Select value={selectedTeamFilter} onValueChange={(value) => {
                    setSelectedTeamFilter(value);
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Όλες οι Ομάδες" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Όλες οι Ομάδες</SelectItem>
                      {teams.filter(t => t.is_active).map(team => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Φίλτρο Εταιρείας</Label>
                  <Select value={selectedCompanyFilter} onValueChange={(value) => {
                    setSelectedCompanyFilter(value);
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Όλες οι Εταιρείες" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Όλες οι Εταιρείες</SelectItem>
                      {companies.map(company => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">
                Bill of Materials ({filteredComponents.length} από {typeComponents.length} components)
              </CardTitle>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Items per page:</Label>
                <Select 
                  value={String(itemsPerPage)} 
                  onValueChange={(value) => {
                    setItemsPerPage(parseInt(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="999999">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {typeComponents.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No components added yet. Click "Add Component" to start building the BOM.
                </p>
              ) : filteredComponents.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  Δεν βρέθηκαν components με τα επιλεγμένα φίλτρα.
                </p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Προϊόν</TableHead>
                        <TableHead className="w-28">Ποσότητα</TableHead>
                        <TableHead className="w-24">Μον. Εισαγ.</TableHead>
                        <TableHead>Κόστος</TableHead>
                        <TableHead>Σημειώσεις</TableHead>
                        <TableHead className="w-24 text-right">Ενέργειες</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedComponents.map((component, index) => {
                        const absoluteIndex = startIndex + index;
                        const productDetails = getProductDetails(component.product_id);
                        const qty = parseFloat(component.quantity_required) || 0;
                        const lineCost = qty * productDetails.cost;
                        
                        return (
                          <TableRow key={absoluteIndex}>
                            <TableCell className="font-medium text-slate-500" rowSpan={2}>
                              {absoluteIndex + 1}
                            </TableCell>
                            <TableCell colSpan={6}>
                              <div className="flex items-center gap-3">
                                <div className="flex-1">
                                  <ProductCombobox
                                    products={products}
                                    value={component.product_id}
                                    onValueChange={(value) => handleUpdateComponent(absoluteIndex, 'product_id', value)}
                                    placeholder="Επιλέξτε προϊόν"
                                  />
                                </div>
                                <div className="flex-shrink-0 text-sm text-slate-600">
                                  {productDetails.company}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                          <TableRow key={`${absoluteIndex}-details`}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Select
                                  value={component.material_category_id || "none"}
                                  onValueChange={(value) => handleUpdateComponent(absoluteIndex, 'material_category_id', value === "none" ? '' : value)}
                                >
                                  <SelectTrigger className="w-44">
                                    <SelectValue placeholder="Κατηγορία" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">-</SelectItem>
                                    {materialCategories.filter(mc => mc.is_active).map(cat => (
                                      <SelectItem key={cat.id} value={cat.id}>
                                        {cat.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Select
                                  value={component.team_id || "none"}
                                  onValueChange={(value) => handleUpdateComponent(absoluteIndex, 'team_id', value === "none" ? '' : value)}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue placeholder="Ομάδα" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">-</SelectItem>
                                    {teams.filter(t => t.is_active).map(team => (
                                      <SelectItem key={team.id} value={team.id}>
                                        {team.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={component.quantity_required}
                                onChange={(e) => handleUpdateComponent(absoluteIndex, 'quantity_required', e.target.value)}
                                onBlur={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if (isNaN(val) || val <= 0) {
                                    handleUpdateComponent(absoluteIndex, 'quantity_required', "1");
                                  } else {
                                    handleUpdateComponent(absoluteIndex, 'quantity_required', String(val));
                                  }
                                }}
                                className="w-24"
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={component.input_unit_of_measure || ''}
                                onValueChange={(value) => handleUpdateComponent(absoluteIndex, 'input_unit_of_measure', value)}
                              >
                                <SelectTrigger className="w-20">
                                  <SelectValue placeholder="-" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(() => {
                                    const product = products.find(p => p.id === component.product_id);
                                    if (product?.unit_of_measure === 'kg') {
                                      return (
                                        <>
                                          <SelectItem value={null}>-</SelectItem>
                                          <SelectItem value="g">g</SelectItem>
                                          <SelectItem value="kg">kg</SelectItem>
                                          <SelectItem value="ton">ton</SelectItem>
                                        </>
                                      );
                                    } else if (product?.unit_of_measure === 'liter') {
                                      return (
                                        <>
                                          <SelectItem value={null}>-</SelectItem>
                                          <SelectItem value="ml">ml</SelectItem>
                                          <SelectItem value="liter">L</SelectItem>
                                        </>
                                      );
                                    } else if (product?.unit_of_measure === 'meter') {
                                      return (
                                        <>
                                          <SelectItem value={null}>-</SelectItem>
                                          <SelectItem value="mm">mm</SelectItem>
                                          <SelectItem value="cm">cm</SelectItem>
                                          <SelectItem value="meter">m</SelectItem>
                                        </>
                                      );
                                    } else if (product?.unit_of_measure === 'piece') {
                                      return (
                                        <>
                                          <SelectItem value={null}>-</SelectItem>
                                          <SelectItem value="piece">pcs</SelectItem>
                                          <SelectItem value="box">box</SelectItem>
                                          <SelectItem value="pallet">pallet</SelectItem>
                                        </>
                                      );
                                    } else {
                                      return <SelectItem value={null}>{product?.unit_of_measure || '-'}</SelectItem>;
                                    }
                                  })()}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-sm font-medium text-slate-700">
                              {lineCost > 0 ? `€${lineCost.toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell>
                              <Input
                                value={component.notes || ''}
                                onChange={(e) => handleUpdateComponent(absoluteIndex, 'notes', e.target.value)}
                                placeholder="Σημειώσεις..."
                                className="w-full"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveComponent(absoluteIndex)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4">
                      <p className="text-sm text-slate-600">
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredComponents.length)} of {filteredComponents.length} components
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Previous
                        </Button>
                        <span className="text-sm text-slate-600">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={handleAddComponent}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Component
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving || typeComponents.length === 0}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save BOM Configuration
            </Button>
          </div>
        </>
      )}
    </div>
  );
}