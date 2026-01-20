import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { BarChart3, Calculator, AlertTriangle, CheckCircle, Package, GripVertical, X, Plus, FileSpreadsheet } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import ExcelJS from 'exceljs';

export default function InstallationCapacityPage() {
  const [busStopTypes, setBusStopTypes] = useState([]);
  const [components, setComponents] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [capacityResults, setCapacityResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [exportOnlyBottlenecks, setExportOnlyBottlenecks] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [typesData, componentsData, stockData, productsData] = await Promise.all([
        base44.entities.BusStopType.list(),
        base44.entities.BusStopTypeComponent.list(),
        base44.entities.StockItem.list(),
        base44.entities.Product.list()
      ]);
      setBusStopTypes(typesData.filter(t => t.is_active));
      setComponents(componentsData);
      setStockItems(stockData);
      setProducts(productsData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setIsLoading(false);
  };

  const handleToggleType = (typeId) => {
    setSelectedTypes(prev => {
      const exists = prev.find(t => t.typeId === typeId);
      if (exists) {
        return prev.filter(t => t.typeId !== typeId);
      } else {
        return [...prev, { typeId, quantity: 1, priority: prev.length + 1 }];
      }
    });
  };

  const handleQuantityChange = (typeId, quantity) => {
    setSelectedTypes(prev =>
      prev.map(t => t.typeId === typeId ? { ...t, quantity: Math.max(1, parseInt(quantity) || 1) } : t)
    );
  };

  const handlePriorityChange = (typeId, newPriority) => {
    const priority = Math.max(1, Math.min(selectedTypes.length, parseInt(newPriority) || 1));
    setSelectedTypes(prev => {
      const updated = prev.map(t => {
        if (t.typeId === typeId) {
          return { ...t, priority };
        }
        return t;
      });
      // Renumber priorities to avoid duplicates
      return updated.sort((a, b) => {
        if (a.typeId === typeId) return priority - 1.5; // Place it before its new position
        return a.priority - b.priority;
      }).map((t, idx) => ({ ...t, priority: idx + 1 }));
    });
  };

  const handleRemoveType = (typeId) => {
    setSelectedTypes(prev => 
      prev.filter(t => t.typeId !== typeId)
        .map((t, idx) => ({ ...t, priority: idx + 1 }))
    );
  };

  const calculateCapacity = () => {
    if (selectedTypes.length === 0) return;

    // Sort by priority
    const sortedTypes = [...selectedTypes].sort((a, b) => a.priority - b.priority);

    // Build a product requirements map
    const productRequirements = {};
    
    sortedTypes.forEach(({ typeId, quantity }) => {
      const typeComponents = components.filter(c => c.bus_stop_type_id === typeId && !c.is_optional);
      
      typeComponents.forEach(comp => {
        const product = products.find(p => p.id === comp.product_id);
        if (!product) return;

        if (!productRequirements[comp.product_id]) {
          productRequirements[comp.product_id] = {
            product_name: product.name,
            product_sku: product.sku,
            unit_of_measure: product.unit_of_measure,
            available_stock: 0,
            usages: []
          };
        }

        productRequirements[comp.product_id].usages.push({
          typeId,
          typeName: busStopTypes.find(t => t.id === typeId)?.name,
          quantity_per_unit: comp.quantity_required,
          requested_units: quantity,
          total_needed: comp.quantity_required * quantity,
          priority: sortedTypes.find(t => t.typeId === typeId).priority
        });
      });
    });

    // Calculate available stock for each product
    Object.keys(productRequirements).forEach(productId => {
      const stock = stockItems.filter(s => s.product_id === productId);
      const availableStock = stock.reduce((sum, item) => 
        sum + (item.quantity_on_hand || 0) - (item.quantity_reserved || 0), 0
      );
      productRequirements[productId].available_stock = availableStock;
    });

    // Simulate allocation by priority
    const allocationResults = sortedTypes.map(({ typeId, quantity, priority }) => {
      const typeName = busStopTypes.find(t => t.id === typeId)?.name;
      const typeComponents = components.filter(c => c.bus_stop_type_id === typeId && !c.is_optional);
      
      let maxCanBuild = Infinity;
      let bottlenecks = [];

      typeComponents.forEach(comp => {
        const prodReq = productRequirements[comp.product_id];
        if (!prodReq) return;

        // Calculate remaining stock after previous priorities
        let remainingStock = prodReq.available_stock;
        prodReq.usages.forEach(usage => {
          if (usage.priority < priority) {
            remainingStock -= usage.total_needed;
          }
        });

        const canBuild = Math.max(0, Math.floor(remainingStock / comp.quantity_required));
        
        if (canBuild < maxCanBuild) {
          maxCanBuild = canBuild;
          bottlenecks = [{
            product_name: prodReq.product_name,
            product_sku: prodReq.product_sku,
            required: comp.quantity_required * quantity,
            available: remainingStock,
            shortage: (comp.quantity_required * quantity) - remainingStock
          }];
        } else if (canBuild === maxCanBuild && canBuild < quantity) {
          bottlenecks.push({
            product_name: prodReq.product_name,
            product_sku: prodReq.product_sku,
            required: comp.quantity_required * quantity,
            available: remainingStock,
            shortage: (comp.quantity_required * quantity) - remainingStock
          });
        }
      });

      const actualBuilt = Math.min(maxCanBuild, quantity);
      
      // "Consume" the stock for this priority level
      typeComponents.forEach(comp => {
        const prodReq = productRequirements[comp.product_id];
        if (prodReq) {
          const usage = prodReq.usages.find(u => u.typeId === typeId);
          if (usage) {
            usage.actual_built = actualBuilt;
            usage.actual_consumed = comp.quantity_required * actualBuilt;
          }
        }
      });

      return {
        typeId,
        typeName,
        priority,
        requested: quantity,
        canBuild: actualBuilt,
        status: actualBuilt >= quantity ? 'OK' : (actualBuilt > 0 ? 'PARTIAL' : 'BLOCKED'),
        bottlenecks
      };
    });

    // Build component analysis with bottleneck info
    const componentAnalysis = Object.values(productRequirements).map(req => {
      const totalRequested = req.usages.reduce((sum, u) => sum + u.total_needed, 0);
      const totalConsumed = req.usages.reduce((sum, u) => sum + (u.actual_consumed || 0), 0);
      const isBottleneck = req.usages.some(u => u.requested_units > (u.actual_built || 0));
      
      return {
        ...req,
        total_requested: totalRequested,
        total_consumed: totalConsumed,
        shortage: Math.max(0, totalConsumed - req.available_stock),
        is_bottleneck: isBottleneck
      };
    });

    // Sort: bottlenecks first
    componentAnalysis.sort((a, b) => {
      if (a.is_bottleneck && !b.is_bottleneck) return -1;
      if (!a.is_bottleneck && b.is_bottleneck) return 1;
      return b.total_requested - a.total_requested;
    });

    setCapacityResults({
      allocationResults,
      componentAnalysis,
      productRequirements
    });
  };

  const selectedTypesData = selectedTypes
    .sort((a, b) => a.priority - b.priority)
    .map(st => ({
      ...st,
      type: busStopTypes.find(t => t.id === st.typeId)
    }));

  const handleExportComponentAnalysis = async () => {
    if (!capacityResults) return;

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Component Analysis');

      // Define columns
      worksheet.columns = [
        { header: 'Product', key: 'product', width: 30 },
        { header: 'SKU', key: 'sku', width: 20 },
        { header: 'Available Stock', key: 'available_stock', width: 18 },
        { header: 'Total Requested', key: 'total_requested', width: 18 },
        { header: 'Will Consume', key: 'will_consume', width: 18 },
        { header: 'Used By', key: 'used_by', width: 50 }
      ];

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4B5563' }
      };
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      // Filter data based on checkbox
      const dataToExport = exportOnlyBottlenecks 
        ? capacityResults.componentAnalysis.filter(comp => comp.available_stock < comp.total_requested)
        : capacityResults.componentAnalysis;

      // Add data
      dataToExport.forEach(comp => {
        const usedByText = comp.usages.map(usage => 
          `#${usage.priority} ${usage.typeName}: ${usage.quantity_per_unit} × ${usage.requested_units} = ${usage.total_needed}${usage.actual_built !== undefined && usage.actual_built < usage.requested_units ? ` (built only ${usage.actual_built})` : ''}`
        ).join('; ');

        const row = worksheet.addRow({
          product: comp.product_name,
          sku: comp.product_sku,
          available_stock: `${comp.available_stock} ${comp.unit_of_measure}`,
          total_requested: `${comp.total_requested} ${comp.unit_of_measure}`,
          will_consume: `${comp.total_consumed} ${comp.unit_of_measure}`,
          used_by: usedByText
        });

        // Highlight bottleneck rows
        if (comp.available_stock < comp.total_requested) {
          row.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFEF2F2' }
            };
          });
        }
      });

      // Add borders
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
      const filename = exportOnlyBottlenecks 
        ? `Component_Analysis_Bottlenecks_${new Date().toISOString().split('T')[0]}.xlsx`
        : `Component_Analysis_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.download = filename;
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
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Installation Capacity Calculator</h1>
          <p className="text-slate-600 mt-1">Calculate capacity for multiple bus stop types with priority allocation</p>
        </div>

        {/* Selection Card */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Select Bus Stop Types
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {busStopTypes.map((type) => {
                const isSelected = selectedTypes.some(t => t.typeId === type.id);
                return (
                  <div 
                    key={type.id}
                    className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => handleToggleType(type.id)}
                  >
                    <div className="flex items-start gap-2">
                      <Checkbox checked={isSelected} className="mt-1" />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{type.name}</p>
                        <p className="text-xs text-slate-500">{type.code}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedTypesData.length > 0 && (
              <>
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-slate-700 mb-3">Selected Types (Priority Order):</p>
                  <div className="space-y-2">
                    {selectedTypesData.map(({ typeId, type, quantity, priority }) => (
                      <div key={typeId} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200">
                        <GripVertical className="w-4 h-4 text-slate-400" />
                        <div className="flex items-center gap-2">
                          <Label className="text-sm text-slate-600 w-16">Priority:</Label>
                          <Input
                            type="number"
                            min="1"
                            max={selectedTypes.length}
                            value={priority}
                            onChange={(e) => handlePriorityChange(typeId, e.target.value)}
                            className="w-16"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{type.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-sm text-slate-600">Quantity:</Label>
                          <Input
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => handleQuantityChange(typeId, e.target.value)}
                            className="w-20"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveType(typeId);
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <Button 
                  onClick={calculateCapacity}
                  className="w-full"
                  size="lg"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Calculate Installation Capacity
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {capacityResults && (
          <>
            {/* Allocation Results */}
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>Installation Capacity by Priority</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Priority</TableHead>
                      <TableHead>Bus Stop Type</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Can Build</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Bottlenecks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {capacityResults.allocationResults.map((result) => (
                      <TableRow key={result.typeId}>
                        <TableCell>
                          <Badge variant="outline">#{result.priority}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{result.typeName}</TableCell>
                        <TableCell>{result.requested}</TableCell>
                        <TableCell className="font-bold text-lg">
                          {result.canBuild}
                        </TableCell>
                        <TableCell>
                          {result.status === 'OK' && (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Full Capacity
                            </Badge>
                          )}
                          {result.status === 'PARTIAL' && (
                            <Badge className="bg-orange-100 text-orange-800">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Partial ({result.canBuild}/{result.requested})
                            </Badge>
                          )}
                          {result.status === 'BLOCKED' && (
                            <Badge className="bg-red-100 text-red-800">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Blocked
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {result.bottlenecks.length > 0 ? (
                            <div className="space-y-1">
                              {result.bottlenecks.map((bn, idx) => (
                                <div key={idx} className="text-xs text-red-600">
                                  {bn.product_name}: need {bn.required}, have {bn.available}
                                  {bn.shortage > 0 && ` (short ${bn.shortage})`}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500">No bottlenecks</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Component Analysis */}
            <Card className="border-slate-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Component Analysis (Bottlenecks First)
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="export-bottlenecks-only"
                        checked={exportOnlyBottlenecks}
                        onCheckedChange={setExportOnlyBottlenecks}
                      />
                      <label 
                        htmlFor="export-bottlenecks-only" 
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        Μόνο Bottlenecks
                      </label>
                    </div>
                    <Button 
                      onClick={handleExportComponentAnalysis}
                      variant="outline"
                      size="sm"
                      className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Export Excel
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Available Stock</TableHead>
                      <TableHead>Total Requested</TableHead>
                      <TableHead>Will Consume</TableHead>
                      <TableHead>Used By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {capacityResults.componentAnalysis
                      .filter(comp => !exportOnlyBottlenecks || comp.available_stock < comp.total_requested)
                      .map((comp, idx) => (
                      <TableRow 
                        key={idx}
                        className={comp.is_bottleneck ? 'bg-red-50' : ''}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {comp.available_stock < comp.total_requested && (
                              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                            )}
                            <span className="font-medium">{comp.product_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{comp.product_sku}</TableCell>
                        <TableCell className="font-semibold">
                          {comp.available_stock} {comp.unit_of_measure}
                        </TableCell>
                        <TableCell>
                          {comp.total_requested} {comp.unit_of_measure}
                        </TableCell>
                        <TableCell className={comp.total_consumed > comp.available_stock ? 'text-red-600 font-semibold' : 'text-green-600'}>
                          {comp.total_consumed} {comp.unit_of_measure}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {comp.usages.map((usage, uidx) => (
                              <div key={uidx} className="text-xs">
                                <span className="font-medium">#{usage.priority} {usage.typeName}:</span>{' '}
                                {usage.quantity_per_unit} × {usage.requested_units} = {usage.total_needed}
                                {usage.actual_built !== undefined && usage.actual_built < usage.requested_units && (
                                  <span className="text-red-600"> (built only {usage.actual_built})</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}

        {/* Help Text */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <h3 className="font-semibold text-blue-900 mb-2">How It Works</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Select multiple bus stop types and set quantities</li>
              <li>Set priority order - lower numbers get materials allocated first</li>
              <li>Calculator simulates allocation by priority</li>
              <li>Bottleneck components (those causing shortages) appear at the top with red highlighting</li>
              <li>Shared components are tracked across all types</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}