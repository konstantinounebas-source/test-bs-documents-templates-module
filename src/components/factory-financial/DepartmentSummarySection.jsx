import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from 'lucide-react';

export default function DepartmentSummarySection({ summary, formatCurrency }) {
    if (summary.length === 0) return null;

    const colTotals = summary.reduce((acc, row) => ({
        personnel: acc.personnel + row.personnel_total,
        fixed: acc.fixed + row.fixed_total,
        overhead: acc.overhead + row.overhead_total,
        maintenance: acc.maintenance + row.maintenance_total,
        investment: acc.investment + row.investment_amortization_total,
        depreciation: acc.depreciation + row.depreciation_investments_total,
        grand: acc.grand + row.grand_total,
    }), { personnel: 0, fixed: 0, overhead: 0, maintenance: 0, investment: 0, depreciation: 0, grand: 0 });

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                    SECTION D — Department Summary
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-100">
                                <th className="text-left px-3 py-2 font-semibold text-slate-700 rounded-tl-lg">Department</th>
                                <th className="text-right px-3 py-2 font-semibold text-slate-700">Personnel</th>
                                <th className="text-right px-3 py-2 font-semibold text-slate-700">Fixed</th>
                                <th className="text-right px-3 py-2 font-semibold text-slate-700">Overhead</th>
                                <th className="text-right px-3 py-2 font-semibold text-slate-700">Maintenance</th>
                                <th className="text-right px-3 py-2 font-semibold text-slate-700">Inv. Amortization</th>
                                <th className="text-right px-3 py-2 font-semibold text-slate-700">Depr. Investments</th>
                                <th className="text-right px-3 py-2 font-semibold text-slate-700 rounded-tr-lg">Grand Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {summary.map((row, idx) => (
                                <tr key={row.department_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                    <td className="px-3 py-2 font-medium text-slate-800">{row.department_name}</td>
                                    <td className="px-3 py-2 text-right text-slate-700">{formatCurrency(row.personnel_total)}</td>
                                    <td className="px-3 py-2 text-right text-slate-700">{formatCurrency(row.fixed_total)}</td>
                                    <td className="px-3 py-2 text-right text-slate-700">{formatCurrency(row.overhead_total)}</td>
                                    <td className="px-3 py-2 text-right text-slate-700">{formatCurrency(row.maintenance_total)}</td>
                                    <td className="px-3 py-2 text-right text-slate-700">{formatCurrency(row.investment_amortization_total)}</td>
                                    <td className="px-3 py-2 text-right text-slate-700">{formatCurrency(row.depreciation_investments_total)}</td>
                                    <td className="px-3 py-2 text-right font-semibold text-indigo-700">{formatCurrency(row.grand_total)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-indigo-50 border-t-2 border-indigo-200">
                                <td className="px-3 py-2 font-bold text-indigo-900">TOTAL</td>
                                <td className="px-3 py-2 text-right font-bold text-indigo-900">{formatCurrency(colTotals.personnel)}</td>
                                <td className="px-3 py-2 text-right font-bold text-indigo-900">{formatCurrency(colTotals.fixed)}</td>
                                <td className="px-3 py-2 text-right font-bold text-indigo-900">{formatCurrency(colTotals.overhead)}</td>
                                <td className="px-3 py-2 text-right font-bold text-indigo-900">{formatCurrency(colTotals.maintenance)}</td>
                                <td className="px-3 py-2 text-right font-bold text-indigo-900">{formatCurrency(colTotals.investment)}</td>
                                <td className="px-3 py-2 text-right font-bold text-indigo-900">{formatCurrency(colTotals.depreciation)}</td>
                                <td className="px-3 py-2 text-right font-bold text-indigo-900">{formatCurrency(colTotals.grand)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}