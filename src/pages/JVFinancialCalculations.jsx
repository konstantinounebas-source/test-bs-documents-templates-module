import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, Plus, Save, Edit, FileText, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import { usePageAccess } from "@/components/lib/usePageAccess";
import SectionAContractIncome from "@/components/jv-financial/SectionAContractIncome";
import SectionBCostBreakdown from "@/components/jv-financial/SectionBCostBreakdown";
import AddShelterInstanceDialog from "@/components/jv-financial/AddShelterInstanceDialog";
import EditShelterInstanceDialog from "@/components/jv-financial/EditShelterInstanceDialog";
import ExcelJS from 'exceljs';
import { toast } from 'sonner';

export default function JVFinancialCalculations() {
    const { hasAccess, isLoading: accessLoading } = usePageAccess('JVFinancialCalculations');

    const [selectedInstanceId, setSelectedInstanceId] = useState(null);
    const [shelterInstances, setShelterInstances] = useState([]);
    const [selectedShelterType, setSelectedShelterType] = useState('');
    const [shelterTypes, setShelterTypes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sectionATotals, setSectionATotals] = useState({ contractIncome: 0 });
    const [sectionBTotals, setSectionBTotals] = useState({ verified: 0, nonBom: 0, waste: 0, accrued: 0 });
    const [refreshKey, setRefreshKey] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editingInstance, setEditingInstance] = useState(null);
    const [isExportingAll, setIsExportingAll] = useState(false);

    const [isInstanceDataLoading, setIsInstanceDataLoading] = useState(false);
    const [isSectionALoading, setIsSectionALoading] = useState(true);
    const [isSectionBLoading, setIsSectionBLoading] = useState(true);

    // Parent-level stale-request protection
    const instanceLoadRef = useRef(null);
    // Debounce ref for manual shelter type change
    const shelterTypeDebounceRef = useRef(null);

    const isBaseReady = !isLoading && !isInstanceDataLoading && !isSectionALoading && !!selectedInstanceId;
    const isSectionBReady = !!selectedShelterType && !isSectionBLoading;
    const canSave = isBaseReady && isSectionBReady && !isSaving;

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (shelterTypeDebounceRef.current) {
                clearTimeout(shelterTypeDebounceRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!accessLoading && hasAccess) {
            loadInitialData();
        }
    }, [accessLoading, hasAccess]);

    const loadInitialData = async () => {
        setIsLoading(true);
        try {
            const [instances, types] = await Promise.all([
                base44.entities.ShelterInstance.list(),
                base44.entities.BusStopType.list()
            ]);

            setShelterInstances(instances.reverse());
            setShelterTypes(types.reverse());

            if (instances.length > 0) {
                setSelectedInstanceId(instances[0].id);
                setSelectedShelterType(instances[0].shelter_type_id || '');
            } else {
                setSelectedInstanceId(null);
                setSelectedShelterType('');
            }
        } catch (error) {
            console.error('Failed to load initial data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (selectedInstanceId) {
            setIsSectionALoading(true);
            instanceLoadRef.current = selectedInstanceId;
            loadInstanceData();
        } else {
            setSelectedShelterType('');
            setIsSectionALoading(false);
            setIsSectionBLoading(false);
            instanceLoadRef.current = null;
        }
    }, [selectedInstanceId]);

    const loadInstanceData = async () => {
        setIsInstanceDataLoading(true);
        const capturedInstanceId = instanceLoadRef.current;

        try {
            const instances = await base44.entities.ShelterInstance.filter({ id: capturedInstanceId });

            if (instanceLoadRef.current !== capturedInstanceId) return;

            if (instances.length > 0) {
                const instance = instances[0];
                const typeId = instance.shelter_type_id || '';

                if (instanceLoadRef.current !== capturedInstanceId) return;
                setSelectedShelterType(typeId);

                if (instanceLoadRef.current !== capturedInstanceId) return;
                if (typeId) {
                    setIsSectionBLoading(true);
                } else {
                    setIsSectionBLoading(false);
                }

                if (instanceLoadRef.current !== capturedInstanceId) return;
                setRefreshKey(prev => prev + 1);
            } else {
                if (instanceLoadRef.current !== capturedInstanceId) return;
                setSelectedShelterType('');
                setIsSectionBLoading(false);
            }
        } catch (error) {
            console.error('Failed to load instance data:', error);
            if (instanceLoadRef.current === capturedInstanceId) {
                setIsSectionBLoading(false);
            }
        } finally {
            if (instanceLoadRef.current === capturedInstanceId) {
                setIsInstanceDataLoading(false);
            }
        }
    };

    // Debounced manual shelter type change — 300ms, ref-based cleanup
    const handleShelterTypeChange = (newTypeId) => {
        setSelectedShelterType(newTypeId);

        if (!newTypeId) {
            setIsSectionBLoading(false);
            return;
        }

        // Immediately mark Section B as loading
        setIsSectionBLoading(true);

        // Cancel previous debounce if any
        if (shelterTypeDebounceRef.current) {
            clearTimeout(shelterTypeDebounceRef.current);
        }

        // After 300ms, remount SectionB via refreshKey
        shelterTypeDebounceRef.current = setTimeout(() => {
            setRefreshKey(prev => prev + 1);
            shelterTypeDebounceRef.current = null;
        }, 300);
    };

    const handleSaveAndRefresh = async () => {
        const currentInstanceId = selectedInstanceId;
        const currentShelterType = selectedShelterType;

        if (!canSave) {
            toast.error('Page is not ready to save. Please wait for data to load.');
            return;
        }

        setIsSaving(true);
        try {
            await base44.entities.ShelterInstance.update(currentInstanceId, {
                shelter_type_id: currentShelterType
            });

            const bomCost = sectionBTotals.verified || 0;
            const nonBomCost = sectionBTotals.nonBom || 0;
            const wasteAllowanceCost = sectionBTotals.waste || 0;
            const accruedCost = sectionBTotals.accrued || 0;
            const totalCostBreakdown = bomCost + nonBomCost + wasteAllowanceCost + accruedCost;
            const totalContractIncome = sectionATotals.contractIncome || 0;
            const grossBalance = totalContractIncome - totalCostBreakdown;
            const warrantyProvision = 0;
            const netExpectedProfit = grossBalance - warrantyProvision;
            const profitMarginPercent = totalCostBreakdown > 0 ? (netExpectedProfit / totalCostBreakdown) * 100 : 0;

            const existingRecords = await base44.entities.ShelterFinancialResults.filter({
                shelter_instance_id: currentInstanceId
            });

            const resultData = {
                shelter_instance_id: currentInstanceId,
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
                air_control_share_percent: 0,
                air_control_profit_amount: 0,
                amco_share_percent: 0,
                amco_profit_amount: 0
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
            const activeInstances = shelterInstances.filter(inst => inst.active !== false);
            if (activeInstances.length === 0) {
                toast.error('No active shelter instances found');
                return;
            }

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

            const pdf = new jsPDF('portrait', 'mm', 'a4');
            const pageHeight = 297;
            const margin = 10;
            const maxY = pageHeight - 20;
            let isFirstPage = true;

            for (const instance of activeInstances) {
                if (!isFirstPage) pdf.addPage();
                isFirstPage = false;

                const shelterType = shelterTypeMap[instance.shelter_type_id];
                const financialData = allFinancialData.find(d => d.shelter_instance_id === instance.id);
                let yPos = 15;

                const checkPageBreak = (spaceNeeded) => {
                    if (yPos + spaceNeeded > maxY) { pdf.addPage(); yPos = 15; return true; }
                    return false;
                };

                pdf.setFontSize(16); pdf.setFont('helvetica', 'bold');
                pdf.text(`Shelter Instance: ${instance.name}`, margin, yPos); yPos += 7;
                pdf.setFontSize(11); pdf.setFont('helvetica', 'normal');
                pdf.text(`Shelter Type: ${shelterType?.code || 'Not allocated'}`, margin, yPos); yPos += 6;
                pdf.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, margin, yPos); yPos += 10;

                checkPageBreak(40);
                pdf.setFontSize(13); pdf.setFont('helvetica', 'bold');
                pdf.text('SECTION A — Contract Income', margin, yPos); yPos += 7;
                pdf.setFontSize(10); pdf.setFont('helvetica', 'normal');

                const contractAmount = financialData?.contract_amount || 0;
                const approvedVars = financialData?.approved_variations || [];
                const potentialVars = financialData?.potential_variations || [];

                pdf.text(`Contract Amount: €${contractAmount.toFixed(2)}`, margin + 5, yPos); yPos += 6;

                const approvedTotal = approvedVars.reduce((sum, v) => sum + (v.amount || 0), 0);
                pdf.setFont('helvetica', 'bold');
                pdf.text(`Approved Variations: €${approvedTotal.toFixed(2)}`, margin + 5, yPos); yPos += 5;
                if (approvedVars.length > 0) {
                    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
                    for (const v of approvedVars) {
                        checkPageBreak(5);
                        pdf.text(`  • ${v.description || 'N/A'}: €${(v.amount || 0).toFixed(2)}`, margin + 8, yPos); yPos += 4;
                    }
                    yPos += 2;
                }

                pdf.setFontSize(10); checkPageBreak(15);
                const potentialTotal = potentialVars.reduce((sum, v) => sum + (v.amount || 0), 0);
                pdf.setFont('helvetica', 'bold');
                pdf.text(`Potential Variations: €${potentialTotal.toFixed(2)}`, margin + 5, yPos); yPos += 5;
                if (potentialVars.length > 0) {
                    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
                    for (const v of potentialVars) {
                        checkPageBreak(5);
                        pdf.text(`  • ${v.description || 'N/A'}: €${(v.amount || 0).toFixed(2)}`, margin + 8, yPos); yPos += 4;
                    }
                    yPos += 2;
                }

                pdf.setFontSize(10); checkPageBreak(10);
                const totalIncome = contractAmount + approvedTotal;
                pdf.setFont('helvetica', 'bold');
                pdf.text(`Total Contract Income: €${totalIncome.toFixed(2)}`, margin + 5, yPos); yPos += 10;

                checkPageBreak(40);
                pdf.setFontSize(13); pdf.setFont('helvetica', 'bold');
                pdf.text('SECTION B — Cost Breakdown', margin, yPos); yPos += 7;
                pdf.setFontSize(10); pdf.setFont('helvetica', 'normal');

                let bomCost = 0;
                const bomCostsByCategory = {};
                if (instance.shelter_type_id) {
                    allBOMComponents.filter(c => c.bus_stop_type_id === instance.shelter_type_id).forEach(comp => {
                        const product = productMap[comp.product_id];
                        const quantity = parseFloat(comp.quantity_required) || 0;
                        const unitCost = parseFloat(product?.unit_cost) || 0;
                        const totalCost = quantity * unitCost;
                        if (comp.material_category_id) {
                            const catName = categoryMap[comp.material_category_id]?.name || 'Unknown';
                            bomCostsByCategory[catName] = (bomCostsByCategory[catName] || 0) + totalCost;
                        }
                        bomCost += totalCost;
                    });
                }

                pdf.setFont('helvetica', 'bold');
                pdf.text(`1. Verified Costs (from BOM): €${bomCost.toFixed(2)}`, margin + 5, yPos); yPos += 5;
                if (Object.keys(bomCostsByCategory).length > 0) {
                    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
                    for (const [cat, cost] of Object.entries(bomCostsByCategory)) {
                        checkPageBreak(5);
                        pdf.text(`  • ${cat}: €${cost.toFixed(2)}`, margin + 8, yPos); yPos += 4;
                    }
                    yPos += 2;
                }

                pdf.setFontSize(10); checkPageBreak(15);
                const nonBomCosts = financialData?.non_bom_costs || [];
                const nonBomTotal = nonBomCosts.reduce((sum, c) => sum + (c.amount || 0), 0);
                pdf.setFont('helvetica', 'bold');
                pdf.text(`2. Verified Non BOM Costs: €${nonBomTotal.toFixed(2)}`, margin + 5, yPos); yPos += 5;
                if (nonBomCosts.length > 0) {
                    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
                    for (const c of nonBomCosts) {
                        checkPageBreak(5);
                        pdf.text(`  • ${c.description || 'N/A'}: €${(c.amount || 0).toFixed(2)}`, margin + 8, yPos); yPos += 4;
                    }
                    yPos += 2;
                }

                pdf.setFontSize(10); checkPageBreak(15);
                const wasteAllowances = financialData?.waste_allowances || [];
                const wasteTotal = wasteAllowances.reduce((sum, w) => sum + ((w.base_cost || 0) * (w.allowance_percent || 0) / 100), 0);
                pdf.setFont('helvetica', 'bold');
                pdf.text(`3. Waste Allowance: €${wasteTotal.toFixed(2)}`, margin + 5, yPos); yPos += 5;
                if (wasteAllowances.length > 0) {
                    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
                    for (const w of wasteAllowances) {
                        checkPageBreak(5);
                        const productName = w.product_id ? (productMap[w.product_id]?.name || 'Unknown') : (w.description || 'Custom');
                        const cost = (w.base_cost || 0) * (w.allowance_percent || 0) / 100;
                        pdf.text(`  • ${productName} (Base: €${(w.base_cost || 0).toFixed(2)}, ${w.allowance_percent || 0}%): €${cost.toFixed(2)}`, margin + 8, yPos); yPos += 4;
                    }
                    yPos += 2;
                }

                pdf.setFontSize(10); checkPageBreak(15);
                const accruedCosts = financialData?.accrued_costs || [];
                const accruedTotal = accruedCosts.reduce((sum, c) => sum + (c.amount || 0), 0);
                pdf.setFont('helvetica', 'bold');
                pdf.text(`4. Unfinalised / Accrued Costs: €${accruedTotal.toFixed(2)}`, margin + 5, yPos); yPos += 5;
                if (accruedCosts.length > 0) {
                    pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
                    for (const c of accruedCosts) {
                        checkPageBreak(5);
                        const catName = c.category_id ? (allCategories.find(x => x.id === c.category_id)?.name || 'Unknown') : (c.description || 'Custom');
                        pdf.text(`  • ${catName}: €${(c.amount || 0).toFixed(2)}`, margin + 8, yPos); yPos += 4;
                    }
                    yPos += 2;
                }

                pdf.setFontSize(10); checkPageBreak(10);
                const totalCost = bomCost + nonBomTotal + wasteTotal + accruedTotal;
                pdf.setFont('helvetica', 'bold');
                pdf.text(`Total Cost Breakdown: €${totalCost.toFixed(2)}`, margin + 5, yPos); yPos += 10;

                checkPageBreak(20);
                pdf.setFontSize(13); pdf.setFont('helvetica', 'bold');
                pdf.text('SECTION C — Cost Summary', margin, yPos); yPos += 7;
                pdf.setFontSize(10); pdf.setFont('helvetica', 'normal');
                pdf.text(`Total Contract Income: €${totalIncome.toFixed(2)}`, margin + 5, yPos); yPos += 6;
                pdf.text(`Total Verified Costs: €${bomCost.toFixed(2)}`, margin + 5, yPos); yPos += 6;
                pdf.text(`Total Waste Allowance: €${wasteTotal.toFixed(2)}`, margin + 5, yPos); yPos += 6;
                pdf.text(`Total Unfinalised Costs: €${accruedTotal.toFixed(2)}`, margin + 5, yPos); yPos += 6;
                pdf.text(`Total Project Costs: €${totalCost.toFixed(2)}`, margin + 5, yPos); yPos += 8;
                pdf.setFont('helvetica', 'bold');
                pdf.text(`Gross Balance: €${(totalIncome - totalCost).toFixed(2)}`, margin + 5, yPos);
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
            const bomComponents = await base44.entities.BusStopTypeComponent.filter({ bus_stop_type_id: shelterTypeId });
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

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('BOM');
            worksheet.mergeCells('A1:H1');
            worksheet.getCell('A1').value = `Bill of Materials - ${shelterType[0]?.code || 'Unknown'}`;
            worksheet.getCell('A1').font = { size: 16, bold: true };
            worksheet.getCell('A1').alignment = { horizontal: 'center' };
            worksheet.addRow([]);
            const headerRow = worksheet.addRow(['Material Category', 'Product Name', 'Product Code', 'Team', 'Quantity Required', 'Unit', 'Unit Cost', 'Total Cost']);
            headerRow.font = { bold: true };
            headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

            let totalCost = 0;
            bomComponents.forEach(comp => {
                const product = productMap[comp.product_id];
                const category = categoryMap[comp.material_category_id];
                const team = teamMap[comp.team_id];
                const quantity = parseFloat(comp.quantity_required) || 0;
                const unitCost = parseFloat(product?.unit_cost) || 0;
                const itemTotal = quantity * unitCost;
                totalCost += itemTotal;
                worksheet.addRow([category?.name || 'N/A', product?.name || 'Unknown', product?.sku || 'N/A', team?.name || 'N/A', quantity, comp.unit_of_measure || 'pcs', unitCost, itemTotal]);
            });

            worksheet.addRow([]);
            const totalRow = worksheet.addRow(['', '', '', '', '', '', 'Total:', totalCost]);
            totalRow.font = { bold: true };
            totalRow.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB3B' } };
            worksheet.columns = [
                { key: 'category', width: 20 }, { key: 'product', width: 30 }, { key: 'code', width: 15 },
                { key: 'team', width: 15 }, { key: 'quantity', width: 15 }, { key: 'unit', width: 10 },
                { key: 'unitCost', width: 15 }, { key: 'total', width: 15 }
            ];
            for (let i = 4; i <= worksheet.lastRow.number; i++) {
                worksheet.getCell(`E${i}`).numFmt = '0.00';
                worksheet.getCell(`G${i}`).numFmt = '€#,##0.00';
                worksheet.getCell(`H${i}`).numFmt = '€#,##0.00';
            }

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

    if (!hasAccess) return null;

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">JV Financial Calculations</h1>
                        <p className="text-slate-600 mt-1">Detailed calculations for income, costs, and profit margins per Shelter Type with full traceability.</p>
                    </div>
                    <Button onClick={exportAllActiveInstancesPDF} disabled={isExportingAll} className="flex items-center gap-2">
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
                            <Button variant="outline" onClick={() => setShowAddDialog(true)} className="flex items-center gap-2">
                                <Plus className="w-4 h-4" /> Add Instance
                            </Button>
                            {selectedInstanceId && (
                                <Button variant="outline" onClick={() => {
                                    const instance = shelterInstances.find(i => i.id === selectedInstanceId);
                                    setEditingInstance(instance);
                                    setShowEditDialog(true);
                                }} className="flex items-center gap-2">
                                    <Edit className="w-4 h-4" /> Edit Instance
                                </Button>
                            )}
                        </div>

                        {selectedInstanceId && (
                            <div className="border-t pt-4">
                                <h3 className="text-sm font-semibold text-slate-900 mb-3">Allocation</h3>
                                <div className="flex gap-4 items-end flex-wrap">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Shelter Type</label>
                                        <Select value={selectedShelterType || ''} onValueChange={handleShelterTypeChange}>
                                            <SelectTrigger className="w-64">
                                                <SelectValue placeholder="Select Shelter Type" />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-[300px]">
                                                {shelterTypes.map(type => (
                                                    <SelectItem key={type.id} value={type.id}>{type.code}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button variant="default" onClick={handleSaveAndRefresh} className="flex items-center gap-2" disabled={!canSave}>
                                        <Save className="w-4 h-4" /> Save & Refresh
                                    </Button>
                                    {selectedShelterType && (
                                        <Button variant="outline" onClick={() => exportBOM(selectedShelterType)} className="flex items-center gap-2">
                                            <Download className="w-4 h-4" /> Export BOM
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {selectedInstanceId && (
                    <div className="space-y-6">
                        <SectionAContractIncome
                            key={`section-a-${refreshKey}`}
                            shelterInstanceId={selectedInstanceId}
                            onTotalsChange={setSectionATotals}
                            onLoadingChange={setIsSectionALoading}
                            canSave={canSave}
                        />

                        {selectedShelterType ? (
                            <SectionBCostBreakdown
                                key={`section-b-${refreshKey}`}
                                shelterInstanceId={selectedInstanceId}
                                shelterTypeId={selectedShelterType}
                                onTotalsChange={setSectionBTotals}
                                onLoadingChange={setIsSectionBLoading}
                                canSave={canSave}
                            />
                        ) : (
                            <Card>
                                <CardHeader><CardTitle>SECTION B — Cost Breakdown (BOM-driven)</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="text-center py-8 text-slate-500">
                                        <p className="text-sm">Please allocate a Shelter Type to view cost breakdown</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
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
                    onUpdated={async () => { await loadInitialData(); }}
                />
            </div>
        </div>
    );
}