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
    getWeekNumberFromDate,
} from './utils/overviewPeriodCalculations';

// ─── Small helpers ────────────────────────────────────────────────────────────

function KPICard({ label, value, icon: Icon, color = 'blue', sub, simulated }) {
    const colorMap = {
        blue: 'bg-blue-50 text-blue-700 border-blue-200',
        green: 'bg-green-50 text-green-700 border-green-200',
        red: 'bg-red-50 text-red-700 border-red-200',
        orange: 'bg-orange-50 text-orange-700 border-orange-200',
        slate: 'bg-slate-50 text-slate-700 border-slate-200',
        purple: 'bg-purple-50 text-purple-700 border-purple-200',
        amber: 'bg-amber-50 text-amber-700 border-amber-300',
    };
    return (
        <div className={`rounded-xl border p-4 flex flex-col gap-2 ${colorMap[color]} ${simulated ? 'ring-2 ring-amber-400' : ''}`}>
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

function AnalysisRow({ label, value, highlight }) {
    return (
        <div className={`flex justify-between items-center py-2 px-3 rounded-lg ${highlight ? 'bg-slate-100 font-semibold' : ''}`}>
            <span className="text-sm text-slate-700">{label}</span>
            <span className={`text-sm font-medium ${highlight ? 'text-slate-900' : 'text-slate-600'}`}>{value}</span>
        </div>
    );
}

// ─── Default filter state ─────────────────────────────────────────────────────

function buildDefaultFilter() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    return {
        mode: 'daily',
        selectedDate: todayStr,
        selectedWeek: getWeekNumberFromDate(today),
        selectedMonth: today.getMonth() + 1,
        selectedYear: today.getFullYear(),
    };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FinancialOverviewTab({
    // Static planning data (always shown)
    totalIncome,
    totalCosts,
    depreciationCost,
    formatCurrency,
    costBreakdown,
    hasInvalidAllocations,
    legacyPersonnelCost,
    // Daily operational data
    dailyProductionEntries,
    dailyRevenueEntries,
    dailyDepartmentHoursEntries,
}) {
    const [filterParams, setFilterParams] = useState(buildDefaultFilter);

    // Simulation state (local UI only — never persisted)
    const [simActive, setSimActive] = useState(false);
    const [simState, setSimState] = useState({ revenue: 0, productionQty: 0, totalHours: 0 });

    const handleSimChange = (field, value) => setSimState(prev => ({ ...prev, [field]: value }));

    // Available years from all entries
    const availableYears = useMemo(
        () => getAvailableYearsFromEntries(dailyProductionEntries, dailyRevenueEntries, dailyDepartmentHoursEntries),
        [dailyProductionEntries, dailyRevenueEntries, dailyDepartmentHoursEntries]
    );

    // Period summary from daily entries
    const periodSummary = useMemo(
        () => buildOverviewPeriodSummary(
            dailyProductionEntries || [],
            dailyRevenueEntries || [],
            dailyDepartmentHoursEntries || [],
            filterParams
        ),
        [dailyProductionEntries, dailyRevenueEntries, dailyDepartmentHoursEntries, filterParams]
    );

    const hasAnyDailyData =
        periodSummary.filteredProdEntries.length > 0 ||
        periodSummary.filteredRevEntries.length > 0 ||
        periodSummary.filteredHoursEntries.length > 0;

    // Effective operational values: simulation overrides daily data when active
    const effectiveRevenue = simActive ? (simState.revenue || 0) : periodSummary.revenue;
    const effectiveQty = simActive ? (simState.productionQty || 0) : periodSummary.productionQty;
    const effectiveHours = simActive ? (simState.totalHours || 0) : periodSummary.totalHours;

    // Planning-level calculations (static)
    const netBeforeDepr = totalIncome - totalCosts;
    const totalCostWithDepr = totalCosts + depreciationCost;
    const netAfterDepr = totalIncome - totalCostWithDepr;
    const deprPct = totalIncome > 0 ? ((depreciationCost / totalIncome) * 100).toFixed(1) : '0.0';

    const fmt = formatCurrency || (v => `€${parseFloat(v || 0).toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

    return (
        <div className="space-y-6">
            {hasInvalidAllocations && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 text-amber-800 rounded-xl px-4 py-3 text-sm font-medium">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span>Προσοχή: Υπάρχουν κατανομές τμημάτων που δεν αθροίζουν στο 100%. Αποθήκευση δεν επιτρέπεται.</span>
                </div>
            )}

            {/* ── Period Filter Bar ─────────────────────────────────────────── */}
            <OverviewFilterBar
                filterParams={filterParams}
                onFilterChange={setFilterParams}
                availableYears={availableYears}
            />

            {/* ── Operational Period KPIs (dynamic) ────────────────────────── */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                        Operational KPIs — Περίοδος
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
                            value={fmt(effectiveRevenue)}
                            icon={DollarSign}
                            color="green"
                            simulated={simActive}
                            sub={simActive ? 'Simulation' : `${periodSummary.filteredRevEntries.length} εγγραφές`}
                        />
                        <KPICard
                            label="Παραγωγή (τεμάχια)"
                            value={effectiveQty.toLocaleString('el-GR')}
                            icon={Package}
                            color="blue"
                            simulated={simActive}
                            sub={simActive ? 'Simulation' : `${periodSummary.filteredProdEntries.length} εγγραφές`}
                        />
                        <KPICard
                            label="Ώρες Εργασίας"
                            value={`${effectiveHours.toLocaleString('el-GR')} h`}
                            icon={Clock}
                            color="purple"
                            simulated={simActive}
                            sub={simActive ? 'Simulation' : `${periodSummary.filteredHoursEntries.length} εγγραφές`}
                        />
                    </div>
                )}
            </div>

            {/* ── Simulation Card ───────────────────────────────────────────── */}
            <SimulationCard
                simState={simState}
                onSimChange={handleSimChange}
                onToggle={() => setSimActive(prev => !prev)}
                isActive={simActive}
            />

            {/* ── Planning-level KPIs (static) ─────────────────────────────── */}
            <div>
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
                    Σχεδιασμός (Static Financial Planning)
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <KPICard label="Σχεδιαστικά Έσοδα" value={fmt(totalIncome)} icon={TrendingUp} color="green" />
                    <KPICard label="Κόστος Παραγωγής" value={fmt(totalCosts)} icon={DollarSign} color="blue" />
                    <KPICard label="Κόστος Απόσβεσης" value={fmt(depreciationCost)} icon={BarChart2} color="purple" />
                    <KPICard
                        label="Αποτέλεσμα προ Απόσβεσης"
                        value={fmt(netBeforeDepr)}
                        icon={netBeforeDepr >= 0 ? TrendingUp : TrendingDown}
                        color={netBeforeDepr >= 0 ? 'green' : 'red'}
                    />
                    <KPICard label="Συνολικό Κόστος με Απόσβεση" value={fmt(totalCostWithDepr)} icon={Minus} color="orange" />
                    <KPICard
                        label="Καθαρό Αποτέλεσμα μετά Απόσβεση"
                        value={fmt(netAfterDepr)}
                        icon={netAfterDepr >= 0 ? TrendingUp : TrendingDown}
                        color={netAfterDepr >= 0 ? 'green' : 'red'}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Financial Analysis */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold text-slate-800">Χρηματοοικονομική Ανάλυση (Σχεδιασμός)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        <AnalysisRow label="Σχεδιαστικά Έσοδα" value={fmt(totalIncome)} />
                        <AnalysisRow label="Κόστος Λειτουργίας" value={`− ${fmt(totalCosts)}`} />
                        <AnalysisRow label="Αποτέλεσμα προ Απόσβεσης" value={fmt(netBeforeDepr)} highlight />
                        <div className="border-t border-slate-200 my-2" />
                        <AnalysisRow label="Επιβάρυνση Απόσβεσης" value={`− ${fmt(depreciationCost)}`} />
                        <AnalysisRow label="Απόσβεση ως % Εσόδων" value={`${deprPct}%`} />
                        <div className="border-t border-slate-200 my-2" />
                        <AnalysisRow label="Τελικό Αποτέλεσμα μετά Απόσβεση" value={fmt(netAfterDepr)} highlight />
                    </CardContent>
                </Card>

                {/* Cost Breakdown */}
                <div className="space-y-3">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold text-slate-800">Ανάλυση Κόστους (Σύνολο Σχεδιασμού)</CardTitle>
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

                    {/* Legacy Personnel Cost */}
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