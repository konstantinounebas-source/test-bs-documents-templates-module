import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function DeptAllocationRows({ allocations, departments, onAdd, onUpdate, onRemove, totalAmount, formatCurrency }) {
    const totalAlloc = (allocations || []).reduce((sum, a) => sum + (parseFloat(a.allocation_percent) || 0), 0);
    const isValid = Math.abs(totalAlloc - 100) < 0.01;

    return (
        <div className="space-y-2">
            {/* Allocations List */}
            <div className="space-y-2">
                {(allocations || []).length === 0 ? (
                    <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded border border-slate-200 text-center">
                        Δεν υπάρχουν κατανομές τμημάτων
                    </div>
                ) : (
                    (allocations || []).map((alloc, allocIdx) => (
                        <div key={allocIdx} className="flex items-end gap-2 bg-white p-2 rounded border border-slate-200 hover:border-slate-300 transition-colors">
                            <div className="flex-1">
                                <Label className="text-xs text-slate-600">Τμήμα</Label>
                                <Select value={alloc.department_id || ''} onValueChange={(value) => onUpdate(allocIdx, 'department_id', value)}>
                                    <SelectTrigger className="h-8"><SelectValue placeholder="Επιλέξτε..." /></SelectTrigger>
                                    <SelectContent position="popper" sideOffset={5}>
                                        {departments.map(dept => (
                                            <SelectItem key={dept.id} value={dept.id}>{dept.department_name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="w-24">
                                <Label className="text-xs text-slate-600">%</Label>
                                <Input
                                    type="number" placeholder="0" min="0" max="100"
                                    value={alloc.allocation_percent || ''}
                                    onChange={(e) => onUpdate(allocIdx, 'allocation_percent', parseFloat(e.target.value) || 0)}
                                    className="h-8"
                                />
                            </div>
                            <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0" onClick={() => onRemove(allocIdx)}>
                                <Trash2 className="w-3 h-3 text-red-500" />
                            </Button>
                        </div>
                    ))
                )}
            </div>

            {/* Add Button - Always Visible */}
            <Button size="sm" variant="outline" onClick={onAdd} className="w-full gap-2">
                <Plus className="w-3 h-3" />
                Προσθήκη Τμήματος
            </Button>

            {/* Validation Status - Only shown when allocations exist */}
            {(allocations || []).length > 0 && (
                <div className={`p-2 rounded flex items-center gap-2 text-xs font-medium ${isValid ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {isValid ? (
                        <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Κατανομή: {totalAlloc.toFixed(1)}% ✓</span>
                        </>
                    ) : (
                        <>
                            <AlertCircle className="w-4 h-4" />
                            <span>Κατανομή: {totalAlloc.toFixed(1)}% (χρειάζεται 100%)</span>
                        </>
                    )}
                </div>
            )}

            {/* Amount Split Preview */}
            {totalAlloc > 0 && totalAmount != null && (
                <div className="text-xs bg-blue-50 p-2 rounded border border-blue-200 space-y-1">
                    <div className="font-semibold text-blue-900">Κατανομή ποσού:</div>
                    {(allocations || []).map((alloc, allocIdx) => {
                        const dept = departments.find(d => d.id === alloc.department_id);
                        const deptName = dept ? dept.department_name : '(χωρίς επιλογή)';
                        const allocAmount = (parseFloat(totalAmount) || 0) * (parseFloat(alloc.allocation_percent) || 0) / 100;
                        return (
                            <div key={allocIdx} className="flex justify-between text-blue-700">
                                <span>{deptName}:</span>
                                <span className="font-medium">{formatCurrency(allocAmount)}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}