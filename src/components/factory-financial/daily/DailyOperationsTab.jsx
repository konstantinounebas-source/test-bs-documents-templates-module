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
    const [selectedDate, setSelectedDate] = useState(todayISO);

    const handleAddRevenue = (row) => onDailyRevenue([...dailyRevenueEntries, { ...row, date: selectedDate }]);
    const handleRemoveRevenue = (idx) => onDailyRevenue(dailyRevenueEntries.filter((_, i) => i !== idx));

    const handleAddDeptHours = (row) => onDailyDepartmentHours([...dailyDepartmentHoursEntries, { ...row, date: selectedDate }]);
    const handleRemoveDeptHours = (idx) => onDailyDepartmentHours(dailyDepartmentHoursEntries.filter((_, i) => i !== idx));

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
                onAdd={handleAddRevenue}
                onRemove={handleRemoveRevenue}
                onUpdate={onDailyRevenue}
            />
            <DailyDepartmentHoursSection
                entries={dailyDepartmentHoursEntries}
                selectedDate={selectedDate}
                departments={departments}
                onAdd={handleAddDeptHours}
                onRemove={handleRemoveDeptHours}
                onUpdate={onDailyDepartmentHours}
            />
        </div>
    );
}