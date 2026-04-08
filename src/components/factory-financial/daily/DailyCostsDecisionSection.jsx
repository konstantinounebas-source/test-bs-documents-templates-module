import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Plus, Trash2, DollarSign } from 'lucide-react';
import { calculateSupervisorAllocatedDailyCost, calculateTotalSupervisorDailyCost } from '../utils/labourModuleCalculations';

export default function DailyCostsDecisionSection({ selectedDate, supervisorDailyAllocations, labourPersonnel, formatCurrency, fixedDailyTotal, operationalDailyTotal, records = [], onSave = () => {} }) {
    const [fixedCosts, setFixedCosts] = useState(false);
    const [operationalCosts, setOperationalCosts] = useState(false);
    const [supervisorCosts, setSupervisorCosts] = useState(false);

    const getFixedCostsTotal = () => {
        if (!fixedCosts) return 0;
        return parseFloat(fixedDailyTotal) || 0;
    };

    const getOperationalCostsTotal = () => {
        if (!operationalCosts) return 0;
        return parseFloat(operationalDailyTotal) || 0;
    };

    const getSupervisorTotalCost = () => {
        if (!supervisorCosts || !supervisorDailyAllocations || !labourPersonnel) return 0;
        return calculateTotalSupervisorDailyCost(supervisorDailyAllocations, labourPersonnel);
    };

    const handleAddRecord = () => {
        const fixedCost = fixedCosts ? getFixedCostsTotal() : 0;
        const operationalCost = operationalCosts ? getOperationalCostsTotal() : 0;
        const supervisorCost = supervisorCosts ? getSupervisorTotalCost() : 0;
        
        const newRecord = {
            date: selectedDate,
            hasFixedCosts: fixedCosts,
            hasOperationalCosts: operationalCosts,
            hasSupervisorCosts: supervisorCosts,
            fixedCost,
            operationalCost,
            supervisorCost,
            totalCost: fixedCost + operationalCost + supervisorCost,
            timestamp: new Date().toISOString()
        };
        const updatedRecords = [...records, newRecord];
        if (typeof onSave === 'function') onSave(updatedRecords);
        setFixedCosts(false);
        setOperationalCosts(false);
        setSupervisorCosts(false);
    };

    const handleRemoveRecord = (idx) => {
        const updatedRecords = records.filter((_, i) => i !== idx);
        if (typeof onSave === 'function') onSave(updatedRecords);
    };

    const todayRecords = records.filter(r => r.date === selectedDate);

    return (
        <Card className="border-slate-200 bg-white">
            <CardHeader className="py-3 px-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                    <CardTitle className="text-sm font-semibold text-slate-900">Καταχώρηση Κοστών</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="pt-3 px-4 pb-3">
                {/* Selection Section */}
                <div className="flex items-center gap-3">
                    <div 
                        className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded"
                        onClick={() => setFixedCosts(!fixedCosts)}
                    >
                        <input
                            type="checkbox"
                            checked={fixedCosts}
                            onChange={(e) => setFixedCosts(e.target.checked)}
                            className="w-4 h-4 cursor-pointer"
                        />
                        <span className="text-xs font-medium text-slate-900">Σταθερά</span>
                    </div>

                    <div 
                        className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded"
                        onClick={() => setOperationalCosts(!operationalCosts)}
                    >
                        <input
                            type="checkbox"
                            checked={operationalCosts}
                            onChange={(e) => setOperationalCosts(e.target.checked)}
                            className="w-4 h-4 cursor-pointer"
                        />
                        <span className="text-xs font-medium text-slate-900">Λειτουργικά</span>
                    </div>

                    <div 
                        className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded"
                        onClick={() => setSupervisorCosts(!supervisorCosts)}
                    >
                        <input
                            type="checkbox"
                            checked={supervisorCosts}
                            onChange={(e) => setSupervisorCosts(e.target.checked)}
                            className="w-4 h-4 cursor-pointer"
                        />
                        <span className="text-xs font-medium text-slate-900">Ημερήσιο Κόστος Επιστάρχη</span>
                    </div>

                    {/* Action Button */}
                    <Button
                        onClick={handleAddRecord}
                        disabled={!fixedCosts && !operationalCosts && !supervisorCosts}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 h-auto px-2 ml-auto"
                    >
                        <Plus className="w-3 h-3 mr-1" />
                        Προσθήκη
                    </Button>
                </div>

                {/* Records List */}
                {todayRecords.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-100">
                        <div className="space-y-1">
                            {todayRecords.map((record, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between p-2 rounded bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors"
                                >
                                    <div className="flex items-center gap-2 flex-1">
                                    <CheckCircle2 className="w-3 h-3 text-blue-600 flex-shrink-0" />
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs text-slate-700">
                                            {record.hasFixedCosts && record.hasOperationalCosts && record.hasSupervisorCosts
                                                ? 'Σ. & Λ. & Επιστάρχη'
                                                : record.hasFixedCosts && record.hasOperationalCosts
                                                ? 'Σ. & Λ. Κόστη'
                                                : record.hasFixedCosts && record.hasSupervisorCosts
                                                ? 'Σ. & Επιστάρχη'
                                                : record.hasOperationalCosts && record.hasSupervisorCosts
                                                ? 'Λ. & Επιστάρχη'
                                                : record.hasFixedCosts
                                                ? 'Σ. Κόστη'
                                                : record.hasOperationalCosts
                                                ? 'Λ. Κόστη'
                                                : 'Επιστάρχη'}
                                        </span>
                                        <div className="text-xs text-slate-600 space-y-0.5">
                                            {record.hasFixedCosts && (
                                                <div>Fixed: {formatCurrency(record.fixedCost)}</div>
                                            )}
                                            {record.hasOperationalCosts && (
                                                <div>Operational: {formatCurrency(record.operationalCost)}</div>
                                            )}
                                            {record.hasSupervisorCosts && (
                                                <div className="text-purple-700 font-medium">Supervisor: {formatCurrency(record.supervisorCost)}</div>
                                            )}
                                        </div>
                                    </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveRecord(idx)}
                                        className="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
                                        title="Διαγραφή"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        {todayRecords.length > 0 && (
                            <div className="mt-3 pt-2 border-t border-slate-200 space-y-2">
                                {todayRecords.some(r => r.hasFixedCosts) && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Σύνολο Σταθερών:</span>
                                        <span className="font-semibold text-slate-900">{formatCurrency && formatCurrency(todayRecords.reduce((sum, r) => sum + (r.fixedCost || 0), 0))}</span>
                                    </div>
                                )}
                                {todayRecords.some(r => r.hasOperationalCosts) && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Σύνολο Λειτουργικών:</span>
                                        <span className="font-semibold text-slate-900">{formatCurrency && formatCurrency(todayRecords.reduce((sum, r) => sum + (r.operationalCost || 0), 0))}</span>
                                    </div>
                                )}
                                {todayRecords.some(r => r.hasSupervisorCosts) && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Σύνολο Επιστάρχη:</span>
                                        <span className="font-semibold text-purple-700">{formatCurrency && formatCurrency(todayRecords.reduce((sum, r) => sum + (r.supervisorCost || 0), 0))}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm border-t border-slate-200 pt-2 font-bold">
                                    <span className="text-slate-900">Σύνολο Ημερήσιων Κοστών:</span>
                                    <span className="text-blue-700">{formatCurrency && formatCurrency(todayRecords.reduce((sum, r) => sum + (r.totalCost || 0), 0))}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}