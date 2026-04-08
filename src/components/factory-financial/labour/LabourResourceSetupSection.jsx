import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, ChevronDown, ChevronRight, Users, AlertTriangle } from 'lucide-react';
import {
    calculateMonthlyResourceDailyRate,
    calculateMonthlyResourceHourlyRate,
    calculateDailyPartTimeHourlyRate,
    validateResourceAllocations,
    getResourceAllocationPreviewAmount,
} from '../utils/labourCostCalculations';
import DeptAllocationRows from '../DeptAllocationRows';
import {
    addLabourResourceAllocation,
    updateLabourResourceAllocation,
    removeLabourResourceAllocation,
} from '../utils/labourStateHelpers';

function ResourceRow({ resource, idx, departments, formatCurrency, onUpdate, onRemove, onResources, allResources }) {
    const [expanded, setExpanded] = useState(false);

    const isMonthly = resource.employment_type === 'monthly_fixed';
    const dailyRate = isMonthly
        ? calculateMonthlyResourceDailyRate(resource.monthly_salary, resource.monthly_to_day_factor)
        : parseFloat(resource.daily_rate) || 0;
    const hourlyRate = isMonthly
        ? calculateMonthlyResourceHourlyRate(resource.monthly_salary, resource.monthly_to_day_factor, resource.hours_per_day)
        : calculateDailyPartTimeHourlyRate(resource.daily_rate, resource.hours_per_day);

    // Allocation status
    const allocStatus = validateResourceAllocations(resource);
    const showAllocWarning = !allocStatus.valid;
    const allocWarningText = allocStatus.hasAllocations
        ? `Κατανομή: ${allocStatus.total}% (απαιτείται 100%)`
        : 'Χωρίς κατανομή τμήματος';

    // Amount shown in the DeptAllocationRows preview
    const previewAmount = getResourceAllocationPreviewAmount(resource);
    const previewLabel = isMonthly ? 'Μηνιαίος μισθός' : 'Ημερήσιο κόστος';

    return (
        <div className={`border rounded-xl bg-white overflow-hidden ${showAllocWarning ? 'border-amber-300' : 'border-slate-200'}`}>
            {/* Header row */}
            <div className="flex items-center gap-3 px-4 py-3">
                <button
                    type="button"
                    onClick={() => setExpanded(p => !p)}
                    className="text-slate-400 hover:text-slate-600 flex-shrink-0"
                >
                    {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>

                <Input
                    value={resource.resource_name || ''}
                    onChange={e => onUpdate(idx, 'resource_name', e.target.value)}
                    placeholder="Όνομα εργαζόμενου / πόρου"
                    className="flex-1 h-8 text-sm"
                />

                <Select
                    value={resource.employment_type || 'monthly_fixed'}
                    onValueChange={v => onUpdate(idx, 'employment_type', v)}
                >
                    <SelectTrigger className="w-44 h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="monthly_fixed">Μηνιαίος Σταθερός</SelectItem>
                        <SelectItem value="daily_part_time">Ημερήσιος / Part-time</SelectItem>
                    </SelectContent>
                </Select>

                <div className="text-xs text-slate-500 text-right w-28 flex-shrink-0">
                    <div>Ημ/σιο: <span className="font-semibold text-slate-700">{formatCurrency(dailyRate)}</span></div>
                    <div>Ωριαίο: <span className="font-semibold text-slate-700">{formatCurrency(hourlyRate)}</span></div>
                </div>

                {/* Allocation warning badge */}
                {showAllocWarning && (
                    <div title={allocWarningText} className="flex-shrink-0">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                    </div>
                )}

                <div className="flex items-center gap-2 flex-shrink-0">
                    <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={resource.is_active !== false}
                            onChange={e => onUpdate(idx, 'is_active', e.target.checked)}
                            className="w-3 h-3"
                        />
                        Ενεργός
                    </label>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onRemove(idx)}>
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </Button>
                </div>
            </div>

            {/* Expanded details */}
            {expanded && (
                <div className="border-t border-slate-100 px-4 py-4 bg-slate-50 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {isMonthly ? (
                            <>
                                <div>
                                    <Label className="text-xs text-slate-600">Μηνιαίος Μισθός (€)</Label>
                                    <Input
                                        type="number"
                                        value={resource.monthly_salary || ''}
                                        onChange={e => onUpdate(idx, 'monthly_salary', parseFloat(e.target.value) || 0)}
                                        className="h-8 text-sm"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-600">Εργάσιμες ημέρες/μήνα</Label>
                                    <Input
                                        type="number"
                                        value={resource.monthly_to_day_factor || ''}
                                        onChange={e => onUpdate(idx, 'monthly_to_day_factor', parseFloat(e.target.value) || 22)}
                                        className="h-8 text-sm"
                                        placeholder="22"
                                    />
                                </div>
                            </>
                        ) : (
                            <div>
                                <Label className="text-xs text-slate-600">Ημερήσιο Κόστος (€)</Label>
                                <Input
                                    type="number"
                                    value={resource.daily_rate || ''}
                                    onChange={e => onUpdate(idx, 'daily_rate', parseFloat(e.target.value) || 0)}
                                    className="h-8 text-sm"
                                    placeholder="0"
                                />
                            </div>
                        )}
                        <div>
                            <Label className="text-xs text-slate-600">Ώρες / ημέρα</Label>
                            <Input
                                type="number"
                                value={resource.hours_per_day || ''}
                                onChange={e => onUpdate(idx, 'hours_per_day', parseFloat(e.target.value) || 8)}
                                className="h-8 text-sm"
                                placeholder="8"
                            />
                        </div>
                        <div className="flex flex-col justify-end">
                            <Label className="text-xs text-slate-500">Υπολογισμένο Ωριαίο</Label>
                            <div className="h-8 flex items-center px-3 bg-blue-50 rounded-md text-sm font-semibold text-blue-700 border border-blue-200">
                                {formatCurrency(hourlyRate)} / ώρα
                            </div>
                        </div>
                    </div>

                    {/* Department allocations */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <Label className="text-xs font-semibold text-slate-700">
                                Κατανομή Τμημάτων
                            </Label>
                            <span className="text-xs text-slate-400">
                                Ποσό preview: {previewLabel} = {formatCurrency(previewAmount)}
                            </span>
                        </div>
                        {showAllocWarning && (
                            <div className="flex items-center gap-1 text-xs text-amber-600 mb-2 bg-amber-50 rounded px-2 py-1 border border-amber-200">
                                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                {allocWarningText}
                            </div>
                        )}
                        <DeptAllocationRows
                            allocations={resource.department_allocations || []}
                            departments={departments}
                            totalAmount={previewAmount}
                            formatCurrency={formatCurrency}
                            onAdd={() => onResources(addLabourResourceAllocation(allResources, idx))}
                            onUpdate={(allocIdx, field, value) => onResources(updateLabourResourceAllocation(allResources, idx, allocIdx, field, value))}
                            onRemove={(allocIdx) => onResources(removeLabourResourceAllocation(allResources, idx, allocIdx))}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default function LabourResourceSetupSection({ labourResources, departments, formatCurrency, onResources }) {
    const safeResources = labourResources || [];

    const handleAdd = () => {
        onResources([
            ...safeResources,
            {
                resource_name: '',
                employment_type: 'monthly_fixed',
                monthly_salary: 0,
                daily_rate: 0,
                hours_per_day: 8,
                monthly_to_day_factor: 22,
                is_active: true,
                department_allocations: [],
            },
        ]);
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        Ρύθμιση Πόρων Εργασίας
                    </CardTitle>
                    <Button size="sm" variant="outline" onClick={handleAdd} className="gap-1 text-xs">
                        <Plus className="w-3 h-3" />
                        Προσθήκη Πόρου
                    </Button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                    Ορίστε εργαζόμενους και τους ρυθμούς κόστους τους. Μηνιαίοι υπολογίζουν αυτόματα ημερήσιο &amp; ωριαίο ρυθμό.
                    Κάθε ενεργός πόρος χρειάζεται κατανομή τμημάτων που αθροίζει 100%.
                </p>
            </CardHeader>
            <CardContent className="space-y-3">
                {safeResources.length === 0 ? (
                    <div className="text-center py-8 text-sm text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        Δεν υπάρχουν καταχωρημένοι πόροι. Πατήστε "Προσθήκη Πόρου" για να ξεκινήσετε.
                    </div>
                ) : (
                    safeResources.map((resource, idx) => (
                        <ResourceRow
                            key={idx}
                            resource={resource}
                            idx={idx}
                            departments={departments}
                            formatCurrency={formatCurrency}
                            onUpdate={(i, field, value) => {
                                onResources(safeResources.map((r, j) => j === i ? { ...r, [field]: value } : r));
                            }}
                            onRemove={(i) => onResources(safeResources.filter((_, j) => j !== i))}
                            onResources={onResources}
                            allResources={safeResources}
                        />
                    ))
                )}
            </CardContent>
        </Card>
    );
}