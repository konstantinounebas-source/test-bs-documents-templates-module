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

export default function PersonnelCostSection({
    personnelCosts,
    dailyMetrics,
    departments,
    expandedSections,
    totalWorkingDays,
    formatCurrency,
    convertCostToDaily,
    calculatePersonnelCostTotal,
    onToggleSection,
    onAddItem,
    onRemoveItem,
    onUpdateItem,
    onAddDeptAlloc,
    onUpdateDeptAlloc,
    onRemoveDeptAlloc
}) {
    return (
        <Collapsible open={expandedSections.personnel} onOpenChange={() => onToggleSection('personnel')}>
            <div>
                <div className="flex items-center justify-between mb-3">
                    <CollapsibleTrigger asChild>
                        <div className="flex items-center gap-2 cursor-pointer hover:text-blue-700 transition-colors">
                            {expandedSections.personnel ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <Label className="text-base font-semibold cursor-pointer">Κόστος Προσωπικού (Personnel Costs) - από Manufacturing</Label>
                        </div>
                    </CollapsibleTrigger>
                    <Button size="sm" variant="outline" onClick={onAddItem}>
                        <Plus className="w-4 h-4 mr-1" />
                        Προσθήκη
                    </Button>
                </div>
                <CollapsibleContent>
                    <div className="space-y-3">
                        {personnelCosts.map((item, idx) => (
                            <div key={idx} className="p-4 bg-slate-50 rounded-lg space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-xs">Μέτρηση (Metric)</Label>
                                        <Select
                                            value={item.metric_id}
                                            onValueChange={(value) => {
                                                onUpdateItem(idx, 'metric_id', value);
                                                const metric = dailyMetrics.find(m => m.id === value);
                                                if (metric) onUpdateItem(idx, 'description', metric.metric_name);
                                            }}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Επιλέξτε μέτρηση" /></SelectTrigger>
                                            <SelectContent position="popper" sideOffset={5}>
                                                {dailyMetrics.map(metric => (
                                                    <SelectItem key={metric.id} value={metric.id}>{metric.metric_code} - {metric.metric_name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="text-xs">Συχνότητα</Label>
                                        <Select
                                            value={item.frequency_type}
                                            onValueChange={(value) => onUpdateItem(idx, 'frequency_type', value)}
                                        >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="daily">Ημερήσιο</SelectItem>
                                                <SelectItem value="per_production_day">Ανά Εργάσιμη</SelectItem>
                                                <SelectItem value="monthly">Μηνιαίο</SelectItem>
                                                <SelectItem value="yearly">Ετήσιο</SelectItem>
                                                <SelectItem value="one_time">Εφάπαξ</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
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
                                        value={item.calculated_amount}
                                        onChange={(e) => onUpdateItem(idx, 'calculated_amount', e.target.value)}
                                        className="w-32"
                                    />
                                    <Button size="icon" variant="ghost" onClick={() => onRemoveItem(idx)}>
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                </div>
                                <div className="text-xs text-slate-600 bg-blue-50 p-2 rounded">
                                    <strong>Ημερήσιο κόστος:</strong> {formatCurrency(convertCostToDaily(item.calculated_amount, item.frequency_type))}/ημέρα × {totalWorkingDays} ημέρες = {formatCurrency(convertCostToDaily(item.calculated_amount, item.frequency_type) * totalWorkingDays)}
                                </div>
                                <DeptAllocationRows
                                    allocations={item.department_allocations}
                                    departments={departments}
                                    totalAmount={convertCostToDaily(item.calculated_amount, item.frequency_type) * totalWorkingDays}
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
                    Υποσύνολο: {formatCurrency(calculatePersonnelCostTotal())}
                </div>
            </div>
        </Collapsible>
    );
}