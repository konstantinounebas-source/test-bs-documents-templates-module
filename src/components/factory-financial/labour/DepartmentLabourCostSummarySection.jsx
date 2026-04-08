import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart2 } from 'lucide-react';
import { buildDepartmentLabourSummary, calculateTotalLabourCost } from '../utils/labourCostCalculations';

export default function DepartmentLabourCostSummarySection({ labourResources, departmentLabourHours, departments, formatCurrency }) {
    const summary = buildDepartmentLabourSummary(labourResources, departmentLabourHours, departments);
    const totalCost = calculateTotalLabourCost(labourResources, departmentLabourHours);

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-emerald-600" />
                    Κόστος Εργασίας ανά Τμήμα
                </CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                    Blended average ωριαίο κόστος × σύνολο ωρών = Κόστος τμήματος
                </p>
            </CardHeader>
            <CardContent>
                {summary.length === 0 ? (
                    <div className="text-center py-6 text-sm text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        Δεν υπάρχουν αποτελέσματα. Συμπληρώστε πόρους και ώρες τμημάτων.
                    </div>
                ) : (
                    <div className="space-y-1">
                        <div className="grid grid-cols-4 gap-2 px-3 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            <div className="col-span-1">Τμήμα</div>
                            <div className="text-right">Μέσο Ωριαίο</div>
                            <div className="text-right">Σύνολο Ωρών</div>
                            <div className="text-right">Κόστος</div>
                        </div>
                        {summary.map((row, i) => (
                            <div
                                key={i}
                                className="grid grid-cols-4 gap-2 items-center px-3 py-2.5 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 transition-colors"
                            >
                                <div className="col-span-1 text-sm font-medium text-slate-800">{row.department_name}</div>
                                <div className="text-right text-sm text-slate-600">{formatCurrency(row.average_hour_rate)}/ώρα</div>
                                <div className="text-right text-sm text-slate-600">{row.total_hours.toLocaleString('el-GR')} ώρ.</div>
                                <div className="text-right text-sm font-semibold text-slate-800">{formatCurrency(row.total_cost)}</div>
                            </div>
                        ))}
                        <div className="grid grid-cols-4 gap-2 items-center px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 mt-2">
                            <div className="col-span-3 text-sm font-bold text-emerald-800">Σύνολο Κόστους Εργασίας</div>
                            <div className="text-right text-sm font-bold text-emerald-800">{formatCurrency(totalCost)}</div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}