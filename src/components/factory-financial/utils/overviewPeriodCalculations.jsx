/**
 * Overview Period Calculations — Pure, null-safe utility functions.
 * Used by FinancialOverviewTab for period filtering, aggregation, and simulation.
 *
 * Labour costing rule (decided here, applied in FinancialOverviewTab):
 *   1. Use filtered daily_department_hours_entries for the selected period.
 *   2. If no daily hours exist for the period, fall back to static department_labour_hours.
 *   3. Static planning cost (calculateTotalLabourCost) is never touched by this module.
 */

// ─── Date Helpers ─────────────────────────────────────────────────────────────

/**
 * Returns the ISO week number (1-53) for a given Date object.
 */
export function getWeekNumberFromDate(date) {
    if (!date || !(date instanceof Date) || isNaN(date)) return 0;
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Returns { week, year } from a date string 'YYYY-MM-DD'.
 */
export function getWeekAndYearFromDateStr(dateStr) {
    if (!dateStr) return { week: 0, year: 0 };
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d)) return { week: 0, year: 0 };
    return { week: getWeekNumberFromDate(d), year: d.getFullYear() };
}

/**
 * Returns { month (1-12), year } from a date string 'YYYY-MM-DD'.
 */
export function getMonthAndYearFromDateStr(dateStr) {
    if (!dateStr) return { month: 0, year: 0 };
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d)) return { month: 0, year: 0 };
    return { month: d.getMonth() + 1, year: d.getFullYear() };
}

/**
 * Returns all unique years from a combined set of entry arrays (newest first).
 * Always returns at least [currentYear].
 */
export function getAvailableYearsFromEntries(...entryArrays) {
    const years = new Set();
    entryArrays.forEach(arr => {
        (arr || []).forEach(e => {
            if (e && e.date) {
                const y = parseInt(e.date.substring(0, 4), 10);
                if (!isNaN(y) && y > 1990) years.add(y);
            }
        });
    });
    const result = [...years].sort((a, b) => b - a);
    return result.length > 0 ? result : [new Date().getFullYear()];
}

/**
 * Returns the latest date string from an array of entries, or null if empty.
 */
export function getLatestDateFromEntries(...entryArrays) {
    let latest = null;
    entryArrays.forEach(arr => {
        (arr || []).forEach(e => {
            if (e && e.date && (!latest || e.date > latest)) {
                latest = e.date;
            }
        });
    });
    return latest;
}

// ─── Entry Filters ────────────────────────────────────────────────────────────

export function filterEntriesByDate(entries, selectedDate) {
    if (!selectedDate) return [];
    return (entries || []).filter(e => e && e.date === selectedDate);
}

export function filterEntriesByWeek(entries, selectedWeek, selectedYear) {
    if (!selectedWeek || !selectedYear) return [];
    return (entries || []).filter(e => {
        if (!e || !e.date) return false;
        const { week, year } = getWeekAndYearFromDateStr(e.date);
        return week === selectedWeek && year === selectedYear;
    });
}

export function filterEntriesByMonth(entries, selectedMonth, selectedYear) {
    if (!selectedMonth || !selectedYear) return [];
    return (entries || []).filter(e => {
        if (!e || !e.date) return false;
        const { month, year } = getMonthAndYearFromDateStr(e.date);
        return month === selectedMonth && year === selectedYear;
    });
}

/**
 * filterParams: { mode, selectedDate, selectedWeek, selectedMonth, selectedYear }
 */
export function filterEntriesForPeriod(entries, filterParams) {
    const { mode, selectedDate, selectedWeek, selectedMonth, selectedYear } = filterParams || {};
    if (mode === 'daily')   return filterEntriesByDate(entries, selectedDate);
    if (mode === 'weekly')  return filterEntriesByWeek(entries, selectedWeek, selectedYear);
    if (mode === 'monthly') return filterEntriesByMonth(entries, selectedMonth, selectedYear);
    return (entries || []).filter(Boolean);
}

// ─── Aggregators ──────────────────────────────────────────────────────────────

export function calculateRevenueForPeriod(dailyRevenueEntries, filterParams) {
    const filtered = filterEntriesForPeriod(dailyRevenueEntries, filterParams);
    return filtered.reduce((sum, e) => sum + (parseFloat(e.total_revenue) || 0), 0);
}

export function calculateProductionForPeriod(dailyProductionEntries, filterParams) {
    const filtered = filterEntriesForPeriod(dailyProductionEntries, filterParams);
    return filtered.reduce((sum, e) => sum + (parseFloat(e.quantity) || 0), 0);
}

export function calculateDepartmentHoursForPeriod(dailyDepartmentHoursEntries, filterParams) {
    const filtered = filterEntriesForPeriod(dailyDepartmentHoursEntries, filterParams);
    return filtered.reduce((sum, e) => sum + (parseFloat(e.total_hours) || 0), 0);
}

/**
 * Builds a full period summary.
 * Returns:
 *   { revenue, productionQty, totalHours,
 *     filteredRevEntries, filteredProdEntries, filteredHoursEntries }
 */
export function buildOverviewPeriodSummary(
    dailyProductionEntries,
    dailyRevenueEntries,
    dailyDepartmentHoursEntries,
    filterParams
) {
    const safe = arr => Array.isArray(arr) ? arr.filter(Boolean) : [];

    const filteredProdEntries  = filterEntriesForPeriod(safe(dailyProductionEntries), filterParams);
    const filteredRevEntries   = filterEntriesForPeriod(safe(dailyRevenueEntries), filterParams);
    const filteredHoursEntries = filterEntriesForPeriod(safe(dailyDepartmentHoursEntries), filterParams);

    const revenue       = filteredRevEntries.reduce((s, e) => s + (parseFloat(e.total_revenue) || 0), 0);
    const productionQty = filteredProdEntries.reduce((s, e) => s + (parseFloat(e.quantity) || 0), 0);
    const totalHours    = filteredHoursEntries.reduce((s, e) => s + (parseFloat(e.total_hours) || 0), 0);

    return {
        revenue,
        productionQty,
        totalHours,
        filteredRevEntries,
        filteredProdEntries,
        filteredHoursEntries,
    };
}

// ─── Simulation Override ──────────────────────────────────────────────────────

/**
 * Returns effective operational values: simulation overrides period values when active.
 * Never returns NaN or undefined.
 */
export function resolveEffectiveOperationalValues(periodSummary, simActive, simState) {
    if (simActive && simState) {
        return {
            revenue:       parseFloat(simState.revenue)       || 0,
            productionQty: parseFloat(simState.productionQty) || 0,
            totalHours:    parseFloat(simState.totalHours)    || 0,
        };
    }
    return {
        revenue:       periodSummary?.revenue       ?? 0,
        productionQty: periodSummary?.productionQty ?? 0,
        totalHours:    periodSummary?.totalHours    ?? 0,
    };
}

// ─── Safe Ratio ───────────────────────────────────────────────────────────────

/**
 * Returns numerator / denominator, or 0 if denominator is zero/null/NaN.
 */
export function safeRatio(numerator, denominator) {
    const d = parseFloat(denominator);
    if (!d || d === 0 || isNaN(d)) return 0;
    return (parseFloat(numerator) || 0) / d;
}

// ─── Period Label ─────────────────────────────────────────────────────────────

export const MONTH_NAMES_EL = [
    '', 'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος',
    'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος',
    'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος',
];

export function getPeriodLabel(filterParams) {
    const { mode, selectedDate, selectedWeek, selectedMonth, selectedYear } = filterParams || {};
    if (mode === 'daily')   return selectedDate || '—';
    if (mode === 'weekly')  return selectedWeek  ? `Εβδομάδα ${selectedWeek} / ${selectedYear}` : '—';
    if (mode === 'monthly') return selectedMonth ? `${MONTH_NAMES_EL[selectedMonth] || ''} ${selectedYear}` : '—';
    return '—';
}