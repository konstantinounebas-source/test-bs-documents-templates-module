import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { filterEntriesForPeriod, getPeriodLabel } from './utils/overviewPeriodCalculations';

/**
 * OperationalPeriodAnalysisSection
 * 
 * Calculates financial analysis ONLY from daily operational data within the selected period.
 * 
 * FORMULAS:
 * 1. Period Revenue = sum(daily_revenue_entries[].total_revenue) where date in [startDate, endDate]
 * 2. Operational Costs = sum((fixedCost + operationalCost) for daily_costs_records in period)
 * 3. Labour Costs = sum(supervisorCost from daily_costs_records) + sum(calculated_total_cost from daily_department_hours_entries)
 * 4. Result Before Depreciation = Revenue - Operational Costs - Labour Costs
 * 5. Final Result = Result Before Depreciation - Depreciation Charge
 */
// Shared helper — identical logic to DailyDepartmentHoursSection.getDeptHourlyCost
function getDeptHourlyCost(deptId, departmentAssignments, labourPersonnel, departments) {
    const deptBlock = (departmentAssignments || []).find(b => b.department_id === deptId);
    if (deptBlock && deptBlock.technician_rows && deptBlock.technician_rows.length > 0) {
        const validRates = deptBlock.technician_rows
            .map(row => {
                const person = (labourPersonnel || []).find(p => p.id === row.personnel_id);
                if (person) {
                    if (person.calculated_hourly_cost) return person.calculated_hourly_cost;
                    if (person.daily_rate) return person.daily_rate / (person.hours_per_day || 8);
                }
                return null;
            })
            .filter(r => r !== null);
        if (validRates.length > 0) return validRates.reduce((s, r) => s + r, 0) / validRates.length;
    }
    const d = (departments || []).find(d => d.id === deptId);
    return d ? (parseFloat(d.avg_hourly_cost) || 0) : 0;
}

export default function OperationalPeriodAnalysisSection({
    filterParams,
    dailyRevenueEntries = [],
    dailyCostsRecords = [],
    dailyDepartmentHoursEntries = [],
    departmentAssignments = [],
    labourPersonnel = [],
    departments = [],
    depreciationFactor = 0,
    formatCurrency = (val) => `€${parseFloat(val || 0).toFixed(2)}`
}) {
    const analysis = useMemo(() => {
        if (!filterParams) return { hasData: false };

        // Filter all arrays using the same filterParams as OverviewFilterBar
        const revenueInPeriod  = filterEntriesForPeriod(dailyRevenueEntries || [], filterParams);
        const costsInPeriod    = filterEntriesForPeriod(dailyCostsRecords || [], filterParams);
        const hoursInPeriod    = filterEntriesForPeriod(dailyDepartmentHoursEntries || [], filterParams);

        // FORMULA 1: Period Revenue = sum(total_revenue)
        const periodRevenue = revenueInPeriod.reduce((sum, entry) => {
            return sum + (parseFloat(entry.total_revenue) || 0);
        }, 0);

        // FORMULA 2: Operational Costs = sum(fixedCost + operationalCost)
        const operationalCosts = costsInPeriod.reduce((sum, record) => {
            const fixed = parseFloat(record.fixedCost) || 0;
            const operational = parseFloat(record.operationalCost) || 0;
            return sum + fixed + operational;
        }, 0);

        // FORMULA 3a: Supervisor Costs = sum(supervisorCost)
        const supervisorCosts = costsInPeriod.reduce((sum, record) => {
            return sum + (parseFloat(record.supervisorCost) || 0);
        }, 0);

        // FORMULA 3b: Department Hours Costs — calculated live from hours × hourly rate
        // (same logic as DailyDepartmentHoursSection, does NOT rely on stored calculated_total_cost)
        const departmentHoursCosts = hoursInPeriod.reduce((sum, entry) => {
            const rate = getDeptHourlyCost(entry.department_id, departmentAssignments, labourPersonnel, departments);
            return sum + ((parseFloat(entry.total_hours) || 0) * rate);
        }, 0);

        // FORMULA 3: Total Labour Costs
        const totalLabourCosts = supervisorCosts + departmentHoursCosts;

        // FORMULA 4: Result Before Depreciation
        const resultBeforeDepreciation = periodRevenue - operationalCosts - totalLabourCosts;

        // FORMULA 5: Depreciation Charge = Period Revenue × Depreciation Factor
        const depreciationCharge = periodRevenue * (parseFloat(depreciationFactor) || 0);

        // FORMULA 6: Final Result After Depreciation
        const finalResult = resultBeforeDepreciation - depreciationCharge;

        const hasData = revenueInPeriod.length > 0 || costsInPeriod.length > 0 || hoursInPeriod.length > 0;

        return {
            periodRevenue,
            operationalCosts,
            supervisorCosts,
            departmentHoursCosts,
            totalLabourCosts,
            resultBeforeDepreciation,
            depreciationCharge,
            finalResult,
            hasData
        };
    }, [filterParams, dailyRevenueEntries, dailyCostsRecords, dailyDepartmentHoursEntries, depreciationFactor, departmentAssignments, labourPersonnel, departments]);

    const periodLabel = getPeriodLabel(filterParams);

    if (!analysis.hasData) {
        return (
            <Card className="bg-slate-50 border-slate-200">
                <CardHeader>
                    <CardTitle className="text-base">Χρηματοοικονομική Ανάλυση (Λειτουργική Περίοδος)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-3 text-slate-600">
                        <AlertCircle className="w-4 h-4" />
                        <p className="text-sm">Δεν υπάρχουν δεδομένα Daily Operations για: {periodLabel}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-slate-200 h-full">
            <CardHeader className="border-b border-slate-200">
                <CardTitle className="text-base">Χρηματοοικονομική Ανάλυση{filterParams?.mode === 'weekly' ? ' - Εβδομαδιαία' : ''}</CardTitle>
                <p className="text-xs text-slate-500 mt-1">{periodLabel}</p>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="space-y-1">
                    {/* Revenue */}
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-sm font-medium text-slate-700">Έσοδα Περιόδου</span>
                        <span className="text-sm font-semibold text-blue-600">{formatCurrency(analysis.periodRevenue)}</span>
                    </div>

                    {/* Operational Costs */}
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-sm font-medium text-slate-700">Κόστος Λειτουργίας</span>
                        <span className="text-sm font-semibold text-red-600">– {formatCurrency(analysis.operationalCosts)}</span>
                    </div>

                    {/* Labour Costs — always show sub-rows so both panels have equal height */}
                    <div className="space-y-1 py-1 border-b border-slate-100">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-700">Κόστος Εργατικών Περιόδου</span>
                            <span className="text-sm font-semibold text-red-600">– {formatCurrency(analysis.totalLabourCosts)}</span>
                        </div>
                        <div className="flex justify-between items-center pl-4">
                            <span className="text-xs text-slate-400">→ Επιστάρχη</span>
                            <span className="text-xs text-slate-400">– {formatCurrency(analysis.supervisorCosts)}</span>
                        </div>
                        <div className="flex justify-between items-center pl-4">
                            <span className="text-xs text-slate-400">→ Ώρες Τμημάτων</span>
                            <span className="text-xs text-slate-400">– {formatCurrency(analysis.departmentHoursCosts)}</span>
                        </div>
                    </div>

                    {/* Result Before Depreciation */}
                    <div className="flex justify-between items-center py-2 border-b border-slate-100 bg-slate-50 px-2 rounded">
                        <span className="text-sm font-semibold text-slate-700">Αποτέλεσμα προ Απόσβεσης</span>
                        <span className={`text-sm font-bold ${analysis.resultBeforeDepreciation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {analysis.resultBeforeDepreciation >= 0 ? '' : '– '}{formatCurrency(Math.abs(analysis.resultBeforeDepreciation))}
                        </span>
                    </div>

                    {/* Depreciation Charge */}
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-sm font-medium text-slate-700">Επιβάρυνση Απόσβεσης</span>
                        <span className="text-sm font-semibold text-red-600">– {formatCurrency(analysis.depreciationCharge)}</span>
                    </div>

                    {/* Final Result */}
                    <div className="flex justify-between items-center py-3 bg-blue-50 px-3 rounded-lg mt-2">
                        <span className="text-sm font-bold text-slate-900">Τελικό Αποτέλεσμα μετά Απόσβεση</span>
                        <span className={`text-lg font-bold ${analysis.finalResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {analysis.finalResult >= 0 ? '' : '– '}{formatCurrency(Math.abs(analysis.finalResult))}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}