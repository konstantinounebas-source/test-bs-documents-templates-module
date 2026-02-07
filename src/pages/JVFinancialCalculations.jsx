import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, Plus } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { usePageAccess } from "@/components/lib/usePageAccess";
import SectionAContractIncome from "@/components/jv-financial/SectionAContractIncome";
import SectionBCostBreakdown from "@/components/jv-financial/SectionBCostBreakdown";
import SectionCCostSummary from "@/components/jv-financial/SectionCCostSummary";

export default function JVFinancialCalculations() {
     // Check page access first
     const { hasAccess, isLoading: accessLoading } = usePageAccess('JVFinancialCalculations');
     const [selectedShelterType, setSelectedShelterType] = useState(null);
     const [shelterTypes, setShelterTypes] = useState([]);
     const [isLoading, setIsLoading] = useState(true);
     const [sectionATotals, setSectionATotals] = useState({ contractIncome: 0 });
     const [sectionBTotals, setSectionBTotals] = useState({ verified: 0, waste: 0, accrued: 0 });
     const [bomVersions, setBomVersions] = useState([]);
     const [selectedBomVersion, setSelectedBomVersion] = useState('');

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

    useEffect(() => {
        if (selectedShelterType) {
            loadBomVersions();
        }
    }, [selectedShelterType]);

    const loadBomVersions = async () => {
        try {
            const bomComponents = await base44.entities.BusStopTypeComponent.filter({
                bus_stop_type_id: selectedShelterType
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
        } catch (error) {
            console.error('Failed to load BOM versions:', error);
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
                        <CardTitle>Select Shelter Type & BOM Version</CardTitle>
                        <CardDescription>Choose a shelter type and BOM version to view its detailed financial calculations</CardDescription>
                    </CardHeader>
                    <CardContent className="flex gap-6 items-end">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Shelter Type</label>
                            <Select value={selectedShelterType || ''} onValueChange={setSelectedShelterType}>
                                <SelectTrigger className="w-64">
                                    <SelectValue placeholder="Select a Shelter Type" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    {shelterTypes.length === 0 ? (
                                        <div className="p-2 text-sm text-slate-500">No shelter types available</div>
                                    ) : (
                                        shelterTypes.map(type => (
                                            <SelectItem key={type.id} value={type.id}>
                                                {type.shelter_type_id}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        {bomVersions.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">BOM Version</label>
                                <Select value={selectedBomVersion} onValueChange={setSelectedBomVersion}>
                                    <SelectTrigger className="w-64">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {bomVersions.map((v) => (
                                            <SelectItem key={v.version} value={v.version}>
                                                {v.version} {v.comment && `- ${v.comment}`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {selectedShelterType && (
                    <div className="space-y-6">
                        <SectionAContractIncome shelterTypeId={selectedShelterType} onTotalsChange={setSectionATotals} />

                        <SectionBCostBreakdown shelterTypeId={selectedShelterType} onTotalsChange={setSectionBTotals} bomVersions={bomVersions} selectedBomVersion={selectedBomVersion} />
                    </div>
                )}
            </div>
        </div>
    );
}