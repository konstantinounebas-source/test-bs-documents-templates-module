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
    
    // Section A - Financial Results
    const [totalContractIncome, setTotalContractIncome] = useState(0);
    const [totalCostBreakdown, setTotalCostBreakdown] = useState(0);
    const [grossBalance, setGrossBalance] = useState(0);
    const [warrantyProvision, setWarrantyProvision] = useState('');
    const [netExpectedProfit, setNetExpectedProfit] = useState(0);
    const [profitMargin, setProfitMargin] = useState(0);
    
    // Section B - Profit Distribution
    const [shelterQuantities, setShelterQuantities] = useState({});
    const [airControlShare, setAirControlShare] = useState('');
    const [airControlProfitAmount, setAirControlProfitAmount] = useState(0);
    const [amcoShare, setAmcoShare] = useState('');
    const [amcoProfitAmount, setAmcoProfitAmount] = useState(0);

    useEffect(() => {
        if (!accessLoading && hasAccess) {
            loadData();
        }
    }, [accessLoading, hasAccess]);

    const loadData = async () => {
        try {
            const types = await base44.entities.ShelterType.list();
            setShelterTypes(types);
            
            // Initialize quantities for each shelter type
            const initialQuantities = {};
            types.forEach(type => {
                initialQuantities[type.id] = '';
            });
            setShelterQuantities(initialQuantities);
            
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
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">JV Financial Results</h1>
                        <p className="text-slate-600 mt-1">Consolidated financial results and profit distribution</p>
                    </div>
                    <Button className="flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Export PDF (A4 Landscape)
                    </Button>
                </div>

                {/* SECTION A — Financial Results */}
                <Card>
                    <CardHeader>
                        <CardTitle>SECTION A — Financial Results</CardTitle>
                        <CardDescription>Consolidated income, costs, and profit calculations</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Total Contract Income */}
                        <div className="grid grid-cols-2 gap-4 items-center bg-slate-50 p-4 rounded-lg">
                            <label className="text-sm font-medium text-slate-700">Total Contract Income</label>
                            <Input
                                type="number"
                                placeholder="0.00"
                                value={totalContractIncome}
                                onChange={(e) => setTotalContractIncome(parseFloat(e.target.value) || 0)}
                                className="text-right"
                            />
                        </div>

                        {/* Total Cost Breakdown */}
                        <div className="grid grid-cols-2 gap-4 items-center bg-slate-50 p-4 rounded-lg">
                            <label className="text-sm font-medium text-slate-700">Total Cost Breakdown</label>
                            <Input
                                type="number"
                                placeholder="0.00"
                                value={totalCostBreakdown}
                                onChange={(e) => setTotalCostBreakdown(parseFloat(e.target.value) || 0)}
                                className="text-right"
                            />
                        </div>

                        {/* Gross Balance (Calculated) */}
                        <div className="grid grid-cols-2 gap-4 items-center bg-slate-50 p-4 rounded-lg">
                            <label className="text-sm font-semibold text-slate-900">Gross Balance</label>
                            <div className="text-right text-lg font-bold text-slate-900">
                                €{grossBalance.toFixed(2)}
                            </div>
                        </div>

                        {/* Warranty Provision */}
                        <div className="grid grid-cols-2 gap-4 items-center bg-slate-50 p-4 rounded-lg">
                            <label className="text-sm font-medium text-slate-700">Warranty Provision</label>
                            <Input
                                type="number"
                                placeholder="0.00"
                                value={warrantyProvision}
                                onChange={(e) => setWarrantyProvision(e.target.value)}
                                className="text-right"
                            />
                        </div>

                        {/* Net Expected Profit (Calculated) */}
                        <div className="grid grid-cols-2 gap-4 items-center bg-slate-50 p-4 rounded-lg">
                            <label className="text-sm font-semibold text-slate-900">Net Expected Profit</label>
                            <div className="text-right text-lg font-bold text-slate-900">
                                €{netExpectedProfit.toFixed(2)}
                            </div>
                        </div>

                        {/* Profit Margin (Calculated) */}
                        <div className="grid grid-cols-2 gap-4 items-center bg-slate-50 p-4 rounded-lg">
                            <label className="text-sm font-semibold text-slate-900">Profit Margin (%)</label>
                            <div className="text-right text-lg font-bold text-slate-900">
                                {profitMargin.toFixed(2)}%
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* SECTION B — Profit Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle>SECTION B — Profit Distribution</CardTitle>
                        <CardDescription>Quantity allocation and profit sharing</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Quantity per Shelter Type - Table Format */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-900 mb-4">
                                Quantity per Shelter Type & Version
                            </label>
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-slate-100">
                                        <tr>
                                            <th className="text-left text-sm font-semibold text-slate-700 p-3 border-b border-slate-200">
                                                Shelter Type
                                            </th>
                                            <th className="text-right text-sm font-semibold text-slate-700 p-3 border-b border-slate-200">
                                                Quantity
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {shelterTypes.map((type, index) => (
                                            <tr key={type.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                                <td className="text-sm text-slate-700 p-3 border-b border-slate-200">
                                                    {type.name}
                                                </td>
                                                <td className="p-3 border-b border-slate-200">
                                                    <Input
                                                        type="number"
                                                        placeholder="0"
                                                        value={shelterQuantities[type.id] || ''}
                                                        onChange={(e) => handleQuantityChange(type.id, e.target.value)}
                                                        className="text-right"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Air Control Share */}
                        <div className="border-t border-slate-200 pt-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4 items-center bg-slate-50 p-4 rounded-lg">
                                <label className="text-sm font-medium text-slate-700">Air Control Share (%)</label>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={airControlShare}
                                    onChange={(e) => setAirControlShare(e.target.value)}
                                    className="text-right"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4 items-center bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <label className="text-sm font-semibold text-slate-900">Air Control Profit Amount</label>
                                <div className="text-right text-lg font-bold text-blue-600">
                                    €{airControlProfitAmount.toFixed(2)}
                                </div>
                            </div>
                        </div>

                        {/* Amco Share */}
                        <div className="border-t border-slate-200 pt-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4 items-center bg-slate-50 p-4 rounded-lg">
                                <label className="text-sm font-medium text-slate-700">Amco Share (%)</label>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={amcoShare}
                                    onChange={(e) => setAmcoShare(e.target.value)}
                                    className="text-right"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4 items-center bg-purple-50 p-4 rounded-lg border border-purple-200">
                                <label className="text-sm font-semibold text-slate-900">Amco Profit Amount</label>
                                <div className="text-right text-lg font-bold text-purple-600">
                                    €{amcoProfitAmount.toFixed(2)}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}