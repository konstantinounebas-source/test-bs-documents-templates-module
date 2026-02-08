import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from 'lucide-react';
import { usePageAccess } from "@/components/lib/usePageAccess";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function JVFinancialResults() {
    const { hasAccess, isLoading: accessLoading } = usePageAccess('JVFinancialResults');
    const [shelterInstances, setShelterInstances] = useState([]);
    const [shelterTypes, setShelterTypes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const tableRef = useRef(null);
    
    // Single source of truth per shelter instance
    const [dataByInstance, setDataByInstance] = useState({});

    // Formatting helpers
    const formatCurrency = (value) => {
        const num = parseFloat(value) || 0;
        return `€${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatPercentage = (value) => {
        const num = parseFloat(value) || 0;
        return `${num.toFixed(1)}%`;
    };

    const exportToPDF = async () => {
        if (!tableRef.current) return;
        
        setIsExporting(true);
        try {
            const canvas = await html2canvas(tableRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });
            
            // A4 Landscape dimensions in mm
            const pdf = new jsPDF('landscape', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            const imgWidth = pageWidth - 20; // 10mm margin on each side
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
            
            pdf.save('JV_Financial_Results.pdf');
        } catch (error) {
            console.error('Failed to export PDF:', error);
        } finally {
            setIsExporting(false);
        }
    };

    useEffect(() => {
        if (!accessLoading && hasAccess) {
            loadData();
        }
    }, [accessLoading, hasAccess]);



    const loadData = async () => {
        try {
            const [instances, types, allFinancialData, allCalculationResults] = await Promise.all([
                base44.entities.ShelterInstance.list(),
                base44.entities.BusStopType.list(),
                base44.entities.ShelterFinancialData.list(),
                base44.entities.ShelterFinancialResults.list()
            ]);
            
            setShelterInstances(instances.reverse());
            setShelterTypes(types);

            // Normalize financial data by shelter_instance_id
            const normalized = {};
            instances.forEach(instance => {
                const existing = allFinancialData.find(d => d.shelter_instance_id === instance.id);
                
                // Get latest calculation result for this shelter instance
                const latestCalculation = allCalculationResults
                    .filter(r => r.shelter_instance_id === instance.id)
                    .sort((a, b) => new Date(b.calculation_date) - new Date(a.calculation_date))[0];

                normalized[instance.id] = {
                    shelter_instance_id: instance.id,
                    shelter_type_id: instance.shelter_type_id,
                    quantity: latestCalculation?.quantity || 1,
                    manual_contract_income: latestCalculation?.total_contract_income || 0,
                    manual_total_cost: latestCalculation?.total_cost_breakdown || 0,
                    warranty_provision: latestCalculation?.warranty_provision || 0,
                    air_control_share_percent: latestCalculation?.air_control_share_percent || 0,
                    amco_share_percent: latestCalculation?.amco_share_percent || 0,
                    id: existing?.id
                };
            });

            setDataByInstance(normalized);

        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setIsLoading(false);
        }
    };



    const updateInstanceData = async (instanceId, updates) => {
        setDataByInstance(prev => ({
            ...prev,
            [instanceId]: { ...prev[instanceId], ...updates }
        }));

        // Auto-save to ShelterFinancialResults
        const instance = shelterInstances.find(i => i.id === instanceId);
        if (!instance) return;

        // Recalculate and save full results
        const data = { ...dataByInstance[instanceId], ...updates };
        const quantity = data.quantity || 1;
        const contractIncome = parseFloat(data.manual_contract_income) || 0;
        const totalCost = parseFloat(data.manual_total_cost) || 0;

        const grossBalance = contractIncome - totalCost;
        const warrantyProvision = data.warranty_provision || 0;
        const netProfit = (grossBalance - warrantyProvision) * quantity;
        const totalCostValue = totalCost * quantity;
        const profitMargin = totalCostValue > 0 ? ((netProfit - totalCostValue) / totalCostValue) * 100 : 0;

        const airControlShare = data.air_control_share_percent || 0;
        const amcoShare = data.amco_share_percent || 0;
        const airControlProfit = (netProfit * airControlShare) / 100;
        const amcoProfit = (netProfit * amcoShare) / 100;

        const existingResults = await base44.entities.ShelterFinancialResults.filter({
            shelter_instance_id: instanceId
        });

        const resultData = {
            shelter_instance_id: instanceId,
            calculation_date: new Date().toISOString(),
            quantity,
            total_contract_income: contractIncome,
            bom_cost: 0,
            non_bom_cost: 0,
            waste_allowance_cost: 0,
            accrued_cost: 0,
            total_cost_breakdown: totalCost,
            gross_balance: grossBalance * quantity,
            warranty_provision: warrantyProvision,
            warranty_provision_total: warrantyProvision * quantity,
            net_expected_profit: netProfit,
            profit_margin_percent: profitMargin,
            air_control_share_percent: airControlShare,
            air_control_profit_amount: airControlProfit,
            amco_share_percent: amcoShare,
            amco_profit_amount: amcoProfit
        };

        if (existingResults.length > 0) {
            await base44.entities.ShelterFinancialResults.update(existingResults[0].id, resultData);
        } else {
            await base44.entities.ShelterFinancialResults.create(resultData);
        }
    };

    const calculateMetrics = (instanceId) => {
        const data = dataByInstance[instanceId];
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
                        <p className="text-slate-600 mt-1">Consolidated financial results and profit distribution per shelter instance</p>
                    </div>
                    <Button onClick={exportToPDF} disabled={isExporting} className="flex items-center gap-2">
                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Export PDF (A4 Landscape)
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Financial Results Table</CardTitle>
                        <CardDescription>All shelter instances in columns with financial metrics</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto" ref={tableRef}>
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-slate-100">
                                        <th className="text-left text-xs font-semibold text-slate-700 px-3 py-2 border border-slate-200 sticky left-0 bg-slate-100 z-10">
                                            Metric
                                        </th>
                                        {shelterInstances.map(instance => (
                                            <th key={instance.id} className="text-center text-xs font-semibold text-slate-700 px-3 py-2 border border-slate-200 min-w-[120px]">
                                                {instance.name}
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
                                        {shelterInstances.map(instance => (
                                            <td key={`quantity-${instance.id}`} className="px-3 py-2 border border-slate-200">
                                                <Input
                                                    type="number"
                                                    placeholder="1"
                                                    value={dataByInstance[instance.id]?.quantity ?? 1}
                                                    onChange={(e) => updateInstanceData(instance.id, { quantity: parseFloat(e.target.value) || 1 })}
                                                    className="text-center h-8 text-sm w-full"
                                                />
                                            </td>
                                        ))}
                                        <td className="text-center text-xs font-bold text-slate-900 px-3 py-2 border border-slate-200 bg-slate-50">
                                            {Object.values(dataByInstance).reduce((sum, data) => sum + (data?.quantity || 1), 0)}
                                        </td>
                                    </tr>

                                    {/* Section A Metrics */}
                                    <tr className="bg-slate-50">
                                        <td colSpan={shelterInstances.length + 2} className="text-xs font-bold text-slate-900 px-3 py-2 border border-slate-200">
                                            SECTION A — Financial Results
                                        </td>
                                    </tr>

                                    <tr className="bg-white">
                                        <td className="text-xs font-medium text-slate-700 px-3 py-2 border border-slate-200 sticky left-0 bg-white z-10">
                                            Total Contract Income
                                        </td>
                                        {shelterInstances.map(instance => (
                                            <td key={`income-${instance.id}`} className="px-3 py-2 border border-slate-200">
                                                <div className="text-center text-xs font-medium text-slate-900">
                                                    {formatCurrency(dataByInstance[instance.id]?.manual_contract_income || 0)}
                                                </div>
                                            </td>
                                        ))}
                                        <td className="text-center text-xs font-bold text-slate-900 px-3 py-2 border border-slate-200 bg-slate-50">
                                            {formatCurrency(shelterInstances.reduce((sum, instance) => sum + (calculateMetrics(instance.id)?.contractIncome || 0), 0))}
                                        </td>
                                    </tr>

                                    <tr className="bg-white">
                                        <td className="text-xs font-medium text-slate-700 px-3 py-2 border border-slate-200 sticky left-0 bg-white z-10">
                                            Total Cost Breakdown
                                        </td>
                                        {shelterInstances.map(instance => (
                                            <td key={`cost-${instance.id}`} className="px-3 py-2 border border-slate-200">
                                                <div className="text-center text-xs font-medium text-slate-900">
                                                    {formatCurrency(dataByInstance[instance.id]?.manual_total_cost || 0)}
                                                </div>
                                            </td>
                                        ))}
                                        <td className="text-center text-xs font-bold text-slate-900 px-3 py-2 border border-slate-200 bg-slate-50">
                                            {formatCurrency(shelterInstances.reduce((sum, instance) => sum + (calculateMetrics(instance.id)?.totalCost || 0), 0))}
                                        </td>
                                    </tr>

                                    <tr className="bg-blue-50">
                                        <td className="text-xs font-semibold text-slate-900 px-3 py-2 border border-slate-200 sticky left-0 bg-blue-50 z-10">
                                            Gross Balance
                                        </td>
                                        {shelterInstances.map(instance => {
                                            const metrics = calculateMetrics(instance.id);
                                            return (
                                                <td key={`gross-${instance.id}`} className="text-center text-xs font-medium text-slate-900 px-3 py-2 border border-slate-200">
                                                    {formatCurrency(metrics?.grossBalance || 0)}
                                                </td>
                                            );
                                        })}
                                        <td className="text-center text-sm font-bold text-slate-900 px-3 py-2 border border-slate-200 bg-blue-100">
                                            {formatCurrency(shelterInstances.reduce((sum, instance) => sum + (calculateMetrics(instance.id)?.grossBalance || 0), 0))}
                                        </td>
                                    </tr>

                                    <tr className="bg-white">
                                        <td className="text-xs font-medium text-slate-700 px-3 py-2 border border-slate-200 sticky left-0 bg-white z-10">
                                            Warranty Provision
                                        </td>
                                        {shelterInstances.map(instance => (
                                            <td key={`warranty-${instance.id}`} className="px-3 py-2 border border-slate-200">
                                                <Input
                                                    type="number"
                                                    placeholder="0.00"
                                                    value={dataByInstance[instance.id]?.warranty_provision ?? ''}
                                                    onChange={(e) => updateInstanceData(instance.id, { warranty_provision: parseFloat(e.target.value) || 0 })}
                                                    className="text-center h-8 text-sm w-full"
                                                />
                                            </td>
                                        ))}
                                        <td className="text-center text-xs font-bold text-slate-900 px-3 py-2 border border-slate-200 bg-slate-50">
                                            {formatCurrency(shelterInstances.reduce((sum, instance) => {
                                                const data = dataByInstance[instance.id];
                                                const warranty = data?.warranty_provision || 0;
                                                const quantity = data?.quantity || 1;
                                                return sum + (warranty * quantity);
                                            }, 0))}
                                        </td>
                                    </tr>

                                    <tr className="bg-green-50">
                                        <td className="text-xs font-semibold text-slate-900 px-3 py-2 border border-slate-200 sticky left-0 bg-green-50 z-10">
                                            Net Expected Profit
                                        </td>
                                        {shelterInstances.map(instance => {
                                            const metrics = calculateMetrics(instance.id);
                                            return (
                                                <td key={`netprofit-${instance.id}`} className="text-center text-xs font-medium text-slate-900 px-3 py-2 border border-slate-200">
                                                    {formatCurrency(metrics?.netProfit || 0)}
                                                </td>
                                            );
                                        })}
                                        <td className="text-center text-sm font-bold text-slate-900 px-3 py-2 border border-slate-200 bg-green-100">
                                            {formatCurrency(shelterInstances.reduce((sum, instance) => sum + (calculateMetrics(instance.id)?.netProfit || 0), 0))}
                                        </td>
                                    </tr>

                                    <tr className="bg-amber-50">
                                        <td className="text-xs font-semibold text-slate-900 px-3 py-2 border border-slate-200 sticky left-0 bg-amber-50 z-10">
                                            Profit Margin (%)
                                        </td>
                                        {shelterInstances.map(instance => {
                                            const metrics = calculateMetrics(instance.id);
                                            return (
                                                <td key={`margin-${instance.id}`} className="text-center text-xs font-medium text-slate-900 px-3 py-2 border border-slate-200">
                                                    {formatPercentage(metrics?.profitMargin || 0)}
                                                </td>
                                            );
                                        })}
                                        <td className="text-center text-sm font-bold text-slate-900 px-3 py-2 border border-slate-200 bg-amber-100">
                                            {(() => {
                                                const totalCost = shelterInstances.reduce((sum, instance) => sum + (calculateMetrics(instance.id)?.totalCost || 0), 0);
                                                const totalNetProfit = shelterInstances.reduce((sum, instance) => sum + (calculateMetrics(instance.id)?.netProfit || 0), 0);
                                                return formatPercentage(totalCost > 0 ? (((totalNetProfit - totalCost) / totalCost) * 100) : 0);
                                            })()}
                                        </td>
                                    </tr>

                                    {/* Section B Metrics */}
                                    <tr className="bg-slate-50">
                                        <td colSpan={shelterInstances.length + 2} className="text-xs font-bold text-slate-900 px-3 py-2 border border-slate-200">
                                            SECTION B — Profit Distribution
                                        </td>
                                    </tr>

                                    <tr className="bg-white">
                                        <td className="text-xs font-medium text-slate-700 px-3 py-2 border border-slate-200 sticky left-0 bg-white z-10">
                                            Air Control Share (%)
                                        </td>
                                        {shelterInstances.map(instance => (
                                            <td key={`air-${instance.id}`} className="px-3 py-2 border border-slate-200">
                                                <Input
                                                    type="number"
                                                    placeholder="0"
                                                    value={dataByInstance[instance.id]?.air_control_share_percent ?? ''}
                                                    onChange={(e) => updateInstanceData(instance.id, { air_control_share_percent: parseFloat(e.target.value) || 0 })}
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
                                        {shelterInstances.map(instance => {
                                            const metrics = calculateMetrics(instance.id);
                                            return (
                                                <td key={`airprofit-${instance.id}`} className="text-center text-xs font-medium text-blue-600 px-3 py-2 border border-slate-200">
                                                    {formatCurrency(metrics?.airControlProfit || 0)}
                                                </td>
                                            );
                                        })}
                                        <td className="text-center text-sm font-bold text-blue-600 px-3 py-2 border border-slate-200 bg-blue-100">
                                            {formatCurrency(shelterInstances.reduce((sum, instance) => sum + (calculateMetrics(instance.id)?.airControlProfit || 0), 0))}
                                        </td>
                                    </tr>

                                    <tr className="bg-white">
                                        <td className="text-xs font-medium text-slate-700 px-3 py-2 border border-slate-200 sticky left-0 bg-white z-10">
                                            Amco Share (%)
                                        </td>
                                        {shelterInstances.map(instance => (
                                            <td key={`amco-${instance.id}`} className="px-3 py-2 border border-slate-200">
                                                <Input
                                                    type="number"
                                                    placeholder="0"
                                                    value={dataByInstance[instance.id]?.amco_share_percent ?? ''}
                                                    onChange={(e) => updateInstanceData(instance.id, { amco_share_percent: parseFloat(e.target.value) || 0 })}
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
                                        {shelterInstances.map(instance => {
                                            const metrics = calculateMetrics(instance.id);
                                            return (
                                                <td key={`amcoprofit-${instance.id}`} className="text-center text-xs font-medium text-purple-600 px-3 py-2 border border-slate-200">
                                                    {formatCurrency(metrics?.amcoProfit || 0)}
                                                </td>
                                            );
                                        })}
                                        <td className="text-center text-sm font-bold text-purple-600 px-3 py-2 border border-slate-200 bg-purple-100">
                                            {formatCurrency(shelterInstances.reduce((sum, instance) => sum + (calculateMetrics(instance.id)?.amcoProfit || 0), 0))}
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