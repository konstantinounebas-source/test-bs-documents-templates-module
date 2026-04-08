import React from 'react';
import DailyProductionSection from './DailyProductionSection';
import DailyRevenueSection from './DailyRevenueSection';
import DailyDepartmentHoursSection from './DailyDepartmentHoursSection';

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
}) {
    const handleAddProduction = (row) => onDailyProduction([...dailyProductionEntries, row]);
    const handleRemoveProduction = (idx) => onDailyProduction(dailyProductionEntries.filter((_, i) => i !== idx));

    const handleAddRevenue = (row) => onDailyRevenue([...dailyRevenueEntries, row]);
    const handleRemoveRevenue = (idx) => onDailyRevenue(dailyRevenueEntries.filter((_, i) => i !== idx));

    const handleAddDeptHours = (row) => onDailyDepartmentHours([...dailyDepartmentHoursEntries, row]);
    const handleRemoveDeptHours = (idx) => onDailyDepartmentHours(dailyDepartmentHoursEntries.filter((_, i) => i !== idx));

    return (
        <div className="space-y-6">
            <DailyProductionSection
                entries={dailyProductionEntries}
                busStopTypes={busStopTypes}
                onAdd={handleAddProduction}
                onRemove={handleRemoveProduction}
                onUpdate={onDailyProduction}
            />
            <DailyRevenueSection
                entries={dailyRevenueEntries}
                formatCurrency={formatCurrency}
                onAdd={handleAddRevenue}
                onRemove={handleRemoveRevenue}
                onUpdate={onDailyRevenue}
            />
            <DailyDepartmentHoursSection
                entries={dailyDepartmentHoursEntries}
                departments={departments}
                onAdd={handleAddDeptHours}
                onRemove={handleRemoveDeptHours}
                onUpdate={onDailyDepartmentHours}
            />
        </div>
    );
}