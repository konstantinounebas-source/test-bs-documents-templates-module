import React, { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import DailyRevenueSection from './DailyRevenueSection';
import DailyDepartmentHoursSection from './DailyDepartmentHoursSection';

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

export default function DailyOperationsTab({
    dailyProductionEntries,
    dailyRevenueEntries,
    dailyDepartmentHoursEntries,
    busStopTypes,
    departments,
    formatCurrency,
    onDailyProduction,
    onDailyRevenue,
    onDailyDepartmentHours,
    revenueCategories,
}) {
    // Ensure busStopTypes is always an array
    const normalizedBusStopTypes = Array.isArray(busStopTypes) ? busStopTypes : [];
    
    return (
        <DailyOperationsTabContent
            dailyRevenueEntries={dailyRevenueEntries}
            dailyDepartmentHoursEntries={dailyDepartmentHoursEntries}
            busStopTypes={normalizedBusStopTypes}
            departments={departments}
            formatCurrency={formatCurrency}
            onDailyRevenue={onDailyRevenue}
            onDailyDepartmentHours={onDailyDepartmentHours}
            revenueCategories={revenueCategories}
        />
    );
}

function DailyOperationsTabContent({
    dailyRevenueEntries,
    dailyDepartmentHoursEntries,
    busStopTypes,
    departments,
    formatCurrency,
    onDailyRevenue,
    onDailyDepartmentHours,
    revenueCategories,
}) {
    const [selectedDate, setSelectedDate] = useState(todayISO());

    // Add: always stamp selectedDate
    const handleAddRevenue = (row) =>
        onDailyRevenue([...dailyRevenueEntries, { ...row, date: selectedDate }]);

    // Remove by real index in the full array
    const handleRemoveRevenue = (realIdx) =>
        onDailyRevenue(dailyRevenueEntries.filter((_, i) => i !== realIdx));

    // Update: the child passes back the full array (with all dates) — pass through as-is
    const handleUpdateRevenue = (fullArray) => onDailyRevenue(fullArray);

    const handleAddDeptHours = (row) =>
        onDailyDepartmentHours([...dailyDepartmentHoursEntries, { ...row, date: selectedDate }]);

    const handleRemoveDeptHours = (realIdx) =>
        onDailyDepartmentHours(dailyDepartmentHoursEntries.filter((_, i) => i !== realIdx));

    const handleUpdateDeptHours = (fullArray) => onDailyDepartmentHours(fullArray);

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

            <DailyRevenueSection
                entries={dailyRevenueEntries}
                selectedDate={selectedDate}
                formatCurrency={formatCurrency}
                revenueCategories={revenueCategories || []}
                busStopTypes={busStopTypes}
                onAdd={handleAddRevenue}
                onRemove={handleRemoveRevenue}
                onUpdate={handleUpdateRevenue}
            />
            <DailyDepartmentHoursSection
                entries={dailyDepartmentHoursEntries}
                selectedDate={selectedDate}
                departments={departments}
                onAdd={handleAddDeptHours}
                onRemove={handleRemoveDeptHours}
                onUpdate={handleUpdateDeptHours}
            />
        </div>
    );
}