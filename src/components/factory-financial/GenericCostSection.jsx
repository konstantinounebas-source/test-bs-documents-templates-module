import React from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import DeptAllocationRows from "@/components/factory-financial/DeptAllocationRows";

export default function GenericCostSection({
    title,
    sectionKey,
    costArray,
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
        <Collapsible open={expandedSections[sectionKey]} onOpenChange={() => onToggleSection(sectionKey)}>
            <div>
                <div className="flex items-center justify-between mb-3">
                    <CollapsibleTrigger asChild>
                        <div className="flex items-center gap-2 cursor-pointer hover:text-blue-700 transition-colors">
                            {expandedSections[sectionKey] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <Label className="text-base font-semibold cursor-pointer">{title}</Label>
                        </div>
                    </CollapsibleTrigger>
                    <Button size="sm" variant="outline" onClick={onAddItem}>
                        <Plus className="w-4 h-4 mr-1" />
                        Προσθήκη
                    </Button>
                </div>
                <CollapsibleContent>
                    <div className="space-y-3">
                        {costArray.map((item, idx) => (
                            <div key={idx} className="p-4 bg-slate-50 rounded-lg space-y-3">
                                <div className="flex items-start gap-2">
                                    <Input
                                        placeholder="Περιγραφή"
                                        value={item.description}
                                        onChange={(e) => onUpdateItem(idx, 'description', e.target.value)}
                                        className="flex-1"
                                    />
                                    <Input
                                        type="number"
                                        placeholder="Ποσό"
                                        value={item.amount}
                                        onChange={(e) => onUpdateItem(idx, 'amount', e.target.value)}
                                        className="w-32"
                                    />
                                    <Select value={item.frequency_type} onValueChange={(value) => onUpdateItem(idx, 'frequency_type', value)}>
                                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="daily">Ημερήσιο</SelectItem>
                                            <SelectItem value="per_production_day">Ανά Εργάσιμη</SelectItem>
                                            <SelectItem value="monthly">Μηνιαίο</SelectItem>
                                            <SelectItem value="yearly">Ετήσιο</SelectItem>
                                            <SelectItem value="one_time">Εφάπαξ</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button size="icon" variant="ghost" onClick={() => onRemoveItem(idx)}>
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                </div>
                                <div className="text-xs text-slate-600 bg-blue-50 p-2 rounded">
                                    <strong>Ημερήσιο κόστος:</strong> {formatCurrency(convertCostToDaily(item.amount, item.frequency_type))}/ημέρα × {totalWorkingDays} ημέρες = {formatCurrency(convertCostToDaily(item.amount, item.frequency_type) * totalWorkingDays)}
                                </div>
                                <DeptAllocationRows
                                    allocations={item.department_allocations}
                                    departments={departments}
                                    totalAmount={convertCostToDaily(item.amount, item.frequency_type) * totalWorkingDays}
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
                    Υποσύνολο: {formatCurrency(calculateCostTotal(costArray))}
                </div>
            </div>
        </Collapsible>
    );
}