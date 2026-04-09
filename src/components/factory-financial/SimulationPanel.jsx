import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import OperationalPeriodAnalysisSection from './OperationalPeriodAnalysisSection';
import OverviewFilterBar from './OverviewFilterBar';
import {
    getAvailableYearsFromEntries,
    getLatestDateFromEntries,
    getWeekNumberFromDate,
} from './utils/overviewPeriodCalculations';

function buildDefaultFilter(prodEntries, revEntries, hoursEntries) {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const latestDate = getLatestDateFromEntries(prodEntries || [], revEntries || [], hoursEntries || []) || todayStr;
    const d = new Date(latestDate + 'T00:00:00');
    const base = isNaN(d) ? today : d;
    return {
        mode: 'daily',
        selectedDate: latestDate,
        selectedWeek: getWeekNumberFromDate(base),
        selectedMonth: base.getMonth() + 1,
        selectedYear: base.getFullYear(),
    };
}

export default function SimulationPanel({
    panelIndex,
    dailyRevenueEntries = [],
    dailyCostsRecords = [],
    dailyDepartmentHoursEntries = [],
    departmentAssignments = [],
    labourPersonnel = [],
    departments = [],
    depreciationFactor = 0,
    formatCurrency,
}) {
    const safeProd  = [];
    const safeRev   = useMemo(() => Array.isArray(dailyRevenueEntries) ? dailyRevenueEntries.filter(Boolean) : [], [dailyRevenueEntries]);
    const safeHours = useMemo(() => Array.isArray(dailyDepartmentHoursEntries) ? dailyDepartmentHoursEntries.filter(Boolean) : [], [dailyDepartmentHoursEntries]);

    const [filterParams, setFilterParams] = useState(() => buildDefaultFilter(safeProd, safeRev, safeHours));

    const availableYears = useMemo(
        () => getAvailableYearsFromEntries(safeProd, safeRev, safeHours),
        [safeRev, safeHours]
    );

    return (
        <div className="flex flex-col gap-3">
            <OverviewFilterBar
                filterParams={filterParams}
                onFilterChange={setFilterParams}
                availableYears={availableYears}
            />
            <OperationalPeriodAnalysisSection
                filterParams={filterParams}
                dailyRevenueEntries={safeRev}
                dailyCostsRecords={dailyCostsRecords}
                dailyDepartmentHoursEntries={safeHours}
                departmentAssignments={departmentAssignments}
                labourPersonnel={labourPersonnel}
                departments={departments}
                depreciationFactor={depreciationFactor}
                formatCurrency={formatCurrency}
            />
        </div>
    );
}