import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function SectionBCostBreakdown({ shelterTypeId, onTotalsChange, bomVersions = [], selectedBomVersion = '' }) {
     const [verifiedCosts, setVerifiedCosts] = useState([]);
     const [nonBomCosts, setNonBomCosts] = useState([]);
     const [wasteAllowances, setWasteAllowances] = useState([]);
     const [accruedCosts, setAccruedCosts] = useState([]);
     const [products, setProducts] = useState([]);
     const [costCategories, setCostCategories] = useState([]);
     const [isLoadingData, setIsLoadingData] = useState(true);
     const [financialDataId, setFinancialDataId] = useState(null);

    useEffect(() => {
        setIsLoadingData(true);
        loadData();
    }, [shelterTypeId, selectedBomVersion]);

    const loadData = async () => {
        try {
            const [productsList, categoriesList] = await Promise.all([
                base44.entities.Product.list(),
                base44.entities.ProductCategory.list(),
            ]);
            setProducts(productsList);
            setCostCategories(categoriesList);
            
            // Load BOM costs if shelterTypeId is provided
            if (shelterTypeId) {
                await loadBomCosts();
                await loadSavedFinancialData();
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setIsLoadingData(false);
        }
    };

    const loadSavedFinancialData = async () => {
        try {
            const existing = await base44.entities.ShelterFinancialData.filter({
                shelter_type_id: shelterTypeId
            });

            if (existing.length > 0) {
                const data = existing[0];
                setFinancialDataId(data.id);
                
                // Load saved costs
                if (data.non_bom_costs && data.non_bom_costs.length > 0) {
                    setNonBomCosts(data.non_bom_costs.map((item, idx) => ({
                        id: Date.now() + idx,
                        description: item.description,
                        amount: item.amount
                    })));
                }
                
                if (data.waste_allowances && data.waste_allowances.length > 0) {
                    setWasteAllowances(data.waste_allowances.map((item, idx) => ({
                        id: Date.now() + idx + 1000,
                        product: item.product_id,
                        baseCost: item.base_cost,
                        allowancePercent: item.allowance_percent,
                        cost: (item.base_cost * item.allowance_percent) / 100
                    })));
                }
                
                if (data.accrued_costs && data.accrued_costs.length > 0) {
                    setAccruedCosts(data.accrued_costs.map((item, idx) => ({
                        id: Date.now() + idx + 2000,
                        category: item.category_id,
                        amount: item.amount
                    })));
                }
            }
        } catch (error) {
            console.error('Failed to load saved financial data:', error);
        }
    };

    const loadBomCosts = async () => {
        try {
            // Get BOM components for the selected shelter type
            const bomComponents = await base44.entities.BusStopTypeComponent.filter({
                bus_stop_type_id: shelterTypeId
            });

            // Get all products to map product_id to product details
            const allProducts = await base44.entities.Product.list();
            const productMap = {};
            allProducts.forEach(p => {
                productMap[p.id] = p;
            });

            // Get material categories
            const materialCategories = await base44.entities.MaterialCategory.list();
            const categoryMap = {};
            materialCategories.forEach(cat => {
                categoryMap[cat.id] = cat.name;
            });

            // Calculate total cost per material category
            const categoryTotals = {};
            bomComponents.forEach(comp => {
                const product = productMap[comp.product_id];
                if (product && comp.material_category_id) {
                    const categoryId = comp.material_category_id;
                    const quantity = parseFloat(comp.quantity_required) || 0;
                    const unitCost = parseFloat(product.unit_cost) || 0;
                    const totalCost = quantity * unitCost;
                    
                    if (!categoryTotals[categoryId]) {
                        categoryTotals[categoryId] = {
                            categoryId,
                            amount: 0
                        };
                    }
                    categoryTotals[categoryId].amount += totalCost;
                }
            });

            // Format verified costs
            const costs = Object.values(categoryTotals).map((item, index) => ({
                id: index,
                category: categoryMap[item.categoryId] || 'Unknown',
                amount: item.amount
            }));

            setVerifiedCosts(costs);
        } catch (error) {
            console.error('Failed to load BOM costs:', error);
            setVerifiedCosts([]);
        }
    };

    const addWasteAllowance = () => {
        setWasteAllowances([...wasteAllowances, { id: Date.now(), product: '', baseCost: '', allowancePercent: '', cost: 0 }]);
    };

    const removeWasteAllowance = (id) => {
        setWasteAllowances(wasteAllowances.filter(w => w.id !== id));
    };

    const updateWasteAllowance = (id, field, value) => {
        setWasteAllowances(wasteAllowances.map(w => {
            if (w.id === id) {
                const updated = { ...w, [field]: value };
                if (field === 'baseCost' || field === 'allowancePercent') {
                    const base = parseFloat(updated.baseCost) || 0;
                    const percent = parseFloat(updated.allowancePercent) || 0;
                    updated.cost = (base * percent) / 100;
                }
                return updated;
            }
            return w;
        }));
    };

    const addNonBomCost = () => {
        setNonBomCosts([...nonBomCosts, { id: Date.now(), description: '', amount: '' }]);
    };

    const removeNonBomCost = (id) => {
        setNonBomCosts(nonBomCosts.filter(n => n.id !== id));
    };

    const updateNonBomCost = (id, field, value) => {
        setNonBomCosts(nonBomCosts.map(n =>
            n.id === id ? { ...n, [field]: value } : n
        ));
    };

    const addAccruedCost = () => {
        setAccruedCosts([...accruedCosts, { id: Date.now(), category: '', amount: '' }]);
    };

    const removeAccruedCost = (id) => {
        setAccruedCosts(accruedCosts.filter(a => a.id !== id));
    };

    const updateAccruedCost = (id, field, value) => {
        setAccruedCosts(accruedCosts.map(a =>
            a.id === id ? { ...a, [field]: value } : a
        ));
    };

    const totalNonBomCosts = nonBomCosts.reduce((sum, n) => sum + (parseFloat(n.amount) || 0), 0);
    const totalWasteAllowance = wasteAllowances.reduce((sum, w) => sum + (w.cost || 0), 0);
    const totalAccruedCosts = accruedCosts.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
    const totalVerifiedCosts = verifiedCosts.reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0);
    const totalCostBreakdown = totalVerifiedCosts + totalNonBomCosts + totalWasteAllowance + totalAccruedCosts;

    useEffect(() => {
        if (onTotalsChange) {
            onTotalsChange({
                verified: totalVerifiedCosts,
                nonBom: totalNonBomCosts,
                waste: totalWasteAllowance,
                accrued: totalAccruedCosts
            });
        }
    }, [totalVerifiedCosts, totalNonBomCosts, totalWasteAllowance, totalAccruedCosts, onTotalsChange]);

    // Auto-save data when it changes
    useEffect(() => {
        if (shelterTypeId && !isLoadingData) {
            saveFinancialData();
        }
    }, [nonBomCosts, wasteAllowances, accruedCosts]);

    const saveFinancialData = async () => {
        try {
            const dataToSave = {
                shelter_type_id: shelterTypeId,
                non_bom_costs: nonBomCosts.map(c => ({
                    description: c.description,
                    amount: parseFloat(c.amount) || 0
                })),
                waste_allowances: wasteAllowances.map(w => ({
                    product_id: w.product,
                    base_cost: parseFloat(w.baseCost) || 0,
                    allowance_percent: parseFloat(w.allowancePercent) || 0
                })),
                accrued_costs: accruedCosts.map(a => ({
                    category_id: a.category,
                    amount: parseFloat(a.amount) || 0
                }))
            };

            if (financialDataId) {
                await base44.entities.ShelterFinancialData.update(financialDataId, dataToSave);
            } else {
                const created = await base44.entities.ShelterFinancialData.create(dataToSave);
                setFinancialDataId(created.id);
            }
        } catch (error) {
            console.error('Failed to save financial data:', error);
        }
    };

    if (isLoadingData) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>SECTION B — Cost Breakdown (BOM-driven)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
                {/* 1. Verified Costs from BOM */}
                <div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-2">1. Verified Costs (from BOM)</label>
                        <p className="text-xs text-slate-500">Total costs per material category from Warehouse & Stock BOM</p>
                    </div>
                    {verifiedCosts.length > 0 ? (
                        <div className="space-y-2 bg-slate-50 p-4 rounded-lg">
                            {verifiedCosts.map((cost) => (
                                <div key={cost.id} className="flex justify-between items-center py-2 border-b border-slate-200 last:border-0">
                                    <span className="text-sm text-slate-700">{cost.category}</span>
                                    <span className="text-sm font-medium text-slate-900">€{parseFloat(cost.amount).toFixed(2)}</span>
                                </div>
                            ))}
                            <div className="border-t border-slate-300 pt-3 flex justify-between items-center">
                                <span className="text-sm font-semibold text-slate-900">Subtotal Verified Costs</span>
                                <span className="text-sm font-bold text-slate-900">€{totalVerifiedCosts.toFixed(2)}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-600">
                            No BOM costs loaded yet
                        </div>
                    )}
                </div>

                {/* 2. Verified Non BOM Costs */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">2. Verified Non BOM Costs</label>
                            <p className="text-xs text-slate-500">Additional verified costs not included in BOM</p>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={addNonBomCost}
                            className="flex items-center gap-1"
                        >
                            <Plus className="w-4 h-4" />
                            Add
                        </Button>
                    </div>
                    <div className="space-y-3">
                        {nonBomCosts.map((cost) => (
                            <div key={cost.id} className="flex gap-3 items-end bg-slate-50 p-3 rounded-lg">
                                <div className="flex-1">
                                    <label className="text-xs text-slate-600 mb-1 block">Description</label>
                                    <Input
                                        placeholder="Cost description"
                                        value={cost.description}
                                        onChange={(e) => updateNonBomCost(cost.id, 'description', e.target.value)}
                                    />
                                </div>
                                <div className="w-32">
                                    <label className="text-xs text-slate-600 mb-1 block">Amount</label>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        value={cost.amount}
                                        onChange={(e) => updateNonBomCost(cost.id, 'amount', e.target.value)}
                                    />
                                </div>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => removeNonBomCost(cost.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                        {nonBomCosts.length > 0 && (
                            <div className="text-right text-sm font-medium text-slate-700 pt-2">
                                Subtotal Non BOM Costs: €{totalNonBomCosts.toFixed(2)}
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Waste Allowance */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">3. Waste Allowance</label>
                            <p className="text-xs text-slate-500">Material / Product Base Cost Allowance</p>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={addWasteAllowance}
                            className="flex items-center gap-1"
                        >
                            <Plus className="w-4 h-4" />
                            Add
                        </Button>
                    </div>
                    <div className="space-y-3">
                        {wasteAllowances.map((allowance) => (
                            <div key={allowance.id} className="flex gap-3 items-end bg-slate-50 p-3 rounded-lg">
                                <div className="flex-1">
                                    <label className="text-xs text-slate-600 mb-1 block">Material / Product</label>
                                    <Select value={allowance.product} onValueChange={(value) => updateWasteAllowance(allowance.id, 'product', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select product" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {products.map(prod => (
                                                <SelectItem key={prod.id} value={prod.id}>{prod.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="w-28">
                                    <label className="text-xs text-slate-600 mb-1 block">Base Cost</label>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        value={allowance.baseCost}
                                        onChange={(e) => updateWasteAllowance(allowance.id, 'baseCost', e.target.value)}
                                    />
                                </div>
                                <div className="w-20">
                                    <label className="text-xs text-slate-600 mb-1 block">Allow. %</label>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={allowance.allowancePercent}
                                        onChange={(e) => updateWasteAllowance(allowance.id, 'allowancePercent', e.target.value)}
                                    />
                                </div>
                                <div className="w-24">
                                    <label className="text-xs text-slate-600 mb-1 block">Cost</label>
                                    <div className="bg-white border border-slate-300 rounded px-3 py-2 text-sm font-medium">
                                        €{allowance.cost.toFixed(2)}
                                    </div>
                                </div>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => removeWasteAllowance(allowance.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                        {wasteAllowances.length > 0 && (
                            <div className="text-right text-sm font-medium text-slate-700 pt-2">
                                Subtotal Waste Allowance: €{totalWasteAllowance.toFixed(2)}
                            </div>
                        )}
                    </div>
                </div>

                {/* 4. Unfinalised / Accrued Costs */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">4. Unfinalised / Accrued Costs</label>
                            <p className="text-xs text-slate-500">Estimated costs not yet finalized</p>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={addAccruedCost}
                            className="flex items-center gap-1"
                        >
                            <Plus className="w-4 h-4" />
                            Add
                        </Button>
                    </div>
                    <div className="space-y-3">
                        {accruedCosts.map((cost) => (
                            <div key={cost.id} className="flex gap-3 items-end bg-slate-50 p-3 rounded-lg">
                                <div className="flex-1">
                                    <label className="text-xs text-slate-600 mb-1 block">Cost Category</label>
                                    <Select value={cost.category} onValueChange={(value) => updateAccruedCost(cost.id, 'category', value)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {costCategories.map(cat => (
                                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="w-32">
                                    <label className="text-xs text-slate-600 mb-1 block">Estimated Amount</label>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        value={cost.amount}
                                        onChange={(e) => updateAccruedCost(cost.id, 'amount', e.target.value)}
                                    />
                                </div>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => removeAccruedCost(cost.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                        {accruedCosts.length > 0 && (
                            <div className="text-right text-sm font-medium text-slate-700 pt-2">
                                Subtotal Accrued Costs: €{totalAccruedCosts.toFixed(2)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Total Cost Breakdown */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold text-slate-900">Total Cost Breakdown</span>
                        <span className="text-2xl font-bold text-blue-600">€{totalCostBreakdown.toFixed(2)}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}