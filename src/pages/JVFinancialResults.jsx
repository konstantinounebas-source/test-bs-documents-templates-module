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
            
            // Initialize quantities for each shelter type
            const initialQuantities = {};
            types.forEach(type => {
                initialQuantities[type.id] = 1;
            });
            setShelterQuantities(initialQuantities);
            
            // Load financial data for all shelter types
            const allFinancialData = await base44.entities.ShelterFinancialData.list();
            const financialDataMap = {};
            allFinancialData.forEach(data => {
                financialDataMap[data.shelter_type_id] = data;
            });
            setShelterFinancialData(financialDataMap);
            
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate Gross Balance
    useEffect(() => {
        const balance = totalContractIncome - totalCostBreakdown;
        setGrossBalance(balance);
    }, [totalContractIncome, totalCostBreakdown]);

    // Calculate Net Expected Profit
    useEffect(() => {
        const warranty = parseFloat(warrantyProvision) || 0;
        const netProfit = grossBalance - warranty;
        setNetExpectedProfit(netProfit);
    }, [grossBalance, warrantyProvision]);

    // Calculate Profit Margin
    useEffect(() => {
        if (totalCostBreakdown > 0) {
            const margin = (netExpectedProfit / totalCostBreakdown) * 100;
            setProfitMargin(margin);
        } else {
            setProfitMargin(0);
        }
    }, [netExpectedProfit, totalCostBreakdown]);

    // Calculate Air Control Profit Amount
    useEffect(() => {
        const share = parseFloat(airControlShare) || 0;
        const amount = (netExpectedProfit * share) / 100;
        setAirControlProfitAmount(amount);
    }, [netExpectedProfit, airControlShare]);

    // Calculate Amco Profit Amount
    useEffect(() => {
        const share = parseFloat(amcoShare) || 0;
        const amount = (netExpectedProfit * share) / 100;
        setAmcoProfitAmount(amount);
    }, [netExpectedProfit, amcoShare]);

    const handleQuantityChange = (shelterTypeId, value) => {
        setShelterQuantities(prev => ({
            ...prev,
            [shelterTypeId]: value
        }));
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
                                            <td key={type.id} className="text-center text-xs text-slate-700 px-3 py-2 border border-slate-200">
                                                -
                                            </td>
                                        ))}
                                        <td className="px-3 py-2 border border-slate-200 bg-slate-50">
                                            <Input
                                                type="number"
                                                placeholder="0.00"
                                                value={warrantyProvision}
                                                onChange={(e) => setWarrantyProvision(e.target.value)}
                                                className="text-center h-8 text-sm w-full font-bold"
                                            />
                                        </td>
                                    </tr>

                                    <tr className="bg-green-50">
                                        <td className="text-xs font-semibold text-slate-900 px-3 py-2 border border-slate-200 sticky left-0 bg-green-50 z-10">
                                            Net Expected Profit
                                        </td>
                                        {shelterTypes.map(type => (
                                            <td key={type.id} className="text-center text-xs text-slate-700 px-3 py-2 border border-slate-200">
                                                -
                                            </td>
                                        ))}
                                        <td className="text-center text-sm font-bold text-slate-900 px-3 py-2 border border-slate-200 bg-green-100">
                                            €{netExpectedProfit.toFixed(2)}
                                        </td>
                                    </tr>

                                    <tr className="bg-amber-50">
                                        <td className="text-xs font-semibold text-slate-900 px-3 py-2 border border-slate-200 sticky left-0 bg-amber-50 z-10">
                                            Profit Margin (%)
                                        </td>
                                        {shelterTypes.map(type => (
                                            <td key={type.id} className="text-center text-xs text-slate-700 px-3 py-2 border border-slate-200">
                                                -
                                            </td>
                                        ))}
                                        <td className="text-center text-sm font-bold text-slate-900 px-3 py-2 border border-slate-200 bg-amber-100">
                                            {profitMargin.toFixed(2)}%
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
                                            <td key={type.id} className="text-center text-xs text-slate-700 px-3 py-2 border border-slate-200">
                                                -
                                            </td>
                                        ))}
                                        <td className="px-3 py-2 border border-slate-200 bg-slate-50">
                                            <Input
                                                type="number"
                                                placeholder="0.00"
                                                value={airControlShare}
                                                onChange={(e) => setAirControlShare(e.target.value)}
                                                className="text-center h-8 text-sm w-full font-bold"
                                            />
                                        </td>
                                    </tr>

                                    <tr className="bg-blue-50">
                                        <td className="text-xs font-semibold text-slate-900 px-3 py-2 border border-slate-200 sticky left-0 bg-blue-50 z-10">
                                            Air Control Profit Amount
                                        </td>
                                        {shelterTypes.map(type => (
                                            <td key={type.id} className="text-center text-xs text-slate-700 px-3 py-2 border border-slate-200">
                                                -
                                            </td>
                                        ))}
                                        <td className="text-center text-sm font-bold text-blue-600 px-3 py-2 border border-slate-200 bg-blue-100">
                                            €{airControlProfitAmount.toFixed(2)}
                                        </td>
                                    </tr>

                                    <tr className="bg-white">
                                        <td className="text-xs font-medium text-slate-700 px-3 py-2 border border-slate-200 sticky left-0 bg-white z-10">
                                            Amco Share (%)
                                        </td>
                                        {shelterTypes.map(type => (
                                            <td key={type.id} className="text-center text-xs text-slate-700 px-3 py-2 border border-slate-200">
                                                -
                                            </td>
                                        ))}
                                        <td className="px-3 py-2 border border-slate-200 bg-slate-50">
                                            <Input
                                                type="number"
                                                placeholder="0.00"
                                                value={amcoShare}
                                                onChange={(e) => setAmcoShare(e.target.value)}
                                                className="text-center h-8 text-sm w-full font-bold"
                                            />
                                        </td>
                                    </tr>

                                    <tr className="bg-purple-50">
                                        <td className="text-xs font-semibold text-slate-900 px-3 py-2 border border-slate-200 sticky left-0 bg-purple-50 z-10">
                                            Amco Profit Amount
                                        </td>
                                        {shelterTypes.map(type => (
                                            <td key={type.id} className="text-center text-xs text-slate-700 px-3 py-2 border border-slate-200">
                                                -
                                            </td>
                                        ))}
                                        <td className="text-center text-sm font-bold text-purple-600 px-3 py-2 border border-slate-200 bg-purple-100">
                                            €{amcoProfitAmount.toFixed(2)}
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