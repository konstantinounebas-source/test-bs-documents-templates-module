import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Loader2, ChevronLeft, ChevronRight, Calculator, Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import ProductCombobox from "./ProductCombobox";
import { MultiSelect } from "@/components/ui/multi-select";


export default function BOMManager({ busStopTypes, components, products, selectedType, onComponentsUpdated }) {
  const [currentTypeId, setCurrentTypeId] = useState(selectedType?.id || '');
  const [typeComponents, setTypeComponents] = useState([]);
  const [savingIds, setSavingIds] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [teams, setTeams] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [materialCategories, setMaterialCategories] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [selectedMaterialCategoryFilter, setSelectedMaterialCategoryFilter] = useState([]);
  const [selectedTeamFilter, setSelectedTeamFilter] = useState([]);
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
    // Add new component at the beginning (index 0)
    setTypeComponents([{
      id: null,
      product_id: '',
      quantity_required: "1",
      input_unit_of_measure: '',
      unit_of_measure: 'pcs',
      team_id: '',
      material_category_id: '',
      is_optional: false,
      notes: ''
    }, ...typeComponents]);
  };

  const handleUpdateComponent = (componentToUpdate, field, value) => {
    const newComponents = [...typeComponents];
    const index = newComponents.findIndex(c => 
      (c.id && c.id === componentToUpdate.id) || 
      (!c.id && !componentToUpdate.id && c === componentToUpdate)
    );
    
    if (index === -1) return;
    
    newComponents[index][field] = value;
    
    // Auto-set input_unit_of_measure based on product's unit_of_measure
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        newComponents[index].input_unit_of_measure = product.unit_of_measure || '';
      }
    }
    
    setTypeComponents(newComponents);
  };

  const handleRemoveComponent = async (componentToRemove) => {
    if (componentToRemove.id) {
      try {
        await base44.entities.BusStopTypeComponent.delete(componentToRemove.id);
        onComponentsUpdated();
      } catch (error) {
        console.error("Error deleting component:", error);
      }
    } else {
      const newComponents = typeComponents.filter(c => c !== componentToRemove);
      setTypeComponents(newComponents);
    }
  };

  const handleSaveComponent = async (componentToSave) => {
    if (!currentTypeId || !componentToSave.product_id) return;
    
    const quantityNum = parseFloat(componentToSave.quantity_required);
    if (isNaN(quantityNum) || quantityNum <= 0) return;
    
    const tempId = componentToSave.id || `temp_${componentToSave.product_id}_${Date.now()}`;
    setSavingIds(prev => ({ ...prev, [tempId]: true }));
    
    try {
      const data = {
        bus_stop_type_id: currentTypeId,
        product_id: componentToSave.product_id,
        quantity_required: quantityNum,
        input_unit_of_measure: componentToSave.input_unit_of_measure || '',
        unit_of_measure: componentToSave.unit_of_measure || 'pcs',
        team_id: componentToSave.team_id || null,
        material_category_id: componentToSave.material_category_id || null,
        is_optional: componentToSave.is_optional || false,
        notes: componentToSave.notes || ''
      };

      if (componentToSave.id) {
        await base44.entities.BusStopTypeComponent.update(componentToSave.id, data);
      } else {
        const created = await base44.entities.BusStopTypeComponent.create(data);
        // Update local state with the new ID
        const newComponents = [...typeComponents];
        const index = newComponents.findIndex(c => c === componentToSave);
        if (index !== -1) {
          newComponents[index] = { ...newComponents[index], id: created.id };
          setTypeComponents(newComponents);
        }
      }
      
      onComponentsUpdated();
    } catch (error) {
      console.error("Error saving component:", error);
    }
    
    setSavingIds(prev => {
      const newState = { ...prev };
      delete newState[tempId];
      return newState;
    });
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
      // Material Category filter (multiple)
      if (selectedMaterialCategoryFilter.length > 0 && !selectedMaterialCategoryFilter.includes(comp.material_category_id)) {
        return false;
      }
      
      // Team filter (multiple)
      if (selectedTeamFilter.length > 0 && !selectedTeamFilter.includes(comp.team_id)) {
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

  const handleExportToExcel = async () => {
    const { Workbook } = await import('https://cdn.jsdelivr.net/npm/exceljs@4.4.0/+esm');
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Bill of Materials');

    // Headers
    worksheet.columns = [
      { header: 'A/A', key: 'index', width: 5 },
      { header: 'SKU', key: 'sku', width: 12 },
      { header: 'Προϊόν', key: 'product_name', width: 30 },
      { header: 'Κατηγορία', key: 'category', width: 15 },
      { header: 'Ομάδα', key: 'team', width: 15 },
      { header: 'Εταιρεία', key: 'company', width: 15 },
      { header: 'Ποσότητα', key: 'quantity', width: 12 },
      { header: 'Μονάδα', key: 'unit', width: 10 },
      { header: 'Κόστος μονάδας', key: 'unit_cost', width: 12 },
      { header: 'Σύνολο Κόστος', key: 'total_cost', width: 12 },
      { header: 'Σημειώσεις', key: 'notes', width: 20 }
    ];

    // Add data rows
    filteredComponents.forEach((comp, idx) => {
      const product = products.find(p => p.id === comp.product_id);
      const materialCat = materialCategories.find(mc => mc.id === comp.material_category_id);
      const qty = parseFloat(comp.quantity_required) || 0;
      const unitCost = product?.unit_cost || 0;
      const totalCost = qty * unitCost;

      worksheet.addRow({
        index: idx + 1,
        sku: product?.sku || '-',
        product_name: product?.name || '-',
        category: materialCat?.name || '-',
        team: getTeamName(comp.team_id),
        company: getProductDetails(comp.product_id).company,
        quantity: qty,
        unit: comp.input_unit_of_measure || product?.unit_of_measure || '-',
        unit_cost: unitCost,
        total_cost: totalCost,
        notes: comp.notes || ''
      });
    });

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'center' };

    // Format cost columns
    worksheet.getColumn('unit_cost').numFmt = '€#,##0.00';
    worksheet.getColumn('total_cost').numFmt = '€#,##0.00';

    // Add summary row
    const summaryRow = worksheet.addRow({});
    summaryRow.getCell(8).value = 'ΣΥΝΟΛΟ:';
    summaryRow.getCell(8).font = { bold: true };
    summaryRow.getCell(10).value = `=SUM(J2:J${worksheet.rowCount - 1})`;
    summaryRow.getCell(10).font = { bold: true };
    summaryRow.getCell(10).numFmt = '€#,##0.00';

    // Generate file
    workbook.xlsx.writeBuffer().then(buffer => {
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `BOM-${selectedType?.name || 'Export'}-${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    });
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                {Object.entries(costByTeam).slice(0, 4).map(([teamName, cost]) => (
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
                  <MultiSelect
                    options={materialCategories.filter(mc => mc.is_active).map(cat => ({
                      value: cat.id,
                      label: cat.name
                    }))}
                    selected={selectedMaterialCategoryFilter}
                    onChange={(values) => {
                      setSelectedMaterialCategoryFilter(values);
                      setCurrentPage(1);
                    }}
                    placeholder="Όλες οι Κατηγορίες"
                    emptyText="Δεν βρέθηκαν κατηγορίες"
                  />
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Φίλτρο Ομάδας</Label>
                  <MultiSelect
                    options={teams.filter(t => t.is_active).map(team => ({
                      value: team.id,
                      label: team.name
                    }))}
                    selected={selectedTeamFilter}
                    onChange={(values) => {
                      setSelectedTeamFilter(values);
                      setCurrentPage(1);
                    }}
                    placeholder="Όλες οι Ομάδες"
                    emptyText="Δεν βρέθηκαν ομάδες"
                  />
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
              <div className="flex items-center gap-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportToExcel}
                  disabled={filteredComponents.length === 0}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export Excel
                </Button>
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
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Component Button at Top */}
              <Button
                type="button"
                variant="outline"
                onClick={handleAddComponent}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Component
              </Button>

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
                    <TableBody>
                      {paginatedComponents.map((component, index) => {
                        const absoluteIndex = startIndex + index;
                        const productDetails = getProductDetails(component.product_id);
                        const qty = parseFloat(component.quantity_required) || 0;
                        const lineCost = qty * productDetails.cost;
                        const tempId = component.id || `temp_${component.product_id}_${Date.now()}`;
                        
                        return (
                          <React.Fragment key={component.id || `new_${index}`}>
                            <TableRow className="border-b-0" key={`row1-${component.id || index}`}>
                              <TableCell className="text-sm text-slate-400 py-2 align-top pt-7" rowSpan={2}>
                                {absoluteIndex + 1}
                              </TableCell>
                              <TableCell className="py-2" colSpan={6}>
                                <div className="flex items-start gap-3 w-full">
                                   <div className="w-20">
                                     <label className="text-xs text-slate-500 mb-1 block">SKU</label>
                                     <div className="h-8 flex items-center text-xs text-slate-600 border border-input rounded-md px-2 bg-slate-50 truncate">
                                       {products.find(p => p.id === component.product_id)?.sku || '-'}
                                     </div>
                                   </div>
                                   <div className="flex-1 max-w-xs">
                                     <label className="text-xs text-slate-500 mb-1 block">Προϊόν</label>
                                     <ProductCombobox
                                       products={products}
                                       value={component.product_id}
                                       onValueChange={(value) => handleUpdateComponent(component, 'product_id', value)}
                                       placeholder="Επιλέξτε προϊόν"
                                     />
                                   </div>
                                  <div className="flex items-start gap-2 flex-shrink-0">
                                    <div>
                                      <label className="text-xs text-slate-500 mb-1 block">Κατηγορία</label>
                                      <Select
                                        value={component.material_category_id || "none"}
                                        onValueChange={(value) => handleUpdateComponent(component, 'material_category_id', value === "none" ? '' : value)}
                                      >
                                        <SelectTrigger className="h-8 text-xs w-44">
                                          <SelectValue placeholder="-" />
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
                                    </div>
                                    <div>
                                      <label className="text-xs text-slate-500 mb-1 block">Ομάδα</label>
                                      <Select
                                        value={component.team_id || "none"}
                                        onValueChange={(value) => handleUpdateComponent(component, 'team_id', value === "none" ? '' : value)}
                                      >
                                        <SelectTrigger className="h-8 text-xs w-40">
                                          <SelectValue placeholder="-" />
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
                                    <div>
                                      <label className="text-xs text-slate-500 mb-1 block">Εταιρεία</label>
                                      <span className="text-xs text-slate-600 font-normal whitespace-nowrap block h-8 flex items-center">
                                        {productDetails.company}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                            <TableRow className="border-b bg-slate-50/50" key={`row2-${component.id || index}`}>
                              <TableCell className="py-2 w-24">
                                <label className="text-xs text-slate-500 mb-1 block">Ποσότητα</label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  value={component.quantity_required}
                                  onChange={(e) => handleUpdateComponent(component, 'quantity_required', e.target.value)}
                                  onBlur={(e) => {
                                    const val = parseFloat(e.target.value);
                                    if (isNaN(val) || val <= 0) {
                                      handleUpdateComponent(component, 'quantity_required', "1");
                                    } else {
                                      handleUpdateComponent(component, 'quantity_required', String(val));
                                    }
                                  }}
                                  className="h-8 w-20"
                                />
                              </TableCell>
                              <TableCell className="py-2 w-24">
                                <label className="text-xs text-slate-500 mb-1 block">Μον. Εισαγ.</label>
                                {(() => {
                                  const product = products.find(p => p.id === component.product_id);
                                  const defaultUnit = product?.unit_of_measure || '';
                                  const displayUnit = component.input_unit_of_measure || defaultUnit;

                                  return (
                                    <div className="h-8 flex items-center text-xs text-slate-600 border border-input rounded-md px-2 bg-slate-50">
                                      {displayUnit || '-'}
                                    </div>
                                  );
                                })()}
                              </TableCell>
                              <TableCell className="py-2 w-20">
                                <label className="text-xs text-slate-500 mb-1 block">Κόστος</label>
                                <span className="text-sm text-slate-700">
                                  {lineCost > 0 ? `€${lineCost.toFixed(2)}` : '-'}
                                </span>
                              </TableCell>
                              <TableCell className="py-2">
                                <label className="text-xs text-slate-500 mb-1 block">Σημειώσεις</label>
                                <Input
                                  value={component.notes || ''}
                                  onChange={(e) => handleUpdateComponent(component, 'notes', e.target.value)}
                                  placeholder="Σημειώσεις..."
                                  className="h-8 text-sm"
                                />
                              </TableCell>
                              <TableCell className="py-2 text-right w-32 align-top pt-7">
                                <div className="flex items-center gap-1">
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => handleSaveComponent(component)}
                                    disabled={savingIds[tempId] || !component.product_id}
                                    className="h-7 px-2 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    {savingIds[tempId] ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      'Save'
                                    )}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveComponent(component)}
                                    className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          </React.Fragment>
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
              </CardContent>
              </Card>
        </>
      )}
    </div>
  );
}