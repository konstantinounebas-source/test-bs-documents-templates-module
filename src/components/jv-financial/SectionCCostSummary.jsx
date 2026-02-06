import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SectionCCostSummary({ sectionATotal, sectionBVerified, sectionBWaste, sectionBAccrued }) {
    const totalVerifiedCosts = sectionBVerified || 0;
    const totalWasteAllowance = sectionBWaste || 0;
    const totalUnfinalisedCosts = sectionBAccrued || 0;
    const totalProjectCosts = sectionATotal + totalVerifiedCosts + totalWasteAllowance + totalUnfinalisedCosts;

    return (
        <Card>
            <CardHeader>
                <CardTitle>SECTION C — Cost Summary (auto-calculated)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Total Verified Costs */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-sm text-slate-600 mb-1">Total Verified Costs</p>
                            <p className="text-3xl font-bold text-blue-600">€{totalVerifiedCosts.toFixed(2)}</p>
                        </div>

                        {/* Total Waste Allowance */}
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                            <p className="text-sm text-slate-600 mb-1">Total Waste Allowance Cost</p>
                            <p className="text-3xl font-bold text-amber-600">€{totalWasteAllowance.toFixed(2)}</p>
                        </div>

                        {/* Total Unfinalised Costs */}
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                            <p className="text-sm text-slate-600 mb-1">Total Unfinalised Costs</p>
                            <p className="text-3xl font-bold text-purple-600">€{totalUnfinalisedCosts.toFixed(2)}</p>
                        </div>

                        {/* Total Project Costs */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <p className="text-sm text-slate-600 mb-1">Total Contract Income (Section A)</p>
                            <p className="text-3xl font-bold text-green-600">€{sectionATotal.toFixed(2)}</p>
                        </div>
                    </div>

                    {/* Grand Total */}
                    <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-lg p-6 mt-6">
                        <p className="text-sm text-slate-300 mb-2">Total Project Costs</p>
                        <p className="text-4xl font-bold text-white">€{totalProjectCosts.toFixed(2)}</p>
                    </div>

                    {/* Cost Breakdown Summary */}
                    <div className="bg-slate-50 rounded-lg p-4 mt-4">
                        <p className="text-sm font-semibold text-slate-700 mb-3">Breakdown:</p>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-600">Contract Income (A)</span>
                                <span className="font-medium">€{sectionATotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">Verified Costs (B1)</span>
                                <span className="font-medium">€{totalVerifiedCosts.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">Waste Allowance (B2)</span>
                                <span className="font-medium">€{totalWasteAllowance.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">Unfinalised Costs (B3)</span>
                                <span className="font-medium">€{totalUnfinalisedCosts.toFixed(2)}</span>
                            </div>
                            <div className="border-t border-slate-300 pt-2 mt-2 flex justify-between font-bold text-slate-900">
                                <span>Grand Total</span>
                                <span>€{totalProjectCosts.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}