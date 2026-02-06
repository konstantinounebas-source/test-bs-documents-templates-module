import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from 'lucide-react';
import { usePageAccess } from "@/components/lib/usePageAccess";

export default function JVFinancialResults() {
    // Check page access first
    const { hasAccess, isLoading: accessLoading } = usePageAccess('JVFinancialResults');
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
                    <h1 className="text-3xl font-bold text-slate-900">JV Financial Results</h1>
                    <p className="text-slate-600 mt-1">View financial results for each Shelter Type - Contract income, costs, profit distribution and key metrics.</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Select Shelter Type</CardTitle>
                        <CardDescription>Choose a shelter type to view its financial position</CardDescription>
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
                    <Card>
                        <CardHeader>
                            <CardTitle>Financial Summary</CardTitle>
                            <CardDescription>Complete financial breakdown for the selected shelter type</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-slate-600">
                                Content will be added here as you guide the development...
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}