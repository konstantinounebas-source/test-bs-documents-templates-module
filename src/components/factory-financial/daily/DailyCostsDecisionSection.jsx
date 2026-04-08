import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Plus, Trash2, DollarSign } from 'lucide-react';

export default function DailyCostsDecisionSection({ selectedDate, supervisorDailyAllocations, labourPersonnel, formatCurrency, onSave = () => {} }) {
    const [fixedCosts, setFixedCosts] = useState(false);
    const [operationalCosts, setOperationalCosts] = useState(false);
    const [supervisorCosts, setSupervisorCosts] = useState(false);
    const [records, setRecords] = useState([]);

    const getSupervisorTotalCost = () => {
        if (!supervisorCosts || !supervisorDailyAllocations || !labourPersonnel) return 0;
        return supervisorDailyAllocations.reduce((sum, alloc) => {
            const person = labourPersonnel.find(p => p.id === alloc.personnel_id);
            return sum + (person?.daily_cost || 0);
        }, 0);
    };

    const handleAddRecord = () => {
        const supervisorCost = getSupervisorTotalCost();
        const newRecord = {
            date: selectedDate,
            hasFixedCosts: fixedCosts,
            hasOperationalCosts: operationalCosts,
            hasSupervisorCosts: supervisorCosts,
            supervisorCost: supervisorCost,
            timestamp: new Date().toISOString()
        };
        const updatedRecords = [...records, newRecord];
        setRecords(updatedRecords);
        if (typeof onSave === 'function') onSave(updatedRecords);
        setFixedCosts(false);
        setOperationalCosts(false);
        setSupervisorCosts(false);
    };

    const handleRemoveRecord = (idx) => {
        const updatedRecords = records.filter((_, i) => i !== idx);
        setRecords(updatedRecords);
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
                                        <div className="flex flex-col gap-0.5">
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
                                            {record.hasSupervisorCosts && formatCurrency && (
                                                <span className="text-xs text-purple-700 font-medium">
                                                    {formatCurrency(record.supervisorCost)}
                                                </span>
                                            )}
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
                        {todayRecords.some(r => r.hasSupervisorCosts) && (
                            <div className="mt-3 pt-2 border-t border-slate-200">
                                <p className="text-sm text-slate-500">Σύνολο ημερήσιου κόστους επιστάρχη:</p>
                                <span className="text-lg font-bold text-blue-700">
                                    {formatCurrency && formatCurrency(todayRecords.reduce((sum, r) => sum + (r.supervisorCost || 0), 0))}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}