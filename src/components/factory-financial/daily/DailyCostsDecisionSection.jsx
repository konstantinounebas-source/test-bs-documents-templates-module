import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Plus, Trash2, DollarSign } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

export default function DailyCostsDecisionSection({ selectedDate, onSave = () => {} }) {
    const [fixedCosts, setFixedCosts] = useState(false);
    const [operationalCosts, setOperationalCosts] = useState(false);
    const [records, setRecords] = useState([]);

    const handleAddRecord = () => {
        const newRecord = {
            date: selectedDate,
            hasFixedCosts: fixedCosts,
            hasOperationalCosts: operationalCosts,
            timestamp: new Date().toISOString()
        };
        const updatedRecords = [...records, newRecord];
        setRecords(updatedRecords);
        if (typeof onSave === 'function') onSave(updatedRecords);
        setFixedCosts(false);
        setOperationalCosts(false);
    };

    const handleRemoveRecord = (idx) => {
        const updatedRecords = records.filter((_, i) => i !== idx);
        setRecords(updatedRecords);
        if (typeof onSave === 'function') onSave(updatedRecords);
    };

    const todayRecords = records.filter(r => r.date === selectedDate);

    return (
        <Card className="border-slate-200 bg-white">
            <CardHeader className="pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                    <CardTitle className="text-base font-semibold text-slate-900">Καταχώρηση Κοστών</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                {/* Selection Section */}
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                        <div className="flex items-center space-x-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                             onClick={() => setFixedCosts(!fixedCosts)}>
                            <Checkbox
                                checked={fixedCosts}
                                onChange={(checked) => setFixedCosts(checked)}
                                className="w-5 h-5"
                            />
                            <div className="flex-1">
                                <label className="text-sm font-medium text-slate-900 cursor-pointer">
                                    Σταθερά Κόστη
                                </label>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Ενεργοποίηση καταχώρησης σταθερών κοστών
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                             onClick={() => setOperationalCosts(!operationalCosts)}>
                            <Checkbox
                                checked={operationalCosts}
                                onChange={(checked) => setOperationalCosts(checked)}
                                className="w-5 h-5"
                            />
                            <div className="flex-1">
                                <label className="text-sm font-medium text-slate-900 cursor-pointer">
                                    Λειτουργικά Κόστη
                                </label>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Ενεργοποίηση καταχώρησης λειτουργικών κοστών
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <Button
                        onClick={handleAddRecord}
                        disabled={!fixedCosts && !operationalCosts}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 h-auto"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Προσθήκη Καταχώρησης
                    </Button>
                </div>

                {/* Records List */}
                {todayRecords.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-slate-100">
                        <h3 className="text-sm font-semibold text-slate-900 mb-3">
                            Καταχωρήσεις για {selectedDate}
                        </h3>
                        <div className="space-y-2">
                            {todayRecords.map((record, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors"
                                >
                                    <div className="flex items-center gap-3 flex-1">
                                        <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                        <div className="text-sm text-slate-700">
                                            <span className="font-medium">
                                                {record.hasFixedCosts && record.hasOperationalCosts
                                                    ? 'Σταθερά & Λειτουργικά Κόστη'
                                                    : record.hasFixedCosts
                                                    ? 'Σταθερά Κόστη'
                                                    : 'Λειτουργικά Κόστη'}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveRecord(idx)}
                                        className="text-red-600 hover:text-red-800 hover:bg-red-100 p-2 rounded-lg transition-colors"
                                        title="Διαγραφή"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}