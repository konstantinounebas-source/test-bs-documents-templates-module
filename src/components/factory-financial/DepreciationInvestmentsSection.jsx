import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import DeptAllocationRows from './DeptAllocationRows';

export default function DepreciationInvestmentsSection({
    depreciationInvestments,
    departments,
    formatCurrency,
    getAllocationTotal,
    getDeptName,
    calculateDepreciationInvestmentsTotal,
    onAddItem,
    onRemoveItem,
    onUpdateItem,
    onAddDeptAlloc,
    onUpdateDeptAlloc,
    onRemoveDeptAlloc
}) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">A. Investments</h3>
                <Button size="sm" variant="outline" onClick={onAddItem}>
                    <Plus className="w-4 h-4 mr-1" />
                    Προσθήκη Επένδυσης
                </Button>
            </div>

            <div className="space-y-3">
                {depreciationInvestments.map((item, idx) => {
                    const totalAlloc = getAllocationTotal(item.department_allocations);
                    const totalAmount = parseFloat(item.total_amount) || 0;

                    return (
                        <div key={idx} className="p-4 bg-slate-50 rounded-lg space-y-3">
                            {/* Description & Category */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs">Περιγραφή</Label>
                                    <Input
                                        placeholder="Περιγραφή επένδυσης"
                                        value={item.description}
                                        onChange={(e) => onUpdateItem(idx, 'description', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Κατηγορία</Label>
                                    <Select value={item.category} onValueChange={(value) => onUpdateItem(idx, 'category', value)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="materials">Materials</SelectItem>
                                            <SelectItem value="labor">Labor</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Total Amount */}
                            <div>
                                <Label className="text-xs">Συνολικό Ποσό</Label>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={item.total_amount}
                                    onChange={(e) => onUpdateItem(idx, 'total_amount', e.target.value)}
                                />
                            </div>

                            {/* Department Allocations */}
                            <div className="border-t pt-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-semibold">Department Allocations</Label>
                                    <Button size="sm" variant="outline" onClick={() => onAddDeptAlloc(idx)}>
                                        <Plus className="w-3 h-3 mr-1" />
                                        Add Department
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    {(item.department_allocations || []).length === 0 ? (
                                        <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded border border-slate-200 text-center">
                                            Δεν υπάρχουν κατανομές τμημάτων
                                        </div>
                                    ) : (
                                        (item.department_allocations || []).map((alloc, allocIdx) => (
                                            <div key={allocIdx} className="flex items-end gap-2 bg-white p-2 rounded border border-slate-200">
                                                <div className="flex-1">
                                                    <Label className="text-xs">Τμήμα</Label>
                                                    <Select value={alloc.department_id || ''} onValueChange={(value) => onUpdateDeptAlloc(idx, allocIdx, 'department_id', value)}>
                                                        <SelectTrigger className="h-8"><SelectValue placeholder="Επιλέξτε τμήμα" /></SelectTrigger>
                                                        <SelectContent position="popper" sideOffset={5}>
                                                            {departments.map(dept => (
                                                                <SelectItem key={dept.id} value={dept.id}>{dept.department_name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="w-24">
                                                    <Label className="text-xs">Allocation %</Label>
                                                    <Input
                                                        type="number"
                                                        placeholder="0"
                                                        min="0"
                                                        max="100"
                                                        value={alloc.allocation_percent || ''}
                                                        onChange={(e) => onUpdateDeptAlloc(idx, allocIdx, 'allocation_percent', e.target.value)}
                                                        className="h-8"
                                                    />
                                                </div>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8"
                                                    onClick={() => onRemoveDeptAlloc(idx, allocIdx)}
                                                >
                                                    <Trash2 className="w-3 h-3 text-red-500" />
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Allocation Total Validation */}
                            <div className={`p-2 rounded text-xs font-semibold ${totalAlloc === 100 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                Total Allocation: {totalAlloc.toFixed(1)}% {totalAlloc === 100 ? '✓' : '(must equal 100%)'}
                            </div>

                            {/* Allocated Amount Split */}
                            {totalAlloc > 0 && (
                                <div className="text-xs text-slate-600 bg-blue-50 p-2 rounded space-y-1">
                                    <strong>Allocated amount split:</strong>
                                    {(item.department_allocations || []).map((alloc, allocIdx) => {
                                        const deptName = getDeptName(alloc.department_id);
                                        const allocAmount = totalAmount * (parseFloat(alloc.allocation_percent) || 0) / 100;
                                        return <div key={allocIdx}>{deptName}: {formatCurrency(allocAmount)}</div>;
                                    })}
                                </div>
                            )}

                            {/* Delete Button */}
                            <div className="flex justify-end">
                                <Button size="icon" variant="ghost" onClick={() => onRemoveItem(idx)}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Total Investments */}
            <div className="pt-2 text-sm font-medium text-slate-700">
                Σύνολο Επενδύσεων: {formatCurrency(calculateDepreciationInvestmentsTotal())}
            </div>
        </div>
    );
}