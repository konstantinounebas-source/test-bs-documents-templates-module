import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Plus, Trash2, DollarSign } from 'lucide-react';

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

                    {/* Action Button */}
                    <Button
                        onClick={handleAddRecord}
                        disabled={!fixedCosts && !operationalCosts}
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
                                        <span className="text-xs text-slate-700">
                                            {record.hasFixedCosts && record.hasOperationalCosts
                                                ? 'Σ. & Λ. Κόστη'
                                                : record.hasFixedCosts
                                                ? 'Σ. Κόστη'
                                                : 'Λ. Κόστη'}
                                        </span>
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
                    </div>
                )}
            </CardContent>
        </Card>
    );
}