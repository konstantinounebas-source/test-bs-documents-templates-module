import React from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronRight, Trash2, Plus } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import DeptAllocationRows from "@/components/factory-financial/DeptAllocationRows";

// Note: Predefined rows are initialized in the parent component (pages/FactoryFinancialCalculations)

export default function FixedCostsTableSection({
    fixedCosts,
    departments,
    expandedSections,
    totalWorkingDays,
    formatCurrency,
    convertCostToDaily,
    calculateCostTotal,
    onToggleSection,
    onAddItem,
    onRemoveItem,
    onUpdateItem,
    onAddDeptAlloc,
    onUpdateDeptAlloc,
    onRemoveDeptAlloc
}) {
    return (
        <Collapsible open={expandedSections['fixedCosts']} onOpenChange={() => onToggleSection('fixedCosts')}>
            <div>
                <div className="flex items-center justify-between mb-4">
                    <CollapsibleTrigger asChild>
                        <div className="flex items-center gap-2 cursor-pointer hover:text-blue-700 transition-colors">
                            {expandedSections['fixedCosts'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <Label className="text-base font-semibold cursor-pointer">Σταθερά Κόστη (Fixed Costs)</Label>
                        </div>
                    </CollapsibleTrigger>
                    <Button size="sm" variant="outline" onClick={onAddItem}>
                        <Plus className="w-4 h-4 mr-1" />
                        Προσθήκη Σειράς
                    </Button>
                </div>

                <CollapsibleContent>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                        {/* Table Header */}
                        <div className="bg-slate-100 grid grid-cols-12 gap-2 p-3 text-xs font-semibold text-slate-700">
                            <div className="col-span-3">Τύπος Κόστους</div>
                            <div className="col-span-2">Ποσό</div>
                            <div className="col-span-2">Συχνότητα</div>
                            <div className="col-span-3">Περίοδος</div>
                            <div className="col-span-2 text-right">Ενέργειες</div>
                        </div>

                        {/* Table Body */}
                        <div className="divide-y divide-slate-200">
                            {fixedCosts.map((item, idx) => {
                                const dailyAmount = convertCostToDaily(item.amount, item.frequency_type);
                                const periodTotal = dailyAmount * totalWorkingDays;

                                return (
                                    <div key={idx}>
                                        {/* Main Row */}
                                        <div className="grid grid-cols-12 gap-2 p-3 items-center bg-white hover:bg-slate-50 transition-colors">
                                            <Input
                                                placeholder="π.χ. Ενοίκιο"
                                                value={item.description}
                                                onChange={(e) => onUpdateItem(idx, 'description', e.target.value)}
                                                className="col-span-3 h-8"
                                            />
                                            <Input
                                                type="number"
                                                placeholder="0.00"
                                                value={item.amount || ''}
                                                onChange={(e) => onUpdateItem(idx, 'amount', parseFloat(e.target.value) || 0)}
                                                className="col-span-2 h-8"
                                            />
                                            <Select value={item.frequency_type} onValueChange={(value) => onUpdateItem(idx, 'frequency_type', value)}>
                                                <SelectTrigger className="col-span-2 h-8">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="daily">Ημερήσιο</SelectItem>
                                                    <SelectItem value="per_production_day">Ανά Εργάσιμη</SelectItem>
                                                    <SelectItem value="monthly">Μηνιαίο</SelectItem>
                                                    <SelectItem value="yearly">Ετήσιο</SelectItem>
                                                    <SelectItem value="one_time">Εφάπαξ</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <div className="col-span-3 text-xs bg-blue-50 p-2 rounded">
                                                <div className="font-medium">{formatCurrency(dailyAmount)}/ημέρα</div>
                                                <div className="text-slate-600">Περίοδος: {formatCurrency(periodTotal)}</div>
                                            </div>
                                            <div className="col-span-2 flex justify-end">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8"
                                                    onClick={() => onRemoveItem(idx)}
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Department Allocations Row - Always Rendered */}
                                        <div className="bg-slate-50 px-3 py-2 border-t border-slate-200">
                                            <div className="text-xs font-semibold text-slate-600 mb-2">Κατανομή ανά Τμήμα:</div>
                                            <DeptAllocationRows
                                                allocations={item.department_allocations || []}
                                                departments={departments}
                                                totalAmount={periodTotal}
                                                formatCurrency={formatCurrency}
                                                onAdd={() => onAddDeptAlloc(idx)}
                                                onUpdate={(allocIdx, field, value) => onUpdateDeptAlloc(idx, allocIdx, field, value)}
                                                onRemove={(allocIdx) => onRemoveDeptAlloc(idx, allocIdx)}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Subtotal */}
                    <div className="mt-3 text-sm font-semibold text-slate-700 text-right bg-blue-50 p-3 rounded">
                        Υποσύνολο Σταθερών Κοστών: {formatCurrency(calculateCostTotal(fixedCosts))}
                    </div>
                </CollapsibleContent>
            </div>
        </Collapsible>
    );
}