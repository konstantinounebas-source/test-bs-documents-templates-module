import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, Plus, Save, Edit, FileText } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { usePageAccess } from "@/components/lib/usePageAccess";
import SectionAContractIncome from "@/components/jv-financial/SectionAContractIncome";
import SectionBCostBreakdown from "@/components/jv-financial/SectionBCostBreakdown";
import SectionCCostSummary from "@/components/jv-financial/SectionCCostSummary";
import AddShelterInstanceDialog from "@/components/jv-financial/AddShelterInstanceDialog";
import EditShelterInstanceDialog from "@/components/jv-financial/EditShelterInstanceDialog";
import ExcelJS from 'exceljs';
import { toast } from 'sonner';

export default function JVFinancialCalculations() {
     // Check page access first
     const { hasAccess, isLoading: accessLoading } = usePageAccess('JVFinancialCalculations');
     const [selectedInstanceId, setSelectedInstanceId] = useState(null);
     const [shelterInstances, setShelterInstances] = useState([]);
     const [selectedShelterType, setSelectedShelterType] = useState(null);
     const [shelterTypes, setShelterTypes] = useState([]);
     const [isLoading, setIsLoading] = useState(true);
     const [sectionATotals, setSectionATotals] = useState({ contractIncome: 0 });
     const [sectionBTotals, setSectionBTotals] = useState({ verified: 0, waste: 0, accrued: 0 });
     const [refreshKey, setRefreshKey] = useState(0);
     const [isSaving, setIsSaving] = useState(false);
     const [showAddDialog, setShowAddDialog] = useState(false);
     const [showEditDialog, setShowEditDialog] = useState(false);
     const [editingInstance, setEditingInstance] = useState(null);
     const [isExportingAll, setIsExportingAll] = useState(false);

    useEffect(() => {
        if (!accessLoading && hasAccess) {
            loadInitialData();
        }
    }, [accessLoading, hasAccess]);

    const loadInitialData = async () => {
        try {
            const [instances, types] = await Promise.all([
                base44.entities.ShelterInstance.list(),
                base44.entities.BusStopType.list()
            ]);
            
            // Show all instances (including inactive) in calculations page
            setShelterInstances(instances.reverse());
            setShelterTypes(types.reverse());
            
            if (instances.length > 0) {
                setSelectedInstanceId(instances[0].id);
                if (instances[0].shelter_type_id) {
                    setSelectedShelterType(instances[0].shelter_type_id);
                }
            }
        } catch (error) {
            console.error('Failed to load initial data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (selectedInstanceId) {
            loadInstanceData();
        }
    }, [selectedInstanceId]);

    const loadInstanceData = async () => {
        try {
            const instances = await base44.entities.ShelterInstance.filter({ id: selectedInstanceId });
            if (instances.length > 0) {
                const instance = instances[0];
                setSelectedShelterType(instance.shelter_type_id || '');
                setRefreshKey(prev => prev + 1);
            }
        } catch (error) {
            console.error('Failed to load instance data:', error);
        }
    };

    const handleSaveAndRefresh = async () => {
        if (!selectedInstanceId) {
            toast.error('Please select a shelter instance');
            return;
        }

        if (!selectedShelterType) {
            toast.error('Please select a shelter type');
            return;
        }

        setIsSaving(true);
        try {
            // Update shelter instance allocation
            await base44.entities.ShelterInstance.update(selectedInstanceId, {
                shelter_type_id: selectedShelterType
            });

            // Calculate verified costs from shelter type BOM
            const bomCost = sectionBTotals.verified || 0;
            const nonBomCost = sectionBTotals.nonBom || 0;
            const wasteAllowanceCost = sectionBTotals.waste || 0;
            const accruedCost = sectionBTotals.accrued || 0;
            const totalCostBreakdown = bomCost + nonBomCost + wasteAllowanceCost + accruedCost;

            // Contract income from Section A
            const totalContractIncome = sectionATotals.contractIncome || 0;

            // Calculate profits (warranty and profit shares are 0 by default)
            const grossBalance = totalContractIncome - totalCostBreakdown;
            const warrantyProvision = 0;
            const netExpectedProfit = grossBalance - warrantyProvision;
            const profitMarginPercent = totalCostBreakdown > 0 ? (netExpectedProfit / totalCostBreakdown) * 100 : 0;

            const airControlSharePercent = 0;
            const amcoSharePercent = 0;
            const airControlProfitAmount = 0;
            const amcoProfitAmount = 0;

            // Check if record exists for this shelter instance
            const existingRecords = await base44.entities.ShelterFinancialResults.filter({
                shelter_instance_id: selectedInstanceId
            });

            const resultData = {
                shelter_instance_id: selectedInstanceId,
                calculation_date: new Date().toISOString(),
                quantity: 1,
                total_contract_income: totalContractIncome,
                bom_cost: bomCost,
                non_bom_cost: nonBomCost,
                waste_allowance_cost: wasteAllowanceCost,
                accrued_cost: accruedCost,
                total_cost_breakdown: totalCostBreakdown,
                gross_balance: grossBalance,
                warranty_provision: warrantyProvision,
                warranty_provision_total: warrantyProvision,
                net_expected_profit: netExpectedProfit,
                profit_margin_percent: profitMarginPercent,
                air_control_share_percent: airControlSharePercent,
                air_control_profit_amount: airControlProfitAmount,
                amco_share_percent: amcoSharePercent,
                amco_profit_amount: amcoProfitAmount
            };

            if (existingRecords.length > 0) {
                await base44.entities.ShelterFinancialResults.update(existingRecords[0].id, resultData);
            } else {
                await base44.entities.ShelterFinancialResults.create(resultData);
            }

            toast.success('Financial results saved successfully');
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            console.error('Failed to save financial results:', error);
            toast.error('Failed to save financial results');
        } finally {
            setIsSaving(false);
        }
    };

    const exportAllActiveInstancesPDF = async () => {
        setIsExportingAll(true);
        try {
            // Get all active instances
            const activeInstances = shelterInstances.filter(inst => inst.active !== false);
            
            if (activeInstances.length === 0) {
                toast.error('No active shelter instances found');
                return;
            }

            // Fetch all required data
            const [allFinancialData, allShelterTypes, allProducts, allCategories, allBOMComponents] = await Promise.all([
                base44.entities.ShelterFinancialData.list(),
                base44.entities.BusStopType.list(),
                base44.entities.Product.list(),
                base44.entities.MaterialCategory.list(),
                base44.entities.BusStopTypeComponent.list()
            ]);

            const productMap = {};
            allProducts.forEach(p => { productMap[p.id] = p; });

            const categoryMap = {};
            allCategories.forEach(c => { categoryMap[c.id] = c; });

            const shelterTypeMap = {};
            allShelterTypes.forEach(t => { shelterTypeMap[t.id] = t; });

            // Create PDF
            const pdf = new jsPDF('portrait', 'mm', 'a4');
            let isFirstPage = true;

            for (const instance of activeInstances) {
                if (!isFirstPage) {
                    pdf.addPage();
                }
                isFirstPage = false;

                const shelterType = shelterTypeMap[instance.shelter_type_id];
                const financialData = allFinancialData.find(d => d.shelter_instance_id === instance.id);

                // Page title
                pdf.setFontSize(16);
                pdf.setFont('helvetica', 'bold');
                pdf.text(`Shelter Instance: ${instance.name}`, 10, 15);
                
                pdf.setFontSize(12);
                pdf.setFont('helvetica', 'normal');
                pdf.text(`Shelter Type: ${shelterType?.code || 'Not allocated'}`, 10, 22);
                pdf.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 10, 28);

                let yPos = 38;

                // Section A: Contract Income
                pdf.setFontSize(14);
                pdf.setFont('helvetica', 'bold');
                pdf.text('SECTION A — Contract Income', 10, yPos);
                yPos += 8;

                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'normal');
                
                const contractAmount = financialData?.contract_amount || 0;
                const approvedVars = financialData?.approved_variations || [];
                const potentialVars = financialData?.potential_variations || [];
                
                const approvedTotal = approvedVars.reduce((sum, v) => sum + (v.amount || 0), 0);
                const potentialTotal = potentialVars.reduce((sum, v) => sum + (v.amount || 0), 0);
                const totalIncome = contractAmount + approvedTotal;

                pdf.text(`Contract Amount: €${contractAmount.toFixed(2)}`, 15, yPos);
                yPos += 6;
                pdf.text(`Approved Variations: €${approvedTotal.toFixed(2)}`, 15, yPos);
                yPos += 6;
                pdf.text(`Potential Variations: €${potentialTotal.toFixed(2)}`, 15, yPos);
                yPos += 6;
                pdf.setFont('helvetica', 'bold');
                pdf.text(`Total Contract Income: €${totalIncome.toFixed(2)}`, 15, yPos);
                yPos += 12;

                // Section B: Cost Breakdown
                pdf.setFontSize(14);
                pdf.setFont('helvetica', 'bold');
                pdf.text('SECTION B — Cost Breakdown', 10, yPos);
                yPos += 8;

                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'normal');

                // BOM Verified Costs
                let bomCost = 0;
                if (instance.shelter_type_id) {
                    const bomComponents = allBOMComponents.filter(c => c.bus_stop_type_id === instance.shelter_type_id);
                    bomCost = bomComponents.reduce((sum, comp) => {
                        const product = productMap[comp.product_id];
                        const quantity = parseFloat(comp.quantity_required) || 0;
                        const unitCost = parseFloat(product?.unit_cost) || 0;
                        return sum + (quantity * unitCost);
                    }, 0);
                }

                pdf.text(`BOM Verified Costs: €${bomCost.toFixed(2)}`, 15, yPos);
                yPos += 6;

                const nonBomCosts = financialData?.non_bom_costs || [];
                const nonBomTotal = nonBomCosts.reduce((sum, c) => sum + (c.amount || 0), 0);
                pdf.text(`Non-BOM Costs: €${nonBomTotal.toFixed(2)}`, 15, yPos);
                yPos += 6;

                const wasteAllowances = financialData?.waste_allowances || [];
                const wasteTotal = wasteAllowances.reduce((sum, w) => {
                    const baseCost = w.base_cost || 0;
                    const allowancePercent = w.allowance_percent || 0;
                    return sum + (baseCost * allowancePercent / 100);
                }, 0);
                pdf.text(`Waste Allowance: €${wasteTotal.toFixed(2)}`, 15, yPos);
                yPos += 6;

                const accruedCosts = financialData?.accrued_costs || [];
                const accruedTotal = accruedCosts.reduce((sum, c) => sum + (c.amount || 0), 0);
                pdf.text(`Accrued Costs: €${accruedTotal.toFixed(2)}`, 15, yPos);
                yPos += 6;

                const totalCost = bomCost + nonBomTotal + wasteTotal + accruedTotal;
                pdf.setFont('helvetica', 'bold');
                pdf.text(`Total Cost Breakdown: €${totalCost.toFixed(2)}`, 15, yPos);
                yPos += 12;

                // Summary
                pdf.setFontSize(14);
                pdf.setFont('helvetica', 'bold');
                pdf.text('SUMMARY', 10, yPos);
                yPos += 8;

                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'normal');
                const grossBalance = totalIncome - totalCost;
                pdf.text(`Gross Balance: €${grossBalance.toFixed(2)}`, 15, yPos);
            }

            pdf.save('JV_Financial_Calculations_All_Instances.pdf');
            toast.success('PDF exported successfully');
        } catch (error) {
            console.error('Failed to export PDF:', error);
            toast.error('Failed to export PDF');
        } finally {
            setIsExportingAll(false);
        }
    };

    const exportBOM = async (shelterTypeId) => {
        if (!shelterTypeId) return;
        
        try {
            // Get BOM components for the shelter type
            const bomComponents = await base44.entities.BusStopTypeComponent.filter({
                bus_stop_type_id: shelterTypeId
            });

            const filteredComponents = bomComponents;

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
            worksheet.getCell('A1').value = `Bill of Materials - ${shelterType[0]?.code || 'Unknown'}`;
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
            a.download = `BOM_${shelterType[0]?.code || 'Unknown'}.xlsx`;
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
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">JV Financial Calculations</h1>
                        <p className="text-slate-600 mt-1">Detailed calculations for income, costs, and profit margins per Shelter Type with full traceability.</p>
                    </div>
                    <Button
                        onClick={exportAllActiveInstancesPDF}
                        disabled={isExportingAll}
                        className="flex items-center gap-2"
                    >
                        {isExportingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                        Export All Active Instances (PDF)
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Select Shelter Instance & Allocation</CardTitle>
                        <CardDescription>Choose a shelter instance and allocate it to a shelter type</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-4 items-end flex-wrap">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Shelter Instance</label>
                                <Select value={selectedInstanceId || ''} onValueChange={setSelectedInstanceId}>
                                    <SelectTrigger className="w-64">
                                        <SelectValue placeholder="Select Shelter Instance" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[300px]">
                                        {shelterInstances.length === 0 ? (
                                            <div className="p-2 text-sm text-slate-500">No instances available</div>
                                        ) : (
                                            shelterInstances.map(instance => (
                                                <SelectItem key={instance.id} value={instance.id}>
                                                    {instance.name} {instance.active === false && '(Inactive)'}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => setShowAddDialog(true)}
                                className="flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add Instance
                            </Button>
                            {selectedInstanceId && (
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        const instance = shelterInstances.find(i => i.id === selectedInstanceId);
                                        setEditingInstance(instance);
                                        setShowEditDialog(true);
                                    }}
                                    className="flex items-center gap-2"
                                >
                                    <Edit className="w-4 h-4" />
                                    Edit Instance
                                </Button>
                            )}
                        </div>

                        {selectedInstanceId && (
                            <div className="border-t pt-4">
                                <h3 className="text-sm font-semibold text-slate-900 mb-3">Allocation</h3>
                                <div className="flex gap-4 items-end flex-wrap">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Shelter Type</label>
                                        <Select value={selectedShelterType || ''} onValueChange={setSelectedShelterType}>
                                            <SelectTrigger className="w-64">
                                                <SelectValue placeholder="Select Shelter Type" />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-[300px]">
                                                {shelterTypes.map(type => (
                                                    <SelectItem key={type.id} value={type.id}>
                                                        {type.code}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button
                                        variant="default"
                                        onClick={handleSaveAndRefresh}
                                        className="flex items-center gap-2"
                                        disabled={isSaving || !selectedShelterType}
                                    >
                                        <Save className="w-4 h-4" />
                                        Save & Refresh
                                    </Button>
                                    {selectedShelterType && (
                                        <Button
                                            variant="outline"
                                            onClick={() => exportBOM(selectedShelterType)}
                                            className="flex items-center gap-2"
                                        >
                                            <Download className="w-4 h-4" />
                                            Export BOM
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {selectedInstanceId && selectedShelterType && (
                    <div className="space-y-6">
                        <SectionAContractIncome key={`section-a-${refreshKey}`} shelterInstanceId={selectedInstanceId} onTotalsChange={setSectionATotals} />

                        <SectionBCostBreakdown key={`section-b-${refreshKey}`} shelterInstanceId={selectedInstanceId} shelterTypeId={selectedShelterType} onTotalsChange={setSectionBTotals} />
                    </div>
                )}

                <AddShelterInstanceDialog 
                    open={showAddDialog} 
                    onOpenChange={setShowAddDialog}
                    onAdded={async (newInstance) => {
                        await loadInitialData();
                        setSelectedInstanceId(newInstance.id);
                    }}
                />

                <EditShelterInstanceDialog
                    open={showEditDialog}
                    onOpenChange={setShowEditDialog}
                    instance={editingInstance}
                    onUpdated={async () => {
                        await loadInitialData();
                    }}
                />
            </div>
        </div>
    );
}