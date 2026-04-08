/**
 * Labour Cost Pure Calculation Functions
 * All functions are stateless and take only plain data as input.
 */

/**
 * Calculate daily rate for a monthly_fixed resource.
 * daily_rate = monthly_salary / monthly_to_day_factor
 */
export function calculateMonthlyResourceDailyRate(monthlySalary, monthlyToDayFactor) {
    const salary = parseFloat(monthlySalary) || 0;
    const factor = parseFloat(monthlyToDayFactor) || 22;
    return factor > 0 ? salary / factor : 0;
}

/**
 * Calculate hourly rate for a monthly_fixed resource.
 * hourly_rate = daily_rate / hours_per_day
 */
export function calculateMonthlyResourceHourlyRate(monthlySalary, monthlyToDayFactor, hoursPerDay) {
    const dailyRate = calculateMonthlyResourceDailyRate(monthlySalary, monthlyToDayFactor);
    const hours = parseFloat(hoursPerDay) || 8;
    return hours > 0 ? dailyRate / hours : 0;
}

/**
 * Calculate hourly rate for a daily_part_time resource.
 * hourly_rate = daily_rate / hours_per_day
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
 * Calculate the blended average hourly rate for a department.
 * Takes all active resources that have a department allocation for this department.
 * Weights them by their allocation percentage.
 *
 * @param {Array} labourResources - All labour resources
 * @param {string} departmentId - Department ID to calculate for
 * @returns {number} Blended average hourly rate
 */
export function calculateDepartmentAverageHourlyRate(labourResources, departmentId) {
    const activeResources = (labourResources || []).filter(r => r.is_active !== false);
    
    let weightedRateSum = 0;
    let totalWeight = 0;

    activeResources.forEach(resource => {
        const allocations = resource.department_allocations || [];
        const alloc = allocations.find(a => a.department_id === departmentId);
        if (!alloc) return;

        const allocPct = parseFloat(alloc.allocation_percent) || 0;
        if (allocPct <= 0) return;

        const hourlyRate = getResourceHourlyRate(resource);
        weightedRateSum += hourlyRate * allocPct;
        totalWeight += allocPct;
    });

    return totalWeight > 0 ? weightedRateSum / totalWeight : 0;
}

/**
 * Calculate total labour cost for a department.
 * total_labour_cost = total_hours * average_hour_rate
 *
 * @param {number} totalHours - Total hours worked in the department
 * @param {number} averageHourRate - Blended average hourly rate
 * @returns {number}
 */
export function calculateDepartmentLabourCost(totalHours, averageHourRate) {
    return (parseFloat(totalHours) || 0) * (parseFloat(averageHourRate) || 0);
}

/**
 * Calculate total labour cost across all departments.
 *
 * @param {Array} labourResources - All labour resources
 * @param {Array} departmentLabourHours - Array of { department_id, total_hours }
 * @returns {number} Grand total labour cost
 */
export function calculateTotalLabourCost(labourResources, departmentLabourHours) {
    return (departmentLabourHours || []).reduce((sum, entry) => {
        const avgRate = calculateDepartmentAverageHourlyRate(labourResources, entry.department_id);
        return sum + calculateDepartmentLabourCost(entry.total_hours, avgRate);
    }, 0);
}

/**
 * Build a summary array for all departments: avg rate, hours, total cost.
 *
 * @param {Array} labourResources
 * @param {Array} departmentLabourHours
 * @param {Array} departments - Reference departments list
 * @returns {Array<{ department_id, department_name, average_hour_rate, total_hours, total_cost }>}
 */
export function buildDepartmentLabourSummary(labourResources, departmentLabourHours, departments) {
    return (departmentLabourHours || []).map(entry => {
        const dept = (departments || []).find(d => d.id === entry.department_id);
        const avgRate = calculateDepartmentAverageHourlyRate(labourResources, entry.department_id);
        const totalCost = calculateDepartmentLabourCost(entry.total_hours, avgRate);
        return {
            department_id: entry.department_id,
            department_name: dept ? dept.department_name : entry.department_id,
            average_hour_rate: avgRate,
            total_hours: parseFloat(entry.total_hours) || 0,
            total_cost: totalCost,
        };
    });
}