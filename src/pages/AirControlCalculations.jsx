import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from 'lucide-react';
import { usePageAccess } from "@/components/lib/usePageAccess";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

export default function AirControlCalculations() {
    const { hasAccess, isLoading: accessLoading } = usePageAccess('AirControlCalculations');
    const [shelterInstances, setShelterInstances] = useState([]);
    const [shelterTypes, setShelterTypes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [dataByInstance, setDataByInstance] = useState({});
    const tableRef = useRef(null);

    const formatCurrency = (value) => {
        const num = parseFloat(value) || 0;
        return `€${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatPercentage = (value) => {
        const num = parseFloat(value) || 0;
        return `${num.toFixed(1)}%`;
    };

    useEffect(() => {
        if (!accessLoading && hasAccess) {
            loadData();
        }
    }, [accessLoading, hasAccess]);

    const loadData = async () => {
        try {
            const [instances, types, allFinancialData, allResults] = await Promise.all([
                base44.entities.ShelterInstance.list(),
                base44.entities.BusStopType.list(),
                base44.entities.ShelterFinancialData.list(),
                base44.entities.ShelterFinancialResults.list()
            ]);

            const activeInstances = instances.filter(inst => inst.active !== false);
            setShelterInstances(activeInstances.reverse());
            setShelterTypes(types);

            const normalized = {};
            activeInstances.forEach(instance => {
                const instanceFinancialDataRecords = allFinancialData
                    .filter(d => String(d.shelter_instance_id) === String(instance.id))
                    .sort((a, b) => new Date(b.updated_date).getTime() - new Date(a.updated_date).getTime());
                const financialData = instanceFinancialDataRecords.length > 0 ? instanceFinancialDataRecords[0] : null;
                const resultsData = allResults.find(r => String(r.shelter_instance_id) === String(instance.id));

                const contractIncome = financialData?.total_contract_income || 0;
                const totalCost = financialData?.total_cost_breakdown || 0;
                const quantity = resultsData?.quantity || 1;
                const warrantyProvision = resultsData?.warranty_provision || 0;
                const airControlSharePercent = resultsData?.air_control_share_percent || 0;

                const grossBalance = (contractIncome - totalCost) * quantity;
                const warranty = warrantyProvision * quantity;
                const netProfit = grossBalance - warranty;
                const airControlProfit = (netProfit * airControlSharePercent) / 100;

                normalized[instance.id] = {
                    shelter_instance_id: instance.id,
                    shelter_type_id: instance.shelter_type_id,
                    quantity,
                    contract_income: contractIncome,
                    total_cost: totalCost,
                    warranty_provision: warrantyProvision,
                    air_control_share_percent: airControlSharePercent,
                    gross_balance: grossBalance,
                    warranty_total: warranty,
                    net_profit: netProfit,
                    air_control_profit: airControlProfit,
                };
            });

            setDataByInstance(normalized);
        } catch (error) {
            console.error('Failed to load data:', error);
            toast.error('Failed to load data');
        } finally {
            setIsLoading(false);
        }
    };

    const exportToPDF = async () => {
        if (!tableRef.current) return;
        setIsExporting(true);
        try {
            const canvas = await html2canvas(tableRef.current, {
                scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff'
            });
            const pdf = new jsPDF('landscape', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Air Control Calculations', 10, 15);
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 10, 22);
            const imgWidth = pageWidth - 20;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 30, imgWidth, imgHeight);
            pdf.save('AirControl_Calculations.pdf');
        } catch (error) {
            console.error('Failed to export PDF:', error);
            toast.error('Export failed');
        } finally {
            setIsExporting(false);
        }
    };

    if (accessLoading || isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (!hasAccess) return null;

    const totalAirControlProfit = shelterInstances.reduce((sum, inst) => sum + (dataByInstance[inst.id]?.air_control_profit || 0), 0);
    const totalNetProfit = shelterInstances.reduce((sum, inst) => sum + (dataByInstance[inst.id]?.net_profit || 0), 0);
    const totalContractIncome = shelterInstances.reduce((sum, inst) => {
        const d = dataByInstance[inst.id];
        return sum + ((d?.contract_income || 0) * (d?.quantity || 1));
    }, 0);
    const totalCostAll = shelterInstances.reduce((sum, inst) => {
        const d = dataByInstance[inst.id];
        return sum + ((d?.total_cost || 0) * (d?.quantity || 1));
    }, 0);

    const rows = [
        { key: 'quantity', label: 'Quantity', format: (v) => v, bg: 'bg-white' },
        { key: 'contract_income', label: 'Contract Income (per unit)', format: formatCurrency, bg: 'bg-white' },
        { key: 'total_cost', label: 'Total Cost (per unit)', format: formatCurrency, bg: 'bg-white' },
        { key: 'gross_balance', label: 'Gross Balance', format: formatCurrency, bg: 'bg-blue-50', bold: true },
        { key: 'warranty_total', label: 'Warranty Provision', format: formatCurrency, bg: 'bg-white' },
        { key: 'net_profit', label: 'Net Expected Profit', format: formatCurrency, bg: 'bg-green-50', bold: true },
        { key: 'air_control_share_percent', label: 'Air Control Share (%)', format: formatPercentage, bg: 'bg-white' },
        { key: 'air_control_profit', label: 'Air Control Profit Amount', format: formatCurrency, bg: 'bg-sky-50', bold: true, highlight: true },
    ];

    const totals = {
        quantity: shelterInstances.reduce((s, i) => s + (dataByInstance[i.id]?.quantity || 1), 0),
        contract_income: totalContractIncome,
        total_cost: totalCostAll,
        gross_balance: shelterInstances.reduce((s, i) => s + (dataByInstance[i.id]?.gross_balance || 0), 0),
        warranty_total: shelterInstances.reduce((s, i) => s + (dataByInstance[i.id]?.warranty_total || 0), 0),
        net_profit: totalNetProfit,
        air_control_share_percent: null,
        air_control_profit: totalAirControlProfit,
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="mx-auto space-y-6" style={{ maxWidth: '100%' }}>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Air Control Calculations</h1>
                        <p className="text-slate-600 mt-1">Air Control profit share per shelter instance</p>
                    </div>
                    <Button onClick={exportToPDF} disabled={isExporting} className="flex items-center gap-2">
                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Export PDF
                    </Button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="border-sky-200 bg-sky-50">
                        <CardContent className="pt-5">
                            <p className="text-sm text-sky-700 font-medium">Total Air Control Profit</p>
                            <p className="text-2xl font-bold text-sky-800 mt-1">{formatCurrency(totalAirControlProfit)}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-green-200 bg-green-50">
                        <CardContent className="pt-5">
                            <p className="text-sm text-green-700 font-medium">Total Net Profit (JV)</p>
                            <p className="text-2xl font-bold text-green-800 mt-1">{formatCurrency(totalNetProfit)}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-200 bg-white">
                        <CardContent className="pt-5">
                            <p className="text-sm text-slate-600 font-medium">Air Control Share of JV Profit</p>
                            <p className="text-2xl font-bold text-slate-800 mt-1">
                                {formatPercentage(totalNetProfit !== 0 ? (totalAirControlProfit / totalNetProfit) * 100 : 0)}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Air Control Calculations Table</CardTitle>
                        <CardDescription>Breakdown per shelter instance — Air Control share only</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto" ref={tableRef}>
                            <table className="min-w-full border-collapse" style={{ fontSize: '11px' }}>
                                <thead>
                                    <tr className="bg-slate-100">
                                        <th className="text-left font-semibold text-slate-700 px-2 py-1.5 border border-slate-200 sticky left-0 bg-slate-100 z-10 min-w-[200px]">
                                            Metric
                                        </th>
                                        {shelterInstances.map(instance => {
                                            const shelterType = shelterTypes.find(t => t.id === instance.shelter_type_id);
                                            return (
                                                <th key={instance.id} className="text-center font-semibold text-slate-700 px-2 py-2 border border-slate-200 min-w-[140px]">
                                                    <div className="truncate" title={instance.name}>{instance.name}</div>
                                                    {shelterType && (
                                                        <div className="text-xs text-slate-500 font-normal">({shelterType.code})</div>
                                                    )}
                                                </th>
                                            );
                                        })}
                                        <th className="text-center font-semibold text-slate-700 px-2 py-1.5 border border-slate-200 bg-slate-200 min-w-[110px]">
                                            TOTAL
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map(row => (
                                        <tr key={row.key} className={row.bg}>
                                            <td className={`font-${row.bold ? 'semibold' : 'medium'} ${row.highlight ? 'text-sky-800' : 'text-slate-700'} px-2 py-1.5 border border-slate-200 sticky left-0 z-10 ${row.bg}`}>
                                                {row.label}
                                            </td>
                                            {shelterInstances.map(instance => {
                                                const val = dataByInstance[instance.id]?.[row.key];
                                                return (
                                                    <td key={instance.id} className={`text-center px-2 py-1.5 border border-slate-200 ${row.highlight ? 'font-bold text-sky-700' : row.bold ? 'font-semibold text-slate-900' : 'text-slate-800'}`}>
                                                        {val === null || val === undefined ? '-' : row.format(val)}
                                                    </td>
                                                );
                                            })}
                                            <td className={`text-center font-bold px-2 py-1.5 border border-slate-200 ${row.highlight ? 'bg-sky-100 text-sky-800' : 'bg-slate-50 text-slate-900'}`}>
                                                {totals[row.key] === null ? '-' : row.format(totals[row.key])}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}