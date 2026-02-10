import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Copy, Trash2, DollarSign, TrendingUp, Package, Users, Calendar, Save, Download } from 'lucide-react';
import { usePageAccess } from "@/components/lib/usePageAccess";
import { toast } from 'sonner';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export default function FactoryFinancialCalculations() {
    const { hasAccess, isLoading: accessLoading } = usePageAccess('FactoryFinancialCalculations');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Data states
    const [financialRecords, setFinancialRecords] = useState([]);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [currentData, setCurrentData] = useState(null);
    
    // Clone dialog
    const [showCloneDialog, setShowCloneDialog] = useState(false);
    const [cloneVersion, setCloneVersion] = useState('');
    
    // Create dialog
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newRecord, setNewRecord] = useState({
        factory_name: '',
        version: 'v1.0',
        start_date: '',
        end_date: ''
    });
    
    // Period settings
    const [totalWorkingDays, setTotalWorkingDays] = useState(0);
    const [avgWorkingDaysPerMonth, setAvgWorkingDaysPerMonth] = useState(22);
    const [avgWorkingDaysPerYear, setAvgWorkingDaysPerYear] = useState(260);
    
    // Income section
    const [salesRevenueItems, setSalesRevenueItems] = useState([]);
    const [contractAmount, setContractAmount] = useState(0);
    const [approvedVariations, setApprovedVariations] = useState([]);
    const [potentialVariations, setPotentialVariations] = useState([]);
    
    // Cost sections
    const [personnelCosts, setPersonnelCosts] = useState([]);
    const [bomCosts, setBomCosts] = useState([]);
    const [fixedCosts, setFixedCosts] = useState([]);
    const [overheadCosts, setOverheadCosts] = useState([]);
    const [investmentAmortization, setInvestmentAmortization] = useState([]);
    const [maintenanceCosts, setMaintenanceCosts] = useState([]);

    useEffect(() => {
        if (!accessLoading && hasAccess) {
            loadFinancialRecords();
        }
    }, [accessLoading, hasAccess]);

    const loadFinancialRecords = async () => {
        try {
            const records = await base44.entities.FactoryFinancialData.list('-created_date');
            setFinancialRecords(records);
            
            if (records.length > 0) {
                loadRecordData(records[0]);
            } else {
                setIsLoading(false);
            }
        } catch (error) {
            console.error('Failed to load financial records:', error);
            toast.error('Σφάλμα φόρτωσης δεδομένων');
            setIsLoading(false);
        }
    };

    const loadRecordData = async (record) => {
        try {
            setIsLoading(true);
            setSelectedRecord(record);
            setCurrentData(record);
            
            // Load period settings
            setTotalWorkingDays(record.total_working_days_in_period || 0);
            setAvgWorkingDaysPerMonth(record.average_working_days_per_month || 22);
            setAvgWorkingDaysPerYear(record.average_working_days_per_year || 260);
            
            // Load income data
            setSalesRevenueItems(record.sales_revenue_items || []);
            setContractAmount(record.contract_amount || 0);
            setApprovedVariations(record.approved_variations || []);
            setPotentialVariations(record.potential_variations || []);
            
            // Load cost data
            setPersonnelCosts(record.personnel_costs || []);
            setBomCosts(record.bill_of_materials_costs || []);
            setFixedCosts(record.fixed_costs || []);
            setOverheadCosts(record.overhead_costs || []);
            setInvestmentAmortization(record.investment_amortization || []);
            setMaintenanceCosts(record.maintenance_costs || []);
            
        } catch (error) {
            console.error('Failed to load record data:', error);
            toast.error('Σφάλμα φόρτωσης δεδομένων εγγραφής');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedRecord) {
            toast.error('Δεν έχει επιλεγεί εγγραφή');
            return;
        }

        try {
            setIsSaving(true);
            
            const updatedData = {
                total_working_days_in_period: totalWorkingDays,
                average_working_days_per_month: avgWorkingDaysPerMonth,
                average_working_days_per_year: avgWorkingDaysPerYear,
                sales_revenue_items: salesRevenueItems,
                contract_amount: contractAmount,
                approved_variations: approvedVariations,
                potential_variations: potentialVariations,
                personnel_costs: personnelCosts,
                bill_of_materials_costs: bomCosts,
                fixed_costs: fixedCosts,
                overhead_costs: overheadCosts,
                investment_amortization: investmentAmortization,
                maintenance_costs: maintenanceCosts
            };

            await base44.entities.FactoryFinancialData.update(selectedRecord.id, updatedData);
            
            toast.success('Τα δεδομένα αποθηκεύτηκαν επιτυχώς');
            loadFinancialRecords();
        } catch (error) {
            console.error('Failed to save data:', error);
            toast.error('Σφάλμα αποθήκευσης δεδομένων');
        } finally {
            setIsSaving(false);
        }
    };

    const handleClone = async () => {
        if (!selectedRecord || !cloneVersion.trim()) {
            toast.error('Εισάγετε όνομα έκδοσης');
            return;
        }

        try {
            const clonedData = {
                factory_name: currentData.factory_name,
                version: cloneVersion,
                start_date: currentData.start_date,
                end_date: currentData.end_date,
                total_working_days_in_period: totalWorkingDays,
                average_working_days_per_month: avgWorkingDaysPerMonth,
                average_working_days_per_year: avgWorkingDaysPerYear,
                sales_revenue_items: salesRevenueItems,
                contract_amount: contractAmount,
                approved_variations: approvedVariations,
                potential_variations: potentialVariations,
                personnel_costs: personnelCosts,
                bill_of_materials_costs: bomCosts,
                fixed_costs: fixedCosts,
                overhead_costs: overheadCosts,
                investment_amortization: investmentAmortization,
                maintenance_costs: maintenanceCosts,
                is_active: true
            };

            await base44.entities.FactoryFinancialData.create(clonedData);
            
            toast.success('Η εγγραφή κλωνοποιήθηκε επιτυχώς');
            setShowCloneDialog(false);
            setCloneVersion('');
            loadFinancialRecords();
        } catch (error) {
            console.error('Failed to clone record:', error);
            toast.error('Σφάλμα κλωνοποίησης');
        }
    };

    const handleCreateNew = async () => {
        if (!newRecord.factory_name.trim() || !newRecord.start_date || !newRecord.end_date) {
            toast.error('Συμπληρώστε όλα τα υποχρεωτικά πεδία');
            return;
        }

        try {
            const created = await base44.entities.FactoryFinancialData.create({
                ...newRecord,
                total_working_days_in_period: 0,
                average_working_days_per_month: 22,
                average_working_days_per_year: 260,
                sales_revenue_items: [],
                contract_amount: 0,
                approved_variations: [],
                potential_variations: [],
                personnel_costs: [],
                bill_of_materials_costs: [],
                fixed_costs: [],
                overhead_costs: [],
                investment_amortization: [],
                maintenance_costs: [],
                is_active: true
            });
            
            toast.success('Η εγγραφή δημιουργήθηκε επιτυχώς');
            setShowCreateDialog(false);
            setNewRecord({
                factory_name: '',
                version: 'v1.0',
                start_date: '',
                end_date: ''
            });
            await loadFinancialRecords();
            
            // Load the newly created record
            const records = await base44.entities.FactoryFinancialData.list('-created_date');
            const newlyCreated = records.find(r => r.id === created.id);
            if (newlyCreated) {
                loadRecordData(newlyCreated);
            }
        } catch (error) {
            console.error('Failed to create record:', error);
            toast.error('Σφάλμα δημιουργίας εγγραφής');
        }
    };

    const addCostItem = (setter, currentArray) => {
        setter([...currentArray, {
            description: '',
            amount: 0,
            frequency_type: 'monthly',
            allocation_production_percent: 100,
            allocation_administration_percent: 0
        }]);
    };
    
    const addPersonnelCostItem = () => {
        setPersonnelCosts([...personnelCosts, {
            description: '',
            employee_type: '',
            amount: 0,
            frequency_type: 'monthly',
            allocation_production_percent: 100,
            allocation_administration_percent: 0
        }]);
    };
    
    const addBomCostItem = () => {
        setBomCosts([...bomCosts, {
            product_identifier: '',
            description: '',
            total_cost: 0
        }]);
    };
    
    const addSalesRevenueItem = () => {
        setSalesRevenueItems([...salesRevenueItems, {
            product_identifier: '',
            description: '',
            quantity_sold: 0,
            unit_selling_price: 0
        }]);
    };

    const updateCostItem = (setter, currentArray, index, field, value) => {
        const updated = [...currentArray];
        updated[index] = { ...updated[index], [field]: value };
        
        // Auto-calculate complementary allocation
        if (field === 'allocation_production_percent') {
            updated[index].allocation_administration_percent = 100 - parseFloat(value || 0);
        } else if (field === 'allocation_administration_percent') {
            updated[index].allocation_production_percent = 100 - parseFloat(value || 0);
        }
        
        setter(updated);
    };

    const removeCostItem = (setter, currentArray, index) => {
        setter(currentArray.filter((_, i) => i !== index));
    };

    const addVariation = (setter, currentArray) => {
        setter([...currentArray, { description: '', amount: 0 }]);
    };

    const updateVariation = (setter, currentArray, index, field, value) => {
        const updated = [...currentArray];
        updated[index] = { ...updated[index], [field]: value };
        setter(updated);
    };

    const removeVariation = (setter, currentArray, index) => {
        setter(currentArray.filter((_, i) => i !== index));
    };

    // Helper to convert cost to daily based on frequency
    const convertCostToDaily = (amount, frequencyType) => {
        const amt = parseFloat(amount) || 0;
        switch(frequencyType) {
            case 'daily':
                return amt;
            case 'per_production_day':
                return amt;
            case 'monthly':
                return amt / (avgWorkingDaysPerMonth || 22);
            case 'yearly':
                return amt / (avgWorkingDaysPerYear || 260);
            case 'one_time':
                return totalWorkingDays > 0 ? amt / totalWorkingDays : 0;
            default:
                return amt;
        }
    };

    // Calculations
    const calculateTotalIncome = () => {
        const salesRevenue = salesRevenueItems.reduce((sum, item) => {
            const qty = parseFloat(item.quantity_sold) || 0;
            const price = parseFloat(item.unit_selling_price) || 0;
            return sum + (qty * price);
        }, 0);
        const approved = approvedVariations.reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0);
        const potential = potentialVariations.reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0);
        return salesRevenue + parseFloat(contractAmount || 0) + approved + potential;
    };

    const calculateCostTotal = (costArray) => {
        return costArray.reduce((sum, item) => {
            const dailyCost = convertCostToDaily(item.amount, item.frequency_type);
            const totalForPeriod = dailyCost * (totalWorkingDays || 0);
            const productionPercent = parseFloat(item.allocation_production_percent) || 0;
            return sum + (totalForPeriod * productionPercent / 100);
        }, 0);
    };
    
    const calculateBomTotal = () => {
        return bomCosts.reduce((sum, item) => sum + (parseFloat(item.total_cost) || 0), 0);
    };

    const calculateTotalCosts = () => {
        return calculateCostTotal(personnelCosts) +
               calculateBomTotal() +
               calculateCostTotal(fixedCosts) +
               calculateCostTotal(overheadCosts) +
               calculateCostTotal(investmentAmortization) +
               calculateCostTotal(maintenanceCosts);
    };

    const formatCurrency = (value) => {
        return `€${parseFloat(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Factory Financial Calculations</h1>
                        <p className="text-slate-600 mt-1">Διαχείριση οικονομικών δεδομένων εργοστασίου</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={() => setShowCreateDialog(true)}
                            variant="outline"
                            className="flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Νέα Εγγραφή
                        </Button>
                        {selectedRecord && (
                            <>
                                <Button
                                    onClick={() => setShowCloneDialog(true)}
                                    variant="outline"
                                    className="flex items-center gap-2"
                                >
                                    <Copy className="w-4 h-4" />
                                    Κλωνοποίηση
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Αποθήκευση
                                </Button>
                            </>
                        )}
                    </div>
                </div>

{/* Version Selection */}
                {financialRecords.length > 0 ? (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="w-5 h-5" />
                                Επιλογή Έκδοσης
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <Label>Έκδοση Δεδομένων</Label>
                                    <Select
                                        value={selectedRecord?.id || ''}
                                        onValueChange={(value) => {
                                            const record = financialRecords.find(r => r.id === value);
                                            if (record) loadRecordData(record);
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Επιλέξτε έκδοση" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {financialRecords.map(record => (
                                                <SelectItem key={record.id} value={record.id}>
                                                    {record.factory_name} - {record.version || 'v1.0'} ({new Date(record.created_date).toLocaleDateString('el-GR')})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {selectedRecord && (
                                    <>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-500">Περίοδος</Label>
                                            <div className="text-sm font-medium">
                                                {new Date(selectedRecord.start_date).toLocaleDateString('el-GR')} - {new Date(selectedRecord.end_date).toLocaleDateString('el-GR')}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-500">Εργάσιμες Ημέρες</Label>
                                            <div className="text-sm font-medium">{totalWorkingDays}</div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Calendar className="w-12 h-12 text-slate-400 mb-4" />
                            <h3 className="text-lg font-semibold text-slate-700 mb-2">Δεν υπάρχουν εγγραφές</h3>
                            <p className="text-slate-500 mb-4 text-center">Δημιουργήστε την πρώτη σας εγγραφή οικονομικών δεδομένων</p>
                            <Button onClick={() => setShowCreateDialog(true)} className="flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                Δημιουργία Εγγραφής
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {selectedRecord && (
                    <>
                        {/* Period Settings */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-blue-600" />
                                    Ρυθμίσεις Περιόδου
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label>Συνολικές Εργάσιμες Ημέρες Περιόδου</Label>
                                    <Input
                                        type="number"
                                        value={totalWorkingDays}
                                        onChange={(e) => setTotalWorkingDays(parseFloat(e.target.value) || 0)}
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <Label>Μέσες Εργάσιμες Ημέρες/Μήνα</Label>
                                    <Input
                                        type="number"
                                        value={avgWorkingDaysPerMonth}
                                        onChange={(e) => setAvgWorkingDaysPerMonth(parseFloat(e.target.value) || 22)}
                                        placeholder="22"
                                    />
                                </div>
                                <div>
                                    <Label>Μέσες Εργάσιμες Ημέρες/Έτος</Label>
                                    <Input
                                        type="number"
                                        value={avgWorkingDaysPerYear}
                                        onChange={(e) => setAvgWorkingDaysPerYear(parseFloat(e.target.value) || 260)}
                                        placeholder="260"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* SECTION A - Income */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-green-600" />
                                    SECTION A — Έσοδα
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Sales Revenue Items */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <Label>Έσοδα Πωλήσεων ανά Προϊόν/Τύπο Στάσης</Label>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={addSalesRevenueItem}
                                        >
                                            <Plus className="w-4 h-4 mr-1" />
                                            Προσθήκη
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        {salesRevenueItems.map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <Input
                                                    placeholder="Product ID"
                                                    value={item.product_identifier}
                                                    onChange={(e) => {
                                                        const updated = [...salesRevenueItems];
                                                        updated[idx].product_identifier = e.target.value;
                                                        setSalesRevenueItems(updated);
                                                    }}
                                                    className="w-32"
                                                />
                                                <Input
                                                    placeholder="Περιγραφή"
                                                    value={item.description}
                                                    onChange={(e) => {
                                                        const updated = [...salesRevenueItems];
                                                        updated[idx].description = e.target.value;
                                                        setSalesRevenueItems(updated);
                                                    }}
                                                    className="flex-1"
                                                />
                                                <Input
                                                    type="number"
                                                    placeholder="Ποσότητα"
                                                    value={item.quantity_sold}
                                                    onChange={(e) => {
                                                        const updated = [...salesRevenueItems];
                                                        updated[idx].quantity_sold = e.target.value;
                                                        setSalesRevenueItems(updated);
                                                    }}
                                                    className="w-24"
                                                />
                                                <Input
                                                    type="number"
                                                    placeholder="Τιμή Μονάδας"
                                                    value={item.unit_selling_price}
                                                    onChange={(e) => {
                                                        const updated = [...salesRevenueItems];
                                                        updated[idx].unit_selling_price = e.target.value;
                                                        setSalesRevenueItems(updated);
                                                    }}
                                                    className="w-32"
                                                />
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => setSalesRevenueItems(salesRevenueItems.filter((_, i) => i !== idx))}
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Contract Amount */}
                                <div>
                                    <Label>Contract Amount</Label>
                                    <Input
                                        type="number"
                                        value={contractAmount}
                                        onChange={(e) => setContractAmount(e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>

                                {/* Approved Variations */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <Label>Approved Variations</Label>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => addVariation(setApprovedVariations, approvedVariations)}
                                        >
                                            <Plus className="w-4 h-4 mr-1" />
                                            Προσθήκη
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        {approvedVariations.map((variation, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <Input
                                                    placeholder="Περιγραφή"
                                                    value={variation.description}
                                                    onChange={(e) => updateVariation(setApprovedVariations, approvedVariations, idx, 'description', e.target.value)}
                                                    className="flex-1"
                                                />
                                                <Input
                                                    type="number"
                                                    placeholder="Ποσό"
                                                    value={variation.amount}
                                                    onChange={(e) => updateVariation(setApprovedVariations, approvedVariations, idx, 'amount', e.target.value)}
                                                    className="w-32"
                                                />
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => removeVariation(setApprovedVariations, approvedVariations, idx)}
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Potential Variations */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <Label>Potential Variations</Label>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => addVariation(setPotentialVariations, potentialVariations)}
                                        >
                                            <Plus className="w-4 h-4 mr-1" />
                                            Προσθήκη
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        {potentialVariations.map((variation, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <Input
                                                    placeholder="Περιγραφή"
                                                    value={variation.description}
                                                    onChange={(e) => updateVariation(setPotentialVariations, potentialVariations, idx, 'description', e.target.value)}
                                                    className="flex-1"
                                                />
                                                <Input
                                                    type="number"
                                                    placeholder="Ποσό"
                                                    value={variation.amount}
                                                    onChange={(e) => updateVariation(setPotentialVariations, potentialVariations, idx, 'amount', e.target.value)}
                                                    className="w-32"
                                                />
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => removeVariation(setPotentialVariations, potentialVariations, idx)}
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Total Income */}
                                <div className="pt-4 border-t">
                                    <div className="flex items-center justify-between text-lg font-semibold">
                                        <span>Σύνολο Εσόδων:</span>
                                        <span className="text-green-600">{formatCurrency(calculateTotalIncome())}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* SECTION B - Costs */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Package className="w-5 h-5 text-orange-600" />
                                    SECTION B — Κόστη
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Personnel Costs */}
                                {renderPersonnelCostSection()}

                                {/* BOM Costs */}
                                {renderBomCostSection()}

                                {/* Fixed Costs */}
                                {renderCostSection('Πάγια Κόστη (Fixed Costs)', fixedCosts, setFixedCosts)}

                                {/* Overhead Costs */}
                                {renderCostSection('Γενικά Έξοδα (Overhead Costs)', overheadCosts, setOverheadCosts)}

                                {/* Investment Amortization */}
                                {renderCostSection('Απόσβεση Επενδύσεων (Investment Amortization)', investmentAmortization, setInvestmentAmortization)}

                                {/* Maintenance Costs */}
                                {renderCostSection('Κόστη Συντήρησης (Maintenance Costs)', maintenanceCosts, setMaintenanceCosts)}
                            </CardContent>
                        </Card>

                        {/* SECTION C - Summary */}
                        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-blue-600" />
                                    SECTION C — Περίληψη
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-lg">
                                        <span className="font-medium">Συνολικά Έσοδα:</span>
                                        <span className="font-semibold text-green-600">{formatCurrency(calculateTotalIncome())}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-lg">
                                        <span className="font-medium">Συνολικά Κόστη (Παραγωγής):</span>
                                        <span className="font-semibold text-orange-600">{formatCurrency(calculateTotalCosts())}</span>
                                    </div>
                                    <div className="pt-4 border-t border-blue-200">
                                        <div className="flex items-center justify-between text-xl">
                                            <span className="font-bold">Καθαρό Κέρδος:</span>
                                            <span className="font-bold text-blue-600">
                                                {formatCurrency(calculateTotalIncome() - calculateTotalCosts())}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>

            {/* Clone Dialog */}
            <Dialog open={showCloneDialog} onOpenChange={setShowCloneDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Κλωνοποίηση Εγγραφής</DialogTitle>
                        <DialogDescription>
                            Δημιουργήστε νέα έκδοση από την τρέχουσα εγγραφή
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Όνομα Νέας Έκδοσης</Label>
                            <Input
                                value={cloneVersion}
                                onChange={(e) => setCloneVersion(e.target.value)}
                                placeholder="π.χ. v2.0"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCloneDialog(false)}>
                            Ακύρωση
                        </Button>
                        <Button onClick={handleClone}>
                            Κλωνοποίηση
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create New Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Δημιουργία Νέας Εγγραφής</DialogTitle>
                        <DialogDescription>
                            Δημιουργήστε νέα εγγραφή οικονομικών δεδομένων εργοστασίου
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Όνομα Εργοστασίου *</Label>
                            <Input
                                value={newRecord.factory_name}
                                onChange={(e) => setNewRecord({ ...newRecord, factory_name: e.target.value })}
                                placeholder="π.χ. Εργοστάσιο Παραγωγής"
                            />
                        </div>
                        <div>
                            <Label>Έκδοση</Label>
                            <Input
                                value={newRecord.version}
                                onChange={(e) => setNewRecord({ ...newRecord, version: e.target.value })}
                                placeholder="v1.0"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Ημερομηνία Έναρξης *</Label>
                                <Input
                                    type="date"
                                    value={newRecord.start_date}
                                    onChange={(e) => setNewRecord({ ...newRecord, start_date: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label>Ημερομηνία Λήξης *</Label>
                                <Input
                                    type="date"
                                    value={newRecord.end_date}
                                    onChange={(e) => setNewRecord({ ...newRecord, end_date: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                            Ακύρωση
                        </Button>
                        <Button onClick={handleCreateNew}>
                            Δημιουργία
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );

    function renderPersonnelCostSection() {
        return (
            <div>
                <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-semibold">Κόστος Προσωπικού (Personnel Costs)</Label>
                    <Button size="sm" variant="outline" onClick={addPersonnelCostItem}>
                        <Plus className="w-4 h-4 mr-1" />
                        Προσθήκη
                    </Button>
                </div>
                <div className="space-y-3">
                    {personnelCosts.map((item, idx) => (
                        <div key={idx} className="p-4 bg-slate-50 rounded-lg space-y-3">
                            <div className="flex items-start gap-2">
                                <Input
                                    placeholder="Περιγραφή"
                                    value={item.description}
                                    onChange={(e) => {
                                        const updated = [...personnelCosts];
                                        updated[idx].description = e.target.value;
                                        setPersonnelCosts(updated);
                                    }}
                                    className="flex-1"
                                />
                                <Input
                                    placeholder="Τύπος"
                                    value={item.employee_type}
                                    onChange={(e) => {
                                        const updated = [...personnelCosts];
                                        updated[idx].employee_type = e.target.value;
                                        setPersonnelCosts(updated);
                                    }}
                                    className="w-40"
                                />
                                <Input
                                    type="number"
                                    placeholder="Ποσό"
                                    value={item.amount}
                                    onChange={(e) => {
                                        const updated = [...personnelCosts];
                                        updated[idx].amount = e.target.value;
                                        setPersonnelCosts(updated);
                                    }}
                                    className="w-32"
                                />
                                <Select
                                    value={item.frequency_type}
                                    onValueChange={(value) => {
                                        const updated = [...personnelCosts];
                                        updated[idx].frequency_type = value;
                                        setPersonnelCosts(updated);
                                    }}
                                >
                                    <SelectTrigger className="w-40">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="daily">Ημερήσιο</SelectItem>
                                        <SelectItem value="per_production_day">Ανά Εργάσιμη</SelectItem>
                                        <SelectItem value="monthly">Μηνιαίο</SelectItem>
                                        <SelectItem value="yearly">Ετήσιο</SelectItem>
                                        <SelectItem value="one_time">Εφάπαξ</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setPersonnelCosts(personnelCosts.filter((_, i) => i !== idx))}
                                >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs">Κατανομή Παραγωγής (%)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={item.allocation_production_percent}
                                        onChange={(e) => {
                                            const updated = [...personnelCosts];
                                            updated[idx].allocation_production_percent = e.target.value;
                                            updated[idx].allocation_administration_percent = 100 - parseFloat(e.target.value || 0);
                                            setPersonnelCosts(updated);
                                        }}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Κατανομή Διοίκησης (%)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={item.allocation_administration_percent}
                                        onChange={(e) => {
                                            const updated = [...personnelCosts];
                                            updated[idx].allocation_administration_percent = e.target.value;
                                            updated[idx].allocation_production_percent = 100 - parseFloat(e.target.value || 0);
                                            setPersonnelCosts(updated);
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="text-xs text-slate-600 bg-blue-50 p-2 rounded">
                                <strong>Υπολογισμός:</strong> {formatCurrency(item.amount)} {item.frequency_type === 'monthly' ? `÷ ${avgWorkingDaysPerMonth} ημέρες/μήνα` : item.frequency_type === 'yearly' ? `÷ ${avgWorkingDaysPerYear} ημέρες/έτος` : item.frequency_type === 'one_time' ? `÷ ${totalWorkingDays} ημέρες περιόδου` : ''} = {formatCurrency(convertCostToDaily(item.amount, item.frequency_type))}/ημέρα × {totalWorkingDays} ημέρες × {item.allocation_production_percent}% = {formatCurrency(convertCostToDaily(item.amount, item.frequency_type) * totalWorkingDays * item.allocation_production_percent / 100)}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-2 text-sm font-medium text-slate-700">
                    Υποσύνολο (Παραγωγή): {formatCurrency(calculateCostTotal(personnelCosts))}
                </div>
            </div>
        );
    }

    function renderBomCostSection() {
        return (
            <div>
                <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-semibold">Κόστος BOM (Bill of Materials)</Label>
                    <Button size="sm" variant="outline" onClick={addBomCostItem}>
                        <Plus className="w-4 h-4 mr-1" />
                        Προσθήκη
                    </Button>
                </div>
                <div className="space-y-2">
                    {bomCosts.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                            <Input
                                placeholder="Product ID"
                                value={item.product_identifier}
                                onChange={(e) => {
                                    const updated = [...bomCosts];
                                    updated[idx].product_identifier = e.target.value;
                                    setBomCosts(updated);
                                }}
                                className="w-32"
                            />
                            <Input
                                placeholder="Περιγραφή"
                                value={item.description}
                                onChange={(e) => {
                                    const updated = [...bomCosts];
                                    updated[idx].description = e.target.value;
                                    setBomCosts(updated);
                                }}
                                className="flex-1"
                            />
                            <Input
                                type="number"
                                placeholder="Συνολικό Κόστος"
                                value={item.total_cost}
                                onChange={(e) => {
                                    const updated = [...bomCosts];
                                    updated[idx].total_cost = e.target.value;
                                    setBomCosts(updated);
                                }}
                                className="w-32"
                            />
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setBomCosts(bomCosts.filter((_, i) => i !== idx))}
                            >
                                <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                        </div>
                    ))}
                </div>
                <div className="mt-2 text-sm font-medium text-slate-700">
                    Σύνολο BOM: {formatCurrency(calculateBomTotal())}
                </div>
            </div>
        );
    }

    function renderCostSection(title, costArray, setter) {
        return (
            <div>
                <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-semibold">{title}</Label>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addCostItem(setter, costArray)}
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        Προσθήκη
                    </Button>
                </div>
                <div className="space-y-3">
                    {costArray.map((item, idx) => (
                        <div key={idx} className="p-4 bg-slate-50 rounded-lg space-y-3">
                            <div className="flex items-start gap-2">
                                <Input
                                    placeholder="Περιγραφή"
                                    value={item.description}
                                    onChange={(e) => updateCostItem(setter, costArray, idx, 'description', e.target.value)}
                                    className="flex-1"
                                />
                                <Input
                                    type="number"
                                    placeholder="Ποσό"
                                    value={item.amount}
                                    onChange={(e) => updateCostItem(setter, costArray, idx, 'amount', e.target.value)}
                                    className="w-32"
                                />
                                <Select
                                    value={item.frequency_type}
                                    onValueChange={(value) => updateCostItem(setter, costArray, idx, 'frequency_type', value)}
                                >
                                    <SelectTrigger className="w-40">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="daily">Ημερήσιο</SelectItem>
                                        <SelectItem value="per_production_day">Ανά Εργάσιμη</SelectItem>
                                        <SelectItem value="monthly">Μηνιαίο</SelectItem>
                                        <SelectItem value="yearly">Ετήσιο</SelectItem>
                                        <SelectItem value="one_time">Εφάπαξ</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => removeCostItem(setter, costArray, idx)}
                                >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs">Κατανομή Παραγωγής (%)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={item.allocation_production_percent}
                                        onChange={(e) => updateCostItem(setter, costArray, idx, 'allocation_production_percent', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Κατανομή Διοίκησης (%)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={item.allocation_administration_percent}
                                        onChange={(e) => updateCostItem(setter, costArray, idx, 'allocation_administration_percent', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="text-xs text-slate-600 bg-blue-50 p-2 rounded">
                                <strong>Υπολογισμός:</strong> {formatCurrency(item.amount)} {item.frequency_type === 'monthly' ? `÷ ${avgWorkingDaysPerMonth} ημέρες/μήνα` : item.frequency_type === 'yearly' ? `÷ ${avgWorkingDaysPerYear} ημέρες/έτος` : item.frequency_type === 'one_time' ? `÷ ${totalWorkingDays} ημέρες περιόδου` : ''} = {formatCurrency(convertCostToDaily(item.amount, item.frequency_type))}/ημέρα × {totalWorkingDays} ημέρες × {item.allocation_production_percent}% = {formatCurrency(convertCostToDaily(item.amount, item.frequency_type) * totalWorkingDays * item.allocation_production_percent / 100)}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-2 text-sm font-medium text-slate-700">
                    Υποσύνολο (Παραγωγή): {formatCurrency(calculateCostTotal(costArray))}
                </div>
            </div>
        );
    }
}