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
    
    // Single source of truth per shelter type
    const [dataByType, setDataByType] = useState({});

    useEffect(() => {
        if (!accessLoading && hasAccess) {
            loadData();
        }
    }, [accessLoading, hasAccess]);



    const loadData = async () => {
        try {
            const [types, allFinancialData, allCalculationResults] = await Promise.all([
                base44.entities.BusStopType.list(),
                base44.entities.ShelterFinancialData.list(),
                base44.entities.ShelterFinancialResults.list()
            ]);
            
            setShelterTypes(types.reverse());

            // Normalize financial data by shelter_type_id
            const normalized = {};
            types.forEach(type => {
                const existing = allFinancialData.find(d => d.shelter_type_id === type.id);
                
                // Get latest calculation result for this shelter type
                const latestCalculation = allCalculationResults
                    .filter(r => r.shelter_type_id === type.id)
                    .sort((a, b) => new Date(b.calculation_date) - new Date(a.calculation_date))[0];

                normalized[type.id] = {
                    shelter_type_id: type.id,
                    quantity: 1,
                    manual_contract_income: latestCalculation?.total_contract_income || existing?.manual_contract_income || 0,
                    manual_total_cost: latestCalculation?.total_cost_breakdown || existing?.manual_total_cost || 0,
                    warranty_provision: existing?.warranty_provision || 0,
                    air_control_share_percent: existing?.air_control_share_percent || 0,
                    amco_share_percent: existing?.amco_share_percent || 0,
                    id: existing?.id
                };
            });

            setDataByType(normalized);

        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setIsLoading(false);
        }
    };



    const updateTypeData = async (shelterTypeId, updates) => {
        setDataByType(prev => ({
            ...prev,
            [shelterTypeId]: { ...prev[shelterTypeId], ...updates }
        }));

        // Auto-save to database (upsert)
        const data = dataByType[shelterTypeId];
        if (data?.id) {
            await base44.entities.ShelterFinancialData.update(data.id, updates);
        } else {
            const newData = await base44.entities.ShelterFinancialData.create({
                shelter_type_id: shelterTypeId,
                ...updates
            });
            setDataByType(prev => ({
                ...prev,
                [shelterTypeId]: { ...prev[shelterTypeId], id: newData.id }
            }));
        }
    };

    const calculateMetrics = (typeId) => {
        const data = dataByType[typeId];
        if (!data) return null;

        const quantity = data.quantity || 1;
        const contractIncome = parseFloat(data.manual_contract_income) || 0;
        const totalCost = parseFloat(data.manual_total_cost) || 0;

        const grossBalance = (contractIncome - totalCost) * quantity;
        const warranty = (data.warranty_provision || 0) * quantity;
        const netProfit = grossBalance - warranty;
        const totalCostValue = totalCost * quantity;
        const profitMargin = totalCostValue > 0 ? ((netProfit - totalCostValue) / totalCostValue) * 100 : 0;

        const airControlShare = data.air_control_share_percent || 0;
        const amcoShare = data.amco_share_percent || 0;
        const airControlProfit = (netProfit * airControlShare) / 100;
        const amcoProfit = (netProfit * amcoShare) / 100;

        return {
            contractIncome: contractIncome * quantity,
            totalCost: totalCostValue,
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
                                            <td key={`quantity-${type.id}`} className="px-3 py-2 border border-slate-200">
                                                <Input
                                                    type="number"
                                                    placeholder="1"
                                                    value={dataByType[type.id]?.quantity ?? 1}
                                                    onChange={(e) => updateTypeData(type.id, { quantity: parseFloat(e.target.value) || 1 })}
                                                    className="text-center h-8 text-sm w-full"
                                                />
                                            </td>
                                        ))}
                                        <td className="text-center text-xs font-bold text-slate-900 px-3 py-2 border border-slate-200 bg-slate-50">
                                            {Object.values(dataByType).reduce((sum, data) => sum + (data?.quantity || 1), 0)}
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
                                        {shelterTypes.map(type => (
                                            <td key={`income-${type.id}`} className="px-3 py-2 border border-slate-200">
                                                <Input
                                                    type="number"
                                                    placeholder="0.00"
                                                    value={dataByType[type.id]?.manual_contract_income ?? ''}
                                                    onChange={(e) => updateTypeData(type.id, { manual_contract_income: parseFloat(e.target.value) || 0 })}
                                                    className="text-center h-8 text-sm w-full"
                                                />
                                            </td>
                                        ))}
                                        <td className="text-center text-xs font-bold text-slate-900 px-3 py-2 border border-slate-200 bg-slate-50">
                                            €{shelterTypes.reduce((sum, type) => sum + (calculateMetrics(type.id)?.contractIncome || 0), 0).toFixed(2)}
                                        </td>
                                    </tr>

                                    <tr className="bg-white">
                                        <td className="text-xs font-medium text-slate-700 px-3 py-2 border border-slate-200 sticky left-0 bg-white z-10">
                                            Total Cost Breakdown
                                        </td>
                                        {shelterTypes.map(type => (
                                            <td key={`cost-${type.id}`} className="px-3 py-2 border border-slate-200">
                                                <Input
                                                    type="number"
                                                    placeholder="0.00"
                                                    value={dataByType[type.id]?.manual_total_cost ?? ''}
                                                    onChange={(e) => updateTypeData(type.id, { manual_total_cost: parseFloat(e.target.value) || 0 })}
                                                    className="text-center h-8 text-sm w-full"
                                                />
                                            </td>
                                        ))}
                                        <td className="text-center text-xs font-bold text-slate-900 px-3 py-2 border border-slate-200 bg-slate-50">
                                            €{shelterTypes.reduce((sum, type) => sum + (calculateMetrics(type.id)?.totalCost || 0), 0).toFixed(2)}
                                        </td>
                                    </tr>

                                    <tr className="bg-blue-50">
                                        <td className="text-xs font-semibold text-slate-900 px-3 py-2 border border-slate-200 sticky left-0 bg-blue-50 z-10">
                                            Gross Balance
                                        </td>
                                        {shelterTypes.map(type => {
                                            const metrics = calculateMetrics(type.id);
                                            return (
                                                <td key={`gross-${type.id}`} className="text-center text-xs font-medium text-slate-900 px-3 py-2 border border-slate-200">
                                                    €{metrics?.grossBalance.toFixed(2) || '0.00'}
                                                </td>
                                            );
                                        })}
                                        <td className="text-center text-sm font-bold text-slate-900 px-3 py-2 border border-slate-200 bg-blue-100">
                                            €{shelterTypes.reduce((sum, type) => sum + (calculateMetrics(type.id)?.grossBalance || 0), 0).toFixed(2)}
                                        </td>
                                    </tr>

                                    <tr className="bg-white">
                                        <td className="text-xs font-medium text-slate-700 px-3 py-2 border border-slate-200 sticky left-0 bg-white z-10">
                                            Warranty Provision
                                        </td>
                                        {shelterTypes.map(type => (
                                            <td key={`warranty-${type.id}`} className="px-3 py-2 border border-slate-200">
                                                <Input
                                                    type="number"
                                                    placeholder="0.00"
                                                    value={dataByType[type.id]?.warranty_provision ?? ''}
                                                    onChange={(e) => updateTypeData(type.id, { warranty_provision: parseFloat(e.target.value) || 0 })}
                                                    className="text-center h-8 text-sm w-full"
                                                />
                                            </td>
                                        ))}
                                        <td className="text-center text-xs font-bold text-slate-900 px-3 py-2 border border-slate-200 bg-slate-50">
                                            €{shelterTypes.reduce((sum, type) => {
                                                const data = dataByType[type.id];
                                                const warranty = data?.warranty_provision || 0;
                                                const quantity = data?.quantity || 1;
                                                return sum + (warranty * quantity);
                                            }, 0).toFixed(2)}
                                        </td>
                                    </tr>

                                    <tr className="bg-green-50">
                                        <td className="text-xs font-semibold text-slate-900 px-3 py-2 border border-slate-200 sticky left-0 bg-green-50 z-10">
                                            Net Expected Profit
                                        </td>
                                        {shelterTypes.map(type => {
                                            const metrics = calculateMetrics(type.id);
                                            return (
                                                <td key={`netprofit-${type.id}`} className="text-center text-xs font-medium text-slate-900 px-3 py-2 border border-slate-200">
                                                    €{metrics?.netProfit.toFixed(2) || '0.00'}
                                                </td>
                                            );
                                        })}
                                        <td className="text-center text-sm font-bold text-slate-900 px-3 py-2 border border-slate-200 bg-green-100">
                                            €{shelterTypes.reduce((sum, type) => sum + (calculateMetrics(type.id)?.netProfit || 0), 0).toFixed(2)}
                                        </td>
                                    </tr>

                                    <tr className="bg-amber-50">
                                        <td className="text-xs font-semibold text-slate-900 px-3 py-2 border border-slate-200 sticky left-0 bg-amber-50 z-10">
                                            Profit Margin (%)
                                        </td>
                                        {shelterTypes.map(type => {
                                            const metrics = calculateMetrics(type.id);
                                            return (
                                                <td key={`margin-${type.id}`} className="text-center text-xs font-medium text-slate-900 px-3 py-2 border border-slate-200">
                                                    {metrics?.profitMargin.toFixed(2) || '0.00'}%
                                                </td>
                                            );
                                        })}
                                        <td className="text-center text-sm font-bold text-slate-900 px-3 py-2 border border-slate-200 bg-amber-100">
                                            {(() => {
                                                const totalCost = shelterTypes.reduce((sum, type) => sum + (calculateMetrics(type.id)?.totalCost || 0), 0);
                                                const totalNetProfit = shelterTypes.reduce((sum, type) => sum + (calculateMetrics(type.id)?.netProfit || 0), 0);
                                                return totalCost > 0 ? (((totalNetProfit - totalCost) / totalCost) * 100).toFixed(2) : '0.00';
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
                                            <td key={`air-${type.id}`} className="px-3 py-2 border border-slate-200">
                                                <Input
                                                    type="number"
                                                    placeholder="0"
                                                    value={dataByType[type.id]?.air_control_share_percent ?? ''}
                                                    onChange={(e) => updateTypeData(type.id, { air_control_share_percent: parseFloat(e.target.value) || 0 })}
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
                                            const metrics = calculateMetrics(type.id);
                                            return (
                                                <td key={`airprofit-${type.id}`} className="text-center text-xs font-medium text-blue-600 px-3 py-2 border border-slate-200">
                                                    €{metrics?.airControlProfit.toFixed(2) || '0.00'}
                                                </td>
                                            );
                                        })}
                                        <td className="text-center text-sm font-bold text-blue-600 px-3 py-2 border border-slate-200 bg-blue-100">
                                            €{shelterTypes.reduce((sum, type) => sum + (calculateMetrics(type.id)?.airControlProfit || 0), 0).toFixed(2)}
                                        </td>
                                    </tr>

                                    <tr className="bg-white">
                                        <td className="text-xs font-medium text-slate-700 px-3 py-2 border border-slate-200 sticky left-0 bg-white z-10">
                                            Amco Share (%)
                                        </td>
                                        {shelterTypes.map(type => (
                                            <td key={`amco-${type.id}`} className="px-3 py-2 border border-slate-200">
                                                <Input
                                                    type="number"
                                                    placeholder="0"
                                                    value={dataByType[type.id]?.amco_share_percent ?? ''}
                                                    onChange={(e) => updateTypeData(type.id, { amco_share_percent: parseFloat(e.target.value) || 0 })}
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
                                            const metrics = calculateMetrics(type.id);
                                            return (
                                                <td key={`amcoprofit-${type.id}`} className="text-center text-xs font-medium text-purple-600 px-3 py-2 border border-slate-200">
                                                    €{metrics?.amcoProfit.toFixed(2) || '0.00'}
                                                </td>
                                            );
                                        })}
                                        <td className="text-center text-sm font-bold text-purple-600 px-3 py-2 border border-slate-200 bg-purple-100">
                                            €{shelterTypes.reduce((sum, type) => sum + (calculateMetrics(type.id)?.amcoProfit || 0), 0).toFixed(2)}
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