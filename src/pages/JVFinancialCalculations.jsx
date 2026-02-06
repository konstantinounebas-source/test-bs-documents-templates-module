import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Loader2 } from 'lucide-react';
import { usePageAccess } from "@/components/lib/usePageAccess";

export default function JVFinancialCalculations() {
    // Check page access first
    const { hasAccess, isLoading: accessLoading } = usePageAccess('JVFinancialCalculations');
    const [selectedShelterType, setSelectedShelterType] = useState(null);
    const [shelterTypes, setShelterTypes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!accessLoading && hasAccess) {
            loadShelterTypes();
        }
    }, [accessLoading, hasAccess]);

    const loadShelterTypes = async () => {
        try {
            const types = await base44.entities.ShelterType.list();
            setShelterTypes(types);
            if (types.length > 0) {
                setSelectedShelterType(types[0].id);
            }
        } catch (error) {
            console.error('Failed to load shelter types:', error);
        } finally {
            setIsLoading(false);
        }
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
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">JV Financial Calculations</h1>
                    <p className="text-slate-600 mt-1">Detailed calculations for income, costs, and profit margins per Shelter Type with full traceability.</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Select Shelter Type</CardTitle>
                        <CardDescription>Choose a shelter type to view its detailed financial calculations</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Select value={selectedShelterType || ''} onValueChange={setSelectedShelterType}>
                            <SelectTrigger className="w-64">
                                <SelectValue placeholder="Select a Shelter Type" />
                            </SelectTrigger>
                            <SelectContent>
                                {shelterTypes.map(type => (
                                    <SelectItem key={type.id} value={type.id}>
                                        {type.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                {selectedShelterType && (
                    <Tabs defaultValue="section-a" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="section-a">Section A: Contract & Income</TabsTrigger>
                            <TabsTrigger value="section-b">Section B: Cost Breakdown (BOM)</TabsTrigger>
                            <TabsTrigger value="section-c">Section C: Cost Summary</TabsTrigger>
                        </TabsList>

                        <TabsContent value="section-a">
                            <Card>
                                <CardHeader>
                                    <CardTitle>SECTION A — Contract & Income</CardTitle>
                                    <CardDescription>Contract income, extra works, and other revenue sources</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-slate-600">
                                        Content will be added here...
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="section-b">
                            <Card>
                                <CardHeader>
                                    <CardTitle>SECTION B — Cost Breakdown (BOM-driven)</CardTitle>
                                    <CardDescription>Costs grouped by BOM categories with full traceability</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-slate-600">
                                        Content will be added here...
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="section-c">
                            <Card>
                                <CardHeader>
                                    <CardTitle>SECTION C — Cost Summary (auto-calculated)</CardTitle>
                                    <CardDescription>Gross balance, warranty provision, net profit, and profit distribution</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-slate-600">
                                        Content will be added here...
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                )}
            </div>
        </div>
    );
}