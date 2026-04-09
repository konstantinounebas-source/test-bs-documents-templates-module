import React, { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import DailyRevenueSection from './DailyRevenueSection';
import DailyDepartmentHoursSection from './DailyDepartmentHoursSection';
import DailyFixedCostsSection from './DailyFixedCostsSection';
import DailyOperationalCostsSection from './DailyOperationalCostsSection';
import DailySupervisorCostsSection from './DailySupervisorCostsSection';
import { calculateTotalSupervisorDailyCost } from '../utils/labourModuleCalculations';

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

export default function DailyOperationsTab({
    dailyProductionEntries,
    dailyRevenueEntries,
    dailyDepartmentHoursEntries,
    dailyCostsRecords,
    shelterInstances,
    departments,
    formatCurrency,
    onDailyProduction,
    onDailyRevenue,
    onDailyDepartmentHours,
    onDailyCostsRecords,
    revenueCategories,
    shelterRevenueItems,
    getShelterRevenueTotal,
    departmentAssignments,
    labourPersonnel,
    supervisorDailyAllocations,
    fixedDailyTotal,
    operationalDailyTotal,
    factoryFinancialDataId,
}) {
    // Ensure shelterInstances is always an array
    const normalizedShelterInstances = Array.isArray(shelterInstances) ? shelterInstances : [];
    
    return (
        <DailyOperationsTabContent
            dailyRevenueEntries={dailyRevenueEntries}
            dailyDepartmentHoursEntries={dailyDepartmentHoursEntries}
            dailyCostsRecords={dailyCostsRecords}
            shelterInstances={normalizedShelterInstances}
            departments={departments}
            formatCurrency={formatCurrency}
            onDailyRevenue={onDailyRevenue}
            onDailyDepartmentHours={onDailyDepartmentHours}
            onDailyCostsRecords={onDailyCostsRecords}
            revenueCategories={revenueCategories}
            shelterRevenueItems={shelterRevenueItems}
            getShelterRevenueTotal={getShelterRevenueTotal}
            departmentAssignments={departmentAssignments}
            labourPersonnel={labourPersonnel}
            supervisorDailyAllocations={supervisorDailyAllocations}
            fixedDailyTotal={fixedDailyTotal}
            operationalDailyTotal={operationalDailyTotal}
            factoryFinancialDataId={factoryFinancialDataId}
        />
    );
}

function DailyOperationsTabContent({
    dailyRevenueEntries,
    dailyDepartmentHoursEntries,
    dailyCostsRecords,
    shelterInstances,
    departments,
    formatCurrency,
    onDailyRevenue,
    onDailyDepartmentHours,
    onDailyCostsRecords,
    revenueCategories,
    shelterRevenueItems,
    getShelterRevenueTotal,
    departmentAssignments,
    labourPersonnel,
    supervisorDailyAllocations,
    fixedDailyTotal,
    operationalDailyTotal,
    factoryFinancialDataId,
}) {
    const [selectedDate, setSelectedDate] = useState(todayISO());

    // Add: always stamp selectedDate
    const handleAddRevenue = (row) => {
        const newEntry = { ...row, date: selectedDate };
        console.log('✅ Adding revenue entry with date:', newEntry);
        onDailyRevenue([...dailyRevenueEntries, newEntry]);
    };

    // Remove by real index in the full array
    const handleRemoveRevenue = (realIdx) => {
        const updated = dailyRevenueEntries.filter((_, i) => i !== realIdx);
        console.log('✅ Removing revenue entry, remaining:', updated);
        onDailyRevenue(updated);
    };

    // Update: the child passes back the full array (with all dates) — pass through as-is
    const handleUpdateRevenue = (fullArray) => {
        console.log('✅ Updating revenue entries:', fullArray);
        onDailyRevenue(fullArray);
    };

    const handleAddDeptHours = (row) => {
        const newEntry = { ...row, date: selectedDate };
        console.log('✅ Adding dept hours entry with date:', newEntry);
        onDailyDepartmentHours([...dailyDepartmentHoursEntries, newEntry]);
    };

    const handleRemoveDeptHours = (realIdx) => {
        const updated = dailyDepartmentHoursEntries.filter((_, i) => i !== realIdx);
        console.log('✅ Removing dept hours entry, remaining:', updated);
        onDailyDepartmentHours(updated);
    };

    const handleUpdateDeptHours = (fullArray) => {
        console.log('✅ Updating dept hours entries:', fullArray);
        onDailyDepartmentHours(fullArray);
    };

    // Helper to add cost row with unique ID
    const addCostRow = (newRow) => {
        const rowWithId = { ...newRow, id: `cost-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
        onDailyCostsRecords([...dailyCostsRecords, rowWithId]);
    };

    // Helper to remove cost row by real index
    const removeCostRow = (realIdx) => {
        const updated = dailyCostsRecords.filter((_, i) => i !== realIdx);
        onDailyCostsRecords(updated);
    };

    // Helper to update cost rows array
    const updateCostRows = (fullArray) => {
        onDailyCostsRecords(fullArray);
    };

    return (
        <div className="space-y-6">
            {/* Shared date picker */}
            <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                <CalendarDays className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span className="text-sm font-semibold text-slate-700">Ημερομηνία καταχώρησης:</span>
                <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
            </div>

            {/* Cost Sections */}
            <DailyFixedCostsSection
                entries={dailyCostsRecords}
                selectedDate={selectedDate}
                unitCost={fixedDailyTotal}
                formatCurrency={formatCurrency}
                onAdd={addCostRow}
                onRemove={removeCostRow}
                onUpdate={updateCostRows}
            />

            <DailyOperationalCostsSection
                entries={dailyCostsRecords}
                selectedDate={selectedDate}
                unitCost={operationalDailyTotal}
                formatCurrency={formatCurrency}
                onAdd={addCostRow}
                onRemove={removeCostRow}
                onUpdate={updateCostRows}
            />

            <DailySupervisorCostsSection
                entries={dailyCostsRecords}
                selectedDate={selectedDate}
                unitCost={calculateTotalSupervisorDailyCost(supervisorDailyAllocations, labourPersonnel)}
                formatCurrency={formatCurrency}
                onAdd={addCostRow}
                onRemove={removeCostRow}
                onUpdate={updateCostRows}
            />

            <DailyRevenueSection
                entries={dailyRevenueEntries}
                selectedDate={selectedDate}
                formatCurrency={formatCurrency}
                revenueCategories={revenueCategories || []}
                shelterInstances={shelterInstances}
                shelterRevenueItems={shelterRevenueItems}
                getShelterRevenueTotal={getShelterRevenueTotal}
                onAdd={handleAddRevenue}
                onRemove={handleRemoveRevenue}
                onUpdate={handleUpdateRevenue}
            />
            <DailyDepartmentHoursSection
                entries={dailyDepartmentHoursEntries}
                selectedDate={selectedDate}
                departments={departments}
                departmentAssignments={departmentAssignments}
                labourPersonnel={labourPersonnel}
                formatCurrency={formatCurrency}
                onAdd={handleAddDeptHours}
                onRemove={handleRemoveDeptHours}
                onUpdate={handleUpdateDeptHours}
            />
        </div>
    );
}