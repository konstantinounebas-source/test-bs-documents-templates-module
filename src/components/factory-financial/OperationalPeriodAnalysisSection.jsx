import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function OperationalPeriodAnalysisSection({
    startDate,
    endDate,
    dailyRevenueEntries = [],
    dailyCostsRecords = [],
    dailyDepartmentHoursEntries = [],
    depreciationInvestmentTotal = 0,
    formatCurrency = (val) => `€${parseFloat(val || 0).toFixed(2)}`
}) {
    const analysis = useMemo(() => {
        // Filter entries by period
        const revenueInPeriod = (dailyRevenueEntries || []).filter(entry => {
            const entryDate = entry.date;
            return entryDate >= startDate && entryDate <= endDate;
        });

        const costsInPeriod = (dailyCostsRecords || []).filter(record => {
            const recordDate = record.date;
            return recordDate >= startDate && recordDate <= endDate;
        });

        const hoursInPeriod = (dailyDepartmentHoursEntries || []).filter(entry => {
            const entryDate = entry.date;
            return entryDate >= startDate && entryDate <= endDate;
        });

        // Calculate Period Revenue
        const periodRevenue = revenueInPeriod.reduce((sum, entry) => {
            return sum + (parseFloat(entry.total_revenue) || 0);
        }, 0);

        // Calculate Operational Costs (Fixed + Operational from daily records)
        const operationalCosts = costsInPeriod.reduce((sum, record) => {
            const fixed = parseFloat(record.fixedCost) || 0;
            const operational = parseFloat(record.operationalCost) || 0;
            return sum + fixed + operational;
        }, 0);

        // Calculate Labour Costs (Supervisor + Department Hours)
        const supervisorCosts = costsInPeriod.reduce((sum, record) => {
            return sum + (parseFloat(record.supervisorCost) || 0);
        }, 0);

        const departmentHoursCosts = hoursInPeriod.reduce((sum, entry) => {
            return sum + (parseFloat(entry.calculated_total_cost) || 0);
        }, 0);

        const totalLabourCosts = supervisorCosts + departmentHoursCosts;

        // Calculate Result Before Depreciation
        const resultBeforeDepreciation = periodRevenue - operationalCosts - totalLabourCosts;

        // Depreciation Charge (from parameter)
        const depreciationCharge = parseFloat(depreciationInvestmentTotal) || 0;

        // Final Result After Depreciation
        const finalResult = resultBeforeDepreciation - depreciationCharge;

        return {
            periodRevenue,
            operationalCosts,
            totalLabourCosts,
            supervisorCosts,
            departmentHoursCosts,
            resultBeforeDepreciation,
            depreciationCharge,
            finalResult,
            hasData: revenueInPeriod.length > 0 || costsInPeriod.length > 0 || hoursInPeriod.length > 0
        };
    }, [startDate, endDate, dailyRevenueEntries, dailyCostsRecords, dailyDepartmentHoursEntries, depreciationInvestmentTotal]);

    if (!analysis.hasData) {
        return (
            <Card className="bg-slate-50 border-slate-200">
                <CardHeader>
                    <CardTitle className="text-base">Χρηματοοικονομική Ανάλυση (Λειτουργική Περίοδος)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-3 text-slate-600">
                        <AlertCircle className="w-4 h-4" />
                        <p className="text-sm">Δεν υπάρχουν δεδομένα για τα Daily Operations στην περίοδο {startDate} έως {endDate}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-slate-200">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-slate-50 border-b border-slate-200">
                <CardTitle className="text-base">Χρηματοοικονομική Ανάλυση (Λειτουργική Περίοδος)</CardTitle>
                <p className="text-xs text-slate-500 mt-1">{startDate} έως {endDate}</p>
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
                        <span className="text-sm font-medium text-slate-700">Κόστος Λειτουργίας (Σχεδιασμένο)</span>
                        <span className="text-sm font-semibold text-red-600">– {formatCurrency(analysis.operationalCosts)}</span>
                    </div>

                    {/* Labour Costs */}
                    <div className="space-y-1 py-1 border-b border-slate-100">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-700">Κόστος Εργατικών Περιόδου</span>
                            <span className="text-sm font-semibold text-red-600">– {formatCurrency(analysis.totalLabourCosts)}</span>
                        </div>
                        {analysis.supervisorCosts > 0 && (
                            <div className="flex justify-between items-center pl-4">
                                <span className="text-xs text-slate-500">  → Επιστάρχη</span>
                                <span className="text-xs text-slate-500">– {formatCurrency(analysis.supervisorCosts)}</span>
                            </div>
                        )}
                        {analysis.departmentHoursCosts > 0 && (
                            <div className="flex justify-between items-center pl-4">
                                <span className="text-xs text-slate-500">  → Ώρες Τμημάτων</span>
                                <span className="text-xs text-slate-500">– {formatCurrency(analysis.departmentHoursCosts)}</span>
                            </div>
                        )}
                    </div>

                    {/* Result Before Depreciation */}
                    <div className="flex justify-between items-center py-2 border-b border-slate-100 bg-slate-50 px-2 rounded">
                        <span className="text-sm font-semibold text-slate-700">Αποτέλεσμα προ Απόσβεσης</span>
                        <span className={`text-sm font-bold ${analysis.resultBeforeDepreciation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {analysis.resultBeforeDepreciation >= 0 ? '+' : '–'} {formatCurrency(Math.abs(analysis.resultBeforeDepreciation))}
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
                            {analysis.finalResult >= 0 ? '+' : '–'} {formatCurrency(Math.abs(analysis.finalResult))}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}