import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Copy, Save, AlertCircle } from 'lucide-react';
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
import FixedCostsTab from "@/components/factory-financial/fixed-costs/FixedCostsTab";
import OperationalCostsTab from "@/components/factory-financial/operational-costs/OperationalCostsTab";
import FinancialOverviewTab from "@/components/factory-financial/FinancialOverviewTab";
import NewLabourTab from "@/components/factory-financial/labour/NewLabourTab";
import DailyOperationsTab from "@/components/factory-financial/daily/DailyOperationsTab";
import DailyDataHistoryTab from "@/components/factory-financial/DailyDataHistoryTab";
import SimulationWhatIfPanel from "@/components/factory-financial/SimulationWhatIfPanel";
import {
    calculateTotalLabourCost,
    normalizeLoadedLabourResources,
    normalizeLoadedDepartmentLabourHours,
} from "@/components/factory-financial/utils/labourCostCalculations";
import { calculateTotalSupervisorDailyCost } from "@/components/factory-financial/utils/labourModuleCalculations";
import {
    normalizeLoadedDailyProductionEntries,
    normalizeLoadedDailyRevenueEntries,
    normalizeLoadedDailyDepartmentHoursEntries,
} from "@/components/factory-financial/utils/dailyOperationsNormalizers";
import {
    normalizeLoadedExpenseRows,
    DEFAULT_FIXED_COSTS,
    DEFAULT_OPERATIONAL_COSTS,
    initializeFixedExpenseRows,
    initializeOperationalExpenseRows,
} from "@/components/factory-financial/utils/expenseRowDefaults";
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
    
    // Labour module states (OLD - kept for backward compat)
    const [labourResources, setLabourResources] = useState([]);
    const [departmentLabourHours, setDepartmentLabourHours] = useState([]);
    
    // NEW Labour module states
    const [labourPersonnel, setLabourPersonnel] = useState([]);
    const [supervisorDailyAllocations, setSupervisorDailyAllocations] = useState([]);
    const [departmentTechnicianAssignments, setDepartmentTechnicianAssignments] = useState([]);

    // Daily operations states
     const [dailyProductionEntries, setDailyProductionEntries] = useState([]);
     const [dailyRevenueEntries, setDailyRevenueEntries] = useState([]);
     const [dailyDepartmentHoursEntries, setDailyDepartmentHoursEntries] = useState([]);
     const [dailyCostsRecords, setDailyCostsRecords] = useState([]);

    // Daily cost totals
    const [fixedDailyTotal, setFixedDailyTotal] = useState(0);
    const [operationalDailyTotal, setOperationalDailyTotal] = useState(0);

    // Simulation panels state (4 what-if scenarios)
    const [simulationPanels, setSimulationPanels] = useState([
        { shelterRows: [{ shelter_instance_id_a: '', quantity_a: '', shelter_instance_id_b: '', quantity_b: '' }], fixedMultiplier: '0', supervisorMultiplier: '0', deptHoursRows: [], extraLabourCost: '', extraLabourNote: '', title: '' },
        { shelterRows: [{ shelter_instance_id_a: '', quantity_a: '', shelter_instance_id_b: '', quantity_b: '' }], fixedMultiplier: '0', supervisorMultiplier: '0', deptHoursRows: [], extraLabourCost: '', extraLabourNote: '', title: '' },
        { shelterRows: [{ shelter_instance_id_a: '', quantity_a: '', shelter_instance_id_b: '', quantity_b: '' }], fixedMultiplier: '0', supervisorMultiplier: '0', deptHoursRows: [], extraLabourCost: '', extraLabourNote: '', title: '' },
        { shelterRows: [{ shelter_instance_id_a: '', quantity_a: '', shelter_instance_id_b: '', quantity_b: '' }], fixedMultiplier: '0', supervisorMultiplier: '0', deptHoursRows: [], extraLabourCost: '', extraLabourNote: '', title: '' }
    ]);

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

    // Tab state
    const [activeTab, setActiveTab] = useState('overview');

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

            // Period settings
            setTotalWorkingDays(record.total_working_days_in_period || 0);
            setAvgWorkingDaysPerMonth(record.average_working_days_per_month || 22);
            setAvgWorkingDaysPerYear(record.average_working_days_per_year || 260);

            // Revenue items
            setShelterRevenueItems((record.shelter_revenue_items || []).map(item => ({
                ...item,
                approved_variations: item.approved_variations || [],
                potential_variations: item.potential_variations || []
            })));
            setSalesRevenueItems(record.sales_revenue_items || []);

            // Cost sections
            setPersonnelCosts(normalizeLoadedExpenseRows(record.personnel_costs || [], 'personnel'));
            setBomCosts(record.bill_of_materials_costs || []);
            setFixedCosts(normalizeLoadedExpenseRows(
                record.fixed_costs && record.fixed_costs.length > 0 ? record.fixed_costs : DEFAULT_FIXED_COSTS,
                'fixed'
            ));
            setOperationalCosts(normalizeLoadedExpenseRows(
                record.operational_costs && record.operational_costs.length > 0 ? record.operational_costs : DEFAULT_OPERATIONAL_COSTS,
                'operational'
            ));
            setOverheadCosts(normalizeLoadedExpenseRows(record.overhead_costs || [], 'overhead'));
            setInvestmentAmortization(normalizeLoadedExpenseRows(record.investment_amortization || [], 'investment'));
            setMaintenanceCosts(normalizeLoadedExpenseRows(record.maintenance_costs || [], 'maintenance'));

            // Depreciation module
            setDepreciationInvestments(record.depreciation_module?.investments || []);
            setEstimatedRevenues(record.depreciation_module?.estimated_revenues || []);
            setAdditionalRevenues(record.depreciation_module?.additional_revenues || []);

            // Legacy labour module (backward compat)
            setLabourResources(normalizeLoadedLabourResources(record.labour_resources));
            setDepartmentLabourHours(normalizeLoadedDepartmentLabourHours(record.department_labour_hours));

            // Daily operations entries
            setDailyProductionEntries(normalizeLoadedDailyProductionEntries(record.daily_production_entries));
            setDailyRevenueEntries(normalizeLoadedDailyRevenueEntries(record.daily_revenue_entries));
            setDailyDepartmentHoursEntries(normalizeLoadedDailyDepartmentHoursEntries(record.daily_department_hours_entries));
            setDailyCostsRecords(record.daily_costs_records || []);

            // Simulation panels
            setSimulationPanels(record.simulation_panels || [
                { shelterRows: [{ shelter_instance_id_a: '', quantity_a: '', shelter_instance_id_b: '', quantity_b: '' }], fixedMultiplier: '0', supervisorMultiplier: '0', deptHoursRows: [], extraLabourCost: '', extraLabourNote: '', title: '' },
                { shelterRows: [{ shelter_instance_id_a: '', quantity_a: '', shelter_instance_id_b: '', quantity_b: '' }], fixedMultiplier: '0', supervisorMultiplier: '0', deptHoursRows: [], extraLabourCost: '', extraLabourNote: '', title: '' },
                { shelterRows: [{ shelter_instance_id_a: '', quantity_a: '', shelter_instance_id_b: '', quantity_b: '' }], fixedMultiplier: '0', supervisorMultiplier: '0', deptHoursRows: [], extraLabourCost: '', extraLabourNote: '', title: '' },
                { shelterRows: [{ shelter_instance_id_a: '', quantity_a: '', shelter_instance_id_b: '', quantity_b: '' }], fixedMultiplier: '0', supervisorMultiplier: '0', deptHoursRows: [], extraLabourCost: '', extraLabourNote: '', title: '' }
            ]);

            // Load Labour data from separate entities
            const [personnel, allocations, assignments] = await Promise.all([
                base44.entities.LabourPersonnel.filter({ factory_financial_data_id: record.id }),
                base44.entities.SupervisorDailyAllocation.filter({ factory_financial_data_id: record.id }),
                base44.entities.DepartmentTechnicianAssignment.filter({ factory_financial_data_id: record.id })
            ]);

            // Build map from DB record id → person_uid for UI references
            const recordIdToPersonUid = {};
            personnel.forEach(p => {
                recordIdToPersonUid[p.id] = p.person_uid || p.id;
            });

            // Map person_uid back to id for UI references
            const personnelWithUIIds = personnel.map(p => ({
                ...p,
                id: p.person_uid || p.id
            }));
            setLabourPersonnel(personnelWithUIIds);
            console.log('✅ Loaded labour personnel:', personnelWithUIIds.length, 'records');
            
            // Map allocations: convert DB record ids back to person_uid for UI
            const allocationsWithUIIds = allocations.map(a => ({
                ...a,
                personnel_id: recordIdToPersonUid[a.personnel_id] || a.personnel_id
            }));
            setSupervisorDailyAllocations(allocationsWithUIIds);
            console.log('✅ Loaded supervisor allocations:', allocationsWithUIIds.length, 'records');

            // Load technician rows for each assignment
            const assignmentsWithRows = await Promise.all(
                assignments.map(async (assignment) => ({
                    ...assignment,
                    technician_rows: (await base44.entities.DepartmentTechnicianRow.filter({ assignment_id: assignment.id })).map(row => ({
                        ...row,
                        personnel_id: recordIdToPersonUid[row.personnel_id] || row.personnel_id
                    }))
                }))
            );
            setDepartmentTechnicianAssignments(assignmentsWithRows);
            console.log('✅ Loaded department technician assignments:', assignmentsWithRows.length, 'records');

            // Load Fixed and Operational cost totals from database
            await loadFixedCostTotal(record.id);
            await loadOperationalCostTotal(record.id);

             } catch (error) {
              console.error('Failed to load record data:', error);
              toast.error('Σφάλμα φόρτωσης δεδομένων εγγραφής');
             } finally {
              setIsLoading(false);
             }
             };

            const loadFixedCostTotal = async (recordId) => {
            try {
             if (!recordId) return;
             const items = await base44.entities.FixedCostItem.filter({
                 factory_financial_data_id: recordId
             });
             const total = items.reduce((sum, item) => {
                 const daily = convertCostToDaily(item.amount, item.frequency_type, avgWorkingDaysPerMonth, avgWorkingDaysPerYear, totalWorkingDays);
                 return sum + daily;
             }, 0);
             setFixedDailyTotal(total);
             console.log('✅ Fixed costs total loaded:', total);
            } catch (error) {
             console.error('Failed to load fixed cost total:', error);
            }
            };

            const loadOperationalCostTotal = async (recordId) => {
            try {
             if (!recordId) return;
             const items = await base44.entities.OperationalCostItem.filter({
                 factory_financial_data_id: recordId
             });
             const total = items.reduce((sum, item) => {
                 const daily = convertCostToDaily(item.amount, item.frequency_type, avgWorkingDaysPerMonth, avgWorkingDaysPerYear, totalWorkingDays);
                 return sum + daily;
             }, 0);
             setOperationalDailyTotal(total);
             console.log('✅ Operational costs total loaded:', total);
            } catch (error) {
             console.error('Failed to load operational cost total:', error);
            }
            };

    const handleSave = async () => {
        if (!selectedRecord) {
            toast.error('Δεν έχει επιλεγεί εγγραφή');
            return;
        }

        if (!validateAllAllocations()) {
            console.warn('Allocations validation failed');
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
                daily_costs_records: dailyCostsRecords,
                simulation_panels: simulationPanels,
            };

            // 1️⃣ Update FactoryFinancialData first
            console.log('📝 Updating FactoryFinancialData...');
            await base44.entities.FactoryFinancialData.update(selectedRecord.id, updatedData);

            // 2️⃣ Delete old labour data in reverse dependency order
            console.log('🗑️ Deleting old labour data...');
            const existingAssignments = await base44.entities.DepartmentTechnicianAssignment.filter({ factory_financial_data_id: selectedRecord.id });
            for (const assignment of existingAssignments) {
                const rows = await base44.entities.DepartmentTechnicianRow.filter({ assignment_id: assignment.id });
                for (const row of rows) {
                    await base44.entities.DepartmentTechnicianRow.delete(row.id);
                }
                await base44.entities.DepartmentTechnicianAssignment.delete(assignment.id);
            }

            const existingAllocations = await base44.entities.SupervisorDailyAllocation.filter({ factory_financial_data_id: selectedRecord.id });
            for (const allocation of existingAllocations) {
                await base44.entities.SupervisorDailyAllocation.delete(allocation.id);
            }

            const existingPersonnel = await base44.entities.LabourPersonnel.filter({ factory_financial_data_id: selectedRecord.id });
            for (const person of existingPersonnel) {
                await base44.entities.LabourPersonnel.delete(person.id);
            }

            // 3️⃣ Create new LabourPersonnel first and build map
            console.log('✅ Creating LabourPersonnel...');
            const personUidToRecordId = {};
            for (const person of labourPersonnel) {
                // Skip empty records
                if (!person.person_name?.trim()) continue;

                const personPayload = {
                    factory_financial_data_id: selectedRecord.id,
                    person_uid: person.id,
                    person_name: person.person_name || '',
                    position: person.position || '',
                    role_type: person.role_type || 'technician',
                    employment_type: person.employment_type || 'monthly',
                    monthly_salary: parseFloat(person.monthly_salary) || 0,
                    daily_rate: parseFloat(person.daily_rate) || 0,
                    day_factor: parseFloat(person.day_factor) || 22,
                    hour_factor: parseFloat(person.hour_factor) || 8,
                    is_active: person.is_active !== false,
                    calculated_daily_cost: parseFloat(person.calculated_daily_cost) || 0,
                    calculated_hourly_cost: parseFloat(person.calculated_hourly_cost) || 0,
                    department_id: person.department_id || '',
                };
                console.log('Creating LabourPersonnel payload:', personPayload);
                const createdPerson = await base44.entities.LabourPersonnel.create(personPayload);
                personUidToRecordId[person.id] = createdPerson.id;
                console.log('Created person:', person.id, '→ DB id:', createdPerson.id);
            }

            // 4️⃣ Create new SupervisorDailyAllocation using actual record ids
            console.log('✅ Creating SupervisorDailyAllocation...');
            for (const allocation of supervisorDailyAllocations) {
                // Skip empty records (must have personnel_id)
                if (!allocation.personnel_id) continue;

                const recordId = personUidToRecordId[allocation.personnel_id];
                if (!recordId) {
                    console.warn('⚠️ Skipping allocation: no matching person found for', allocation.personnel_id);
                    continue;
                }

                const allocPayload = {
                    factory_financial_data_id: selectedRecord.id,
                    personnel_id: recordId,
                    allocation_factor: parseFloat(allocation.allocation_factor) || 1,
                    comments: allocation.comments || '',
                };
                console.log('Creating SupervisorDailyAllocation payload:', allocPayload);
                await base44.entities.SupervisorDailyAllocation.create(allocPayload);
            }

            // 5️⃣ Create new DepartmentTechnicianAssignment + DepartmentTechnicianRow
            console.log('✅ Creating DepartmentTechnicianAssignment + Row...');
            for (const assignment of departmentTechnicianAssignments) {
                // Skip empty records (must have department_id)
                if (!assignment.department_id) continue;

                const assignPayload = {
                    factory_financial_data_id: selectedRecord.id,
                    department_id: assignment.department_id,
                };
                console.log('Creating DepartmentTechnicianAssignment payload:', assignPayload);
                const createdAssignment = await base44.entities.DepartmentTechnicianAssignment.create(assignPayload);

                for (const techRow of (assignment.technician_rows || [])) {
                    // Skip empty technician rows
                    if (!techRow.personnel_id && !techRow.comments?.trim()) continue;

                    const recordId = personUidToRecordId[techRow.personnel_id];
                    if (!recordId) {
                        console.warn('⚠️ Skipping technician row: no matching person found for', techRow.personnel_id);
                        continue;
                    }

                    const rowPayload = {
                        assignment_id: createdAssignment.id,
                        personnel_id: recordId,
                        comments: techRow.comments || '',
                    };
                    console.log('Creating DepartmentTechnicianRow payload:', rowPayload);
                    await base44.entities.DepartmentTechnicianRow.create(rowPayload);
                }
            }

            console.log('✅ Save completed successfully');
            toast.success('Τα δεδομένα αποθηκεύτηκαν επιτυχώς');
            setCurrentData(prev => ({ ...prev, ...updatedData }));
        } catch (error) {
            console.error('❌ SAVE ERROR:', error);
            console.error('❌ SAVE ERROR JSON:', JSON.stringify(error, null, 2));
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
               daily_costs_records: dailyCostsRecords,
               simulation_panels: simulationPanels,
               is_active: true
               };

            const clonedRecord = await base44.entities.FactoryFinancialData.create(clonedData);

            // Clone labour data with same person-first + id-map logic
            const clonePersonUidToRecordId = {};
            for (const person of labourPersonnel) {
                if (!person.person_name?.trim()) continue;

                const personPayload = {
                    factory_financial_data_id: clonedRecord.id,
                    person_uid: person.id,
                    person_name: person.person_name || '',
                    position: person.position || '',
                    role_type: person.role_type || 'technician',
                    employment_type: person.employment_type || 'monthly',
                    monthly_salary: parseFloat(person.monthly_salary) || 0,
                    daily_rate: parseFloat(person.daily_rate) || 0,
                    day_factor: parseFloat(person.day_factor) || 22,
                    hour_factor: parseFloat(person.hour_factor) || 8,
                    is_active: person.is_active !== false,
                    calculated_daily_cost: parseFloat(person.calculated_daily_cost) || 0,
                    calculated_hourly_cost: parseFloat(person.calculated_hourly_cost) || 0,
                    department_id: person.department_id || '',
                };
                const createdPerson = await base44.entities.LabourPersonnel.create(personPayload);
                clonePersonUidToRecordId[person.id] = createdPerson.id;
            }

            for (const alloc of supervisorDailyAllocations) {
                if (!alloc.personnel_id) continue;

                const recordId = clonePersonUidToRecordId[alloc.personnel_id];
                if (!recordId) continue;

                const allocPayload = {
                    factory_financial_data_id: clonedRecord.id,
                    personnel_id: recordId,
                    allocation_factor: parseFloat(alloc.allocation_factor) || 1,
                    comments: alloc.comments || '',
                };
                await base44.entities.SupervisorDailyAllocation.create(allocPayload);
            }

            for (const assignment of departmentTechnicianAssignments) {
                if (!assignment.department_id) continue;

                const assignPayload = {
                    factory_financial_data_id: clonedRecord.id,
                    department_id: assignment.department_id,
                };
                const newAssignment = await base44.entities.DepartmentTechnicianAssignment.create(assignPayload);

                for (const row of (assignment.technician_rows || [])) {
                    if (!row.personnel_id && !row.comments?.trim()) continue;

                    const recordId = clonePersonUidToRecordId[row.personnel_id];
                    if (!recordId) continue;

                    const rowPayload = {
                        assignment_id: newAssignment.id,
                        personnel_id: recordId,
                        comments: row.comments || '',
                    };
                    await base44.entities.DepartmentTechnicianRow.create(rowPayload);
                }
            }

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
        
        if (field === 'shelter_instance_bundle') {
            // Single atomic update for shelter instance + unit_revenue
            updated[idx].shelter_instance_id = value?.shelter_instance_id || '';
            updated[idx].unit_revenue = parseFloat(value?.unit_revenue) || 0;
            updated[idx].total_revenue = (parseFloat(updated[idx].pending_quantity) || 0) * (parseFloat(value?.unit_revenue) || 0);
        } else if (field === 'shelter_instance_id') {
            updated[idx].shelter_instance_id = value || '';
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
                         {/* Overhead Alert */}
                         {overheadCosts && overheadCosts.length > 0 && overheadCosts.some(c => !c.allocation || c.allocation === 0) && (
                             <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 flex items-start gap-3">
                                 <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                 <div>
                                     <p className="font-semibold text-yellow-900">Εκκρεμή Κόστη Overhead</p>
                                     <p className="text-sm text-yellow-800 mt-1">
                                         Υπάρχουν κόστη Overhead που χρειάζονται αναλογική ανάλυση κατανομής στα τμήματα. 
                                         Παρακαλώ ελέγξτε την καρτέλα Επισκόπησης για λεπτομέρειες.
                                     </p>
                                 </div>
                             </div>
                         )}

                         {/* Tab Layout */}
                          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                             <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-slate-100 p-1 rounded-xl mb-2">
                                {[
                                    { value: 'overview', label: 'Επισκόπηση' },
                                    { value: 'daily', label: 'Daily Operations' },
                                    { value: 'daily_history', label: 'Daily History' },
                                    { value: 'revenue', label: 'Έσοδα' },
                                    { value: 'fixed', label: 'Σταθερά Κόστη' },
                                    { value: 'operational', label: 'Λειτουργικά Κόστη' },
                                    { value: 'labour', label: 'Κόστος Προσωπικού' },
                                    { value: 'depreciation', label: 'Αποσβέσεις' },
                                    { value: 'simulation', label: 'Προσομοίωση' },
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
                                    depreciationFactor={getCalculateDepreciationFactor()}
                                    formatCurrency={formatCurrency}
                                    hasInvalidAllocations={!validateAllAllocations()}
                                    legacyPersonnelCost={getCalculateLegacyPersonnelCostTotal()}
                                    dailyProductionEntries={dailyProductionEntries}
                                    dailyRevenueEntries={dailyRevenueEntries}
                                    dailyDepartmentHoursEntries={dailyDepartmentHoursEntries}
                                    dailyCostsRecords={dailyCostsRecords}
                                    startDate={currentData?.start_date || ''}
                                    endDate={currentData?.end_date || ''}
                                    departmentAssignments={departmentTechnicianAssignments}
                                    labourPersonnel={labourPersonnel}
                                    departments={departments}
                                    costBreakdown={[
                                        { label: 'Κόστος Προσωπικού', value: getCalculateLabourCostTotal() },
                                        { label: 'BOM (Υλικά)', value: getCalculateBomTotal() },
                                        { label: 'Σταθερά Κόστη', value: getCalculateCostTotal(fixedCosts) },
                                        { label: 'Λειτουργικά Κόστη', value: getCalculateCostTotal(operationalCosts) },
                                        { label: 'Overhead', value: getCalculateCostTotal(overheadCosts) },
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
                                    onAddItem={() => setShelterRevenueItems([...shelterRevenueItems, {
                                         shelter_instance_id: '',
                                         description: '',
                                         contract_amount: 0,
                                         amount_from_jv: 0,
                                         approved_variations: [],
                                         potential_variations: []
                                     }])}
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
                                 <FixedCostsTab
                                     factoryFinancialDataId={selectedRecord?.id}
                                     totalWorkingDays={totalWorkingDays}
                                     formatCurrency={formatCurrency}
                                     onDailyTotalChange={setFixedDailyTotal}
                                 />
                             </TabsContent>

                            {/* OPERATIONAL COSTS TAB */}
                             <TabsContent value="operational" className="mt-4">
                                 <OperationalCostsTab
                                     factoryFinancialDataId={selectedRecord?.id}
                                     totalWorkingDays={totalWorkingDays}
                                     formatCurrency={formatCurrency}
                                     onDailyTotalChange={setOperationalDailyTotal}
                                 />
                             </TabsContent>



                            {/* LABOUR COST TAB - NEW MODULE */}
                            <TabsContent value="labour" className="mt-4">
                                <NewLabourTab
                                    labourPersonnel={labourPersonnel}
                                    supervisorDailyAllocations={supervisorDailyAllocations}
                                    departmentTechnicianAssignments={departmentTechnicianAssignments}
                                    departments={departments}
                                    formatCurrency={formatCurrency}
                                    onPersonnelUpdate={setLabourPersonnel}
                                    onSupervisorAllocationsUpdate={setSupervisorDailyAllocations}
                                    onDepartmentAssignmentsUpdate={setDepartmentTechnicianAssignments}
                                />
                            </TabsContent>

                            {/* DAILY OPERATIONS TAB */}
                             <TabsContent value="daily" className="mt-4">
                                  <DailyOperationsTab
                                      dailyProductionEntries={dailyProductionEntries}
                                      dailyRevenueEntries={dailyRevenueEntries}
                                      dailyDepartmentHoursEntries={dailyDepartmentHoursEntries}
                                      dailyCostsRecords={dailyCostsRecords}
                                      shelterInstances={shelterInstances}
                                      departments={departments}
                                      formatCurrency={formatCurrency}
                                      onDailyProduction={setDailyProductionEntries}
                                      onDailyRevenue={setDailyRevenueEntries}
                                      onDailyDepartmentHours={setDailyDepartmentHoursEntries}
                                      onDailyCostsRecords={setDailyCostsRecords}
                                      revenueCategories={salesRevenueItems}
                                      shelterRevenueItems={shelterRevenueItems}
                                      getShelterRevenueTotal={getShelterRevenueTotal}
                                      departmentAssignments={departmentTechnicianAssignments}
                                      labourPersonnel={labourPersonnel}
                                      supervisorDailyAllocations={supervisorDailyAllocations}
                                      fixedDailyTotal={fixedDailyTotal}
                                      operationalDailyTotal={operationalDailyTotal}
                                      factoryFinancialDataId={selectedRecord?.id}
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
                                        shelter_instance_id: '',
                                        description: '',
                                        pending_quantity: 0,
                                        unit_revenue: 0,
                                        total_revenue: 0
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

                            {/* SIMULATION TAB */}
                            <TabsContent value="simulation" className="mt-4">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {[0, 1, 2, 3].map((idx) => (
                                        <SimulationWhatIfPanel
                                            key={idx}
                                            panelIndex={idx}
                                            shelterInstances={shelterInstances}
                                            shelterRevenueItems={shelterRevenueItems}
                                            getShelterRevenueTotal={getShelterRevenueTotal}
                                            departmentAssignments={departmentTechnicianAssignments}
                                            labourPersonnel={labourPersonnel}
                                            departments={departments}
                                            fixedDailyTotal={fixedDailyTotal}
                                            operationalDailyTotal={operationalDailyTotal}
                                            supervisorDailyCost={calculateTotalSupervisorDailyCost(supervisorDailyAllocations, labourPersonnel)}
                                            depreciationFactor={getCalculateDepreciationFactor()}
                                            formatCurrency={formatCurrency}
                                            // Pass simulation data and handlers
                                            panelData={simulationPanels[idx]}
                                            onPanelDataChange={(newData) => {
                                                setSimulationPanels(prev => {
                                                    const updated = [...prev];
                                                    updated[idx] = newData;
                                                    return updated;
                                                });
                                            }}
                                        />
                                    ))}
                                </div>
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