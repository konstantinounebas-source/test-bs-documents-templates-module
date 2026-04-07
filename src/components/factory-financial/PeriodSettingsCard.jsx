import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from 'lucide-react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function PeriodSettingsCard({ totalWorkingDays, avgWorkingDaysPerMonth, avgWorkingDaysPerYear, onUpdate }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    Ρυθμίσεις Περιόδου
                </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
                <div>
                    <Label>Συνολικές Εργάσιμες Ημέρες Περιόδου</Label>
                    <Input
                        type="number"
                        value={totalWorkingDays}
                        onChange={(e) => onUpdate('totalWorkingDays', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                    />
                </div>
                <div>
                    <Label>Μέσες Εργάσιμες Ημέρες/Μήνα</Label>
                    <Input
                        type="number"
                        value={avgWorkingDaysPerMonth}
                        onChange={(e) => onUpdate('avgWorkingDaysPerMonth', parseFloat(e.target.value) || 22)}
                        placeholder="22"
                    />
                </div>
                <div>
                    <Label>Μέσες Εργάσιμες Ημέρες/Έτος</Label>
                    <Input
                        type="number"
                        value={avgWorkingDaysPerYear}
                        onChange={(e) => onUpdate('avgWorkingDaysPerYear', parseFloat(e.target.value) || 260)}
                        placeholder="260"
                    />
                </div>
            </CardContent>
        </Card>
    );
}