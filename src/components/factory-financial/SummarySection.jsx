import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from 'lucide-react';

export default function SummarySection({ totalIncome, totalCosts, formatCurrency }) {
    return (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    SECTION C — Περίληψη
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex items-center justify-between text-lg">
                        <span className="font-medium">Συνολικά Έσοδα:</span>
                        <span className="font-semibold text-green-600">{formatCurrency(totalIncome)}</span>
                    </div>
                    <div className="flex items-center justify-between text-lg">
                        <span className="font-medium">Συνολικά Κόστη (Παραγωγής):</span>
                        <span className="font-semibold text-orange-600">{formatCurrency(totalCosts)}</span>
                    </div>
                    <div className="pt-4 border-t border-blue-200">
                        <div className="flex items-center justify-between text-xl">
                            <span className="font-bold">Καθαρό Κέρδος:</span>
                            <span className="font-bold text-blue-600">
                                {formatCurrency(totalIncome - totalCosts)}
                            </span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}