import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from 'lucide-react';
import { Label } from "@/components/ui/label";

export default function DepreciationRateCard({
    totalRevenueBase,
    totalDepreciationCost,
    depreciationFactor,
    formatCurrency
}) {
    return (
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-amber-600" />
                    Depreciation Rate on Revenue
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-white rounded-lg border border-amber-100">
                        <Label className="text-xs text-slate-600">Total Revenue</Label>
                        <p className="text-lg font-semibold text-amber-700">{formatCurrency(totalRevenueBase)}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-amber-100">
                        <Label className="text-xs text-slate-600">Total Depreciation Cost</Label>
                        <p className="text-lg font-semibold text-amber-700">{formatCurrency(totalDepreciationCost)}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-amber-100">
                        <Label className="text-xs text-slate-600">Depreciation Factor</Label>
                        <p className="text-lg font-semibold text-amber-700">{depreciationFactor.toFixed(4)}</p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-amber-100">
                        <Label className="text-xs text-slate-600">Depreciation %</Label>
                        <p className="text-lg font-semibold text-amber-700">{(depreciationFactor * 100).toFixed(2)}%</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}