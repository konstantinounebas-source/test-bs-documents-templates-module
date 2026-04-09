import React, { useState, useMemo } from 'react';
import {
    AlertTriangle, Info, FlaskConical, CalendarDays, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import OverviewFilterBar from './OverviewFilterBar';
import SimulationCard from './SimulationCard';
import OperationalPeriodAnalysisSection from './OperationalPeriodAnalysisSection';
import {
    buildOverviewPeriodSummary,
    getAvailableYearsFromEntries,
    getLatestDateFromEntries,
    getWeekNumberFromDate,
} from './utils/overviewPeriodCalculations';

// ─── Weekly Selector (inline mini-bar for the weekly panel) ──────────────────
function WeeklySelector({ selectedWeek, selectedYear, availableYears, onChange }) {
    const years = availableYears && availableYears.length > 0 ? availableYears : [new Date().getFullYear()];
    const WEEKS = Array.from({ length: 53 }, (_, i) => i + 1);

    const prev = () => {
        if (selectedWeek > 1) {
            onChange({ selectedWeek: selectedWeek - 1, selectedYear });
        } else {
            onChange({ selectedWeek: 52, selectedYear: selectedYear - 1 });
        }
    };
    const next = () => {
        if (selectedWeek < 52) {
            onChange({ selectedWeek: selectedWeek + 1, selectedYear });
        } else {
            onChange({ selectedWeek: 1, selectedYear: selectedYear + 1 });
        }
    };

    return (
        <div className="flex items-center gap-2 flex-wrap">
            <button onClick={prev} className="p-1 rounded hover:bg-slate-100 text-slate-500">
                <ChevronLeft className="w-4 h-4" />
            </button>
            <select
                value={selectedYear}
                onChange={e => onChange({ selectedWeek, selectedYear: parseInt(e.target.value) })}
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select
                value={selectedWeek}
                onChange={e => onChange({ selectedWeek: parseInt(e.target.value), selectedYear })}
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
                {WEEKS.map(w => <option key={w} value={w}>Εβδ. {w}</option>)}
            </select>
            <button onClick={next} className="p-1 rounded hover:bg-slate-100 text-slate-500">
                <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    );
}

// ─── Build default filter (today, or latest available date) ───────────────────

function buildDefaultFilter(prodEntries, revEntries, hoursEntries) {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    // Use latest available date from daily entries; fall back to today
    const latestDate = getLatestDateFromEntries(prodEntries, revEntries, hoursEntries) || todayStr;
    const d = new Date(latestDate + 'T00:00:00');
    return {
        mode: 'daily',
        selectedDate: latestDate,
        selectedWeek: getWeekNumberFromDate(isNaN(d) ? today : d),
        selectedMonth: (isNaN(d) ? today : d).getMonth() + 1,
        selectedYear:  (isNaN(d) ? today : d).getFullYear(),
    };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FinancialOverviewTab({
    // Static planning data (never affected by period filter or simulation)
    totalIncome,
    totalCosts,
    depreciationCost,
    depreciationFactor,
    formatCurrency,
    costBreakdown,
    hasInvalidAllocations,
    legacyPersonnelCost,
    // Daily operational data (source for period KPIs)
    dailyProductionEntries,
    dailyRevenueEntries,
    dailyDepartmentHoursEntries,
    dailyCostsRecords = [],
    startDate = '',
    endDate = '',
    // For live labour cost calculation
    departmentAssignments = [],
    labourPersonnel = [],
    departments = [],
}) {
    const safeProd  = useMemo(() => Array.isArray(dailyProductionEntries)       ? dailyProductionEntries.filter(Boolean)       : [], [dailyProductionEntries]);
    const safeRev   = useMemo(() => Array.isArray(dailyRevenueEntries)          ? dailyRevenueEntries.filter(Boolean)          : [], [dailyRevenueEntries]);
    const safeHours = useMemo(() => Array.isArray(dailyDepartmentHoursEntries)  ? dailyDepartmentHoursEntries.filter(Boolean)  : [], [dailyDepartmentHoursEntries]);

    // Filter state — initialised once; default date = latest from entries or today
    const [filterParams, setFilterParams] = useState(() => buildDefaultFilter(safeProd, safeRev, safeHours));

    // Weekly panel — always mode='weekly', defaults to current week
    const [weeklyParams, setWeeklyParams] = useState(() => {
        const today = new Date();
        return {
            mode: 'weekly',
            selectedWeek: getWeekNumberFromDate(today),
            selectedYear: today.getFullYear(),
            selectedDate: '',
            selectedMonth: today.getMonth() + 1,
        };
    });

    // Simulation state (local UI only — NEVER saved to DB)
    const [simActive, setSimActive] = useState(false);
    const [simState, setSimState] = useState({ revenue: 0, productionQty: 0, totalHours: 0 });
    const handleSimChange = (field, value) => setSimState(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));

    // Available years from all entries (for filter dropdowns)
    const availableYears = useMemo(
        () => getAvailableYearsFromEntries(safeProd, safeRev, safeHours),
        [safeProd, safeRev, safeHours]
    );

    // Period summary filtered from daily arrays
    const periodSummary = useMemo(
        () => buildOverviewPeriodSummary(safeProd, safeRev, safeHours, filterParams),
        [safeProd, safeRev, safeHours, filterParams]
    );

    const fmt = formatCurrency
        || (v => `€${parseFloat(v || 0).toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

    return (
        <div className="space-y-6">

            {/* 1. Invalid allocation warning */}
            {hasInvalidAllocations && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 text-amber-800 rounded-xl px-4 py-3 text-sm font-medium">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span>Προσοχή: Υπάρχουν κατανομές τμημάτων που δεν αθροίζουν στο 100%. Αποθήκευση δεν επιτρέπεται.</span>
                </div>
            )}

            {/* 3. Simulation Card (UI-only, never saves to DB) */}
            <SimulationCard
                simState={simState}
                onSimChange={handleSimChange}
                onToggle={() => setSimActive(prev => !prev)}
                isActive={simActive}
            />

            {/* 4. Operational Period Financial Analysis — two panels side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: period-filter-driven panel */}
                <div className="flex flex-col gap-3">
                    {/* Mirror header bar for left panel */}
                    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
                        <OverviewFilterBar
                            filterParams={filterParams}
                            onFilterChange={setFilterParams}
                            availableYears={availableYears}
                        />
                    </div>
                    <OperationalPeriodAnalysisSection
                        filterParams={filterParams}
                        dailyRevenueEntries={safeRev}
                        dailyCostsRecords={dailyCostsRecords}
                        dailyDepartmentHoursEntries={safeHours}
                        departmentAssignments={departmentAssignments}
                        labourPersonnel={labourPersonnel}
                        departments={departments}
                        depreciationFactor={depreciationFactor}
                        formatCurrency={fmt}
                    />
                </div>

                {/* Right: standalone weekly panel */}
                <div className="flex flex-col gap-3">
                    {/* Weekly selector header */}
                    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm">
                            <CalendarDays className="w-4 h-4" />
                            Εβδομαδιαία Επισκόπηση
                        </div>
                        <div className="ml-auto">
                            <WeeklySelector
                                selectedWeek={weeklyParams.selectedWeek}
                                selectedYear={weeklyParams.selectedYear}
                                availableYears={availableYears}
                                onChange={({ selectedWeek, selectedYear }) =>
                                    setWeeklyParams(prev => ({ ...prev, selectedWeek, selectedYear }))
                                }
                            />
                        </div>
                    </div>
                    <OperationalPeriodAnalysisSection
                        filterParams={weeklyParams}
                        dailyRevenueEntries={safeRev}
                        dailyCostsRecords={dailyCostsRecords}
                        dailyDepartmentHoursEntries={safeHours}
                        departmentAssignments={departmentAssignments}
                        labourPersonnel={labourPersonnel}
                        departments={departments}
                        depreciationFactor={depreciationFactor}
                        formatCurrency={fmt}
                    />
                </div>
            </div>
        </div>
    );
}