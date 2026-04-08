/**
 * Pure calculation functions for factory financial calculations.
 * All functions accept values as arguments and return computed results.
 * No component state dependencies.
 */

export const getAllocationTotal = (allocations) => {
    return (allocations || []).reduce((sum, a) => sum + (parseFloat(a.allocation_percent) || 0), 0);
};

export const hasInvalidAllocation = (items) => {
    if (!items || items.length === 0) return false;
    return items.some(item => {
        const allocations = item.department_allocations || [];
        if (allocations.length === 0) return false;
        const total = getAllocationTotal(allocations);
        return total < 99.99 || total > 100.01;
    });
};

export const convertCostToDaily = (amount, frequencyType, avgMonthDays = 22, avgYearDays = 260, totalWorkDays = 0) => {
    const amt = parseFloat(amount) || 0;
    switch(frequencyType) {
        case 'daily':
        case 'per_production_day':
            return amt;
        case 'monthly':
            return amt / (avgMonthDays || 22);
        case 'yearly':
            return amt / (avgYearDays || 260);
        case 'one_time':
            return totalWorkDays > 0 ? amt / totalWorkDays : 0;
        default:
            return amt;
    }
};

export const getVariationsTotal = (variations) => {
    return (variations || []).reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0);
};

export const getShelterRevenueTotal = (item) => {
    const contract = parseFloat(item.contract_amount) || 0;
    const jv = parseFloat(item.amount_from_jv) || 0;
    const approved = getVariationsTotal(item.approved_variations);
    const potential = getVariationsTotal(item.potential_variations);
    return contract + jv + approved + potential;
};

export const getTotalAllocPct = (allocations) =>
    (allocations || []).reduce((sum, a) => sum + (parseFloat(a.allocation_percent) || 0), 0);

export const calculateCostWithAlloc = (items, getAmountField, totalWorkingDays, isDailyAlready = false, avgMonthDays = 22, avgYearDays = 260) => {
    return items.reduce((sum, item) => {
        const amount = getAmountField(item);
        const dailyCost = isDailyAlready ? amount : convertCostToDaily(amount, item.frequency_type, avgMonthDays, avgYearDays, totalWorkingDays);
        const totalForPeriod = dailyCost * (totalWorkingDays || 0);
        const totalAlloc = getTotalAllocPct(item.department_allocations);
        return sum + (totalForPeriod * totalAlloc / 100);
    }, 0);
};

export const calculatePersonnelCostTotal = (personnelCosts, totalWorkingDays, avgMonthDays, avgYearDays) => 
    calculateCostWithAlloc(personnelCosts, item => item.calculated_amount, totalWorkingDays, false, avgMonthDays, avgYearDays);

export const calculateBomTotal = (bomCosts) => {
    return bomCosts.reduce((sum, item) => {
        const cost = parseFloat(item.calculated_bom_cost) || 0;
        const qty = parseFloat(item.quantity) || 1;
        return sum + (cost * qty);
    }, 0);
};

export const calculateInvestmentTotal = (investmentAmortization, totalWorkingDays, avgMonthDays, avgYearDays) => 
    calculateCostWithAlloc(investmentAmortization, item => item.calculated_daily_cost, totalWorkingDays, true, avgMonthDays, avgYearDays);

export const calculateCostTotal = (costArray, totalWorkingDays, avgMonthDays, avgYearDays) => 
    calculateCostWithAlloc(costArray, item => item.amount, totalWorkingDays, false, avgMonthDays, avgYearDays);

export const calculateTotalCosts = (
    personnelCosts, bomCosts, fixedCosts, operationalCosts, overheadCosts, investmentAmortization, maintenanceCosts,
    totalWorkingDays, avgMonthDays, avgYearDays
) => {
    return calculatePersonnelCostTotal(personnelCosts, totalWorkingDays, avgMonthDays, avgYearDays) +
           calculateBomTotal(bomCosts) +
           calculateCostTotal(fixedCosts, totalWorkingDays, avgMonthDays, avgYearDays) +
           calculateCostTotal(operationalCosts, totalWorkingDays, avgMonthDays, avgYearDays) +
           calculateCostTotal(overheadCosts, totalWorkingDays, avgMonthDays, avgYearDays) +
           calculateInvestmentTotal(investmentAmortization, totalWorkingDays, avgMonthDays, avgYearDays) +
           calculateCostTotal(maintenanceCosts, totalWorkingDays, avgMonthDays, avgYearDays);
};

export const formatCurrency = (value) => {
    return `€${parseFloat(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const calculateDepreciationInvestmentsTotal = (depreciationInvestments) => {
    return depreciationInvestments.reduce((sum, item) => {
        return sum + (parseFloat(item.total_amount) || 0);
    }, 0);
};

export const calculateEstimatedRevenuesTotal = (estimatedRevenues) => {
    return estimatedRevenues.reduce((sum, item) => {
        const totalRevenue = item.total_revenue != null
            ? parseFloat(item.total_revenue) || 0
            : (parseFloat(item.pending_quantity) || 0) * (parseFloat(item.unit_revenue) || 0);
        return sum + totalRevenue;
    }, 0);
};

export const calculateAdditionalRevenuesTotal = (additionalRevenues) => {
    return additionalRevenues.reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0);
};

export const calculateTotalDepreciationRevenueBase = (estimatedRevenues, additionalRevenues) => {
    return calculateEstimatedRevenuesTotal(estimatedRevenues) + calculateAdditionalRevenuesTotal(additionalRevenues);
};

export const calculateDepreciationFactor = (depreciationInvestments, estimatedRevenues, additionalRevenues) => {
    const revenueBase = calculateTotalDepreciationRevenueBase(estimatedRevenues, additionalRevenues);
    return revenueBase > 0 ? calculateDepreciationInvestmentsTotal(depreciationInvestments) / revenueBase : 0;
};

export const calculateDepartmentSummary = (
    personnelCosts, fixedCosts, operationalCosts, overheadCosts, maintenanceCosts, investmentAmortization, depreciationInvestments,
    departments, totalWorkingDays, avgMonthDays, avgYearDays
) => {
    const deptMap = {};

    const ensureDept = (deptId) => {
        if (!deptMap[deptId]) {
            const dept = departments.find(d => d.id === deptId);
            deptMap[deptId] = {
                department_id: deptId,
                department_name: dept ? dept.department_name : deptId,
                personnel_total: 0,
                fixed_total: 0,
                operational_total: 0,
                overhead_total: 0,
                maintenance_total: 0,
                investment_amortization_total: 0,
                depreciation_investments_total: 0,
            };
        }
    };

    const distribute = (items, getItemTotal, field) => {
        items.forEach(item => {
            const allocs = item.department_allocations || [];
            if (allocs.length === 0) return;
            const itemTotal = getItemTotal(item);
            allocs.forEach(alloc => {
                if (!alloc.department_id) return;
                ensureDept(alloc.department_id);
                deptMap[alloc.department_id][field] += itemTotal * (parseFloat(alloc.allocation_percent) || 0) / 100;
            });
        });
    };

    distribute(personnelCosts, item => convertCostToDaily(item.calculated_amount, item.frequency_type, avgMonthDays, avgYearDays, totalWorkingDays) * totalWorkingDays, 'personnel_total');
    distribute(fixedCosts, item => convertCostToDaily(item.amount, item.frequency_type, avgMonthDays, avgYearDays, totalWorkingDays) * totalWorkingDays, 'fixed_total');
    distribute(operationalCosts, item => convertCostToDaily(item.amount, item.frequency_type, avgMonthDays, avgYearDays, totalWorkingDays) * totalWorkingDays, 'operational_total');
    distribute(overheadCosts, item => convertCostToDaily(item.amount, item.frequency_type, avgMonthDays, avgYearDays, totalWorkingDays) * totalWorkingDays, 'overhead_total');
    distribute(maintenanceCosts, item => convertCostToDaily(item.amount, item.frequency_type, avgMonthDays, avgYearDays, totalWorkingDays) * totalWorkingDays, 'maintenance_total');
    distribute(investmentAmortization, item => (parseFloat(item.calculated_daily_cost) || 0) * totalWorkingDays, 'investment_amortization_total');
    distribute(depreciationInvestments, item => parseFloat(item.total_amount) || 0, 'depreciation_investments_total');

    return Object.values(deptMap)
        .map(d => ({
            ...d,
            grand_total: d.personnel_total + d.fixed_total + d.operational_total + d.overhead_total + d.maintenance_total + d.investment_amortization_total + d.depreciation_investments_total
        }))
        .sort((a, b) => a.department_name.localeCompare(b.department_name))
        .filter(d => d.grand_total > 0);
};