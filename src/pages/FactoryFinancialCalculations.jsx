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
import SummarySection from "@/components/factory-financial/SummarySection";
import DepartmentSummarySection from "@/components/factory-financial/DepartmentSummarySection";
import DepreciationModuleSection from "@/components/factory-financial/DepreciationModuleSection";
import DepreciationRateCard from "@/components/factory-financial/DepreciationRateCard";
import ValidationWarningCard from "@/components/factory-financial/ValidationWarningCard";
import FactoryCostSectionsCard from "@/components/factory-financial/FactoryCostSectionsCard";
import FixedCostsTableSection from "@/components/factory-financial/FixedCostsTableSection";
import OperationalCostsTableSection from "@/components/factory-financial/OperationalCostsTableSection";
import {
    getAllocationTotal,
    hasInvalidAllocation,
    convertCostToDaily,
    getVariationsTotal,
    getShelterRevenueTotal,
    calculateCostWithAlloc,
    calculatePersonnelCostTotal,
    calculateBomTotal,
    calculateInvestmentTotal,
    calculateCostTotal,
    calculateTotalCosts,
    calculateDepreciationInvestmentsTotal,
    calculateEstimatedRevenuesTotal,
    calculateAdditionalRevenuesTotal,
    calculateTotalDepreciationRevenueBase,
    calculateDepreciationFactor,
    calculateDepartmentSummary,
    formatCurrency,
} from "@/components/factory-financial/utils/financialCalculations";
import {
    updateArrayItem,
    addArrayItem,
    removeArrayItem,
    addDeptAllocation,
    updateDeptAllocation,
    removeDeptAllocation,
} from "@/components/factory-financial/utils/stateHelpers";
import {
    DEFAULT_FIXED_COSTS,
    DEFAULT_OPERATIONAL_COSTS,
    ensureRowsWithDefaults,
    normalizeLoadedExpenseRows,
    initializeFixedExpenseRows,
    initializeOperationalExpenseRows,
} from "@/components/factory-financial/utils/expenseRowDefaults";

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
    const [operationalCosts, setOperationalCosts] = useState([]);
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
        fixedCosts: true,
        operational: true,
        personnel: true,
        bom: true,
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
            
            setPersonnelCosts(normalizeLoadedExpenseRows(record.personnel_costs || []));
            setBomCosts(record.bill_of_materials_costs || []);
            setFixedCosts(normalizeLoadedExpenseRows(record.fixed_costs && record.fixed_costs.length > 0 ? record.fixed_costs : DEFAULT_FIXED_COSTS));
            setOperationalCosts(normalizeLoadedExpenseRows(record.operational_costs && record.operational_costs.length > 0 ? record.operational_costs : DEFAULT_OPERATIONAL_COSTS));
            setOverheadCosts(normalizeLoadedExpenseRows(record.overhead_costs || []));
            setInvestmentAmortization(normalizeLoadedExpenseRows(record.investment_amortization || []));
            setMaintenanceCosts(normalizeLoadedExpenseRows(record.maintenance_costs || []));
            
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
                operational_costs: operationalCosts,
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

    const validateAllAllocations = () => {
        return ![personnelCosts, fixedCosts, operationalCosts, overheadCosts, maintenanceCosts, investmentAmortization, depreciationInvestments]
            .some(hasInvalidAllocation);
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
                operational_costs: operationalCosts,
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
                fixed_costs: initializeFixedExpenseRows('with_defaults'),
                operational_costs: initializeOperationalExpenseRows('with_defaults'),
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



    const calculateTotalIncome = () => {
        return shelterRevenueItems.reduce((sum, item) => sum + getShelterRevenueTotal(item), 0);
    };

    // Helper wrappers for calculation functions that need component state parameters
    const getConvertCostToDaily = (amount, frequencyType) => 
        convertCostToDaily(amount, frequencyType, avgWorkingDaysPerMonth, avgWorkingDaysPerYear, totalWorkingDays);

    const getCalculatePersonnelCostTotal = () => 
        calculatePersonnelCostTotal(personnelCosts, totalWorkingDays, avgWorkingDaysPerMonth, avgWorkingDaysPerYear);

    const getCalculateBomTotal = () => calculateBomTotal(bomCosts);

    const getCalculateInvestmentTotal = () => 
        calculateInvestmentTotal(investmentAmortization, totalWorkingDays, avgWorkingDaysPerMonth, avgWorkingDaysPerYear);

    const getCalculateCostTotal = (costArray) => 
        calculateCostTotal(costArray, totalWorkingDays, avgWorkingDaysPerMonth, avgWorkingDaysPerYear);

    const getCalculateTotalCosts = () => 
        calculateTotalCosts(
            personnelCosts, bomCosts, fixedCosts, operationalCosts, overheadCosts, investmentAmortization, maintenanceCosts,
            totalWorkingDays, avgWorkingDaysPerMonth, avgWorkingDaysPerYear
        );

    const getCalculateDepreciationInvestmentsTotal = () => calculateDepreciationInvestmentsTotal(depreciationInvestments);

    const getCalculateEstimatedRevenuesTotal = () => calculateEstimatedRevenuesTotal(estimatedRevenues);

    const getCalculateAdditionalRevenuesTotal = () => calculateAdditionalRevenuesTotal(additionalRevenues);

    const getCalculateTotalDepreciationRevenueBase = () => 
        calculateTotalDepreciationRevenueBase(estimatedRevenues, additionalRevenues);

    const getCalculateDepreciationFactor = () => 
        calculateDepreciationFactor(depreciationInvestments, estimatedRevenues, additionalRevenues);

    const getCalculateDepartmentSummary = () => 
        calculateDepartmentSummary(
            personnelCosts, fixedCosts, operationalCosts, overheadCosts, maintenanceCosts, investmentAmortization, depreciationInvestments,
            departments, totalWorkingDays, avgWorkingDaysPerMonth, avgWorkingDaysPerYear
        );

    // ===== DEPRECIATION & SHELTER REVENUE HANDLERS =====
    const updateDepreciationInvestment = (idx, field, value) => {
        setDepreciationInvestments(updateArrayItem(depreciationInvestments, idx, field, value));
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
        setAdditionalRevenues(updateArrayItem(additionalRevenues, idx, field, value));
    };

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

                        {/* SECTION B - Costs */}
                         <div className="space-y-6">
                             {/* Fixed Costs - Table Style */}
                             <FixedCostsTableSection
                                 fixedCosts={fixedCosts}
                                 departments={departments}
                                 expandedSections={expandedSections}
                                 totalWorkingDays={totalWorkingDays}
                                 formatCurrency={formatCurrency}
                                 convertCostToDaily={(amount, freq) => convertCostToDaily(amount, freq, avgWorkingDaysPerMonth, avgWorkingDaysPerYear, totalWorkingDays)}
                                 calculateCostTotal={() => calculateCostTotal(fixedCosts, totalWorkingDays, avgWorkingDaysPerMonth, avgWorkingDaysPerYear)}
                                 onToggleSection={toggleSection}
                                 onAddItem={() => setFixedCosts(prev => addArrayItem(prev, { description: '', amount: 0, frequency_type: 'monthly', category: 'fixed', department_allocations: [] }))}
                                 onRemoveItem={(idx) => setFixedCosts(prev => removeArrayItem(prev, idx))}
                                 onUpdateItem={(idx, field, value) => setFixedCosts(prev => updateArrayItem(prev, idx, field, value))}
                                 onAddDeptAlloc={(idx) => setFixedCosts(prev => addDeptAllocation(prev, idx))}
                                 onUpdateDeptAlloc={(idx, allocIdx, field, value) => setFixedCosts(prev => updateDeptAllocation(prev, idx, allocIdx, field, value))}
                                 onRemoveDeptAlloc={(idx, allocIdx) => setFixedCosts(prev => removeDeptAllocation(prev, idx, allocIdx))}
                             />

                             {/* Operational Costs - Table Style */}
                             <OperationalCostsTableSection
                                 operationalCosts={operationalCosts}
                                 departments={departments}
                                 expandedSections={expandedSections}
                                 totalWorkingDays={totalWorkingDays}
                                 formatCurrency={formatCurrency}
                                 convertCostToDaily={(amount, freq) => convertCostToDaily(amount, freq, avgWorkingDaysPerMonth, avgWorkingDaysPerYear, totalWorkingDays)}
                                 calculateCostTotal={() => calculateCostTotal(operationalCosts, totalWorkingDays, avgWorkingDaysPerMonth, avgWorkingDaysPerYear)}
                                 onToggleSection={toggleSection}
                                 onAddItem={() => setOperationalCosts(prev => addArrayItem(prev, { description: '', amount: 0, frequency_type: 'monthly', category: 'operational', department_allocations: [] }))}
                                 onRemoveItem={(idx) => setOperationalCosts(prev => removeArrayItem(prev, idx))}
                                 onUpdateItem={(idx, field, value) => setOperationalCosts(prev => updateArrayItem(prev, idx, field, value))}
                                 onAddDeptAlloc={(idx) => setOperationalCosts(prev => addDeptAllocation(prev, idx))}
                                 onUpdateDeptAlloc={(idx, allocIdx, field, value) => setOperationalCosts(prev => updateDeptAllocation(prev, idx, allocIdx, field, value))}
                                 onRemoveDeptAlloc={(idx, allocIdx) => setOperationalCosts(prev => removeDeptAllocation(prev, idx, allocIdx))}
                             />

                             {/* Other Costs - Using FactoryCostSectionsCard */}
                             <FactoryCostSectionsCard
                                 personnelCosts={personnelCosts}
                                 dailyMetrics={dailyMetrics}
                                 bomCosts={bomCosts}
                                 busStopTypes={busStopTypes}
                                 overheadCosts={overheadCosts}
                                 maintenanceCosts={maintenanceCosts}
                                 investmentAmortization={investmentAmortization}
                                 departments={departments}
                                 expandedSections={expandedSections}
                                 totalWorkingDays={totalWorkingDays}
                                 formatCurrency={formatCurrency}
                                 convertCostToDaily={getConvertCostToDaily}
                                 calculatePersonnelCostTotal={getCalculatePersonnelCostTotal}
                                 calculateBomTotal={getCalculateBomTotal}
                                 calculateCostTotal={getCalculateCostTotal}
                                 calculateInvestmentTotal={getCalculateInvestmentTotal}
                                 toggleSection={toggleSection}
                                 onAddPersonnel={() => setPersonnelCosts(addArrayItem(personnelCosts, { metric_id: '', description: '', calculated_amount: 0, frequency_type: 'monthly', department_allocations: [] }))}
                                 onRemovePersonnel={(idx) => setPersonnelCosts(removeArrayItem(personnelCosts, idx))}
                                 onUpdatePersonnel={(idx, field, value) => setPersonnelCosts(updateArrayItem(personnelCosts, idx, field, value))}
                                 onAddPersonnelDeptAlloc={(idx) => setPersonnelCosts(addDeptAllocation(personnelCosts, idx))}
                                 onUpdatePersonnelDeptAlloc={(idx, allocIdx, field, value) => setPersonnelCosts(updateDeptAllocation(personnelCosts, idx, allocIdx, field, value))}
                                 onRemovePersonnelDeptAlloc={(idx, allocIdx) => setPersonnelCosts(removeDeptAllocation(personnelCosts, idx, allocIdx))}
                                 onAddBom={() => setBomCosts(addArrayItem(bomCosts, { bus_stop_type_id: '', product_identifier: '', description: '', calculated_bom_cost: 0, quantity: 1 }))}
                                 onRemoveBom={(idx) => setBomCosts(removeArrayItem(bomCosts, idx))}
                                 onUpdateBom={(idx, field, value) => setBomCosts(updateArrayItem(bomCosts, idx, field, value))}
                                 onBusStopTypeChange={handleBusStopTypeChange}
                                 onAddOverhead={() => setOverheadCosts(addArrayItem(overheadCosts, { description: '', amount: 0, frequency_type: 'monthly', department_allocations: [] }))}
                                 onRemoveOverhead={(idx) => setOverheadCosts(removeArrayItem(overheadCosts, idx))}
                                 onUpdateOverhead={(idx, field, value) => setOverheadCosts(updateArrayItem(overheadCosts, idx, field, value))}
                                 onAddOverheadDeptAlloc={(idx) => setOverheadCosts(addDeptAllocation(overheadCosts, idx))}
                                 onUpdateOverheadDeptAlloc={(idx, allocIdx, field, value) => setOverheadCosts(updateDeptAllocation(overheadCosts, idx, allocIdx, field, value))}
                                 onRemoveOverheadDeptAlloc={(idx, allocIdx) => setOverheadCosts(removeDeptAllocation(overheadCosts, idx, allocIdx))}
                                 onAddMaintenance={() => setMaintenanceCosts(addArrayItem(maintenanceCosts, { description: '', amount: 0, frequency_type: 'monthly', department_allocations: [] }))}
                                 onRemoveMaintenance={(idx) => setMaintenanceCosts(removeArrayItem(maintenanceCosts, idx))}
                                 onUpdateMaintenance={(idx, field, value) => setMaintenanceCosts(updateArrayItem(maintenanceCosts, idx, field, value))}
                                 onAddMaintenanceDeptAlloc={(idx) => setMaintenanceCosts(addDeptAllocation(maintenanceCosts, idx))}
                                 onUpdateMaintenanceDeptAlloc={(idx, allocIdx, field, value) => setMaintenanceCosts(updateDeptAllocation(maintenanceCosts, idx, allocIdx, field, value))}
                                 onRemoveMaintenanceDeptAlloc={(idx, allocIdx) => setMaintenanceCosts(removeDeptAllocation(maintenanceCosts, idx, allocIdx))}
                                 onAddInvestment={() => setInvestmentAmortization(addArrayItem(investmentAmortization, { description: '', total_investment_amount: 0, project_duration_months: 12, calculated_daily_cost: 0, department_allocations: [] }))}
                                 onRemoveInvestment={(idx) => setInvestmentAmortization(removeArrayItem(investmentAmortization, idx))}
                                 onUpdateInvestment={handleInvestmentChange}
                                 onAddInvestmentDeptAlloc={(idx) => setInvestmentAmortization(addDeptAllocation(investmentAmortization, idx))}
                                 onUpdateInvestmentDeptAlloc={(idx, allocIdx, field, value) => setInvestmentAmortization(updateDeptAllocation(investmentAmortization, idx, allocIdx, field, value))}
                                 onRemoveInvestmentDeptAlloc={(idx, allocIdx) => setInvestmentAmortization(removeDeptAllocation(investmentAmortization, idx, allocIdx))}
                             />
                         </div>

                        {/* Allocation Validation Warning */}
                         {!validateAllAllocations() && <ValidationWarningCard />}

                         {/* SECTION C - Summary */}
                         <SummarySection
                             totalIncome={calculateTotalIncome()}
                             totalCosts={getCalculateTotalCosts()}
                             formatCurrency={formatCurrency}
                         />

                         {/* SECTION D - Department Summary */}
                         <DepartmentSummarySection
                             summary={getCalculateDepartmentSummary()}
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
                             calculateDepreciationInvestmentsTotal={getCalculateDepreciationInvestmentsTotal}
                             calculateEstimatedRevenuesTotal={getCalculateEstimatedRevenuesTotal}
                             calculateAdditionalRevenuesTotal={getCalculateAdditionalRevenuesTotal}
                             onAddDeprecInv={() => setDepreciationInvestments(addArrayItem(depreciationInvestments, {
                                 description: '', category: 'materials', total_amount: 0, department_allocations: []
                             }))}
                             onRemoveDeprecInv={(idx) => setDepreciationInvestments(removeArrayItem(depreciationInvestments, idx))}
                             onUpdateDeprecInv={(idx, field, value) => setDepreciationInvestments(updateArrayItem(depreciationInvestments, idx, field, value))}
                             onAddDeptAllocDepr={(idx) => setDepreciationInvestments(addDeptAllocation(depreciationInvestments, idx))}
                             onRemoveDeptAllocDepr={(idx, allocIdx) => setDepreciationInvestments(removeDeptAllocation(depreciationInvestments, idx, allocIdx))}
                             onUpdateDeptAllocDepr={(idx, allocIdx, field, value) => setDepreciationInvestments(updateDeptAllocation(depreciationInvestments, idx, allocIdx, field, value))}
                             onAddEstRevenue={() => setEstimatedRevenues(addArrayItem(estimatedRevenues, {
                                 bus_stop_type_id: '', description: '', pending_quantity: 0, unit_revenue: 0, total_revenue: 0
                             }))}
                             onRemoveEstRevenue={(idx) => setEstimatedRevenues(removeArrayItem(estimatedRevenues, idx))}
                             onUpdateEstRevenue={(idx, field, value) => updateEstimatedRevenue(idx, field, value)}
                             onAddAddRevenue={() => setAdditionalRevenues(addArrayItem(additionalRevenues, {
                                 description: '', total_amount: 0
                             }))}
                             onRemoveAddRevenue={(idx) => setAdditionalRevenues(removeArrayItem(additionalRevenues, idx))}
                             onUpdateAddRevenue={(idx, field, value) => setAdditionalRevenues(updateArrayItem(additionalRevenues, idx, field, value))}
                         />

                         {/* Depreciation Rate on Revenue */}
                         <DepreciationRateCard
                             totalRevenueBase={getCalculateTotalDepreciationRevenueBase()}
                             totalDepreciationCost={getCalculateDepreciationInvestmentsTotal()}
                             depreciationFactor={getCalculateDepreciationFactor()}
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
}