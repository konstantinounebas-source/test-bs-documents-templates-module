/**
 * Daily Operations Normalizers
 * Safely normalize daily arrays loaded from the database.
 * Always return arrays. Numeric fields fall back to 0. String/date fields fall back to ''.
 */

function normalizeDailyProductionEntry(raw) {
    const e = raw && typeof raw === 'object' ? raw : {};
    return {
        date:             e.date             ?? '',
        bus_stop_type_id: e.bus_stop_type_id ?? '',
        product_label:    e.product_label    ?? '',
        quantity:         parseFloat(e.quantity) || 0,
        notes:            e.notes            ?? '',
    };
}

export function normalizeLoadedDailyProductionEntries(entries) {
    if (!Array.isArray(entries)) return [];
    return entries.map(normalizeDailyProductionEntry);
}

function normalizeDailyRevenueEntry(raw) {
    const e = raw && typeof raw === 'object' ? raw : {};
    const qty        = parseFloat(e.quantity)     || 0;
    const unitRev    = parseFloat(e.unit_revenue) || 0;
    return {
        date:               e.date               ?? '',
        revenue_item:       e.revenue_item       ?? '',
        bus_stop_type_id:   e.bus_stop_type_id   ?? '',
        quantity:           qty,
        unit_revenue:       unitRev,
        total_revenue:      parseFloat(e.total_revenue) || qty * unitRev,
        notes:              e.notes              ?? '',
    };
}

export function normalizeLoadedDailyRevenueEntries(entries) {
    if (!Array.isArray(entries)) return [];
    return entries.map(normalizeDailyRevenueEntry);
}

function normalizeDailyDepartmentHoursEntry(raw) {
    const e = raw && typeof raw === 'object' ? raw : {};
    return {
        date:          e.date          ?? '',
        department_id: e.department_id ?? '',
        total_hours:   parseFloat(e.total_hours) || 0,
        notes:         e.notes        ?? '',
    };
}

export function normalizeLoadedDailyDepartmentHoursEntries(entries) {
    if (!Array.isArray(entries)) return [];
    return entries.map(normalizeDailyDepartmentHoursEntry);
}