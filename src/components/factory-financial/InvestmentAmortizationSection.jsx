import React from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import DeptAllocationRows from "@/components/factory-financial/DeptAllocationRows";

export default function InvestmentAmortizationSection({
    investmentAmortization,
    departments,
    expandedSections,
    totalWorkingDays,
    formatCurrency,
    calculateInvestmentTotal,
    onToggleSection,
    onAddItem,
    onRemoveItem,
    onUpdateItem,
    onAddDeptAlloc,
    onUpdateDeptAlloc,
    onRemoveDeptAlloc
}) {
    return (
        <Collapsible open={expandedSections.investment} onOpenChange={() => onToggleSection('investment')}>
            <div>
                <div className="flex items-center justify-between mb-3">
                    <CollapsibleTrigger asChild>
                        <div className="flex items-center gap-2 cursor-pointer hover:text-purple-700 transition-colors">
                            {expandedSections.investment ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <Label className="text-base font-semibold cursor-pointer">Απόσβεση Επενδύσεων (Investment Amortization)</Label>
                        </div>
                    </CollapsibleTrigger>
                    <Button size="sm" variant="outline" onClick={onAddItem}>
                        <Plus className="w-4 h-4 mr-1" />
                        Προσθήκη
                    </Button>
                </div>
                <CollapsibleContent>
                    <div className="space-y-3">
                        {investmentAmortization.map((item, idx) => (
                            <div key={idx} className="p-4 bg-slate-50 rounded-lg space-y-3">
                                <div className="flex items-start gap-2">
                                    <Input
                                        placeholder="Περιγραφή"
                                        value={item.description}
                                        onChange={(e) => onUpdateItem(idx, 'description', e.target.value)}
                                        className="flex-1"
                                    />
                                    <div className="space-y-1">
                                        <Label className="text-xs">Συνολική Επένδυση</Label>
                                        <Input
                                            type="number"
                                            placeholder="Συνολικό Ποσό"
                                            value={item.total_investment_amount}
                                            onChange={(e) => onUpdateItem(idx, 'total_investment_amount', e.target.value)}
                                            className="w-40"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Διάρκεια (μήνες)</Label>
                                        <Input
                                            type="number"
                                            placeholder="Μήνες"
                                            value={item.project_duration_months}
                                            onChange={(e) => onUpdateItem(idx, 'project_duration_months', e.target.value)}
                                            className="w-32"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Ημερήσιο Κόστος</Label>
                                        <Input
                                            type="number"
                                            value={item.calculated_daily_cost}
                                            className="w-32 bg-blue-50"
                                            disabled
                                        />
                                    </div>
                                    <Button size="icon" variant="ghost" onClick={() => onRemoveItem(idx)}>
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                </div>
                                <div className="text-xs text-slate-600 bg-blue-50 p-2 rounded">
                                    <strong>Ημερήσιο κόστος:</strong> {formatCurrency(item.calculated_daily_cost)}/ημέρα × {totalWorkingDays} ημέρες = {formatCurrency((parseFloat(item.calculated_daily_cost) || 0) * totalWorkingDays)}
                                </div>
                                <DeptAllocationRows
                                    allocations={item.department_allocations}
                                    departments={departments}
                                    totalAmount={(parseFloat(item.calculated_daily_cost) || 0) * totalWorkingDays}
                                    formatCurrency={formatCurrency}
                                    onAdd={() => onAddDeptAlloc(idx)}
                                    onUpdate={(allocIdx, field, value) => onUpdateDeptAlloc(idx, allocIdx, field, value)}
                                    onRemove={(allocIdx) => onRemoveDeptAlloc(idx, allocIdx)}
                                />
                            </div>
                        ))}
                    </div>
                </CollapsibleContent>
                <div className="mt-2 text-sm font-medium text-slate-700">
                    Υποσύνολο: {formatCurrency(calculateInvestmentTotal())}
                </div>
            </div>
        </Collapsible>
    );
}