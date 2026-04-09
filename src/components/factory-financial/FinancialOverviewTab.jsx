import React, { useState, useMemo } from 'react';
import {
    AlertTriangle, Info, FlaskConical
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

            {/* 2. Period Filter Bar */}
            <OverviewFilterBar
                filterParams={filterParams}
                onFilterChange={setFilterParams}
                availableYears={availableYears}
            />

            {/* 3. Simulation Card (UI-only, never saves to DB) */}
            <SimulationCard
                simState={simState}
                onSimChange={handleSimChange}
                onToggle={() => setSimActive(prev => !prev)}
                isActive={simActive}
            />

            {/* 4. Operational Period Financial Analysis + Cost Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

                {/* 6. Cost Breakdown + Legacy Personnel info */}
                <div className="space-y-3">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold text-slate-800">Ανάλυση Κόστους (Λειτουργική Περίοδος)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1">
                            {(costBreakdown || []).map((item, i) => (
                                <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
                                    <span className="text-sm text-slate-600">{item.label}</span>
                                    <span className="text-sm font-medium text-slate-800">{fmt(item.value)}</span>
                                </div>
                            ))}
                            <div className="flex justify-between items-center py-2 bg-slate-100 rounded px-2 mt-2">
                                <span className="text-sm font-semibold text-slate-800">Σύνολο Κόστους</span>
                                <span className="text-sm font-bold text-slate-900">{fmt(totalCosts)}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Legacy personnel cost — informational only, excluded from official totals */}
                    {legacyPersonnelCost !== undefined && legacyPersonnelCost > 0 && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                            <div className="flex items-center gap-2 text-slate-500 font-semibold text-xs uppercase tracking-wide">
                                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                                Legacy Personnel Cost (informational only — εκτός συνολικού κόστους)
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Legacy Personnel (παλιά εγγραφές)</span>
                                <span className="text-sm font-medium text-slate-500">{fmt(legacyPersonnelCost)}</span>
                            </div>
                            <p className="text-xs text-slate-400">
                                Αυτό το ποσό δεν προσμετράται στο Κόστος Παραγωγής. Αντικαθίσταται από το Labour Module.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}