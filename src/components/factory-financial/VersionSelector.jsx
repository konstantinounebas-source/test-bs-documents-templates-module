import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function VersionSelector({ financialRecords, selectedRecord, totalWorkingDays, onLoadRecord, onCreateNew }) {
    if (financialRecords.length === 0) {
        return (
            <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <Calendar className="w-12 h-12 text-slate-400 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Δεν υπάρχουν εγγραφές</h3>
                    <p className="text-slate-500 mb-4 text-center">Δημιουργήστε την πρώτη σας εγγραφή οικονομικών δεδομένων</p>
                    <Button onClick={onCreateNew} className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Δημιουργία Εγγραφής
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Επιλογή Έκδοσης
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <Label>Έκδοση Δεδομένων</Label>
                        <Select
                            value={selectedRecord?.id || ''}
                            onValueChange={(value) => {
                                const record = financialRecords.find(r => r.id === value);
                                if (record) onLoadRecord(record);
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Επιλέξτε έκδοση" />
                            </SelectTrigger>
                            <SelectContent>
                                {financialRecords.map(record => (
                                    <SelectItem key={record.id} value={record.id}>
                                        {record.factory_name} - {record.version || 'v1.0'} ({new Date(record.created_date).toLocaleDateString('el-GR')})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {selectedRecord && (
                        <>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">Περίοδος</Label>
                                <div className="text-sm font-medium">
                                    {new Date(selectedRecord.start_date).toLocaleDateString('el-GR')} - {new Date(selectedRecord.end_date).toLocaleDateString('el-GR')}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-500">Εργάσιμες Ημέρες</Label>
                                <div className="text-sm font-medium">{totalWorkingDays}</div>
                            </div>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}