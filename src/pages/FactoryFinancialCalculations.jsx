import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import DepartmentSummarySection from "@/components/factory-financial/DepartmentSummarySection";
import DepreciationModuleSection from "@/components/factory-financial/DepreciationModuleSection";
import DepreciationRateCard from "@/components/factory-financial/DepreciationRateCard";
import ValidationWarningCard from "@/components/factory-financial/ValidationWarningCard";
import FactoryCostSectionsCard from "@/components/factory-financial/FactoryCostSectionsCard";
import ExpenseTableSection from "@/components/factory-financial/ExpenseTableSection";
import FinancialOverviewTab from "@/components/factory-financial/FinancialOverviewTab";
import LabourCostTab from "@/components/factory-financial/labour/LabourCostTab";
import DailyOperationsTab from "@/components/factory-financial/daily/DailyOperationsTab";
import DailyDataHistoryTab from "@/components/factory-financial/DailyDataHistoryTab";
import {
    calculateTotalLabourCost,
    normalizeLoadedLabourResources,
    normalizeLoadedDepartmentLabourHours,
} from "@/components/factory-financial/utils/labourCostCalculations";
import {
    normalizeLoadedDailyProductionEntries,
    normalizeLoadedDailyRevenueEntries,
    normalizeLoadedDailyDepartmentHoursEntries,
} from "@/components/factory-financial/utils/dailyOperationsNormalizers";
import {
    getAllocationTotal,
    hasInvalidAllocation,
    convertCostToDaily,
    getVariationsTotal,
    getShelterRevenueTotal,
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
    // Daily revenue catalog — sourced from sales_revenue_items (schema: product_identifier, description, unit_selling_price)
    const [salesRevenueItems, setSalesRevenueItems] = useState([]);
    
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
    const [shelterInstances, setShelterInstances] = useState([]);
    const [dailyMetrics, setDailyMetrics] = useState([]);
    
    // Labour module states
    const [labourResources, setLabourResources] = useState([]);
    const [departmentLabourHours, setDepartmentLabourHours] = useState([]);

    // Daily operations states
    const [dailyProductionEntries, setDailyProductionEntries] = useState([]);
    const [dailyRevenueEntries, setDailyRevenueEntries] = useState([]);
    const [dailyDepartmentHoursEntries, setDailyDepartmentHoursEntries] = useState([]);

    // Depreciation module states
    const [depreciationInvestments, setDepreciationInvestments] = useState([]);
    const [estimatedRevenues, setEstimatedRevenues] = useState([]);
    const [additionalRevenues, setAdditionalRevenues] = useState([]);
    
    // Collapsible sections state (keys must match section identifiers)
    const [expandedSections, setExpandedSections] = useState({
        fixedCosts: true,
        operationalCosts: true,
        personnelCosts: true,
        bomCosts: true,
        overheadCosts: true,
        investmentAmortization: true,
        maintenanceCosts: true
    });

    useEffect(() => {
        if (!accessLoading && hasAccess) {
            loadFinancialRecords();
            loadReferenceData();
        }
    }, [accessLoading, hasAccess]);
    
    const loadReferenceData = async () => {
        try {
            const [depts, busTypes, shelterInst, metrics] = await Promise.all([
                base44.entities.Department.list(),
                base44.entities.BusStopType.list(),
                base44.entities.ShelterInstance.list(),
                base44.entities.MetricDefinition.list()
            ]);
            setDepartments(depts);
            setBusStopTypes(busTypes);
            setShelterInstances(shelterInst);
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
            // sales_revenue_items exists in FactoryFinancialData schema:
            // { product_identifier, description, quantity_sold, unit_selling_price }
            // This is the correct catalog source for daily revenue category selection.
            setSalesRevenueItems(record.sales_revenue_items || []);
            
            setPersonnelCosts(normalizeLoadedExpenseRows(record.personnel_costs || [], 'personnel'));
            setBomCosts(record.bill_of_materials_costs || []);
            setFixedCosts(normalizeLoadedExpenseRows(record.fixed_costs && record.fixed_costs.length > 0 ? record.fixed_costs : DEFAULT_FIXED_COSTS, 'fixed'));
            setOperationalCosts(normalizeLoadedExpenseRows(record.operational_costs && record.operational_costs.length > 0 ? record.operational_costs : DEFAULT_OPERATIONAL_COSTS, 'operational'));
            setOverheadCosts(normalizeLoadedExpenseRows(record.overhead_costs || [], 'overhead'));
            setInvestmentAmortization(normalizeLoadedExpenseRows(record.investment_amortization || [], 'investment'));
            setMaintenanceCosts(normalizeLoadedExpenseRows(record.maintenance_costs || [], 'maintenance'));
            
            setDepreciationInvestments(record.depreciation_module?.investments || []);
            setEstimatedRevenues(record.depreciation_module?.estimated_revenues || []);
            setAdditionalRevenues(record.depreciation_module?.additional_revenues || []);

            setLabourResources(normalizeLoadedLabourResources(record.labour_resources));
            setDepartmentLabourHours(normalizeLoadedDepartmentLabourHours(record.department_labour_hours));

            setDailyProductionEntries(normalizeLoadedDailyProductionEntries(record.daily_production_entries));
            setDailyRevenueEntries(normalizeLoadedDailyRevenueEntries(record.daily_revenue_entries));
            setDailyDepartmentHoursEntries(normalizeLoadedDailyDepartmentHoursEntries(record.daily_department_hours_entries));
            
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
                sales_revenue_items: salesRevenueItems,
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
                labour_resources: labourResources,
                department_labour_hours: departmentLabourHours,
                daily_production_entries: dailyProductionEntries,
                daily_revenue_entries: dailyRevenueEntries,
                daily_department_hours_entries: dailyDepartmentHoursEntries,
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
                sales_revenue_items: salesRevenueItems,
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
                labour_resources: labourResources,
                department_labour_hours: departmentLabourHours,
                daily_production_entries: dailyProductionEntries,
                daily_revenue_entries: dailyRevenueEntries,
                daily_department_hours_entries: dailyDepartmentHoursEntries,
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
                labour_resources: [],
                department_labour_hours: [],
                daily_production_entries: [],
                daily_revenue_entries: [],
                daily_department_hours_entries: [],
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

    const getCalculateBomTotal = () => calculateBomTotal(bomCosts);

    const getCalculateInvestmentTotal = () => 
        calculateInvestmentTotal(investmentAmortization, totalWorkingDays, avgWorkingDaysPerMonth, avgWorkingDaysPerYear);

    const getCalculateCostTotal = (costArray) => 
        calculateCostTotal(costArray, totalWorkingDays, avgWorkingDaysPerMonth, avgWorkingDaysPerYear);

    // ── Official Labour Cost (new module, primary source) ─────────────────────
    const getCalculateLabourCostTotal = () =>
        calculateTotalLabourCost(labourResources, departmentLabourHours);

    // ── Legacy Personnel Cost (kept for backward compat & department summary) ─
    // NOT included in getOfficialTotalCosts. Informational only.
    const getCalculateLegacyPersonnelCostTotal = () =>
        calculatePersonnelCostTotal(personnelCosts, totalWorkingDays, avgWorkingDaysPerMonth, avgWorkingDaysPerYear);

    // ── Official Total Costs: Labour Module replaces legacy personnelCosts ─────
    const getOfficialTotalCosts = () =>
        getCalculateLabourCostTotal() +
        calculateBomTotal(bomCosts) +
        calculateCostTotal(fixedCosts, totalWorkingDays, avgWorkingDaysPerMonth, avgWorkingDaysPerYear) +
        calculateCostTotal(operationalCosts, totalWorkingDays, avgWorkingDaysPerMonth, avgWorkingDaysPerYear) +
        calculateCostTotal(overheadCosts, totalWorkingDays, avgWorkingDaysPerMonth, avgWorkingDaysPerYear) +
        calculateInvestmentTotal(investmentAmortization, totalWorkingDays, avgWorkingDaysPerMonth, avgWorkingDaysPerYear) +
        calculateCostTotal(maintenanceCosts, totalWorkingDays, avgWorkingDaysPerMonth, avgWorkingDaysPerYear);

    // ── Legacy total (still used only for calculateDepartmentSummary) ─────────
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
        return dept ? (dept.department_name || dept.name || departmentId) : departmentId;
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
                        {/* Period Settings - always visible */}
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

                        {/* Tab Layout */}
                        <Tabs defaultValue="overview" className="w-full">
                            <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-slate-100 p-1 rounded-xl mb-2">
                                {[
                                    { value: 'overview', label: 'Επισκόπηση' },
                                    { value: 'revenue', label: 'Έσοδα' },
                                    { value: 'fixed', label: 'Σταθερά Κόστη' },
                                    { value: 'operational', label: 'Λειτουργικά Κόστη' },
                                    { value: 'other', label: 'Λοιπά Κόστη' },
                                    { value: 'labour', label: 'Κόστος Προσωπικού' },
                                    { value: 'daily', label: 'Daily Operations' },
                                    { value: 'daily_history', label: 'Daily History' },
                                    { value: 'depreciation', label: 'Αποσβέσεις' },
                                    { value: 'department', label: 'Ανά Τμήμα' },
                                ].map(tab => (
                                    <TabsTrigger
                                        key={tab.value}
                                        value={tab.value}
                                        className="flex-1 min-w-[100px] text-xs font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg"
                                    >
                                        {tab.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            {/* OVERVIEW TAB */}
                            <TabsContent value="overview" className="mt-4">
                                <FinancialOverviewTab
                                    totalIncome={calculateTotalIncome()}
                                    totalCosts={getOfficialTotalCosts()}
                                    depreciationCost={getCalculateDepreciationInvestmentsTotal()}
                                    formatCurrency={formatCurrency}
                                    hasInvalidAllocations={!validateAllAllocations()}
                                    legacyPersonnelCost={getCalculateLegacyPersonnelCostTotal()}
                                    dailyProductionEntries={dailyProductionEntries}
                                    dailyRevenueEntries={dailyRevenueEntries}
                                    dailyDepartmentHoursEntries={dailyDepartmentHoursEntries}
                                    labourResources={labourResources}
                                    departmentLabourHours={departmentLabourHours}
                                    costBreakdown={[
                                        { label: 'Κόστος Προσωπικού', value: getCalculateLabourCostTotal() },
                                        { label: 'BOM (Υλικά)', value: getCalculateBomTotal() },
                                        { label: 'Σταθερά Κόστη', value: getCalculateCostTotal(fixedCosts) },
                                        { label: 'Λειτουργικά Κόστη', value: getCalculateCostTotal(operationalCosts) },
                                        { label: 'Γενικά Έξοδα', value: getCalculateCostTotal(overheadCosts) },
                                        { label: 'Κόστη Συντήρησης', value: getCalculateCostTotal(maintenanceCosts) },
                                        { label: 'Απόσβεση Επενδύσεων', value: getCalculateInvestmentTotal() },
                                    ]}
                                />
                            </TabsContent>

                            {/* REVENUE TAB */}
                             <TabsContent value="revenue" className="mt-4">
                                 <ShelterRevenueSection
                                     shelterRevenueItems={shelterRevenueItems}
                                     shelterInstances={shelterInstances}
                                     formatCurrency={formatCurrency}
                                    getVariationsTotal={getVariationsTotal}
                                    getShelterRevenueTotal={getShelterRevenueTotal}
                                    calculateTotalIncome={calculateTotalIncome}
                                    onAddItem={() => addArrayItem(setShelterRevenueItems, shelterRevenueItems, {
                                         shelter_instance_id: '',
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
                            </TabsContent>

                            {/* FIXED COSTS TAB */}
                            <TabsContent value="fixed" className="mt-4">
                                <ExpenseTableSection
                                    title="Σταθερά Κόστη (Fixed Costs)"
                                    sectionKey="fixedCosts"
                                    expenseItems={fixedCosts}
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
                            </TabsContent>

                            {/* OPERATIONAL COSTS TAB */}
                            <TabsContent value="operational" className="mt-4">
                                <ExpenseTableSection
                                    title="Λειτουργικά Κόστη (Operational Costs)"
                                    sectionKey="operationalCosts"
                                    expenseItems={operationalCosts}
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
                            </TabsContent>

                            {/* OTHER COSTS TAB */}
                            <TabsContent value="other" className="mt-4">
                                {!validateAllAllocations() && <div className="mb-4"><ValidationWarningCard /></div>}
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
                                    calculatePersonnelCostTotal={getCalculateLegacyPersonnelCostTotal}
                                    calculateBomTotal={getCalculateBomTotal}
                                    calculateCostTotal={getCalculateCostTotal}
                                    calculateInvestmentTotal={getCalculateInvestmentTotal}
                                    toggleSection={toggleSection}
                                    onAddPersonnel={() => setPersonnelCosts(prev => addArrayItem(prev, { metric_id: '', description: '', calculated_amount: 0, frequency_type: 'monthly', department_allocations: [] }))}
                                    onRemovePersonnel={(idx) => setPersonnelCosts(prev => removeArrayItem(prev, idx))}
                                    onUpdatePersonnel={(idx, field, value) => setPersonnelCosts(prev => updateArrayItem(prev, idx, field, value))}
                                    onAddPersonnelDeptAlloc={(idx) => setPersonnelCosts(prev => addDeptAllocation(prev, idx))}
                                    onUpdatePersonnelDeptAlloc={(idx, allocIdx, field, value) => setPersonnelCosts(prev => updateDeptAllocation(prev, idx, allocIdx, field, value))}
                                    onRemovePersonnelDeptAlloc={(idx, allocIdx) => setPersonnelCosts(prev => removeDeptAllocation(prev, idx, allocIdx))}
                                    onAddBom={() => setBomCosts(prev => addArrayItem(prev, { bus_stop_type_id: '', product_identifier: '', description: '', calculated_bom_cost: 0, quantity: 1 }))}
                                    onRemoveBom={(idx) => setBomCosts(prev => removeArrayItem(prev, idx))}
                                    onUpdateBom={(idx, field, value) => setBomCosts(prev => updateArrayItem(prev, idx, field, value))}
                                    onBusStopTypeChange={handleBusStopTypeChange}
                                    onAddOverhead={() => setOverheadCosts(prev => addArrayItem(prev, { description: '', amount: 0, frequency_type: 'monthly', department_allocations: [] }))}
                                    onRemoveOverhead={(idx) => setOverheadCosts(prev => removeArrayItem(prev, idx))}
                                    onUpdateOverhead={(idx, field, value) => setOverheadCosts(prev => updateArrayItem(prev, idx, field, value))}
                                    onAddOverheadDeptAlloc={(idx) => setOverheadCosts(prev => addDeptAllocation(prev, idx))}
                                    onUpdateOverheadDeptAlloc={(idx, allocIdx, field, value) => setOverheadCosts(prev => updateDeptAllocation(prev, idx, allocIdx, field, value))}
                                    onRemoveOverheadDeptAlloc={(idx, allocIdx) => setOverheadCosts(prev => removeDeptAllocation(prev, idx, allocIdx))}
                                    onAddMaintenance={() => setMaintenanceCosts(prev => addArrayItem(prev, { description: '', amount: 0, frequency_type: 'monthly', department_allocations: [] }))}
                                    onRemoveMaintenance={(idx) => setMaintenanceCosts(prev => removeArrayItem(prev, idx))}
                                    onUpdateMaintenance={(idx, field, value) => setMaintenanceCosts(prev => updateArrayItem(prev, idx, field, value))}
                                    onAddMaintenanceDeptAlloc={(idx) => setMaintenanceCosts(prev => addDeptAllocation(prev, idx))}
                                    onUpdateMaintenanceDeptAlloc={(idx, allocIdx, field, value) => setMaintenanceCosts(prev => updateDeptAllocation(prev, idx, allocIdx, field, value))}
                                    onRemoveMaintenanceDeptAlloc={(idx, allocIdx) => setMaintenanceCosts(prev => removeDeptAllocation(prev, idx, allocIdx))}
                                    onAddInvestment={() => setInvestmentAmortization(prev => addArrayItem(prev, { description: '', total_investment_amount: 0, project_duration_months: 12, calculated_daily_cost: 0, department_allocations: [] }))}
                                    onRemoveInvestment={(idx) => setInvestmentAmortization(prev => removeArrayItem(prev, idx))}
                                    onUpdateInvestment={handleInvestmentChange}
                                    onAddInvestmentDeptAlloc={(idx) => setInvestmentAmortization(prev => addDeptAllocation(prev, idx))}
                                    onUpdateInvestmentDeptAlloc={(idx, allocIdx, field, value) => setInvestmentAmortization(prev => updateDeptAllocation(prev, idx, allocIdx, field, value))}
                                    onRemoveInvestmentDeptAlloc={(idx, allocIdx) => setInvestmentAmortization(prev => removeDeptAllocation(prev, idx, allocIdx))}
                                />
                            </TabsContent>

                            {/* LABOUR COST TAB */}
                            <TabsContent value="labour" className="mt-4">
                                <LabourCostTab
                                    labourResources={labourResources}
                                    departmentLabourHours={departmentLabourHours}
                                    departments={departments}
                                    formatCurrency={formatCurrency}
                                    onLabourResources={setLabourResources}
                                    onDepartmentLabourHours={setDepartmentLabourHours}
                                />
                            </TabsContent>

                            {/* DAILY OPERATIONS TAB */}
                             <TabsContent value="daily" className="mt-4">
                                 <DailyOperationsTab
                                     dailyProductionEntries={dailyProductionEntries}
                                     dailyRevenueEntries={dailyRevenueEntries}
                                     dailyDepartmentHoursEntries={dailyDepartmentHoursEntries}
                                     shelterInstances={shelterInstances}
                                     departments={departments}
                                     formatCurrency={formatCurrency}
                                     onDailyProduction={setDailyProductionEntries}
                                     onDailyRevenue={setDailyRevenueEntries}
                                     onDailyDepartmentHours={setDailyDepartmentHoursEntries}
                                     revenueCategories={salesRevenueItems}
                                     shelterRevenueItems={shelterRevenueItems}
                                     getShelterRevenueTotal={getShelterRevenueTotal}
                                 />
                             </TabsContent>

                            {/* DAILY DATA HISTORY TAB */}
                             <TabsContent value="daily_history" className="mt-4">
                                 <DailyDataHistoryTab
                                     dailyProductionEntries={dailyProductionEntries}
                                     dailyRevenueEntries={dailyRevenueEntries}
                                     dailyDepartmentHoursEntries={dailyDepartmentHoursEntries}
                                     shelterInstances={shelterInstances}
                                     busStopTypes={busStopTypes}
                                     departments={departments}
                                     formatCurrency={formatCurrency}
                                 />
                             </TabsContent>

                            {/* DEPRECIATION TAB */}
                            <TabsContent value="depreciation" className="mt-4 space-y-6">
                                <DepreciationModuleSection
                                    depreciationInvestments={depreciationInvestments}
                                    estimatedRevenues={estimatedRevenues}
                                    additionalRevenues={additionalRevenues}
                                    departments={departments}
                                    busStopTypes={busStopTypes}
                                    shelterInstances={shelterInstances}
                                    shelterRevenueItems={shelterRevenueItems}
                                    getShelterRevenueTotal={getShelterRevenueTotal}
                                    formatCurrency={formatCurrency}
                                    getAllocationTotal={getAllocationTotal}
                                    getDeptName={getDeptName}
                                    calculateDepreciationInvestmentsTotal={getCalculateDepreciationInvestmentsTotal}
                                    calculateEstimatedRevenuesTotal={getCalculateEstimatedRevenuesTotal}
                                    calculateAdditionalRevenuesTotal={getCalculateAdditionalRevenuesTotal}
                                    onAddDeprecInv={() => setDepreciationInvestments(prev => addArrayItem(prev, {
                                        description: '', category: 'materials', total_amount: 0, department_allocations: []
                                    }))}
                                    onRemoveDeprecInv={(idx) => setDepreciationInvestments(prev => removeArrayItem(prev, idx))}
                                    onUpdateDeprecInv={(idx, field, value) => setDepreciationInvestments(prev => updateArrayItem(prev, idx, field, value))}
                                    onAddDeptAllocDepr={(idx) => setDepreciationInvestments(prev => addDeptAllocation(prev, idx))}
                                    onRemoveDeptAllocDepr={(idx, allocIdx) => setDepreciationInvestments(prev => removeDeptAllocation(prev, idx, allocIdx))}
                                    onUpdateDeptAllocDepr={(idx, allocIdx, field, value) => setDepreciationInvestments(prev => updateDeptAllocation(prev, idx, allocIdx, field, value))}
                                    onAddEstRevenue={() => setEstimatedRevenues(prev => addArrayItem(prev, {
                                        shelter_instance_id: '', description: '', pending_quantity: 0, unit_revenue: 0, total_revenue: 0
                                    }))}
                                    onRemoveEstRevenue={(idx) => setEstimatedRevenues(prev => removeArrayItem(prev, idx))}
                                    onUpdateEstRevenue={(idx, field, value) => updateEstimatedRevenue(idx, field, value)}
                                    onAddAddRevenue={() => setAdditionalRevenues(prev => addArrayItem(prev, {
                                        description: '', total_amount: 0
                                    }))}
                                    onRemoveAddRevenue={(idx) => setAdditionalRevenues(prev => removeArrayItem(prev, idx))}
                                    onUpdateAddRevenue={(idx, field, value) => setAdditionalRevenues(prev => updateArrayItem(prev, idx, field, value))}
                                />
                                <DepreciationRateCard
                                    totalRevenueBase={getCalculateTotalDepreciationRevenueBase()}
                                    totalDepreciationCost={getCalculateDepreciationInvestmentsTotal()}
                                    depreciationFactor={getCalculateDepreciationFactor()}
                                    formatCurrency={formatCurrency}
                                />
                            </TabsContent>

                            {/* DEPARTMENT SUMMARY TAB */}
                            <TabsContent value="department" className="mt-4">
                                <DepartmentSummarySection
                                    summary={getCalculateDepartmentSummary()}
                                    formatCurrency={formatCurrency}
                                />
                            </TabsContent>
                        </Tabs>
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