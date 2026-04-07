import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Copy, Trash2, DollarSign, TrendingUp, Package, Calendar, Save, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { usePageAccess } from "@/components/lib/usePageAccess";
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import DeptAllocationRows from "@/components/factory-financial/DeptAllocationRows";

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
            
            // Load period settings
            setTotalWorkingDays(record.total_working_days_in_period || 0);
            setAvgWorkingDaysPerMonth(record.average_working_days_per_month || 22);
            setAvgWorkingDaysPerYear(record.average_working_days_per_year || 260);
            
            // Load income data
            setShelterRevenueItems(record.shelter_revenue_items || []);
            
            // Load cost data
            setPersonnelCosts(record.personnel_costs || []);
            setBomCosts(record.bill_of_materials_costs || []);
            setFixedCosts(record.fixed_costs || []);
            setOverheadCosts(record.overhead_costs || []);
            setInvestmentAmortization(record.investment_amortization || []);
            setMaintenanceCosts(record.maintenance_costs || []);
            
            // Load depreciation module data
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
        const sections = [
            { data: personnelCosts, name: 'Personnel Costs' },
            { data: fixedCosts, name: 'Fixed Costs' },
            { data: overheadCosts, name: 'Overhead Costs' },
            { data: maintenanceCosts, name: 'Maintenance Costs' },
            { data: investmentAmortization, name: 'Investment Amortization' },
            { data: depreciationInvestments, name: 'Depreciation Investments' }
        ];

        return sections.every(({ data }) => !hasInvalidAllocation(data));
    };

    const hasAnyInvalidAllocation = () => {
        return !validateAllAllocations();
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
            department_allocations: []
        }]);
    };
    
    const addPersonnelCostItem = () => {
        setPersonnelCosts([...personnelCosts, {
            metric_id: '',
            description: '',
            calculated_amount: 0,
            frequency_type: 'monthly',
            department_allocations: []
        }]);
    };
    
    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };
    
    const addBomCostItem = () => {
        setBomCosts([...bomCosts, {
            bus_stop_type_id: '',
            product_identifier: '',
            description: '',
            calculated_bom_cost: 0,
            quantity: 1
        }]);
    };
    
    const addInvestmentItem = () => {
        setInvestmentAmortization([...investmentAmortization, {
            description: '',
            total_investment_amount: 0,
            project_duration_months: 12,
            calculated_daily_cost: 0,
            department_allocations: []
        }]);
    };

    const addInvDeptAlloc = (itemIdx) => {
        const updated = [...investmentAmortization];
        updated[itemIdx].department_allocations = [...(updated[itemIdx].department_allocations || []), { department_id: '', allocation_percent: 0 }];
        setInvestmentAmortization(updated);
    };

    const updateInvDeptAlloc = (itemIdx, allocIdx, field, value) => {
        const updated = [...investmentAmortization];
        updated[itemIdx].department_allocations[allocIdx][field] = value;
        setInvestmentAmortization(updated);
    };

    const removeInvDeptAlloc = (itemIdx, allocIdx) => {
        const updated = [...investmentAmortization];
        updated[itemIdx].department_allocations = updated[itemIdx].department_allocations.filter((_, i) => i !== allocIdx);
        setInvestmentAmortization(updated);
    };
    
    const handleBusStopTypeChange = async (idx, busStopTypeId) => {
        const updated = [...bomCosts];
        updated[idx].bus_stop_type_id = busStopTypeId;
        
        if (busStopTypeId) {
            const selectedType = busStopTypes.find(t => t.id === busStopTypeId);
            if (selectedType) {
                updated[idx].product_identifier = selectedType.type_code || '';
                updated[idx].description = selectedType.type_name || '';
                
                // Fetch BOM cost
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
    
    const addShelterRevenueItem = () => {
        setShelterRevenueItems([...shelterRevenueItems, {
            bus_shelter_type_id: '',
            description: '',
            contract_amount: 0,
            amount_from_jv: 0,
            approved_variations: [],
            potential_variations: []
        }]);
    };

    const updateShelterRevenueItem = (index, field, value) => {
        const updated = [...shelterRevenueItems];
        updated[index] = { ...updated[index], [field]: value };
        setShelterRevenueItems(updated);
    };

    const addShelterApprovedVariation = (itemIndex) => {
        const updated = [...shelterRevenueItems];
        updated[itemIndex].approved_variations = [...updated[itemIndex].approved_variations, { description: '', amount: 0 }];
        setShelterRevenueItems(updated);
    };

    const addShelterPotentialVariation = (itemIndex) => {
        const updated = [...shelterRevenueItems];
        updated[itemIndex].potential_variations = [...updated[itemIndex].potential_variations, { description: '', amount: 0 }];
        setShelterRevenueItems(updated);
    };

    const updateShelterVariation = (itemIndex, variationType, variationIndex, field, value) => {
        const updated = [...shelterRevenueItems];
        updated[itemIndex][variationType][variationIndex] = { ...updated[itemIndex][variationType][variationIndex], [field]: value };
        setShelterRevenueItems(updated);
    };

    const removeShelterRevenueItem = (index) => {
        setShelterRevenueItems(shelterRevenueItems.filter((_, i) => i !== index));
    };

    const removeShelterVariation = (itemIndex, variationType, variationIndex) => {
        const updated = [...shelterRevenueItems];
        updated[itemIndex][variationType] = updated[itemIndex][variationType].filter((_, i) => i !== variationIndex);
        setShelterRevenueItems(updated);
    };

    const updateCostItem = (setter, currentArray, index, field, value) => {
        const updated = [...currentArray];
        updated[index] = { ...updated[index], [field]: value };
        setter(updated);
    };

    const addCostDeptAlloc = (setter, costArray, itemIdx) => {
        const updated = [...costArray];
        updated[itemIdx].department_allocations = [...(updated[itemIdx].department_allocations || []), { department_id: '', allocation_percent: 0 }];
        setter(updated);
    };

    const updateCostDeptAlloc = (setter, costArray, itemIdx, allocIdx, field, value) => {
        const updated = [...costArray];
        updated[itemIdx].department_allocations[allocIdx][field] = value;
        setter(updated);
    };

    const removeCostDeptAlloc = (setter, costArray, itemIdx, allocIdx) => {
        const updated = [...costArray];
        updated[itemIdx].department_allocations = updated[itemIdx].department_allocations.filter((_, i) => i !== allocIdx);
        setter(updated);
    };

    const removeCostItem = (setter, currentArray, index) => {
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

    // Calculation helpers for shelter revenue items
    const getApprovedVariationsTotal = (item) => {
        return item.approved_variations.reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0);
    };

    const getPotentialVariationsTotal = (item) => {
        return item.potential_variations.reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0);
    };

    const getShelterRevenueTotal = (item) => {
        const contract = parseFloat(item.contract_amount) || 0;
        const jv = parseFloat(item.amount_from_jv) || 0;
        const approved = getApprovedVariationsTotal(item);
        const potential = getPotentialVariationsTotal(item);
        return contract + jv + approved + potential;
    };

    // Calculations
    const calculateTotalIncome = () => {
        return shelterRevenueItems.reduce((sum, item) => sum + getShelterRevenueTotal(item), 0);
    };

    const getDeptName = (departmentId) => {
        const dept = departments.find(d => d.id === departmentId);
        return dept ? dept.department_name : departmentId;
    };

    const getTotalAllocPct = (allocations) =>
        (allocations || []).reduce((sum, a) => sum + (parseFloat(a.allocation_percent) || 0), 0);

    const calculatePersonnelCostTotal = () => {
        return personnelCosts.reduce((sum, item) => {
            const dailyCost = convertCostToDaily(item.calculated_amount, item.frequency_type);
            const totalForPeriod = dailyCost * (totalWorkingDays || 0);
            const totalAlloc = getTotalAllocPct(item.department_allocations);
            return sum + (totalForPeriod * totalAlloc / 100);
        }, 0);
    };
    
    const calculateBomTotal = () => {
        return bomCosts.reduce((sum, item) => {
            const cost = parseFloat(item.calculated_bom_cost) || 0;
            const qty = parseFloat(item.quantity) || 1;
            return sum + (cost * qty);
        }, 0);
    };
    
    const calculateInvestmentTotal = () => {
        return investmentAmortization.reduce((sum, item) => {
            const dailyCost = parseFloat(item.calculated_daily_cost) || 0;
            const totalForPeriod = dailyCost * (totalWorkingDays || 0);
            const totalAlloc = getTotalAllocPct(item.department_allocations);
            return sum + (totalForPeriod * totalAlloc / 100);
        }, 0);
    };
    
    const calculateCostTotal = (costArray) => {
        return costArray.reduce((sum, item) => {
            const dailyCost = convertCostToDaily(item.amount, item.frequency_type);
            const totalForPeriod = dailyCost * (totalWorkingDays || 0);
            const totalAlloc = getTotalAllocPct(item.department_allocations);
            return sum + (totalForPeriod * totalAlloc / 100);
        }, 0);
    };

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

    // Depreciation module calculations
    const calculateDepreciationInvestmentsTotal = () => {
        return depreciationInvestments.reduce((sum, item) => {
            const amount = parseFloat(item.total_amount) || 0;
            const allocations = item.department_allocations || [];
            const totalAllocation = allocations.reduce((allSum, alloc) => allSum + (parseFloat(alloc.allocation_percent) || 0), 0);
            return sum + (amount * totalAllocation / 100);
        }, 0);
    };

    const calculateInvestmentAllocationTotal = (departmentAllocations) => {
        return (departmentAllocations || []).reduce((sum, alloc) => sum + (parseFloat(alloc.allocation_percent) || 0), 0);
    };

    const getInvestmentDepartmentName = (departmentId) => {
        const dept = departments.find(d => d.id === departmentId);
        return dept ? dept.department_name : departmentId;
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

    // Depreciation module helpers
    const addDepreciationInvestment = () => {
        setDepreciationInvestments([...depreciationInvestments, {
            description: '',
            category: 'materials',
            total_amount: 0,
            department_allocations: []
        }]);
    };

    const updateDepreciationInvestment = (idx, field, value) => {
        const updated = [...depreciationInvestments];
        updated[idx][field] = value;
        setDepreciationInvestments(updated);
    };

    const addDepartmentAllocation = (investmentIdx) => {
        const updated = [...depreciationInvestments];
        updated[investmentIdx].department_allocations = [...(updated[investmentIdx].department_allocations || []), {
            department_id: '',
            allocation_percent: 0
        }];
        setDepreciationInvestments(updated);
    };

    const updateDepartmentAllocation = (investmentIdx, allocIdx, field, value) => {
        const updated = [...depreciationInvestments];
        updated[investmentIdx].department_allocations[allocIdx][field] = value;
        setDepreciationInvestments(updated);
    };

    const removeDepartmentAllocation = (investmentIdx, allocIdx) => {
        const updated = [...depreciationInvestments];
        updated[investmentIdx].department_allocations = updated[investmentIdx].department_allocations.filter((_, i) => i !== allocIdx);
        setDepreciationInvestments(updated);
    };

    const removeDepreciationInvestment = (idx) => {
        setDepreciationInvestments(depreciationInvestments.filter((_, i) => i !== idx));
    };

    const addEstimatedRevenue = () => {
        setEstimatedRevenues([...estimatedRevenues, {
            bus_stop_type_id: '',
            description: '',
            pending_quantity: 0,
            unit_revenue: 0,
            total_revenue: 0
        }]);
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

    const removeEstimatedRevenue = (idx) => {
        setEstimatedRevenues(estimatedRevenues.filter((_, i) => i !== idx));
    };

    const addAdditionalRevenue = () => {
        setAdditionalRevenues([...additionalRevenues, {
            description: '',
            total_amount: 0
        }]);
    };

    const updateAdditionalRevenue = (idx, field, value) => {
        const updated = [...additionalRevenues];
        updated[idx][field] = value;
        setAdditionalRevenues(updated);
    };

    const removeAdditionalRevenue = (idx) => {
        setAdditionalRevenues(additionalRevenues.filter((_, i) => i !== idx));
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
                                {/* Shelter Revenue Items Header */}
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-lg font-semibold">Έσοδα ανά Τύπο Στάσης</h3>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={addShelterRevenueItem}
                                    >
                                        <Plus className="w-4 h-4 mr-1" />
                                        Προσθήκη
                                    </Button>
                                </div>

                                {/* Shelter Revenue Items */}
                                <div className="space-y-4">
                                    {shelterRevenueItems.map((item, itemIdx) => (
                                        <div key={itemIdx} className="p-4 border border-slate-200 rounded-lg space-y-3">
                                            {/* Top Row: Bus Shelter Type, Description, Delete */}
                                            <div className="flex items-end gap-2">
                                                <div className="flex-1">
                                                    <Label className="text-xs">Τύπος Στάσης</Label>
                                                    <Select
                                                        value={item.bus_shelter_type_id}
                                                        onValueChange={(value) => {
                                                            updateShelterRevenueItem(itemIdx, 'bus_shelter_type_id', value);
                                                            const selectedType = busStopTypes.find(t => t.id === value);
                                                            if (selectedType) {
                                                                updateShelterRevenueItem(itemIdx, 'description', selectedType.type_name);
                                                            }
                                                        }}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Επιλέξτε τύπο" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {busStopTypes.map(type => (
                                                                <SelectItem key={type.id} value={type.id}>
                                                                    {type.type_code} - {type.type_name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="flex-1">
                                                    <Label className="text-xs">Περιγραφή</Label>
                                                    <Input
                                                        placeholder="Περιγραφή"
                                                        value={item.description}
                                                        onChange={(e) => updateShelterRevenueItem(itemIdx, 'description', e.target.value)}
                                                    />
                                                </div>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => removeShelterRevenueItem(itemIdx)}
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                            </div>

                                            {/* Second Row: Contract Amount, Amount from JV */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <Label className="text-xs">Ποσό Σύμβασης</Label>
                                                    <Input
                                                        type="number"
                                                        placeholder="0.00"
                                                        value={item.contract_amount}
                                                        onChange={(e) => updateShelterRevenueItem(itemIdx, 'contract_amount', e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Ποσό από JV</Label>
                                                    <Input
                                                        type="number"
                                                        placeholder="0.00"
                                                        value={item.amount_from_jv}
                                                        onChange={(e) => updateShelterRevenueItem(itemIdx, 'amount_from_jv', e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            {/* Approved Variations */}
                                            <div className="bg-slate-50 p-3 rounded-lg space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-sm font-semibold">Εγκεκριμένες Παραλλαγές</Label>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => addShelterApprovedVariation(itemIdx)}
                                                    >
                                                        <Plus className="w-3 h-3 mr-1" />
                                                        Προσθήκη
                                                    </Button>
                                                </div>
                                                <div className="space-y-2">
                                                    {item.approved_variations.map((variation, varIdx) => (
                                                        <div key={varIdx} className="flex items-end gap-2">
                                                            <Input
                                                                placeholder="Περιγραφή"
                                                                value={variation.description}
                                                                onChange={(e) => updateShelterVariation(itemIdx, 'approved_variations', varIdx, 'description', e.target.value)}
                                                                className="flex-1"
                                                            />
                                                            <Input
                                                                type="number"
                                                                placeholder="Ποσό"
                                                                value={variation.amount}
                                                                onChange={(e) => updateShelterVariation(itemIdx, 'approved_variations', varIdx, 'amount', e.target.value)}
                                                                className="w-28"
                                                            />
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() => removeShelterVariation(itemIdx, 'approved_variations', varIdx)}
                                                            >
                                                                <Trash2 className="w-4 h-4 text-red-500" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Potential Variations */}
                                            <div className="bg-slate-50 p-3 rounded-lg space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-sm font-semibold">Δυνητικές Παραλλαγές</Label>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => addShelterPotentialVariation(itemIdx)}
                                                    >
                                                        <Plus className="w-3 h-3 mr-1" />
                                                        Προσθήκη
                                                    </Button>
                                                </div>
                                                <div className="space-y-2">
                                                    {item.potential_variations.map((variation, varIdx) => (
                                                        <div key={varIdx} className="flex items-end gap-2">
                                                            <Input
                                                                placeholder="Περιγραφή"
                                                                value={variation.description}
                                                                onChange={(e) => updateShelterVariation(itemIdx, 'potential_variations', varIdx, 'description', e.target.value)}
                                                                className="flex-1"
                                                            />
                                                            <Input
                                                                type="number"
                                                                placeholder="Ποσό"
                                                                value={variation.amount}
                                                                onChange={(e) => updateShelterVariation(itemIdx, 'potential_variations', varIdx, 'amount', e.target.value)}
                                                                className="w-28"
                                                            />
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() => removeShelterVariation(itemIdx, 'potential_variations', varIdx)}
                                                            >
                                                                <Trash2 className="w-4 h-4 text-red-500" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Item Totals */}
                                            <div className="pt-2 border-t border-slate-200 grid grid-cols-3 gap-4 text-sm">
                                                <div className="bg-blue-50 p-2 rounded">
                                                    <Label className="text-xs font-semibold">Σύνολο Εγκ. Παραλλαγών</Label>
                                                    <p className="text-lg font-bold text-blue-700">{formatCurrency(getApprovedVariationsTotal(item))}</p>
                                                </div>
                                                <div className="bg-orange-50 p-2 rounded">
                                                    <Label className="text-xs font-semibold">Σύνολο Δυν. Παραλλαγών</Label>
                                                    <p className="text-lg font-bold text-orange-700">{formatCurrency(getPotentialVariationsTotal(item))}</p>
                                                </div>
                                                <div className="bg-green-50 p-2 rounded">
                                                    <Label className="text-xs font-semibold">Σύνολο Στάσης</Label>
                                                    <p className="text-lg font-bold text-green-700">{formatCurrency(getShelterRevenueTotal(item))}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
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
                                {/* Operational Costs */}
                                <Collapsible open={expandedSections.operational} onOpenChange={() => toggleSection('operational')}>
                                    <CollapsibleTrigger asChild>
                                        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                                            <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                                                {expandedSections.operational ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                                Λειτουργικά Κόστη (Operational Costs)
                                            </h3>
                                            <span className="text-sm font-semibold text-blue-700">
                                                {formatCurrency(calculatePersonnelCostTotal() + calculateBomTotal() + calculateCostTotal(overheadCosts) + calculateCostTotal(maintenanceCosts))}
                                            </span>
                                        </div>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="space-y-6 mt-4">
                                        {/* Personnel Costs */}
                                        {renderPersonnelCostSection()}

                                        {/* BOM Costs */}
                                        {renderBomCostSection()}

                                        {/* Overhead Costs */}
                                        {renderCostSection('Γενικά Έξοδα (Overhead Costs)', overheadCosts, setOverheadCosts, 'overhead')}

                                        {/* Maintenance Costs */}
                                        {renderCostSection('Κόστη Συντήρησης (Maintenance Costs)', maintenanceCosts, setMaintenanceCosts, 'maintenance')}
                                    </CollapsibleContent>
                                </Collapsible>

                                {/* Fixed Costs */}
                                <Collapsible open={expandedSections.fixed} onOpenChange={() => toggleSection('fixed')}>
                                    <CollapsibleTrigger asChild>
                                        <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors">
                                            <h3 className="text-lg font-bold text-purple-900 flex items-center gap-2">
                                                {expandedSections.fixed ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                                Πάγια Κόστη (Fixed Costs)
                                            </h3>
                                            <span className="text-sm font-semibold text-purple-700">
                                                {formatCurrency(calculateCostTotal(fixedCosts) + calculateInvestmentTotal())}
                                            </span>
                                        </div>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="space-y-6 mt-4">
                                        {/* Fixed Costs */}
                                        {renderCostSection('Πάγια Κόστη (Fixed Costs)', fixedCosts, setFixedCosts, 'fixedCosts')}

                                        {/* Investment Amortization */}
                                        {renderInvestmentAmortizationSection()}
                                    </CollapsibleContent>
                                </Collapsible>
                            </CardContent>
                        </Card>

                        {/* Allocation Validation Warning */}
                        {hasAnyInvalidAllocation() && (
                            <Card className="bg-red-50 border-red-300">
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h3 className="font-semibold text-red-900">Προσοχή</h3>
                                            <p className="text-sm text-red-700 mt-1">Υπάρχουν allocations που δεν κάνουν 100%</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

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

                        {/* Depreciation Module */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-amber-600" />
                                    Depreciation Module
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* A. Investments */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-slate-900">A. Investments</h3>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={addDepreciationInvestment}
                                        >
                                            <Plus className="w-4 h-4 mr-1" />
                                            Προσθήκη Επένδυσης
                                        </Button>
                                    </div>
                                    <div className="space-y-3">
                                        {depreciationInvestments.map((item, idx) => {
                                            const totalAlloc = calculateInvestmentAllocationTotal(item.department_allocations);
                                            const totalAmount = parseFloat(item.total_amount) || 0;
                                            return (
                                            <div key={idx} className="p-4 bg-slate-50 rounded-lg space-y-3">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <Label className="text-xs">Περιγραφή</Label>
                                                        <Input placeholder="Περιγραφή επένδυσης" value={item.description} onChange={(e) => updateDepreciationInvestment(idx, 'description', e.target.value)} />
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs">Κατηγορία</Label>
                                                        <Select value={item.category} onValueChange={(value) => updateDepreciationInvestment(idx, 'category', value)}>
                                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="materials">Materials</SelectItem>
                                                                <SelectItem value="labor">Labor</SelectItem>
                                                                <SelectItem value="other">Other</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Συνολικό Ποσό</Label>
                                                    <Input type="number" placeholder="0.00" value={item.total_amount} onChange={(e) => updateDepreciationInvestment(idx, 'total_amount', e.target.value)} />
                                                </div>
                                                <div className="border-t pt-3 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-sm font-semibold">Department Allocations</Label>
                                                        <Button size="sm" variant="outline" onClick={() => addDepartmentAllocation(idx)}>
                                                            <Plus className="w-3 h-3 mr-1" />
                                                            Add Department
                                                        </Button>
                                                    </div>
                                                    {(item.department_allocations || []).map((alloc, allocIdx) => (
                                                        <div key={allocIdx} className="flex items-end gap-2 bg-white p-2 rounded border border-slate-200">
                                                            <div className="flex-1">
                                                                <Label className="text-xs">Τμήμα</Label>
                                                                <Select value={alloc.department_id} onValueChange={(value) => updateDepartmentAllocation(idx, allocIdx, 'department_id', value)}>
                                                                    <SelectTrigger className="h-8"><SelectValue placeholder="Επιλέξτε τμήμα" /></SelectTrigger>
                                                                    <SelectContent position="popper" sideOffset={5}>{departments.map(dept => (<SelectItem key={dept.id} value={dept.id}>{dept.department_name}</SelectItem>))}</SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="w-24">
                                                                <Label className="text-xs">Allocation %</Label>
                                                                <Input type="number" placeholder="0" min="0" max="100" value={alloc.allocation_percent} onChange={(e) => updateDepartmentAllocation(idx, allocIdx, 'allocation_percent', e.target.value)} className="h-8" />
                                                            </div>
                                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeDepartmentAllocation(idx, allocIdx)}>
                                                                <Trash2 className="w-3 h-3 text-red-500" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className={`p-2 rounded text-xs font-semibold ${totalAlloc === 100 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                    Total Allocation: {totalAlloc.toFixed(1)}% {totalAlloc === 100 ? '✓' : '(must equal 100%)'}
                                                </div>
                                                {totalAlloc > 0 && (
                                                    <div className="text-xs text-slate-600 bg-blue-50 p-2 rounded space-y-1">
                                                        <strong>Allocated amount split:</strong>
                                                        {(item.department_allocations || []).map((alloc, allocIdx) => {
                                                            const deptName = getInvestmentDepartmentName(alloc.department_id);
                                                            const allocAmount = totalAmount * (parseFloat(alloc.allocation_percent) || 0) / 100;
                                                            return <div key={allocIdx}>{deptName}: {formatCurrency(allocAmount)}</div>;
                                                        })}
                                                    </div>
                                                )}
                                                <div className="flex justify-end">
                                                    <Button size="icon" variant="ghost" onClick={() => removeDepreciationInvestment(idx)}>
                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            </div>
                                            );
                                        })}
                                    </div>
                                    <div className="pt-2 text-sm font-medium text-slate-700">
                                        Σύνολο Επενδύσεων: {formatCurrency(calculateDepreciationInvestmentsTotal())}
                                    </div>
                                </div>

                                {/* B. Estimated Revenues */}
                                <div className="border-t pt-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-slate-900">B. Estimated Revenues</h3>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={addEstimatedRevenue}
                                        >
                                            <Plus className="w-4 h-4 mr-1" />
                                            Προσθήκη Εκτιμώμενου Εσόδου
                                        </Button>
                                    </div>
                                    <div className="space-y-3">
                                        {estimatedRevenues.map((item, idx) => (
                                            <div key={idx} className="p-4 bg-slate-50 rounded-lg space-y-3">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <Label className="text-xs">Τύπος Στάσης</Label>
                                                        <Select
                                                            value={item.bus_stop_type_id}
                                                            onValueChange={(value) => updateEstimatedRevenue(idx, 'bus_stop_type_id', value)}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Επιλέξτε τύπο" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {busStopTypes.map(type => (
                                                                    <SelectItem key={type.id} value={type.id}>
                                                                        {type.type_code} - {type.type_name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs">Περιγραφή</Label>
                                                        <Input
                                                            placeholder="Περιγραφή"
                                                            value={item.description}
                                                            onChange={(e) => updateEstimatedRevenue(idx, 'description', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-3">
                                                    <div>
                                                        <Label className="text-xs">Εκκρεμής Ποσότητα</Label>
                                                        <Input
                                                            type="number"
                                                            placeholder="0"
                                                            value={item.pending_quantity}
                                                            onChange={(e) => updateEstimatedRevenue(idx, 'pending_quantity', e.target.value)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs">Ποσό Ανά Μονάδα</Label>
                                                        <Input
                                                            type="number"
                                                            placeholder="0.00"
                                                            value={item.unit_revenue}
                                                            onChange={(e) => updateEstimatedRevenue(idx, 'unit_revenue', e.target.value)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs">Συνολικό Έσοδο</Label>
                                                        <Input
                                                            type="number"
                                                            placeholder="0.00"
                                                            value={item.total_revenue}
                                                            disabled
                                                            className="bg-blue-50"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex justify-end">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => removeEstimatedRevenue(idx)}
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="pt-2 text-sm font-medium text-slate-700">
                                        Σύνολο Εκτιμώμενων Εσόδων: {formatCurrency(calculateEstimatedRevenuesTotal())}
                                    </div>
                                </div>

                                {/* C. Additional Revenues */}
                                <div className="border-t pt-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-slate-900">C. Additional Revenues</h3>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={addAdditionalRevenue}
                                        >
                                            <Plus className="w-4 h-4 mr-1" />
                                            Προσθήκη Πρόσθετου Εσόδου
                                        </Button>
                                    </div>
                                    <div className="space-y-3">
                                        {additionalRevenues.map((item, idx) => (
                                            <div key={idx} className="p-4 bg-slate-50 rounded-lg space-y-3">
                                                <div className="flex items-end gap-2">
                                                    <div className="flex-1">
                                                        <Label className="text-xs">Περιγραφή</Label>
                                                        <Input
                                                            placeholder="Περιγραφή πρόσθετου εσόδου"
                                                            value={item.description}
                                                            onChange={(e) => updateAdditionalRevenue(idx, 'description', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="w-32">
                                                        <Label className="text-xs">Ποσό</Label>
                                                        <Input
                                                            type="number"
                                                            placeholder="0.00"
                                                            value={item.total_amount}
                                                            onChange={(e) => updateAdditionalRevenue(idx, 'total_amount', e.target.value)}
                                                        />
                                                    </div>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => removeAdditionalRevenue(idx)}
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="pt-2 text-sm font-medium text-slate-700">
                                        Σύνολο Πρόσθετων Εσόδων: {formatCurrency(calculateAdditionalRevenuesTotal())}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Depreciation Rate on Revenue */}
                        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-amber-600" />
                                    Depreciation Rate on Revenue
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-white rounded-lg border border-amber-100">
                                        <Label className="text-xs text-slate-600">Total Revenue</Label>
                                        <p className="text-lg font-semibold text-amber-700">{formatCurrency(calculateTotalDepreciationRevenueBase())}</p>
                                    </div>
                                    <div className="p-3 bg-white rounded-lg border border-amber-100">
                                        <Label className="text-xs text-slate-600">Total Depreciation Cost</Label>
                                        <p className="text-lg font-semibold text-amber-700">{formatCurrency(calculateDepreciationInvestmentsTotal())}</p>
                                    </div>
                                    <div className="p-3 bg-white rounded-lg border border-amber-100">
                                        <Label className="text-xs text-slate-600">Depreciation Factor</Label>
                                        <p className="text-lg font-semibold text-amber-700">{calculateDepreciationFactor().toFixed(4)}</p>
                                    </div>
                                    <div className="p-3 bg-white rounded-lg border border-amber-100">
                                        <Label className="text-xs text-slate-600">Depreciation %</Label>
                                        <p className="text-lg font-semibold text-amber-700">{(calculateDepreciationFactor() * 100).toFixed(2)}%</p>
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
            <Collapsible open={expandedSections.personnel} onOpenChange={() => toggleSection('personnel')}>
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <CollapsibleTrigger asChild>
                            <div className="flex items-center gap-2 cursor-pointer hover:text-blue-700 transition-colors">
                                {expandedSections.personnel ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                <Label className="text-base font-semibold cursor-pointer">Κόστος Προσωπικού (Personnel Costs) - από Manufacturing</Label>
                            </div>
                        </CollapsibleTrigger>
                        <Button size="sm" variant="outline" onClick={addPersonnelCostItem}>
                            <Plus className="w-4 h-4 mr-1" />
                            Προσθήκη
                        </Button>
                    </div>
                    <CollapsibleContent>
                        <div className="space-y-3">
                            {personnelCosts.map((item, idx) => (
                                <div key={idx} className="p-4 bg-slate-50 rounded-lg space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label className="text-xs">Μέτρηση (Metric)</Label>
                                            <Select
                                                value={item.metric_id}
                                                onValueChange={(value) => {
                                                    const updated = [...personnelCosts];
                                                    updated[idx].metric_id = value;
                                                    const metric = dailyMetrics.find(m => m.id === value);
                                                    if (metric) updated[idx].description = metric.metric_name;
                                                    setPersonnelCosts(updated);
                                                }}
                                            >
                                                <SelectTrigger><SelectValue placeholder="Επιλέξτε μέτρηση" /></SelectTrigger>
                                                <SelectContent position="popper" sideOffset={5}>
                                                    {dailyMetrics.map(metric => (
                                                        <SelectItem key={metric.id} value={metric.id}>{metric.metric_code} - {metric.metric_name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label className="text-xs">Συχνότητα</Label>
                                            <Select
                                                value={item.frequency_type}
                                                onValueChange={(value) => { const u = [...personnelCosts]; u[idx].frequency_type = value; setPersonnelCosts(u); }}
                                            >
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="daily">Ημερήσιο</SelectItem>
                                                    <SelectItem value="per_production_day">Ανά Εργάσιμη</SelectItem>
                                                    <SelectItem value="monthly">Μηνιαίο</SelectItem>
                                                    <SelectItem value="yearly">Ετήσιο</SelectItem>
                                                    <SelectItem value="one_time">Εφάπαξ</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <Input placeholder="Περιγραφή" value={item.description}
                                            onChange={(e) => { const u = [...personnelCosts]; u[idx].description = e.target.value; setPersonnelCosts(u); }}
                                            className="flex-1" />
                                        <Input type="number" placeholder="Ποσό" value={item.calculated_amount}
                                            onChange={(e) => { const u = [...personnelCosts]; u[idx].calculated_amount = e.target.value; setPersonnelCosts(u); }}
                                            className="w-32" />
                                        <Button size="icon" variant="ghost" onClick={() => setPersonnelCosts(personnelCosts.filter((_, i) => i !== idx))}>
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                    <div className="text-xs text-slate-600 bg-blue-50 p-2 rounded">
                                        <strong>Ημερήσιο κόστος:</strong> {formatCurrency(convertCostToDaily(item.calculated_amount, item.frequency_type))}/ημέρα × {totalWorkingDays} ημέρες = {formatCurrency(convertCostToDaily(item.calculated_amount, item.frequency_type) * totalWorkingDays)}
                                    </div>
                                    <DeptAllocationRows
                                        allocations={item.department_allocations}
                                        departments={departments}
                                        totalAmount={convertCostToDaily(item.calculated_amount, item.frequency_type) * totalWorkingDays}
                                        formatCurrency={formatCurrency}
                                        onAdd={() => { const u = [...personnelCosts]; u[idx].department_allocations = [...(u[idx].department_allocations || []), { department_id: '', allocation_percent: 0 }]; setPersonnelCosts(u); }}
                                        onUpdate={(allocIdx, field, value) => { const u = [...personnelCosts]; u[idx].department_allocations[allocIdx][field] = value; setPersonnelCosts(u); }}
                                        onRemove={(allocIdx) => { const u = [...personnelCosts]; u[idx].department_allocations = u[idx].department_allocations.filter((_, i) => i !== allocIdx); setPersonnelCosts(u); }}
                                    />
                                </div>
                            ))}
                        </div>
                    </CollapsibleContent>
                    <div className="mt-2 text-sm font-medium text-slate-700">
                        Υποσύνολο: {formatCurrency(calculatePersonnelCostTotal())}
                    </div>
                </div>
            </Collapsible>
        );
    }

    function renderBomCostSection() {
        return (
            <Collapsible open={expandedSections.bom} onOpenChange={() => toggleSection('bom')}>
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <CollapsibleTrigger asChild>
                            <div className="flex items-center gap-2 cursor-pointer hover:text-blue-700 transition-colors">
                                {expandedSections.bom ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                <Label className="text-base font-semibold cursor-pointer">Κόστος Υλικών (Bill of Materials) - από Warehouse</Label>
                            </div>
                        </CollapsibleTrigger>
                        <Button size="sm" variant="outline" onClick={addBomCostItem}>
                            <Plus className="w-4 h-4 mr-1" />
                            Προσθήκη
                        </Button>
                    </div>
                    <CollapsibleContent>
                <div className="space-y-2">
                    {bomCosts.map((item, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 rounded-lg space-y-2">
                            <div className="flex items-center gap-2">
                                <Select
                                    value={item.bus_stop_type_id}
                                    onValueChange={(value) => handleBusStopTypeChange(idx, value)}
                                >
                                    <SelectTrigger className="w-64">
                                        <SelectValue placeholder="Επιλέξτε Τύπο Στάσης" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {busStopTypes.map(type => (
                                            <SelectItem key={type.id} value={type.id}>
                                                {type.type_code} - {type.type_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Input
                                    placeholder="Product ID"
                                    value={item.product_identifier}
                                    onChange={(e) => {
                                        const updated = [...bomCosts];
                                        updated[idx].product_identifier = e.target.value;
                                        setBomCosts(updated);
                                    }}
                                    className="w-32"
                                    disabled
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
                                    placeholder="Ποσότητα"
                                    value={item.quantity}
                                    onChange={(e) => {
                                        const updated = [...bomCosts];
                                        updated[idx].quantity = e.target.value;
                                        setBomCosts(updated);
                                    }}
                                    className="w-24"
                                />
                                <Input
                                    type="number"
                                    placeholder="Κόστος BOM"
                                    value={item.calculated_bom_cost}
                                    className="w-32 bg-blue-50"
                                    disabled
                                />
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setBomCosts(bomCosts.filter((_, i) => i !== idx))}
                                >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                            <div className="text-xs text-slate-600 bg-blue-50 p-2 rounded">
                                <strong>Υπολογισμός:</strong> {formatCurrency(item.calculated_bom_cost)} × {item.quantity} τεμάχια = {formatCurrency((parseFloat(item.calculated_bom_cost) || 0) * (parseFloat(item.quantity) || 1))}
                            </div>
                        </div>
                    ))}
                    </div>
                    </CollapsibleContent>
                    <div className="mt-2 text-sm font-medium text-slate-700">
                    Σύνολο Υλικών: {formatCurrency(calculateBomTotal())}
                    </div>
                    </div>
                    </Collapsible>
                    );
                    }
    
    function renderInvestmentAmortizationSection() {
        return (
            <Collapsible open={expandedSections.investment} onOpenChange={() => toggleSection('investment')}>
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <CollapsibleTrigger asChild>
                            <div className="flex items-center gap-2 cursor-pointer hover:text-purple-700 transition-colors">
                                {expandedSections.investment ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                <Label className="text-base font-semibold cursor-pointer">Απόσβεση Επενδύσεων (Investment Amortization)</Label>
                            </div>
                        </CollapsibleTrigger>
                        <Button size="sm" variant="outline" onClick={addInvestmentItem}>
                            <Plus className="w-4 h-4 mr-1" />
                            Προσθήκη
                        </Button>
                    </div>
                    <CollapsibleContent>
                        <div className="space-y-3">
                            {investmentAmortization.map((item, idx) => (
                                <div key={idx} className="p-4 bg-slate-50 rounded-lg space-y-3">
                                    <div className="flex items-start gap-2">
                                        <Input placeholder="Περιγραφή" value={item.description} onChange={(e) => handleInvestmentChange(idx, 'description', e.target.value)} className="flex-1" />
                                        <div className="space-y-1">
                                            <Label className="text-xs">Συνολική Επένδυση</Label>
                                            <Input type="number" placeholder="Συνολικό Ποσό" value={item.total_investment_amount} onChange={(e) => handleInvestmentChange(idx, 'total_investment_amount', e.target.value)} className="w-40" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Διάρκεια (μήνες)</Label>
                                            <Input type="number" placeholder="Μήνες" value={item.project_duration_months} onChange={(e) => handleInvestmentChange(idx, 'project_duration_months', e.target.value)} className="w-32" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Ημερήσιο Κόστος</Label>
                                            <Input type="number" value={item.calculated_daily_cost} className="w-32 bg-blue-50" disabled />
                                        </div>
                                        <Button size="icon" variant="ghost" onClick={() => setInvestmentAmortization(investmentAmortization.filter((_, i) => i !== idx))}>
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                    <div className="text-xs text-slate-600 bg-blue-50 p-2 rounded">
                                        <strong>Ημερήσιο κόστος:</strong> {formatCurrency(item.calculated_daily_cost)}/ημέρα × {totalWorkingDays} ημέρες = {formatCurrency((parseFloat(item.calculated_daily_cost) || 0) * totalWorkingDays)}
                                    </div>
                                    <DeptAllocationRows
                                        allocations={item.department_allocations}
                                        departments={departments}
                                        totalAmount={(parseFloat(item.calculated_daily_cost) || 0) * totalWorkingDays}
                                        formatCurrency={formatCurrency}
                                        onAdd={() => addInvDeptAlloc(idx)}
                                        onUpdate={(allocIdx, field, value) => updateInvDeptAlloc(idx, allocIdx, field, value)}
                                        onRemove={(allocIdx) => removeInvDeptAlloc(idx, allocIdx)}
                                    />
                                </div>
                            ))}
                        </div>
                    </CollapsibleContent>
                    <div className="mt-2 text-sm font-medium text-slate-700">
                        Υποσύνολο: {formatCurrency(calculateInvestmentTotal())}
                    </div>
                </div>
            </Collapsible>
        );
    }

    function renderCostSection(title, costArray, setter, sectionKey) {
        return (
            <Collapsible open={expandedSections[sectionKey]} onOpenChange={() => toggleSection(sectionKey)}>
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <CollapsibleTrigger asChild>
                            <div className="flex items-center gap-2 cursor-pointer hover:text-blue-700 transition-colors">
                                {expandedSections[sectionKey] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                <Label className="text-base font-semibold cursor-pointer">{title}</Label>
                            </div>
                        </CollapsibleTrigger>
                        <Button size="sm" variant="outline" onClick={() => addCostItem(setter, costArray)}>
                            <Plus className="w-4 h-4 mr-1" />
                            Προσθήκη
                        </Button>
                    </div>
                    <CollapsibleContent>
                        <div className="space-y-3">
                            {costArray.map((item, idx) => (
                                <div key={idx} className="p-4 bg-slate-50 rounded-lg space-y-3">
                                    <div className="flex items-start gap-2">
                                        <Input placeholder="Περιγραφή" value={item.description} onChange={(e) => updateCostItem(setter, costArray, idx, 'description', e.target.value)} className="flex-1" />
                                        <Input type="number" placeholder="Ποσό" value={item.amount} onChange={(e) => updateCostItem(setter, costArray, idx, 'amount', e.target.value)} className="w-32" />
                                        <Select value={item.frequency_type} onValueChange={(value) => updateCostItem(setter, costArray, idx, 'frequency_type', value)}>
                                            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="daily">Ημερήσιο</SelectItem>
                                                <SelectItem value="per_production_day">Ανά Εργάσιμη</SelectItem>
                                                <SelectItem value="monthly">Μηνιαίο</SelectItem>
                                                <SelectItem value="yearly">Ετήσιο</SelectItem>
                                                <SelectItem value="one_time">Εφάπαξ</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button size="icon" variant="ghost" onClick={() => removeCostItem(setter, costArray, idx)}>
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                    <div className="text-xs text-slate-600 bg-blue-50 p-2 rounded">
                                        <strong>Ημερήσιο κόστος:</strong> {formatCurrency(convertCostToDaily(item.amount, item.frequency_type))}/ημέρα × {totalWorkingDays} ημέρες = {formatCurrency(convertCostToDaily(item.amount, item.frequency_type) * totalWorkingDays)}
                                    </div>
                                    <DeptAllocationRows
                                        allocations={item.department_allocations}
                                        departments={departments}
                                        totalAmount={convertCostToDaily(item.amount, item.frequency_type) * totalWorkingDays}
                                        formatCurrency={formatCurrency}
                                        onAdd={() => addCostDeptAlloc(setter, costArray, idx)}
                                        onUpdate={(allocIdx, field, value) => updateCostDeptAlloc(setter, costArray, idx, allocIdx, field, value)}
                                        onRemove={(allocIdx) => removeCostDeptAlloc(setter, costArray, idx, allocIdx)}
                                    />
                                </div>
                            ))}
                        </div>
                    </CollapsibleContent>
                    <div className="mt-2 text-sm font-medium text-slate-700">
                        Υποσύνολο: {formatCurrency(calculateCostTotal(costArray))}
                    </div>
                </div>
            </Collapsible>
        );
    }
}