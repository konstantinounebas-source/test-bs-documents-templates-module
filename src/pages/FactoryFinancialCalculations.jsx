import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Copy, Save } from 'lucide-react';
import { usePageAccess } from "@/components/lib/usePageAccess";
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import VersionSelector from "@/components/factory-financial/VersionSelector";
import PeriodSettingsCard from "@/components/factory-financial/PeriodSettingsCard";
import ShelterRevenueSection from "@/components/factory-financial/ShelterRevenueSection";
import PersonnelCostSection from "@/components/factory-financial/PersonnelCostSection";
import BomCostSection from "@/components/factory-financial/BomCostSection";
import GenericCostSection from "@/components/factory-financial/GenericCostSection";
import InvestmentAmortizationSection from "@/components/factory-financial/InvestmentAmortizationSection";
import SummarySection from "@/components/factory-financial/SummarySection";
import DepartmentSummarySection from "@/components/factory-financial/DepartmentSummarySection";
import DepreciationModuleSection from "@/components/factory-financial/DepreciationModuleSection";
import DepreciationRateCard from "@/components/factory-financial/DepreciationRateCard";
import ValidationWarningCard from "@/components/factory-financial/ValidationWarningCard";

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
    const [shelterRevenueItems, setShelterRevenueItems] = useState([]);
    
    // Cost sections
    const [personnelCosts, setPersonnelCosts] = useState([]);
    const [bomCosts, setBomCosts] = useState([]);
    const [fixedCosts, setFixedCosts] = useState([]);
    const [overheadCosts, setOverheadCosts] = useState([]);
    const [investmentAmortization, setInvestmentAmortization] = useState([]);
    const [maintenanceCosts, setMaintenanceCosts] = useState([]);
    
    // Reference data from other modules
    const [departments, setDepartments] = useState([]);
    const [busStopTypes, setBusStopTypes] = useState([]);
    const [dailyMetrics, setDailyMetrics] = useState([]);
    
    // Depreciation module states
    const [depreciationInvestments, setDepreciationInvestments] = useState([]);
    const [estimatedRevenues, setEstimatedRevenues] = useState([]);
    const [additionalRevenues, setAdditionalRevenues] = useState([]);
    
    // Collapsible sections state
    const [expandedSections, setExpandedSections] = useState({
        operational: true,
        fixed: true,
        personnel: true,
        bom: true,
        fixedCosts: true,
        overhead: true,
        investment: true,
        maintenance: true
    });

    useEffect(() => {
        if (!accessLoading && hasAccess) {
            loadFinancialRecords();
            loadReferenceData();
        }
    }, [accessLoading, hasAccess]);
    
    const loadReferenceData = async () => {
        try {
            const [depts, busTypes, metrics] = await Promise.all([
                base44.entities.Department.list(),
                base44.entities.BusStopType.list(),
                base44.entities.MetricDefinition.list()
            ]);
            setDepartments(depts);
            setBusStopTypes(busTypes);
            setDailyMetrics(metrics);
        } catch (error) {
            console.error('Failed to load reference data:', error);
        }
    };

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
            
            setTotalWorkingDays(record.total_working_days_in_period || 0);
            setAvgWorkingDaysPerMonth(record.average_working_days_per_month || 22);
            setAvgWorkingDaysPerYear(record.average_working_days_per_year || 260);
            
            setShelterRevenueItems(record.shelter_revenue_items || []);
            
            setPersonnelCosts(record.personnel_costs || []);
            setBomCosts(record.bill_of_materials_costs || []);
            setFixedCosts(record.fixed_costs || []);
            setOverheadCosts(record.overhead_costs || []);
            setInvestmentAmortization(record.investment_amortization || []);
            setMaintenanceCosts(record.maintenance_costs || []);
            
            setDepreciationInvestments(record.depreciation_module?.investments || []);
            setEstimatedRevenues(record.depreciation_module?.estimated_revenues || []);
            setAdditionalRevenues(record.depreciation_module?.additional_revenues || []);
            
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

        if (!validateAllAllocations()) {
            toast.error('Όλα τα department allocations πρέπει να κάνουν 100%');
            return;
        }

        try {
            setIsSaving(true);
            
            const updatedData = {
                total_working_days_in_period: totalWorkingDays,
                average_working_days_per_month: avgWorkingDaysPerMonth,
                average_working_days_per_year: avgWorkingDaysPerYear,
                shelter_revenue_items: shelterRevenueItems,
                personnel_costs: personnelCosts,
                bill_of_materials_costs: bomCosts,
                fixed_costs: fixedCosts,
                overhead_costs: overheadCosts,
                investment_amortization: investmentAmortization,
                maintenance_costs: maintenanceCosts,
                depreciation_module: {
                    investments: depreciationInvestments,
                    estimated_revenues: estimatedRevenues,
                    additional_revenues: additionalRevenues
                }
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

    // ===== ALLOCATION HELPERS =====
    const getAllocationTotal = (allocations) => {
        return (allocations || []).reduce((sum, a) => sum + (parseFloat(a.allocation_percent) || 0), 0);
    };

    const hasInvalidAllocation = (items) => {
        if (!items || items.length === 0) return false;
        return items.some(item => {
            const allocations = item.department_allocations || [];
            if (allocations.length === 0) return false;
            const total = getAllocationTotal(allocations);
            return total < 99.99 || total > 100.01;
        });
    };

    const validateAllAllocations = () => {
        return ![personnelCosts, fixedCosts, overheadCosts, maintenanceCosts, investmentAmortization, depreciationInvestments]
            .some(hasInvalidAllocation);
    };

    // ===== GENERIC STATE UPDATE UTILITIES =====
    const updateArrayItem = (setter, array, index, field, value) => {
        const updated = [...array];
        updated[index] = { ...updated[index], [field]: value };
        setter(updated);
    };

    const addArrayItem = (setter, array, newItem) => {
        setter([...array, newItem]);
    };

    const removeArrayItem = (setter, array, index) => {
        setter(array.filter((_, i) => i !== index));
    };

    const addDeptAllocation = (setter, array, itemIdx) => {
        const updated = [...array];
        updated[itemIdx].department_allocations = [...(updated[itemIdx].department_allocations || []), 
            { department_id: '', allocation_percent: 0 }];
        setter(updated);
    };

    const updateDeptAllocation = (setter, array, itemIdx, allocIdx, field, value) => {
        const updated = [...array];
        updated[itemIdx].department_allocations[allocIdx][field] = value;
        setter(updated);
    };

    const removeDeptAllocation = (setter, array, itemIdx, allocIdx) => {
        const updated = [...array];
        updated[itemIdx].department_allocations = updated[itemIdx].department_allocations
            .filter((_, i) => i !== allocIdx);
        setter(updated);
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
                shelter_revenue_items: shelterRevenueItems,
                personnel_costs: personnelCosts,
                bill_of_materials_costs: bomCosts,
                fixed_costs: fixedCosts,
                overhead_costs: overheadCosts,
                investment_amortization: investmentAmortization,
                maintenance_costs: maintenanceCosts,
                depreciation_module: {
                    investments: depreciationInvestments,
                    estimated_revenues: estimatedRevenues,
                    additional_revenues: additionalRevenues
                },
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
                shelter_revenue_items: [],
                personnel_costs: [],
                bill_of_materials_costs: [],
                fixed_costs: [],
                overhead_costs: [],
                investment_amortization: [],
                maintenance_costs: [],
                depreciation_module: {
                    investments: [],
                    estimated_revenues: [],
                    additional_revenues: []
                },
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

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };
    
    const handleBusStopTypeChange = async (idx, busStopTypeId) => {
        const updated = [...bomCosts];
        updated[idx].bus_stop_type_id = busStopTypeId;
        
        if (busStopTypeId) {
            const selectedType = busStopTypes.find(t => t.id === busStopTypeId);
            if (selectedType) {
                updated[idx].product_identifier = selectedType.type_code || '';
                updated[idx].description = selectedType.type_name || '';
                
                try {
                    const components = await base44.entities.BusStopTypeComponent.filter({ bus_stop_type_id: busStopTypeId });
                    const totalCost = components.reduce((sum, comp) => {
                        return sum + (parseFloat(comp.total_cost) || 0);
                    }, 0);
                    updated[idx].calculated_bom_cost = totalCost;
                } catch (error) {
                    console.error('Failed to fetch BOM cost:', error);
                }
            }
        }
        
        setBomCosts(updated);
    };
    
    const handleInvestmentChange = (idx, field, value) => {
        const updated = [...investmentAmortization];
        updated[idx][field] = value;
        if (field === 'total_investment_amount' || field === 'project_duration_months') {
            const totalAmount = parseFloat(updated[idx].total_investment_amount) || 0;
            const durationMonths = parseFloat(updated[idx].project_duration_months) || 1;
            const totalDays = durationMonths * (avgWorkingDaysPerMonth || 22);
            updated[idx].calculated_daily_cost = totalDays > 0 ? totalAmount / totalDays : 0;
        }
        setInvestmentAmortization(updated);
    };

    // ===== SHELTER REVENUE HELPERS =====
    const updateShelterRevenueItem = (index, field, value) => {
        const updated = [...shelterRevenueItems];
        updated[index] = { ...updated[index], [field]: value };
        setShelterRevenueItems(updated);
    };

    const updateShelterVariation = (itemIndex, variationType, variationIndex, field, value) => {
        const updated = [...shelterRevenueItems];
        updated[itemIndex][variationType][variationIndex] = { ...updated[itemIndex][variationType][variationIndex], [field]: value };
        setShelterRevenueItems(updated);
    };

    const removeShelterVariation = (itemIndex, variationType, variationIndex) => {
        const updated = [...shelterRevenueItems];
        updated[itemIndex][variationType] = updated[itemIndex][variationType].filter((_, i) => i !== variationIndex);
        setShelterRevenueItems(updated);
    };

    // ===== COST CONVERSION =====
    const convertCostToDaily = (amount, frequencyType) => {
        const amt = parseFloat(amount) || 0;
        switch(frequencyType) {
            case 'daily':
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

    // ===== SHELTER REVENUE CALCULATIONS =====
    const getVariationsTotal = (variations) => {
        return variations.reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0);
    };

    const getShelterRevenueTotal = (item) => {
        const contract = parseFloat(item.contract_amount) || 0;
        const jv = parseFloat(item.amount_from_jv) || 0;
        const approved = getVariationsTotal(item.approved_variations);
        const potential = getVariationsTotal(item.potential_variations);
        return contract + jv + approved + potential;
    };

    const calculateTotalIncome = () => {
        return shelterRevenueItems.reduce((sum, item) => sum + getShelterRevenueTotal(item), 0);
    };

    // ===== COST CALCULATIONS =====
    const getTotalAllocPct = (allocations) =>
        (allocations || []).reduce((sum, a) => sum + (parseFloat(a.allocation_percent) || 0), 0);

    const calculateCostWithAlloc = (items, getAmountField, isDailyAlready = false) => {
        return items.reduce((sum, item) => {
            const amount = getAmountField(item);
            const dailyCost = isDailyAlready ? amount : convertCostToDaily(amount, item.frequency_type);
            const totalForPeriod = dailyCost * (totalWorkingDays || 0);
            const totalAlloc = getTotalAllocPct(item.department_allocations);
            return sum + (totalForPeriod * totalAlloc / 100);
        }, 0);
    };

    const calculatePersonnelCostTotal = () => 
        calculateCostWithAlloc(personnelCosts, item => item.calculated_amount);
    
    const calculateBomTotal = () => {
        return bomCosts.reduce((sum, item) => {
            const cost = parseFloat(item.calculated_bom_cost) || 0;
            const qty = parseFloat(item.quantity) || 1;
            return sum + (cost * qty);
        }, 0);
    };
    
    const calculateInvestmentTotal = () => 
        calculateCostWithAlloc(investmentAmortization, item => item.calculated_daily_cost, true);
    
    const calculateCostTotal = (costArray) => 
        calculateCostWithAlloc(costArray, item => item.amount);

    const calculateTotalCosts = () => {
        return calculatePersonnelCostTotal() +
               calculateBomTotal() +
               calculateCostTotal(fixedCosts) +
               calculateCostTotal(overheadCosts) +
               calculateInvestmentTotal() +
               calculateCostTotal(maintenanceCosts);
    };

    const formatCurrency = (value) => {
        return `€${parseFloat(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // ===== DEPRECIATION CALCULATIONS =====
    const calculateDepreciationInvestmentsTotal = () => {
        return depreciationInvestments.reduce((sum, item) => {
            const amount = parseFloat(item.total_amount) || 0;
            const totalAllocation = getAllocationTotal(item.department_allocations);
            return sum + (amount * totalAllocation / 100);
        }, 0);
    };

    const calculateEstimatedRevenuesTotal = () => {
        return estimatedRevenues.reduce((sum, item) => {
            const totalRevenue = item.total_revenue != null
                ? parseFloat(item.total_revenue) || 0
                : (parseFloat(item.pending_quantity) || 0) * (parseFloat(item.unit_revenue) || 0);
            return sum + totalRevenue;
        }, 0);
    };

    const calculateAdditionalRevenuesTotal = () => {
        return additionalRevenues.reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0);
    };

    const calculateTotalDepreciationRevenueBase = () => {
        return calculateEstimatedRevenuesTotal() + calculateAdditionalRevenuesTotal();
    };

    const calculateDepreciationFactor = () => {
        const revenueBase = calculateTotalDepreciationRevenueBase();
        return revenueBase > 0 ? calculateDepreciationInvestmentsTotal() / revenueBase : 0;
    };

    const calculateDepartmentSummary = () => {
        const deptMap = {};

        const ensureDept = (deptId) => {
            if (!deptMap[deptId]) {
                const dept = departments.find(d => d.id === deptId);
                deptMap[deptId] = {
                    department_id: deptId,
                    department_name: dept ? dept.department_name : deptId,
                    personnel_total: 0,
                    fixed_total: 0,
                    overhead_total: 0,
                    maintenance_total: 0,
                    investment_amortization_total: 0,
                    depreciation_investments_total: 0,
                };
            }
        };

        const distribute = (items, getItemTotal, field) => {
            items.forEach(item => {
                const allocs = item.department_allocations || [];
                if (allocs.length === 0) return;
                const itemTotal = getItemTotal(item);
                allocs.forEach(alloc => {
                    if (!alloc.department_id) return;
                    ensureDept(alloc.department_id);
                    deptMap[alloc.department_id][field] += itemTotal * (parseFloat(alloc.allocation_percent) || 0) / 100;
                });
            });
        };

        distribute(personnelCosts, item => convertCostToDaily(item.calculated_amount, item.frequency_type) * totalWorkingDays, 'personnel_total');
        distribute(fixedCosts, item => convertCostToDaily(item.amount, item.frequency_type) * totalWorkingDays, 'fixed_total');
        distribute(overheadCosts, item => convertCostToDaily(item.amount, item.frequency_type) * totalWorkingDays, 'overhead_total');
        distribute(maintenanceCosts, item => convertCostToDaily(item.amount, item.frequency_type) * totalWorkingDays, 'maintenance_total');
        distribute(investmentAmortization, item => (parseFloat(item.calculated_daily_cost) || 0) * totalWorkingDays, 'investment_amortization_total');
        distribute(depreciationInvestments, item => parseFloat(item.total_amount) || 0, 'depreciation_investments_total');

        return Object.values(deptMap)
            .map(d => ({
                ...d,
                grand_total: d.personnel_total + d.fixed_total + d.overhead_total + d.maintenance_total + d.investment_amortization_total + d.depreciation_investments_total
            }))
            .filter(d => d.grand_total > 0);
    };

    // ===== DEPRECIATION HELPERS =====
    const updateDepreciationInvestment = (idx, field, value) => {
        updateArrayItem(setDepreciationInvestments, depreciationInvestments, idx, field, value);
    };

    const updateEstimatedRevenue = (idx, field, value) => {
        const updated = [...estimatedRevenues];
        
        if (field === 'bus_stop_type_id') {
            updated[idx].bus_stop_type_id = value;
            const selectedType = busStopTypes.find(t => t.id === value);
            if (selectedType && !updated[idx].description) {
                updated[idx].description = selectedType.type_name;
            }
        } else if (field === 'pending_quantity' || field === 'unit_revenue') {
            updated[idx][field] = parseFloat(value) || 0;
            updated[idx].total_revenue = (parseFloat(updated[idx].pending_quantity) || 0) * (parseFloat(updated[idx].unit_revenue) || 0);
        } else {
            updated[idx][field] = value;
        }
        
        setEstimatedRevenues(updated);
    };

    const updateAdditionalRevenue = (idx, field, value) => {
        updateArrayItem(setAdditionalRevenues, additionalRevenues, idx, field, value);
    };

    const getDeptName = (departmentId) => {
        const dept = departments.find(d => d.id === departmentId);
        return dept ? dept.department_name : departmentId;
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
                <VersionSelector
                    financialRecords={financialRecords}
                    selectedRecord={selectedRecord}
                    totalWorkingDays={totalWorkingDays}
                    onLoadRecord={loadRecordData}
                    onCreateNew={() => setShowCreateDialog(true)}
                />

                {selectedRecord && (
                    <>
                        {/* Period Settings */}
                        <PeriodSettingsCard
                            totalWorkingDays={totalWorkingDays}
                            avgWorkingDaysPerMonth={avgWorkingDaysPerMonth}
                            avgWorkingDaysPerYear={avgWorkingDaysPerYear}
                            onUpdate={(field, value) => {
                                if (field === 'totalWorkingDays') setTotalWorkingDays(value);
                                else if (field === 'avgWorkingDaysPerMonth') setAvgWorkingDaysPerMonth(value);
                                else if (field === 'avgWorkingDaysPerYear') setAvgWorkingDaysPerYear(value);
                            }}
                        />

                        {/* SECTION A - Income */}
                        <ShelterRevenueSection
                            shelterRevenueItems={shelterRevenueItems}
                            busStopTypes={busStopTypes}
                            formatCurrency={formatCurrency}
                            getVariationsTotal={getVariationsTotal}
                            getShelterRevenueTotal={getShelterRevenueTotal}
                            calculateTotalIncome={calculateTotalIncome}
                            onAddItem={() => addArrayItem(setShelterRevenueItems, shelterRevenueItems, {
                                bus_shelter_type_id: '',
                                description: '',
                                contract_amount: 0,
                                amount_from_jv: 0,
                                approved_variations: [],
                                potential_variations: []
                            })}
                            onRemoveItem={(idx) => removeArrayItem(setShelterRevenueItems, shelterRevenueItems, idx)}
                            onUpdateItem={(idx, field, value) => updateShelterRevenueItem(idx, field, value)}
                            onUpdateVariation={(itemIdx, varType, varIdx, field, value) => updateShelterVariation(itemIdx, varType, varIdx, field, value)}
                            onRemoveVariation={(itemIdx, varType, varIdx) => removeShelterVariation(itemIdx, varType, varIdx)}
                            onAddVariation={(itemIdx, varType) => {
                                const updated = [...shelterRevenueItems];
                                updated[itemIdx][varType] = [...updated[itemIdx][varType], { description: '', amount: 0 }];
                                setShelterRevenueItems(updated);
                            }}
                        />

                        {/* SECTION B - Costs (with render functions inline for now) */}
                        {renderCostSectionsCard()}

                        {/* Allocation Validation Warning */}
                        {!validateAllAllocations() && <ValidationWarningCard />}

                        {/* SECTION C - Summary */}
                        <SummarySection
                            totalIncome={calculateTotalIncome()}
                            totalCosts={calculateTotalCosts()}
                            formatCurrency={formatCurrency}
                        />

                        {/* SECTION D - Department Summary */}
                        <DepartmentSummarySection
                            summary={calculateDepartmentSummary()}
                            formatCurrency={formatCurrency}
                        />

                        {/* Depreciation Module */}
                        <DepreciationModuleSection
                            depreciationInvestments={depreciationInvestments}
                            estimatedRevenues={estimatedRevenues}
                            additionalRevenues={additionalRevenues}
                            departments={departments}
                            busStopTypes={busStopTypes}
                            formatCurrency={formatCurrency}
                            getAllocationTotal={getAllocationTotal}
                            getDeptName={getDeptName}
                            calculateDepreciationInvestmentsTotal={calculateDepreciationInvestmentsTotal}
                            calculateEstimatedRevenuesTotal={calculateEstimatedRevenuesTotal}
                            calculateAdditionalRevenuesTotal={calculateAdditionalRevenuesTotal}
                            onAddDeprecInv={() => addArrayItem(setDepreciationInvestments, depreciationInvestments, {
                                description: '', category: 'materials', total_amount: 0, department_allocations: []
                            })}
                            onRemoveDeprecInv={(idx) => removeArrayItem(setDepreciationInvestments, depreciationInvestments, idx)}
                            onUpdateDeprecInv={(idx, field, value) => updateArrayItem(setDepreciationInvestments, depreciationInvestments, idx, field, value)}
                            onAddDeptAllocDepr={(idx) => addDeptAllocation(setDepreciationInvestments, depreciationInvestments, idx)}
                            onRemoveDeptAllocDepr={(idx, allocIdx) => removeDeptAllocation(setDepreciationInvestments, depreciationInvestments, idx, allocIdx)}
                            onUpdateDeptAllocDepr={(idx, allocIdx, field, value) => updateDeptAllocation(setDepreciationInvestments, depreciationInvestments, idx, allocIdx, field, value)}
                            onAddEstRevenue={() => addArrayItem(setEstimatedRevenues, estimatedRevenues, {
                                bus_stop_type_id: '', description: '', pending_quantity: 0, unit_revenue: 0, total_revenue: 0
                            })}
                            onRemoveEstRevenue={(idx) => removeArrayItem(setEstimatedRevenues, estimatedRevenues, idx)}
                            onUpdateEstRevenue={(idx, field, value) => updateEstimatedRevenue(idx, field, value)}
                            onAddAddRevenue={() => addArrayItem(setAdditionalRevenues, additionalRevenues, {
                                description: '', total_amount: 0
                            })}
                            onRemoveAddRevenue={(idx) => removeArrayItem(setAdditionalRevenues, additionalRevenues, idx)}
                            onUpdateAddRevenue={(idx, field, value) => updateArrayItem(setAdditionalRevenues, additionalRevenues, idx, field, value)}
                        />

                        {/* Depreciation Rate on Revenue */}
                        <DepreciationRateCard
                            totalRevenueBase={calculateTotalDepreciationRevenueBase()}
                            totalDepreciationCost={calculateDepreciationInvestmentsTotal()}
                            depreciationFactor={calculateDepreciationFactor()}
                            formatCurrency={formatCurrency}
                        />
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

    function renderCostSectionsCard() {
        return (
            <div className="space-y-6">
                <PersonnelCostSection
                    personnelCosts={personnelCosts} dailyMetrics={dailyMetrics} departments={departments} expandedSections={expandedSections} totalWorkingDays={totalWorkingDays} formatCurrency={formatCurrency} convertCostToDaily={convertCostToDaily} calculatePersonnelCostTotal={calculatePersonnelCostTotal} onToggleSection={toggleSection}
                    onAddItem={() => addArrayItem(setPersonnelCosts, personnelCosts, { metric_id: '', description: '', calculated_amount: 0, frequency_type: 'monthly', department_allocations: [] })}
                    onRemoveItem={(idx) => removeArrayItem(setPersonnelCosts, personnelCosts, idx)}
                    onUpdateItem={(idx, field, value) => { const u = [...personnelCosts]; u[idx][field] = value; setPersonnelCosts(u); }}
                    onAddDeptAlloc={(idx) => addDeptAllocation(setPersonnelCosts, personnelCosts, idx)}
                    onUpdateDeptAlloc={(idx, allocIdx, field, value) => updateDeptAllocation(setPersonnelCosts, personnelCosts, idx, allocIdx, field, value)}
                    onRemoveDeptAlloc={(idx, allocIdx) => removeDeptAllocation(setPersonnelCosts, personnelCosts, idx, allocIdx)}
                />
                <BomCostSection bomCosts={bomCosts} busStopTypes={busStopTypes} expandedSections={expandedSections} formatCurrency={formatCurrency} calculateBomTotal={calculateBomTotal} onToggleSection={toggleSection} onAddItem={() => addArrayItem(setBomCosts, bomCosts, { bus_stop_type_id: '', product_identifier: '', description: '', calculated_bom_cost: 0, quantity: 1 })} onRemoveItem={(idx) => removeArrayItem(setBomCosts, bomCosts, idx)} onUpdateItem={(idx, field, value) => updateArrayItem(setBomCosts, bomCosts, idx, field, value)} onBusStopTypeChange={handleBusStopTypeChange} />
                <GenericCostSection title="Γενικά Έξοδα (Overhead Costs)" sectionKey="overhead" costArray={overheadCosts} departments={departments} expandedSections={expandedSections} totalWorkingDays={totalWorkingDays} formatCurrency={formatCurrency} convertCostToDaily={convertCostToDaily} calculateCostTotal={calculateCostTotal} onToggleSection={toggleSection} onAddItem={() => addArrayItem(setOverheadCosts, overheadCosts, { description: '', amount: 0, frequency_type: 'monthly', department_allocations: [] })} onRemoveItem={(idx) => removeArrayItem(setOverheadCosts, overheadCosts, idx)} onUpdateItem={(idx, field, value) => updateArrayItem(setOverheadCosts, overheadCosts, idx, field, value)} onAddDeptAlloc={(idx) => addDeptAllocation(setOverheadCosts, overheadCosts, idx)} onUpdateDeptAlloc={(idx, allocIdx, field, value) => updateDeptAllocation(setOverheadCosts, overheadCosts, idx, allocIdx, field, value)} onRemoveDeptAlloc={(idx, allocIdx) => removeDeptAllocation(setOverheadCosts, overheadCosts, idx, allocIdx)} />
                <GenericCostSection title="Κόστη Συντήρησης (Maintenance Costs)" sectionKey="maintenance" costArray={maintenanceCosts} departments={departments} expandedSections={expandedSections} totalWorkingDays={totalWorkingDays} formatCurrency={formatCurrency} convertCostToDaily={convertCostToDaily} calculateCostTotal={calculateCostTotal} onToggleSection={toggleSection} onAddItem={() => addArrayItem(setMaintenanceCosts, maintenanceCosts, { description: '', amount: 0, frequency_type: 'monthly', department_allocations: [] })} onRemoveItem={(idx) => removeArrayItem(setMaintenanceCosts, maintenanceCosts, idx)} onUpdateItem={(idx, field, value) => updateArrayItem(setMaintenanceCosts, maintenanceCosts, idx, field, value)} onAddDeptAlloc={(idx) => addDeptAllocation(setMaintenanceCosts, maintenanceCosts, idx)} onUpdateDeptAlloc={(idx, allocIdx, field, value) => updateDeptAllocation(setMaintenanceCosts, maintenanceCosts, idx, allocIdx, field, value)} onRemoveDeptAlloc={(idx, allocIdx) => removeDeptAllocation(setMaintenanceCosts, maintenanceCosts, idx, allocIdx)} />
                <InvestmentAmortizationSection investmentAmortization={investmentAmortization} departments={departments} expandedSections={expandedSections} totalWorkingDays={totalWorkingDays} formatCurrency={formatCurrency} calculateInvestmentTotal={calculateInvestmentTotal} onToggleSection={toggleSection} onAddItem={() => addArrayItem(setInvestmentAmortization, investmentAmortization, { description: '', total_investment_amount: 0, project_duration_months: 12, calculated_daily_cost: 0, department_allocations: [] })} onRemoveItem={(idx) => removeArrayItem(setInvestmentAmortization, investmentAmortization, idx)} onUpdateItem={(idx, field, value) => handleInvestmentChange(idx, field, value)} onAddDeptAlloc={(idx) => addDeptAllocation(setInvestmentAmortization, investmentAmortization, idx)} onUpdateDeptAlloc={(idx, allocIdx, field, value) => updateDeptAllocation(setInvestmentAmortization, investmentAmortization, idx, allocIdx, field, value)} onRemoveDeptAlloc={(idx, allocIdx) => removeDeptAllocation(setInvestmentAmortization, investmentAmortization, idx, allocIdx)} />
            </div>
        );
    }

}