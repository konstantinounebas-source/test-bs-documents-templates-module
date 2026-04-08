/**
 * Daily Operations Pure Calculation Functions
 * All functions are stateless and null/undefined safe.
 */

/**
 * Calculate total revenue across all daily revenue entries.
 */
export function calculateDailyRevenueTotal(entries) {
    return (entries || []).reduce((sum, e) => sum + (parseFloat(e.total_revenue) || 0), 0);
}

/**
 * Calculate total quantity across all daily production entries.
 */
export function calculateDailyProductionTotal(entries) {
    return (entries || []).reduce((sum, e) => sum + (parseFloat(e.quantity) || 0), 0);
}

/**
 * Calculate total hours across all daily department hours entries.
 */
export function calculateDailyDepartmentHoursTotal(entries) {
    return (entries || []).reduce((sum, e) => sum + (parseFloat(e.total_hours) || 0), 0);
}

/**
 * Group an array of entries by their date field.
 * Returns an object: { 'YYYY-MM-DD': [entry, ...] }
 */
export function groupDailyEntriesByDate(entries) {
    return (entries || []).reduce((acc, entry) => {
        const key = entry.date || 'unknown';
        if (!acc[key]) acc[key] = [];
        acc[key].push(entry);
        return acc;
    }, {});
}