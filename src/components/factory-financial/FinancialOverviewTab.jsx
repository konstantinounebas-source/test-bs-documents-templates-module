import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, BarChart2, Minus, AlertTriangle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function KPICard({ label, value, icon: Icon, color = 'blue', sub }) {
    const colorMap = {
        blue: 'bg-blue-50 text-blue-700 border-blue-200',
        green: 'bg-green-50 text-green-700 border-green-200',
        red: 'bg-red-50 text-red-700 border-red-200',
        orange: 'bg-orange-50 text-orange-700 border-orange-200',
        slate: 'bg-slate-50 text-slate-700 border-slate-200',
        purple: 'bg-purple-50 text-purple-700 border-purple-200',
    };
    return (
        <div className={`rounded-xl border p-4 flex flex-col gap-2 ${colorMap[color]}`}>
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</span>
                {Icon && <Icon className="w-5 h-5 opacity-60" />}
            </div>
            <div className="text-2xl font-bold">{value}</div>
            {sub && <div className="text-xs opacity-70">{sub}</div>}
        </div>
    );
}

function AnalysisRow({ label, value, highlight }) {
    return (
        <div className={`flex justify-between items-center py-2 px-3 rounded-lg ${highlight ? 'bg-slate-100 font-semibold' : ''}`}>
            <span className="text-sm text-slate-700">{label}</span>
            <span className={`text-sm font-medium ${highlight ? 'text-slate-900' : 'text-slate-600'}`}>{value}</span>
        </div>
    );
}

export default function FinancialOverviewTab({
    totalIncome,
    totalCosts,
    depreciationCost,
    formatCurrency,
    costBreakdown,
    hasInvalidAllocations,
    legacyPersonnelCost,
}) {
    const netBeforeDepr = totalIncome - totalCosts;
    const totalCostWithDepr = totalCosts + depreciationCost;
    const netAfterDepr = totalIncome - totalCostWithDepr;
    const deprPct = totalIncome > 0 ? ((depreciationCost / totalIncome) * 100).toFixed(1) : '0.0';

    return (
        <div className="space-y-6">
            {hasInvalidAllocations && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 text-amber-800 rounded-xl px-4 py-3 text-sm font-medium">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span>Προσοχή: Υπάρχουν κατανομές τμημάτων που δεν αθροίζουν στο 100%. Αποθήκευση δεν επιτρέπεται.</span>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <KPICard label="Συνολικά Έσοδα" value={formatCurrency(totalIncome)} icon={TrendingUp} color="green" />
                <KPICard label="Κόστος Παραγωγής" value={formatCurrency(totalCosts)} icon={DollarSign} color="blue" />
                <KPICard label="Κόστος Απόσβεσης" value={formatCurrency(depreciationCost)} icon={BarChart2} color="purple" />
                <KPICard
                    label="Αποτέλεσμα προ Απόσβεσης"
                    value={formatCurrency(netBeforeDepr)}
                    icon={netBeforeDepr >= 0 ? TrendingUp : TrendingDown}
                    color={netBeforeDepr >= 0 ? 'green' : 'red'}
                />
                <KPICard label="Συνολικό Κόστος με Απόσβεση" value={formatCurrency(totalCostWithDepr)} icon={Minus} color="orange" />
                <KPICard
                    label="Καθαρό Αποτέλεσμα μετά Απόσβεση"
                    value={formatCurrency(netAfterDepr)}
                    icon={netAfterDepr >= 0 ? TrendingUp : TrendingDown}
                    color={netAfterDepr >= 0 ? 'green' : 'red'}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Financial Analysis */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold text-slate-800">Χρηματοοικονομική Ανάλυση</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        <AnalysisRow label="Έσοδα" value={formatCurrency(totalIncome)} />
                        <AnalysisRow label="Κόστος Λειτουργίας" value={`− ${formatCurrency(totalCosts)}`} />
                        <AnalysisRow label="Αποτέλεσμα προ Απόσβεσης" value={formatCurrency(netBeforeDepr)} highlight />
                        <div className="border-t border-slate-200 my-2" />
                        <AnalysisRow label="Επιβάρυνση Απόσβεσης" value={`− ${formatCurrency(depreciationCost)}`} />
                        <AnalysisRow label="Απόσβεση ως % Εσόδων" value={`${deprPct}%`} />
                        <div className="border-t border-slate-200 my-2" />
                        <AnalysisRow label="Τελικό Αποτέλεσμα μετά Απόσβεση" value={formatCurrency(netAfterDepr)} highlight />
                    </CardContent>
                </Card>

                {/* Cost Breakdown */}
                <div className="space-y-3">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold text-slate-800">Ανάλυση Κόστους (Σύνολο)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1">
                            {costBreakdown.map((item, i) => (
                                <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
                                    <span className="text-sm text-slate-600">{item.label}</span>
                                    <span className="text-sm font-medium text-slate-800">{formatCurrency(item.value)}</span>
                                </div>
                            ))}
                            <div className="flex justify-between items-center py-2 bg-slate-100 rounded px-2 mt-2">
                                <span className="text-sm font-semibold text-slate-800">Σύνολο Κόστους</span>
                                <span className="text-sm font-bold text-slate-900">{formatCurrency(totalCosts)}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Legacy Personnel Cost — informational only, NOT in official total */}
                    {legacyPersonnelCost !== undefined && legacyPersonnelCost > 0 && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                            <div className="flex items-center gap-2 text-slate-500 font-semibold text-xs uppercase tracking-wide">
                                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                                Legacy Personnel Cost (informational only — εκτός συνολικού κόστους)
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Legacy Personnel (παλιά εγγραφές)</span>
                                <span className="text-sm font-medium text-slate-500">{formatCurrency(legacyPersonnelCost)}</span>
                            </div>
                            <p className="text-xs text-slate-400">
                                Αυτό το ποσό δεν προσμετράται στο Κόστος Παραγωγής. Αντικαθίσταται από το Labour Module.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}