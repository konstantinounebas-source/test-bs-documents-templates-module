import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';

export default function DailyCostsDecisionSection({ selectedDate, onSave }) {
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
        onSave(updatedRecords);
        setFixedCosts(false);
        setOperationalCosts(false);
    };

    const handleRemoveRecord = (idx) => {
        const updatedRecords = records.filter((_, i) => i !== idx);
        setRecords(updatedRecords);
        onSave(updatedRecords);
    };

    const todayRecords = records.filter(r => r.date === selectedDate);

    return (
        <Card className="border-slate-200">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    Καταχώρηση Κοστών για τη {selectedDate}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Decision Section */}
                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={fixedCosts}
                                onChange={e => setFixedCosts(e.target.checked)}
                                className="rounded border-slate-300"
                            />
                            <span className="text-sm text-slate-700">Καταχώρηση Σταθερών Κοστών</span>
                        </label>
                    </div>
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={operationalCosts}
                                onChange={e => setOperationalCosts(e.target.checked)}
                                className="rounded border-slate-300"
                            />
                            <span className="text-sm text-slate-700">Καταχώρηση Λειτουργικών Κοστών</span>
                        </label>
                    </div>
                    <Button
                        onClick={handleAddRecord}
                        disabled={!fixedCosts && !operationalCosts}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Προσθήκη
                    </Button>
                </div>

                {/* Records Table */}
                {todayRecords.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Σταθερά Κόστη</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Λειτουργικά Κόστη</th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Ενέργεια</th>
                                </tr>
                            </thead>
                            <tbody>
                                {todayRecords.map((record, idx) => (
                                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-3 py-2 text-slate-700">
                                            {record.hasFixedCosts ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                                    ✓ Ναι
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-slate-700">
                                            {record.hasOperationalCosts ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                                    ✓ Ναι
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2">
                                            <button
                                                onClick={() => handleRemoveRecord(idx)}
                                                className="text-red-600 hover:text-red-800 transition-colors"
                                                title="Διαγραφή"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}