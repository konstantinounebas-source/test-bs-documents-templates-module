/**
 * Overview Period Calculations — Pure, null-safe utility functions
 * for filtering and aggregating daily operational entries by period.
 */

// ─── Date Helpers ────────────────────────────────────────────────────────────

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
    return { week: getWeekNumberFromDate(d), year: d.getFullYear() };
}

/**
 * Returns { month (1-12), year } from a date string 'YYYY-MM-DD'.
 */
export function getMonthAndYearFromDateStr(dateStr) {
    if (!dateStr) return { month: 0, year: 0 };
    const d = new Date(dateStr + 'T00:00:00');
    return { month: d.getMonth() + 1, year: d.getFullYear() };
}

/**
 * Returns all unique years from a combined set of entry arrays.
 */
export function getAvailableYearsFromEntries(...entryArrays) {
    const years = new Set();
    entryArrays.forEach(arr => {
        (arr || []).forEach(e => {
            if (e.date) {
                const y = parseInt(e.date.substring(0, 4), 10);
                if (!isNaN(y)) years.add(y);
            }
        });
    });
    const result = [...years].sort((a, b) => b - a);
    return result.length > 0 ? result : [new Date().getFullYear()];
}

// ─── Entry Filters ────────────────────────────────────────────────────────────

export function filterEntriesByDate(entries, selectedDate) {
    if (!selectedDate) return [];
    return (entries || []).filter(e => e.date === selectedDate);
}

export function filterEntriesByWeek(entries, selectedWeek, selectedYear) {
    if (!selectedWeek || !selectedYear) return [];
    return (entries || []).filter(e => {
        const { week, year } = getWeekAndYearFromDateStr(e.date);
        return week === selectedWeek && year === selectedYear;
    });
}

export function filterEntriesByMonth(entries, selectedMonth, selectedYear) {
    if (!selectedMonth || !selectedYear) return [];
    return (entries || []).filter(e => {
        const { month, year } = getMonthAndYearFromDateStr(e.date);
        return month === selectedMonth && year === selectedYear;
    });
}

// ─── Filter Dispatcher ────────────────────────────────────────────────────────

/**
 * filterParams: { mode, selectedDate, selectedWeek, selectedMonth, selectedYear }
 */
export function filterEntriesForPeriod(entries, filterParams) {
    const { mode, selectedDate, selectedWeek, selectedMonth, selectedYear } = filterParams || {};
    if (mode === 'daily') return filterEntriesByDate(entries, selectedDate);
    if (mode === 'weekly') return filterEntriesByWeek(entries, selectedWeek, selectedYear);
    if (mode === 'monthly') return filterEntriesByMonth(entries, selectedMonth, selectedYear);
    return entries || [];
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
 * Builds a full period summary object used by the overview.
 * Returns: { revenue, productionQty, totalHours, filteredRevEntries, filteredProdEntries, filteredHoursEntries }
 */
export function buildOverviewPeriodSummary(
    dailyProductionEntries,
    dailyRevenueEntries,
    dailyDepartmentHoursEntries,
    filterParams
) {
    const filteredProdEntries = filterEntriesForPeriod(dailyProductionEntries, filterParams);
    const filteredRevEntries = filterEntriesForPeriod(dailyRevenueEntries, filterParams);
    const filteredHoursEntries = filterEntriesForPeriod(dailyDepartmentHoursEntries, filterParams);

    const revenue = filteredRevEntries.reduce((sum, e) => sum + (parseFloat(e.total_revenue) || 0), 0);
    const productionQty = filteredProdEntries.reduce((sum, e) => sum + (parseFloat(e.quantity) || 0), 0);
    const totalHours = filteredHoursEntries.reduce((sum, e) => sum + (parseFloat(e.total_hours) || 0), 0);

    return { revenue, productionQty, totalHours, filteredRevEntries, filteredProdEntries, filteredHoursEntries };
}

// ─── Period Label ─────────────────────────────────────────────────────────────

const MONTH_NAMES_EL = [
    '', 'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος',
    'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος',
    'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'
];

export function getPeriodLabel(filterParams) {
    const { mode, selectedDate, selectedWeek, selectedMonth, selectedYear } = filterParams || {};
    if (mode === 'daily') return selectedDate || '—';
    if (mode === 'weekly') return selectedWeek ? `Εβδομάδα ${selectedWeek} / ${selectedYear}` : '—';
    if (mode === 'monthly') return selectedMonth ? `${MONTH_NAMES_EL[selectedMonth]} ${selectedYear}` : '—';
    return '—';
}

export { MONTH_NAMES_EL };