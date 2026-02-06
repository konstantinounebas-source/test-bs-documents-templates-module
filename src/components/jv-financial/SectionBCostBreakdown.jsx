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

export default function SectionBCostBreakdown({ shelterTypeId, onTotalsChange }) {
    const [verifiedCosts, setVerifiedCosts] = useState([]);
    const [nonBomCosts, setNonBomCosts] = useState([]);
    const [wasteAllowances, setWasteAllowances] = useState([]);
    const [accruedCosts, setAccruedCosts] = useState([]);
    const [products, setProducts] = useState([]);
    const [costCategories, setCostCategories] = useState([]);
    const [bomVersions, setBomVersions] = useState([]);
    const [selectedBomVersion, setSelectedBomVersion] = useState('');
    const [isLoadingData, setIsLoadingData] = useState(true);

    useEffect(() => {
        loadData();
    }, [shelterTypeId]);

    const loadData = async () => {
        try {
            const [productsList, categoriesList, busStopTypesList] = await Promise.all([
                base44.entities.Product.list(),
                base44.entities.ProductCategory.list(),
                base44.entities.BusStopType.list(),
            ]);
            setProducts(productsList);
            setCostCategories(categoriesList);

            // Find BOM versions for the selected shelter type
            if (shelterTypeId && busStopTypesList.length > 0) {
                const matchingTypes = busStopTypesList.filter(t => t.id === shelterTypeId);
                if (matchingTypes.length > 0) {
                    // Load BOM component types for this bus stop type
                    const bomComponents = await base44.entities.BusStopTypeComponent.filter({
                        bus_stop_type_id: shelterTypeId
                    });
                    
                    // Group by version (V1, V2, etc.)
                    const versions = {};
                    bomComponents.forEach(comp => {
                        const version = comp.version || 'V1';
                        if (!versions[version]) {
                            versions[version] = {
                                version,
                                components: [],
                                comment: comp.comment || ''
                            };
                        }
                        versions[version].components.push(comp);
                    });
                    
                    const versionsList = Object.values(versions);
                    setBomVersions(versionsList);
                    if (versionsList.length > 0) {
                        setSelectedBomVersion(versionsList[0].version);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setIsLoadingData(false);
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

    const totalWasteAllowance = wasteAllowances.reduce((sum, w) => sum + (w.cost || 0), 0);
    const totalAccruedCosts = accruedCosts.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
    const totalVerifiedCosts = verifiedCosts.reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0);
    const totalCostBreakdown = totalVerifiedCosts + totalWasteAllowance + totalAccruedCosts;

    useEffect(() => {
        if (onTotalsChange) {
            onTotalsChange({
                verified: totalVerifiedCosts,
                waste: totalWasteAllowance,
                accrued: totalAccruedCosts
            });
        }
    }, [totalVerifiedCosts, totalWasteAllowance, totalAccruedCosts, onTotalsChange]);

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

                {/* 2. Waste Allowance */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">2. Waste Allowance</label>
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

                {/* 3. Unfinalised / Accrued Costs */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">3. Unfinalised / Accrued Costs</label>
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
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold text-slate-900">Total Cost Breakdown</span>
                        <span className="text-2xl font-bold text-orange-600">€{totalCostBreakdown.toFixed(2)}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}