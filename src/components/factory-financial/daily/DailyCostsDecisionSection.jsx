import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';

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
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={fixedCosts}
                        onChange={e => setFixedCosts(e.target.checked)}
                        className="rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700">Σταθερά Κόστη</span>
                </label>
            </div>
            <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={operationalCosts}
                        onChange={e => setOperationalCosts(e.target.checked)}
                        className="rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700">Λειτουργικά Κόστη</span>
                </label>
            </div>
            <Button
                onClick={handleAddRecord}
                disabled={!fixedCosts && !operationalCosts}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 h-auto"
            >
                <Plus className="w-3 h-3 mr-1" />
                Προσθήκη
            </Button>

            {todayRecords.length > 0 && (
                <div className="mt-3 text-xs space-y-1">
                    {todayRecords.map((record, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded">
                            <span className="text-slate-600 flex-1">
                                {(record.hasFixedCosts ? '✓ Σ.Κ' : '') + (record.hasFixedCosts && record.hasOperationalCosts ? ' + ' : '') + (record.hasOperationalCosts ? '✓ Λ.Κ' : '')}
                            </span>
                            <button
                                onClick={() => handleRemoveRecord(idx)}
                                className="text-red-600 hover:text-red-800"
                                title="Διαγραφή"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}