import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, Plus, Save } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { usePageAccess } from "@/components/lib/usePageAccess";
import SectionAContractIncome from "@/components/jv-financial/SectionAContractIncome";
import SectionBCostBreakdown from "@/components/jv-financial/SectionBCostBreakdown";
import SectionCCostSummary from "@/components/jv-financial/SectionCCostSummary";
import ExcelJS from 'exceljs';
import { toast } from 'sonner';

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
     const [refreshKey, setRefreshKey] = useState(0);
     const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!accessLoading && hasAccess) {
            loadShelterTypes();
        }
    }, [accessLoading, hasAccess]);

    const loadShelterTypes = async () => {
        try {
            const types = await base44.entities.BusStopType.list();
            setShelterTypes(types.reverse());
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
            
            // Trigger refresh of child components
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            console.error('Failed to load BOM versions:', error);
        }
    };

    const handleSaveAndRefresh = () => {
        toast.success('Data saved successfully');
        setRefreshKey(prev => prev + 1);
    };

    const exportBOM = async (shelterTypeId, version) => {
        try {
            // Get BOM components for the selected shelter type and version
            const bomComponents = await base44.entities.BusStopTypeComponent.filter({
                bus_stop_type_id: shelterTypeId
            });

            // Filter by version if specified
            const filteredComponents = version 
                ? bomComponents.filter(c => (c.version || 'V1') === version)
                : bomComponents;

            // Get all products and material categories
            const [products, materialCategories, teams, shelterType] = await Promise.all([
                base44.entities.Product.list(),
                base44.entities.MaterialCategory.list(),
                base44.entities.Team.list(),
                base44.entities.BusStopType.filter({ id: shelterTypeId })
            ]);

            const productMap = {};
            products.forEach(p => { productMap[p.id] = p; });

            const categoryMap = {};
            materialCategories.forEach(c => { categoryMap[c.id] = c; });

            const teamMap = {};
            teams.forEach(t => { teamMap[t.id] = t; });

            // Create Excel workbook
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('BOM');

            // Add title
            worksheet.mergeCells('A1:H1');
            worksheet.getCell('A1').value = `Bill of Materials - ${shelterType[0]?.code || 'Unknown'} - ${version}`;
            worksheet.getCell('A1').font = { size: 16, bold: true };
            worksheet.getCell('A1').alignment = { horizontal: 'center' };

            // Add headers
            worksheet.addRow([]);
            const headerRow = worksheet.addRow([
                'Material Category',
                'Product Name',
                'Product Code',
                'Team',
                'Quantity Required',
                'Unit',
                'Unit Cost',
                'Total Cost'
            ]);
            headerRow.font = { bold: true };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };

            // Add data rows
            let totalCost = 0;
            filteredComponents.forEach(comp => {
                const product = productMap[comp.product_id];
                const category = categoryMap[comp.material_category_id];
                const team = teamMap[comp.team_id];
                const quantity = parseFloat(comp.quantity_required) || 0;
                const unitCost = parseFloat(product?.unit_cost) || 0;
                const itemTotal = quantity * unitCost;
                totalCost += itemTotal;

                worksheet.addRow([
                    category?.name || 'N/A',
                    product?.name || 'Unknown',
                    product?.code || 'N/A',
                    team?.name || 'N/A',
                    quantity,
                    comp.unit_of_measure || 'pcs',
                    unitCost,
                    itemTotal
                ]);
            });

            // Add total row
            worksheet.addRow([]);
            const totalRow = worksheet.addRow(['', '', '', '', '', '', 'Total:', totalCost]);
            totalRow.font = { bold: true };
            totalRow.getCell(8).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFEB3B' }
            };

            // Format columns
            worksheet.columns = [
                { key: 'category', width: 20 },
                { key: 'product', width: 30 },
                { key: 'code', width: 15 },
                { key: 'team', width: 15 },
                { key: 'quantity', width: 15 },
                { key: 'unit', width: 10 },
                { key: 'unitCost', width: 15 },
                { key: 'total', width: 15 }
            ];

            // Format number columns
            for (let i = 4; i <= worksheet.lastRow.number; i++) {
                worksheet.getCell(`E${i}`).numFmt = '0.00';
                worksheet.getCell(`G${i}`).numFmt = '€#,##0.00';
                worksheet.getCell(`H${i}`).numFmt = '€#,##0.00';
            }

            // Export file
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `BOM_${shelterType[0]?.code || 'Unknown'}_${version}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to export BOM:', error);
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
                    <CardContent className="flex gap-4 items-end flex-wrap">
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
                                                {type.code}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        {bomVersions.length > 0 && (
                            <>
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
                                <Button
                                    variant="default"
                                    onClick={handleSaveAndRefresh}
                                    className="flex items-center gap-2"
                                    disabled={isSaving}
                                >
                                    <Save className="w-4 h-4" />
                                    Save & Refresh
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => exportBOM(selectedShelterType, selectedBomVersion)}
                                    className="flex items-center gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    Export BOM
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>

                {selectedShelterType && (
                    <div className="space-y-6">
                        <SectionAContractIncome key={`section-a-${refreshKey}`} shelterTypeId={selectedShelterType} onTotalsChange={setSectionATotals} />

                        <SectionBCostBreakdown key={`section-b-${refreshKey}`} shelterTypeId={selectedShelterType} onTotalsChange={setSectionBTotals} bomVersions={bomVersions} selectedBomVersion={selectedBomVersion} />
                    </div>
                )}
            </div>
        </div>
    );
}