/**
 * Labour Cost Pure Calculation Functions
 * All functions are stateless and take only plain data as input.
 * All functions are null/undefined safe and never return NaN.
 */

// ── Normalizers ────────────────────────────────────────────────

/**
 * Normalize a single labour resource, filling missing fields with safe defaults.
 */
function normalizeLabourResource(raw) {
    const r = raw && typeof raw === 'object' ? raw : {};
    return {
        resource_name:         r.resource_name       ?? '',
        employment_type:       r.employment_type      ?? 'monthly_fixed',
        monthly_salary:        parseFloat(r.monthly_salary)        || 0,
        daily_rate:            parseFloat(r.daily_rate)            || 0,
        hours_per_day:         parseFloat(r.hours_per_day)         || 8,
        monthly_to_day_factor: parseFloat(r.monthly_to_day_factor) || 22,
        is_active:             r.is_active !== false,
        department_allocations: Array.isArray(r.department_allocations)
            ? r.department_allocations.map(a => ({
                  department_id:      a.department_id      ?? '',
                  allocation_percent: parseFloat(a.allocation_percent) || 0,
              }))
            : [],
    };
}

/**
 * Normalize the full labourResources array loaded from the database.
 * Always returns an array, even if input is null/undefined.
 */
export function normalizeLoadedLabourResources(resources) {
    if (!Array.isArray(resources)) return [];
    return resources.map(normalizeLabourResource);
}

/**
 * Normalize a single department labour hours entry.
 */
function normalizeDeptLabourHoursEntry(raw) {
    const e = raw && typeof raw === 'object' ? raw : {};
    return {
        department_id: e.department_id ?? '',
        total_hours:   parseFloat(e.total_hours) || 0,
        notes:         e.notes ?? '',
    };
}

/**
 * Normalize the full departmentLabourHours array loaded from the database.
 * Always returns an array, even if input is null/undefined.
 */
export function normalizeLoadedDepartmentLabourHours(entries) {
    if (!Array.isArray(entries)) return [];
    return entries.map(normalizeDeptLabourHoursEntry);
}

// ── Rate Calculations ──────────────────────────────────────────

/**
 * Calculate daily rate for a monthly_fixed resource.
 */
export function calculateMonthlyResourceDailyRate(monthlySalary, monthlyToDayFactor) {
    const salary = parseFloat(monthlySalary) || 0;
    const factor = parseFloat(monthlyToDayFactor) || 22;
    return factor > 0 ? salary / factor : 0;
}

/**
 * Calculate hourly rate for a monthly_fixed resource.
 */
export function calculateMonthlyResourceHourlyRate(monthlySalary, monthlyToDayFactor, hoursPerDay) {
    const dailyRate = calculateMonthlyResourceDailyRate(monthlySalary, monthlyToDayFactor);
    const hours = parseFloat(hoursPerDay) || 8;
    return hours > 0 ? dailyRate / hours : 0;
}

/**
 * Calculate hourly rate for a daily_part_time resource.
 */
export function calculateDailyPartTimeHourlyRate(dailyRate, hoursPerDay) {
    const rate = parseFloat(dailyRate) || 0;
    const hours = parseFloat(hoursPerDay) || 8;
    return hours > 0 ? rate / hours : 0;
}

/**
 * Get the derived hourly rate for any resource based on its employment type.
 */
export function getResourceHourlyRate(resource) {
    if (!resource) return 0;
    if (resource.employment_type === 'monthly_fixed') {
        return calculateMonthlyResourceHourlyRate(
            resource.monthly_salary,
            resource.monthly_to_day_factor,
            resource.hours_per_day
        );
    }
    if (resource.employment_type === 'daily_part_time') {
        return calculateDailyPartTimeHourlyRate(resource.daily_rate, resource.hours_per_day);
    }
    return parseFloat(resource.hourly_rate) || 0;
}

/**
 * Get the "preview amount" for the allocation widget based on employment type.
 * monthly_fixed → monthly salary, daily_part_time → daily rate.
 */
export function getResourceAllocationPreviewAmount(resource) {
    if (!resource) return 0;
    if (resource.employment_type === 'monthly_fixed') {
        return parseFloat(resource.monthly_salary) || 0;
    }
    return parseFloat(resource.daily_rate) || 0;
}

// ── Validation ─────────────────────────────────────────────────

/**
 * Validate a single resource's department allocations.
 * Returns { valid: bool, total: number, hasAllocations: bool }
 */
export function validateResourceAllocations(resource) {
    if (!resource) return { valid: true, total: 0, hasAllocations: false };
    const allocations = resource.department_allocations || [];
    if (allocations.length === 0) {
        return { valid: false, total: 0, hasAllocations: false };
    }
    const total = allocations.reduce((s, a) => s + (parseFloat(a.allocation_percent) || 0), 0);
    return {
        valid: Math.abs(total - 100) < 0.01,
        total: Math.round(total * 100) / 100,
        hasAllocations: true,
    };
}

/**
 * Validate all active resource allocations.
 * Returns array of { resource_name, valid, total, hasAllocations } for resources with issues.
 */
export function validateAllLabourAllocations(labourResources) {
    return (labourResources || [])
        .filter(r => r.is_active !== false)
        .map((r, idx) => ({
            idx,
            resource_name: r.resource_name || `Πόρος ${idx + 1}`,
            ...validateResourceAllocations(r),
        }))
        .filter(v => !v.valid);
}

// ── Aggregate Calculations ─────────────────────────────────────

/**
 * Calculate the blended average hourly rate for a department.
 * Weights active resources by their allocation percentage.
 */
export function calculateDepartmentAverageHourlyRate(labourResources, departmentId) {
    if (!departmentId) return 0;
    const activeResources = (labourResources || []).filter(r => r.is_active !== false);

    let weightedRateSum = 0;
    let totalWeight = 0;

    activeResources.forEach(resource => {
        const alloc = (resource.department_allocations || []).find(a => a.department_id === departmentId);
        if (!alloc) return;
        const allocPct = parseFloat(alloc.allocation_percent) || 0;
        if (allocPct <= 0) return;
        weightedRateSum += getResourceHourlyRate(resource) * allocPct;
        totalWeight += allocPct;
    });

    return totalWeight > 0 ? weightedRateSum / totalWeight : 0;
}

/**
 * Calculate total labour cost for a department.
 */
export function calculateDepartmentLabourCost(totalHours, averageHourRate) {
    return (parseFloat(totalHours) || 0) * (parseFloat(averageHourRate) || 0);
}

/**
 * Calculate grand total labour cost across all departments.
 */
export function calculateTotalLabourCost(labourResources, departmentLabourHours) {
    return (departmentLabourHours || []).reduce((sum, entry) => {
        const avgRate = calculateDepartmentAverageHourlyRate(labourResources, entry.department_id);
        return sum + calculateDepartmentLabourCost(entry.total_hours, avgRate);
    }, 0);
}

/**
 * Build a summary array for all departments: avg rate, hours, total cost, and warning flags.
 */
export function buildDepartmentLabourSummary(labourResources, departmentLabourHours, departments) {
    return (departmentLabourHours || []).map(entry => {
        const dept = (departments || []).find(d => d.id === entry.department_id);
        const avgRate = calculateDepartmentAverageHourlyRate(labourResources, entry.department_id);
        const hours = parseFloat(entry.total_hours) || 0;
        const totalCost = calculateDepartmentLabourCost(hours, avgRate);
        return {
            department_id:     entry.department_id,
            department_name:   dept ? dept.department_name : (entry.department_id || '—'),
            average_hour_rate: avgRate,
            total_hours:       hours,
            total_cost:        totalCost,
            // Warning flags for UI
            warn_no_rate:     avgRate === 0 && hours > 0,
            warn_no_hours:    avgRate > 0 && hours === 0,
        };
    });
}