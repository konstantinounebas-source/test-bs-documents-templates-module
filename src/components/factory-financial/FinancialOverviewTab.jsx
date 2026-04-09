import React, { useState, useMemo, useEffect } from 'react';
import {
    AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Info, TrendingUp
} from 'lucide-react';
import OverviewFilterBar from './OverviewFilterBar';
import OperationalPeriodAnalysisSection from './OperationalPeriodAnalysisSection';
import { base44 } from '@/api/base44Client';
import {
    buildOverviewPeriodSummary,
    getAvailableYearsFromEntries,
    getLatestDateFromEntries,
    getWeekNumberFromDate,
} from './utils/overviewPeriodCalculations';

// ─── Weekly Selector (styled identical to OverviewFilterBar) ─────────────────
function WeeklySelector({ selectedWeek, selectedYear, availableYears, onChange }) {
    const years = availableYears && availableYears.length > 0 ? availableYears : [new Date().getFullYear()];
    const WEEKS = Array.from({ length: 53 }, (_, i) => i + 1);

    const prev = () => {
        if (selectedWeek > 1) onChange({ selectedWeek: selectedWeek - 1, selectedYear });
        else onChange({ selectedWeek: 52, selectedYear: selectedYear - 1 });
    };
    const next = () => {
        if (selectedWeek < 52) onChange({ selectedWeek: selectedWeek + 1, selectedYear });
        else onChange({ selectedWeek: 1, selectedYear: selectedYear + 1 });
    };

    return (
        <div className="flex flex-wrap items-center gap-3">
            {/* "Mode" indicator — fixed to Εβδομαδιαίο, styled like active button */}
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                <div className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-blue-600 text-white">
                    <CalendarDays className="w-3.5 h-3.5" />
                    Εβδομαδιαίο
                </div>
            </div>

            {/* Year + Week selects */}
            <div className="flex items-center gap-2">
                <button onClick={prev} className="p-1.5 rounded hover:bg-slate-100 text-slate-500">
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <select
                    value={selectedYear}
                    onChange={e => onChange({ selectedWeek, selectedYear: parseInt(e.target.value) })}
                    className="border border-slate-200 rounded-lg px-2 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select
                    value={selectedWeek}
                    onChange={e => onChange({ selectedWeek: parseInt(e.target.value), selectedYear })}
                    className="border border-slate-200 rounded-lg px-2 py-2 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
                >
                    {WEEKS.map(w => <option key={w} value={w}>Εβδ. {w}</option>)}
                </select>
                <button onClick={next} className="p-1.5 rounded hover:bg-slate-100 text-slate-500">
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
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

    // JV profit data — calculated from Net Expected Profit per shelter instance
     // Quantity comes from Daily Revenue entries for the SELECTED PERIOD
     // Air Control = 75% of Net Profit, Amco = 25% of Net Profit
     const [jvData, setJvData] = useState({ airControlTotal: null, amcoTotal: null, netProfitTotal: null });

     // Helper function to filter entries by period
     const filterEntriesByPeriod = (entries, period) => {
         if (!entries || !period) return [];

         return entries.filter(entry => {
             // Support both 'date' and 'entry_date' field names
             const dateStr = entry.date || entry.entry_date;
             if (!dateStr) return false;
             const entryDate = new Date(dateStr + 'T00:00:00');

             if (period.mode === 'daily') {
                 // Single day
                 const selectedDate = new Date(period.selectedDate + 'T00:00:00');
                 return entryDate.getTime() === selectedDate.getTime();
             } else if (period.mode === 'weekly') {
                 // Week of year
                 const year = period.selectedYear;
                 const week = period.selectedWeek;
                 const jan4 = new Date(year, 0, 4);
                 const weekStart = new Date(jan4);
                 weekStart.setDate(jan4.getDate() - jan4.getDay() + 1);
                 const weekStartOfYear = Math.ceil(((new Date(year, 0, 1).getTime() - weekStart.getTime()) / (7 * 24 * 60 * 60 * 1000)));
                 const currentWeekStart = new Date(weekStart);
                 currentWeekStart.setDate(currentWeekStart.getDate() + (week - 1) * 7);
                 const currentWeekEnd = new Date(currentWeekStart);
                 currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);

                 return entryDate >= currentWeekStart && entryDate <= currentWeekEnd;
             } else if (period.mode === 'monthly') {
                 // Month
                 return entryDate.getFullYear() === period.selectedYear && 
                        entryDate.getMonth() + 1 === period.selectedMonth;
             }
             return false;
         });
     };

     // Filter state — initialised once; default date = latest from entries or today
     const [filterParams, setFilterParams] = useState(() => buildDefaultFilter(safeProd, safeRev, safeHours));

     useEffect(() => {
         const loadJV = async () => {
             try {
                 const [allFinancialData, allResults, instances] = await Promise.all([
                     base44.entities.ShelterFinancialData.list(),
                     base44.entities.ShelterFinancialResults.list(),
                     base44.entities.ShelterInstance.list(),
                 ]);

                 // Calculate quantity per shelter instance from daily revenue entries FILTERED BY SELECTED PERIOD
                 const filteredRevenues = filterEntriesByPeriod(safeRev, filterParams);
                 const quantityByInstance = {};
                 if (filteredRevenues && filteredRevenues.length > 0) {
                     filteredRevenues.forEach(entry => {
                         // Support both snake_case and camelCase field names
                         const instanceId = entry.shelter_instance_id || entry.shelterInstanceId;
                         if (instanceId) {
                             quantityByInstance[instanceId] = 
                                 (quantityByInstance[instanceId] || 0) + (entry.quantity || 0);
                         }
                     });
                 }

                 let airControlTotal = 0, amcoTotal = 0, netProfitTotal = 0;
                 // For each active shelter instance, calculate Net Expected Profit
                 instances.filter(i => i.active !== false).forEach(instance => {
                     const fd = allFinancialData.find(d => d.shelter_instance_id === instance.id);
                     const rd = allResults.find(r => r.shelter_instance_id === instance.id);
                     if (!rd) return;

                     // Calculate total contract income (base + approved + potential variations)
                     const contractAmount = fd?.contract_amount || 0;
                     const approvedTotal = (fd?.approved_variations || []).reduce((s, v) => s + (v.amount || 0), 0);
                     const potentialTotal = (fd?.potential_variations || []).reduce((s, v) => s + (v.amount || 0), 0);
                     const totalIncome = contractAmount + approvedTotal + potentialTotal;
                     const totalCost = fd?.total_cost_breakdown || 0;

                     // Get quantity from daily revenue entries for THIS PERIOD only, fallback to results data
                     const qty = quantityByInstance[instance.id] || rd.quantity || 1;

                     // Calculate Net Expected Profit = (Total Income - Total Cost) × Quantity - Warranty Provision
                     const grossBalance = (totalIncome - totalCost) * qty;
                     const warranty = (rd.warranty_provision || 0) * qty;
                     const netProfit = grossBalance - warranty;

                     // Distribute profit: Air Control (75%) & Amco (25%)
                     const airControlShare = rd.air_control_share_percent || 75; // Default 75%
                     const amcoShare = rd.amco_share_percent || 25; // Default 25%

                     airControlTotal += (netProfit * airControlShare) / 100;
                     amcoTotal += (netProfit * amcoShare) / 100;
                     netProfitTotal += netProfit;
                 });
                 setJvData({ airControlTotal, amcoTotal, netProfitTotal });
             } catch (e) {
                 // silently fail
             }
         };
         loadJV();
     }, [safeRev, filterParams]);

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



            {/* 3. JV Profit Summary — based on Net Expected Profit */}
            {jvData.netProfitTotal !== null && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-center gap-4">
                        <TrendingUp className="w-6 h-6 text-green-600 flex-shrink-0" />
                        <div>
                            <p className="text-xs text-green-700 font-medium uppercase tracking-wide">Καθαρό Κέρδος JV</p>
                            <p className="text-xl font-bold text-green-700">{fmt(jvData.netProfitTotal)}</p>
                            <p className="text-xs text-green-600 mt-1">από Net Expected Profit</p>
                        </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 flex items-center gap-4">
                        <TrendingUp className="w-6 h-6 text-blue-600 flex-shrink-0" />
                        <div>
                            <p className="text-xs text-blue-700 font-medium uppercase tracking-wide">Air Control (75%)</p>
                            <p className="text-xl font-bold text-blue-700">{fmt(jvData.airControlTotal)}</p>
                            <p className="text-xs text-blue-600 mt-1">75% × Net Profit</p>
                        </div>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-xl px-5 py-4 flex items-center gap-4">
                        <TrendingUp className="w-6 h-6 text-purple-600 flex-shrink-0" />
                        <div>
                            <p className="text-xs text-purple-700 font-medium uppercase tracking-wide">Amco (25%)</p>
                            <p className="text-xl font-bold text-purple-700">{fmt(jvData.amcoTotal)}</p>
                            <p className="text-xs text-purple-600 mt-1">25% × Net Profit</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Operational Period Financial Analysis — two panels side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: period-filter-driven panel */}
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
                        formatCurrency={fmt}
                    />
                </div>

                {/* Right: standalone weekly panel */}
                <div className="flex flex-col gap-3">
                    {/* Weekly selector header — same wrapper as OverviewFilterBar */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4">
                        <div className="flex flex-wrap items-center gap-3">
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