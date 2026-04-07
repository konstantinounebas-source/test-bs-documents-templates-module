import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import DeptAllocationRows from './DeptAllocationRows';

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
            <Card className="border border-slate-200 bg-white">
                <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {expandedSections['fixedCosts'] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                <CardTitle>Σταθερά Κόστη (Fixed Costs)</CardTitle>
                            </div>
                            <div className="text-sm text-slate-600">
                                Σύνολο: {formatCurrency(calculateCostTotal(fixedCosts))}
                            </div>
                        </div>
                    </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <CardContent className="p-0">
                        {/* Table Section */}
                        <div className="border-t border-slate-200">
                            {/* Table Header */}
                            <div className="bg-slate-100 grid grid-cols-12 gap-2 p-3 text-xs font-semibold text-slate-700">
                                <div className="col-span-3">Τύπος Κόστους</div>
                                <div className="col-span-2">Ποσό</div>
                                <div className="col-span-2">Συχνότητα</div>
                                <div className="col-span-3">Ημερήσιο Ποσό</div>
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
                                                    <span>{formatCurrency(dailyAmount)}/ημέρα</span>
                                                    <br />
                                                    <span className="text-slate-600">× {totalWorkingDays} ημέρες = {formatCurrency(periodTotal)}</span>
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

                                            {/* Department Allocations Row (Expandable) */}
                                            {item.department_allocations && item.department_allocations.length > 0 && (
                                                <div className="bg-slate-50 px-3 py-2 border-t border-slate-200">
                                                    <div className="text-xs font-semibold text-slate-600 mb-2">Κατανομή ανά Τμήμα:</div>
                                                    <DeptAllocationRows
                                                        allocations={item.department_allocations}
                                                        departments={departments}
                                                        totalAmount={periodTotal}
                                                        formatCurrency={formatCurrency}
                                                        onAdd={() => onAddDeptAlloc(idx)}
                                                        onUpdate={(allocIdx, field, value) => onUpdateDeptAlloc(idx, allocIdx, field, value)}
                                                        onRemove={(allocIdx) => onRemoveDeptAlloc(idx, allocIdx)}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Add Row Button */}
                            <div className="bg-slate-50 p-3 border-t border-slate-200">
                                <Button
                                    onClick={onAddItem}
                                    variant="outline"
                                    size="sm"
                                    className="w-full flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Προσθήκη Κόστους
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    );
}