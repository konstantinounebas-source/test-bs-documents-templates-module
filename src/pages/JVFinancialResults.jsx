import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from 'lucide-react';
import { usePageAccess } from "@/components/lib/usePageAccess";

export default function JVFinancialResults() {
    const { hasAccess, isLoading: accessLoading } = usePageAccess('JVFinancialResults');
    const [shelterTypes, setShelterTypes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [shelterFinancialData, setShelterFinancialData] = useState({});
    
    // Section A - Financial Results
    const [totalContractIncome, setTotalContractIncome] = useState(0);
    const [totalCostBreakdown, setTotalCostBreakdown] = useState(0);
    const [grossBalance, setGrossBalance] = useState(0);
    const [warrantyProvision, setWarrantyProvision] = useState('');
    const [netExpectedProfit, setNetExpectedProfit] = useState(0);
    const [profitMargin, setProfitMargin] = useState(0);
    
    // Section B - Profit Distribution
    const [shelterQuantities, setShelterQuantities] = useState({});
    const [warrantyProvisions, setWarrantyProvisions] = useState({});
    const [airControlShares, setAirControlShares] = useState({});
    const [amcoShares, setAmcoShares] = useState({});

    useEffect(() => {
        if (!accessLoading && hasAccess) {
            loadData();
        }
    }, [accessLoading, hasAccess]);

    const loadData = async () => {
        try {
            const types = await base44.entities.BusStopType.list();
            setShelterTypes(types.reverse());
            
            // Initialize quantities, warranty provisions, and shares for each shelter type
            const initialQuantities = {};
            const initialWarrantyProvisions = {};
            const initialAirControlShares = {};
            const initialAmcoShares = {};
            types.forEach(type => {
                initialQuantities[type.id] = 1;
                initialWarrantyProvisions[type.id] = 0;
                initialAirControlShares[type.id] = 0;
                initialAmcoShares[type.id] = 0;
            });
            setShelterQuantities(initialQuantities);
            setWarrantyProvisions(initialWarrantyProvisions);
            setAirControlShares(initialAirControlShares);
            setAmcoShares(initialAmcoShares);
            
            // Load financial data for all shelter types
            const allFinancialData = await base44.entities.ShelterFinancialData.list();
            const financialDataMap = {};
            allFinancialData.forEach(data => {
                financialDataMap[data.shelter_type_id] = data;
            });
            setShelterFinancialData(financialDataMap);

            // Load saved warranty provisions and shares
            allFinancialData.forEach(data => {
                if (data.warranty_provision !== undefined) {
                    initialWarrantyProvisions[data.shelter_type_id] = data.warranty_provision;
                }
                if (data.air_control_share_percent !== undefined) {
                    initialAirControlShares[data.shelter_type_id] = data.air_control_share_percent;
                }
                if (data.amco_share_percent !== undefined) {
                    initialAmcoShares[data.shelter_type_id] = data.amco_share_percent;
                }
            });
            setWarrantyProvisions(initialWarrantyProvisions);
            setAirControlShares(initialAirControlShares);
            setAmcoShares(initialAmcoShares);
            
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setIsLoading(false);
        }
    };



    const handleQuantityChange = (shelterTypeId, value) => {
        setShelterQuantities(prev => ({
            ...prev,
            [shelterTypeId]: value
        }));
    };

    const handleWarrantyProvisionChange = async (shelterTypeId, value) => {
        const numValue = parseFloat(value) || 0;
        setWarrantyProvisions(prev => ({
            ...prev,
            [shelterTypeId]: numValue
        }));

        // Auto-save to database
        const financialData = shelterFinancialData[shelterTypeId];
        if (financialData?.id) {
            await base44.entities.ShelterFinancialData.update(financialData.id, {
                warranty_provision: numValue
            });
        } else {
            const newData = await base44.entities.ShelterFinancialData.create({
                shelter_type_id: shelterTypeId,
                warranty_provision: numValue
            });
            setShelterFinancialData(prev => ({
                ...prev,
                [shelterTypeId]: newData
            }));
        }
    };

    const handleAirControlShareChange = async (shelterTypeId, value) => {
        const numValue = parseFloat(value) || 0;
        setAirControlShares(prev => ({
            ...prev,
            [shelterTypeId]: numValue
        }));

        // Auto-save to database
        const financialData = shelterFinancialData[shelterTypeId];
        if (financialData?.id) {
            await base44.entities.ShelterFinancialData.update(financialData.id, {
                air_control_share_percent: numValue
            });
        } else {
            const newData = await base44.entities.ShelterFinancialData.create({
                shelter_type_id: shelterTypeId,
                air_control_share_percent: numValue
            });
            setShelterFinancialData(prev => ({
                ...prev,
                [shelterTypeId]: newData
            }));
        }
    };

    const handleAmcoShareChange = async (shelterTypeId, value) => {
        const numValue = parseFloat(value) || 0;
        setAmcoShares(prev => ({
            ...prev,
            [shelterTypeId]: numValue
        }));

        // Auto-save to database
        const financialData = shelterFinancialData[shelterTypeId];
        if (financialData?.id) {
            await base44.entities.ShelterFinancialData.update(financialData.id, {
                amco_share_percent: numValue
            });
        } else {
            const newData = await base44.entities.ShelterFinancialData.create({
                shelter_type_id: shelterTypeId,
                amco_share_percent: numValue
            });
            setShelterFinancialData(prev => ({
                ...prev,
                [shelterTypeId]: newData
            }));
        }
    };

    // Helper function to calculate metrics per shelter type
    const calculateMetrics = (type) => {
        const financialData = shelterFinancialData[type.id];
        const quantity = shelterQuantities[type.id] || 1;

        const contractIncome = financialData 
            ? (parseFloat(financialData.contract_amount) || 0) + 
              (financialData.approved_variations?.reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0) || 0) +
              (financialData.potential_variations?.reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0) || 0)
            : 0;

        const totalCost = financialData 
            ? (financialData.non_bom_costs?.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0) || 0) +
              (financialData.waste_allowances?.reduce((sum, w) => {
                  const baseCost = parseFloat(w.base_cost) || 0;
                  const allowancePercent = parseFloat(w.allowance_percent) || 0;
                  return sum + ((baseCost * allowancePercent) / 100);
              }, 0) || 0) +
              (financialData.accrued_costs?.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0) || 0)
            : 0;

        const grossBalance = (contractIncome - totalCost) * quantity;
        const warranty = (warrantyProvisions[type.id] || 0) * quantity;
        const netProfit = grossBalance - warranty;
        const totalCostWithQuantity = totalCost * quantity;
        const profitMargin = totalCostWithQuantity > 0 ? (netProfit / totalCostWithQuantity) * 100 : 0;
        const airControlShare = airControlShares[type.id] || 0;
        const amcoShare = amcoShares[type.id] || 0;
        const airControlProfit = (netProfit * airControlShare) / 100;
        const amcoProfit = (netProfit * amcoShare) / 100;

        return {
            contractIncome: contractIncome * quantity,
            totalCost: totalCostWithQuantity,
            grossBalance,
            warranty,
            netProfit,
            profitMargin,
            airControlProfit,
            amcoProfit
        };
    };

    if (accessLoading || isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (!hasAccess) {
        return null;
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="mx-auto space-y-6" style={{ maxWidth: '100%' }}>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">JV Financial Results</h1>
                        <p className="text-slate-600 mt-1">Consolidated financial results and profit distribution per shelter type</p>
                    </div>
                    <Button className="flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Export PDF (A4 Landscape)
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Financial Results Table</CardTitle>
                        <CardDescription>All shelter types in columns with financial metrics</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-slate-100">
                                        <th className="text-left text-xs font-semibold text-slate-700 px-3 py-2 border border-slate-200 sticky left-0 bg-slate-100 z-10">
                                            Metric
                                        </th>
                                        {shelterTypes.map(type => (
                                            <th key={type.id} className="text-center text-xs font-semibold text-slate-700 px-3 py-2 border border-slate-200 min-w-[120px]">
                                                {type.code}
                                            </th>
                                        ))}
                                        <th className="text-center text-xs font-semibold text-slate-700 px-3 py-2 border border-slate-200 bg-slate-200 min-w-[120px]">
                                            TOTAL
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Quantity Row */}
                                    <tr className="bg-white">
                                        <td className="text-xs font-medium text-slate-700 px-3 py-2 border border-slate-200 sticky left-0 bg-white z-10">
                                            Quantity
                                        </td>
                                        {shelterTypes.map(type => (
                                            <td key={type.id} className="px-3 py-2 border border-slate-200">
                                                <Input
                                                    type="number"
                                                    placeholder="1"
                                                    value={shelterQuantities[type.id]}
                                                    onChange={(e) => handleQuantityChange(type.id, parseFloat(e.target.value) || 0)}
                                                    className="text-center h-8 text-sm w-full"
                                                />
                                            </td>
                                        ))}
                                        <td className="text-center text-xs font-bold text-slate-900 px-3 py-2 border border-slate-200 bg-slate-50">
                                            {Object.values(shelterQuantities).reduce((sum, val) => sum + val, 0)}
                                        </td>
                                    </tr>

                                    {/* Section A Metrics */}
                                    <tr className="bg-slate-50">
                                        <td colSpan={shelterTypes.length + 2} className="text-xs font-bold text-slate-900 px-3 py-2 border border-slate-200">
                                            SECTION A — Financial Results
                                        </td>
                                    </tr>

                                    <tr className="bg-white">
                                        <td className="text-xs font-medium text-slate-700 px-3 py-2 border border-slate-200 sticky left-0 bg-white z-10">
                                            Total Contract Income
                                        </td>
                                        {shelterTypes.map(type => {
                                            const financialData = shelterFinancialData[type.id];
                                            const contractIncome = financialData 
                                                ? (parseFloat(financialData.contract_amount) || 0) + 
                                                  (financialData.approved_variations?.reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0) || 0) +
                                                  (financialData.potential_variations?.reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0) || 0)
                                                : 0;
                                            const quantity = shelterQuantities[type.id] || 1;
                                            return (
                                                <td key={type.id} className="text-center text-xs text-slate-700 px-3 py-2 border border-slate-200">
                                                    €{(contractIncome * quantity).toFixed(2)}
                                                </td>
                                            );
                                        })}
                                        <td className="text-center text-xs font-bold text-slate-900 px-3 py-2 border border-slate-200 bg-slate-50">
                                            €{shelterTypes.reduce((sum, type) => {
                                                const financialData = shelterFinancialData[type.id];
                                                const contractIncome = financialData 
                                                    ? (parseFloat(financialData.contract_amount) || 0) + 
                                                      (financialData.approved_variations?.reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0) || 0) +
                                                      (financialData.potential_variations?.reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0) || 0)
                                                    : 0;
                                                const quantity = shelterQuantities[type.id] || 1;
                                                return sum + (contractIncome * quantity);
                                            }, 0).toFixed(2)}
                                        </td>
                                    </tr>

                                    <tr className="bg-white">
                                        <td className="text-xs font-medium text-slate-700 px-3 py-2 border border-slate-200 sticky left-0 bg-white z-10">
                                            Total Cost Breakdown
                                        </td>
                                        {shelterTypes.map(type => {
                                            const financialData = shelterFinancialData[type.id];
                                            const totalCost = financialData 
                                                ? (financialData.non_bom_costs?.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0) || 0) +
                                                  (financialData.waste_allowances?.reduce((sum, w) => {
                                                      const baseCost = parseFloat(w.base_cost) || 0;
                                                      const allowancePercent = parseFloat(w.allowance_percent) || 0;
                                                      return sum + ((baseCost * allowancePercent) / 100);
                                                  }, 0) || 0) +
                                                  (financialData.accrued_costs?.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0) || 0)
                                                : 0;
                                            const quantity = shelterQuantities[type.id] || 1;
                                            return (
                                                <td key={type.id} className="text-center text-xs text-slate-700 px-3 py-2 border border-slate-200">
                                                    €{(totalCost * quantity).toFixed(2)}
                                                </td>
                                            );
                                        })}
                                        <td className="text-center text-xs font-bold text-slate-900 px-3 py-2 border border-slate-200 bg-slate-50">
                                            €{shelterTypes.reduce((sum, type) => {
                                                const financialData = shelterFinancialData[type.id];
                                                const totalCost = financialData 
                                                    ? (financialData.non_bom_costs?.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0) || 0) +
                                                      (financialData.waste_allowances?.reduce((sum, w) => {
                                                          const baseCost = parseFloat(w.base_cost) || 0;
                                                          const allowancePercent = parseFloat(w.allowance_percent) || 0;
                                                          return sum + ((baseCost * allowancePercent) / 100);
                                                      }, 0) || 0) +
                                                      (financialData.accrued_costs?.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0) || 0)
                                                    : 0;
                                                const quantity = shelterQuantities[type.id] || 1;
                                                return sum + (totalCost * quantity);
                                            }, 0).toFixed(2)}
                                        </td>
                                    </tr>

                                    <tr className="bg-blue-50">
                                        <td className="text-xs font-semibold text-slate-900 px-3 py-2 border border-slate-200 sticky left-0 bg-blue-50 z-10">
                                            Gross Balance
                                        </td>
                                        {shelterTypes.map(type => {
                                            const financialData = shelterFinancialData[type.id];
                                            const contractIncome = financialData 
                                                ? (parseFloat(financialData.contract_amount) || 0) + 
                                                  (financialData.approved_variations?.reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0) || 0) +
                                                  (financialData.potential_variations?.reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0) || 0)
                                                : 0;
                                            const totalCost = financialData 
                                                ? (financialData.non_bom_costs?.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0) || 0) +
                                                  (financialData.waste_allowances?.reduce((sum, w) => {
                                                      const baseCost = parseFloat(w.base_cost) || 0;
                                                      const allowancePercent = parseFloat(w.allowance_percent) || 0;
                                                      return sum + ((baseCost * allowancePercent) / 100);
                                                  }, 0) || 0) +
                                                  (financialData.accrued_costs?.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0) || 0)
                                                : 0;
                                            const quantity = shelterQuantities[type.id] || 1;
                                            const grossBalance = (contractIncome - totalCost) * quantity;
                                            return (
                                                <td key={type.id} className="text-center text-xs font-medium text-slate-900 px-3 py-2 border border-slate-200">
                                                    €{grossBalance.toFixed(2)}
                                                </td>
                                            );
                                        })}
                                        <td className="text-center text-sm font-bold text-slate-900 px-3 py-2 border border-slate-200 bg-blue-100">
                                            €{shelterTypes.reduce((sum, type) => {
                                                const financialData = shelterFinancialData[type.id];
                                                const contractIncome = financialData 
                                                    ? (parseFloat(financialData.contract_amount) || 0) + 
                                                      (financialData.approved_variations?.reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0) || 0) +
                                                      (financialData.potential_variations?.reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0) || 0)
                                                    : 0;
                                                const totalCost = financialData 
                                                    ? (financialData.non_bom_costs?.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0) || 0) +
                                                      (financialData.waste_allowances?.reduce((sum, w) => {
                                                          const baseCost = parseFloat(w.base_cost) || 0;
                                                          const allowancePercent = parseFloat(w.allowance_percent) || 0;
                                                          return sum + ((baseCost * allowancePercent) / 100);
                                                      }, 0) || 0) +
                                                      (financialData.accrued_costs?.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0) || 0)
                                                    : 0;
                                                const quantity = shelterQuantities[type.id] || 1;
                                                return sum + ((contractIncome - totalCost) * quantity);
                                            }, 0).toFixed(2)}
                                        </td>
                                    </tr>

                                    <tr className="bg-white">
                                        <td className="text-xs font-medium text-slate-700 px-3 py-2 border border-slate-200 sticky left-0 bg-white z-10">
                                            Warranty Provision
                                        </td>
                                        {shelterTypes.map(type => (
                                            <td key={type.id} className="px-3 py-2 border border-slate-200">
                                                <Input
                                                    type="number"
                                                    placeholder="0.00"
                                                    value={warrantyProvisions[type.id] || ''}
                                                    onChange={(e) => handleWarrantyProvisionChange(type.id, e.target.value)}
                                                    className="text-center h-8 text-sm w-full"
                                                />
                                            </td>
                                        ))}
                                        <td className="text-center text-xs font-bold text-slate-900 px-3 py-2 border border-slate-200 bg-slate-50">
                                            €{shelterTypes.reduce((sum, type) => {
                                                const quantity = shelterQuantities[type.id] || 1;
                                                const warranty = warrantyProvisions[type.id] || 0;
                                                return sum + (warranty * quantity);
                                            }, 0).toFixed(2)}
                                        </td>
                                    </tr>

                                    <tr className="bg-green-50">
                                        <td className="text-xs font-semibold text-slate-900 px-3 py-2 border border-slate-200 sticky left-0 bg-green-50 z-10">
                                            Net Expected Profit
                                        </td>
                                        {shelterTypes.map(type => {
                                            const metrics = calculateMetrics(type);
                                            return (
                                                <td key={type.id} className="text-center text-xs font-medium text-slate-900 px-3 py-2 border border-slate-200">
                                                    €{metrics.netProfit.toFixed(2)}
                                                </td>
                                            );
                                        })}
                                        <td className="text-center text-sm font-bold text-slate-900 px-3 py-2 border border-slate-200 bg-green-100">
                                            €{shelterTypes.reduce((sum, type) => {
                                                const metrics = calculateMetrics(type);
                                                return sum + metrics.netProfit;
                                            }, 0).toFixed(2)}
                                        </td>
                                    </tr>

                                    <tr className="bg-amber-50">
                                        <td className="text-xs font-semibold text-slate-900 px-3 py-2 border border-slate-200 sticky left-0 bg-amber-50 z-10">
                                            Profit Margin (%)
                                        </td>
                                        {shelterTypes.map(type => {
                                            const metrics = calculateMetrics(type);
                                            return (
                                                <td key={type.id} className="text-center text-xs font-medium text-slate-900 px-3 py-2 border border-slate-200">
                                                    {metrics.profitMargin.toFixed(2)}%
                                                </td>
                                            );
                                        })}
                                        <td className="text-center text-sm font-bold text-slate-900 px-3 py-2 border border-slate-200 bg-amber-100">
                                            {(() => {
                                                const totalCost = shelterTypes.reduce((sum, type) => sum + calculateMetrics(type).totalCost, 0);
                                                const totalNetProfit = shelterTypes.reduce((sum, type) => sum + calculateMetrics(type).netProfit, 0);
                                                return totalCost > 0 ? ((totalNetProfit / totalCost) * 100).toFixed(2) : '0.00';
                                            })()}%
                                        </td>
                                    </tr>

                                    {/* Section B Metrics */}
                                    <tr className="bg-slate-50">
                                        <td colSpan={shelterTypes.length + 2} className="text-xs font-bold text-slate-900 px-3 py-2 border border-slate-200">
                                            SECTION B — Profit Distribution
                                        </td>
                                    </tr>

                                    <tr className="bg-white">
                                        <td className="text-xs font-medium text-slate-700 px-3 py-2 border border-slate-200 sticky left-0 bg-white z-10">
                                            Air Control Share (%)
                                        </td>
                                        {shelterTypes.map(type => (
                                            <td key={type.id} className="px-3 py-2 border border-slate-200">
                                                <Input
                                                    type="number"
                                                    placeholder="0"
                                                    value={airControlShares[type.id] || ''}
                                                    onChange={(e) => handleAirControlShareChange(type.id, e.target.value)}
                                                    className="text-center h-8 text-sm w-full"
                                                />
                                            </td>
                                        ))}
                                        <td className="text-center text-xs font-bold text-slate-900 px-3 py-2 border border-slate-200 bg-slate-50">
                                            -
                                        </td>
                                    </tr>

                                    <tr className="bg-blue-50">
                                        <td className="text-xs font-semibold text-slate-900 px-3 py-2 border border-slate-200 sticky left-0 bg-blue-50 z-10">
                                            Air Control Profit Amount
                                        </td>
                                        {shelterTypes.map(type => {
                                            const metrics = calculateMetrics(type);
                                            return (
                                                <td key={type.id} className="text-center text-xs font-medium text-blue-600 px-3 py-2 border border-slate-200">
                                                    €{metrics.airControlProfit.toFixed(2)}
                                                </td>
                                            );
                                        })}
                                        <td className="text-center text-sm font-bold text-blue-600 px-3 py-2 border border-slate-200 bg-blue-100">
                                            €{shelterTypes.reduce((sum, type) => {
                                                const metrics = calculateMetrics(type);
                                                return sum + metrics.airControlProfit;
                                            }, 0).toFixed(2)}
                                        </td>
                                    </tr>

                                    <tr className="bg-white">
                                        <td className="text-xs font-medium text-slate-700 px-3 py-2 border border-slate-200 sticky left-0 bg-white z-10">
                                            Amco Share (%)
                                        </td>
                                        {shelterTypes.map(type => (
                                            <td key={type.id} className="px-3 py-2 border border-slate-200">
                                                <Input
                                                    type="number"
                                                    placeholder="0"
                                                    value={amcoShares[type.id] || ''}
                                                    onChange={(e) => handleAmcoShareChange(type.id, e.target.value)}
                                                    className="text-center h-8 text-sm w-full"
                                                />
                                            </td>
                                        ))}
                                        <td className="text-center text-xs font-bold text-slate-900 px-3 py-2 border border-slate-200 bg-slate-50">
                                            -
                                        </td>
                                    </tr>

                                    <tr className="bg-purple-50">
                                        <td className="text-xs font-semibold text-slate-900 px-3 py-2 border border-slate-200 sticky left-0 bg-purple-50 z-10">
                                            Amco Profit Amount
                                        </td>
                                        {shelterTypes.map(type => {
                                            const metrics = calculateMetrics(type);
                                            return (
                                                <td key={type.id} className="text-center text-xs font-medium text-purple-600 px-3 py-2 border border-slate-200">
                                                    €{metrics.amcoProfit.toFixed(2)}
                                                </td>
                                            );
                                        })}
                                        <td className="text-center text-sm font-bold text-purple-600 px-3 py-2 border border-slate-200 bg-purple-100">
                                            €{shelterTypes.reduce((sum, type) => {
                                                const metrics = calculateMetrics(type);
                                                return sum + metrics.amcoProfit;
                                            }, 0).toFixed(2)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}