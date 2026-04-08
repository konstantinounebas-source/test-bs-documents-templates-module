import React, { useState, useMemo } from 'react';
import {
    TrendingUp, TrendingDown, DollarSign, BarChart2,
    Minus, AlertTriangle, Info, Package, Clock, FlaskConical
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import OverviewFilterBar from './OverviewFilterBar';
import SimulationCard from './SimulationCard';
import {
    buildOverviewPeriodSummary,
    getAvailableYearsFromEntries,
    getLatestDateFromEntries,
    getWeekNumberFromDate,
    resolveEffectiveOperationalValues,
    calculatePeriodLabourCost,
    safeRatio,
} from './utils/overviewPeriodCalculations';
import {
    calculateDepartmentAverageHourlyRate,
} from './utils/labourCostCalculations';

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({ label, value, icon: Icon, color = 'blue', sub, simulated }) {
    const colorMap = {
        blue:   'bg-blue-50 text-blue-700 border-blue-200',
        green:  'bg-green-50 text-green-700 border-green-200',
        red:    'bg-red-50 text-red-700 border-red-200',
        orange: 'bg-orange-50 text-orange-700 border-orange-200',
        slate:  'bg-slate-50 text-slate-700 border-slate-200',
        purple: 'bg-purple-50 text-purple-700 border-purple-200',
        amber:  'bg-amber-50 text-amber-700 border-amber-300',
        teal:   'bg-teal-50 text-teal-700 border-teal-200',
    };
    return (
        <div className={`rounded-xl border p-4 flex flex-col gap-2 ${colorMap[color] || colorMap.blue} ${simulated ? 'ring-2 ring-amber-400' : ''}`}>
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</span>
                <div className="flex items-center gap-1">
                    {simulated && <FlaskConical className="w-3.5 h-3.5 text-amber-500" />}
                    {Icon && <Icon className="w-5 h-5 opacity-60" />}
                </div>
            </div>
            <div className="text-2xl font-bold">{value}</div>
            {sub && <div className="text-xs opacity-70">{sub}</div>}
        </div>
    );
}

// ─── Analysis Row ─────────────────────────────────────────────────────────────

function AnalysisRow({ label, value, highlight }) {
    return (
        <div className={`flex justify-between items-center py-2 px-3 rounded-lg ${highlight ? 'bg-slate-100 font-semibold' : ''}`}>
            <span className="text-sm text-slate-700">{label}</span>
            <span className={`text-sm font-medium ${highlight ? 'text-slate-900' : 'text-slate-600'}`}>{value}</span>
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
    formatCurrency,
    costBreakdown,
    hasInvalidAllocations,
    legacyPersonnelCost,
    // Daily operational data (source for period KPIs)
    dailyProductionEntries,
    dailyRevenueEntries,
    dailyDepartmentHoursEntries,
    // Labour data (for period labour cost calculation)
    labourResources,
    departmentLabourHours,
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

    const hasAnyDailyData =
        periodSummary.filteredProdEntries.length > 0 ||
        periodSummary.filteredRevEntries.length > 0 ||
        periodSummary.filteredHoursEntries.length > 0;

    // Build dept rate map: { department_id → avg hourly rate } from labour_resources
    const deptRateMap = useMemo(() => {
        const safeResources = Array.isArray(labourResources) ? labourResources : [];
        const safeDeptHours = Array.isArray(departmentLabourHours) ? departmentLabourHours : [];
        const map = {};
        // Use dept IDs from both static hours and filtered hours entries
        const allDeptIds = new Set([
            ...safeDeptHours.map(e => e.department_id),
            ...periodSummary.filteredHoursEntries.map(e => e.department_id),
        ]);
        allDeptIds.forEach(id => {
            if (id) map[id] = calculateDepartmentAverageHourlyRate(safeResources, id);
        });
        return map;
    }, [labourResources, departmentLabourHours, periodSummary.filteredHoursEntries]);

    // Period labour cost: filtered daily hours × avg rate; fallback to static dept hours
    const periodLabourCost = useMemo(
        () => calculatePeriodLabourCost(
            periodSummary.filteredHoursEntries,
            Array.isArray(departmentLabourHours) ? departmentLabourHours : [],
            deptRateMap
        ),
        [periodSummary.filteredHoursEntries, departmentLabourHours, deptRateMap]
    );

    // Effective operational values:
    //   - simulation OFF → use filtered daily period data
    //   - simulation ON  → use simState values (UI-only, never saved)
    const effective = useMemo(
        () => resolveEffectiveOperationalValues(periodSummary, simActive, simState),
        [periodSummary, simActive, simState]
    );

    // Derived ratios (safe — no NaN, no division by zero)
    const revenuePerUnit = safeRatio(effective.revenue, effective.productionQty);
    const revenuePerHour = safeRatio(effective.revenue, effective.totalHours);

    // Static planning calculations (never touched by period filter or simulation)
    const netBeforeDepr   = (totalIncome || 0) - (totalCosts || 0);
    const totalCostWithDepr = (totalCosts || 0) + (depreciationCost || 0);
    const netAfterDepr    = (totalIncome || 0) - totalCostWithDepr;
    const deprPct = (totalIncome || 0) > 0
        ? (((depreciationCost || 0) / totalIncome) * 100).toFixed(1)
        : '0.0';

    const fmt = formatCurrency
        || (v => `€${parseFloat(v || 0).toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

    const fmtNum = v => {
        const n = parseFloat(v);
        return isNaN(n) ? '0' : n.toLocaleString('el-GR', { maximumFractionDigits: 1 });
    };

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

            {/* 4. Operational KPI section */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                        Λειτουργική Επισκόπηση Περιόδου
                    </h3>
                    {simActive && (
                        <span className="text-xs font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <FlaskConical className="w-3 h-3" /> Simulation Mode
                        </span>
                    )}
                </div>

                {!hasAnyDailyData && !simActive ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
                        <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500 font-medium">Δεν υπάρχουν ημερήσια δεδομένα για την επιλεγμένη περίοδο.</p>
                        <p className="text-xs text-slate-400 mt-1">
                            Προσθέστε εγγραφές στην καρτέλα "Daily Operations" ή ενεργοποιήστε τη Simulation Mode.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <KPICard
                            label="Έσοδα Περιόδου"
                            value={fmt(effective.revenue)}
                            icon={DollarSign}
                            color="green"
                            simulated={simActive}
                            sub={simActive ? 'Simulation' : `${periodSummary.filteredRevEntries.length} εγγραφές`}
                        />
                        <KPICard
                            label="Παραγωγή (τεμάχια)"
                            value={fmtNum(effective.productionQty)}
                            icon={Package}
                            color="blue"
                            simulated={simActive}
                            sub={simActive ? 'Simulation' : `${periodSummary.filteredProdEntries.length} εγγραφές`}
                        />
                        <KPICard
                            label="Ώρες Εργασίας"
                            value={`${fmtNum(effective.totalHours)} h`}
                            icon={Clock}
                            color="purple"
                            simulated={simActive}
                            sub={simActive ? 'Simulation' : `${periodSummary.filteredHoursEntries.length} εγγραφές`}
                        />
                    </div>
                )}
            </div>

            {/* 5. Operational Financial Analysis + Cost Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold text-slate-800">Χρηματοοικονομική Ανάλυση (Λειτουργική Περίοδος)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        <AnalysisRow label="Έσοδα Περιόδου"                     value={fmt(effective.revenue)} />
                        <AnalysisRow label="Κόστος Λειτουργίας (Σχεδιασμένο)"    value={`− ${fmt(totalCosts)}`} />
                        <AnalysisRow label="Κόστος Εργατικών Περιόδου"          value={`− ${fmt(periodLabourCost)}`} />
                        <AnalysisRow label="Αποτέλεσμα προ Απόσβεσης"           value={fmt((effective.revenue) - (totalCosts) - (periodLabourCost))} highlight />
                        <div className="border-t border-slate-200 my-2" />
                        <AnalysisRow label="Επιβάρυνση Απόσβεσης"                value={`− ${fmt(depreciationCost)}`} />
                        <AnalysisRow label="Τελικό Αποτέλεσμα μετά Απόσβεση"   value={fmt((effective.revenue) - (totalCosts) - (periodLabourCost) - (depreciationCost))} highlight />
                    </CardContent>
                </Card>

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