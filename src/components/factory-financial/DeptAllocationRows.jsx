import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from 'lucide-react';

export default function DeptAllocationRows({ allocations, departments, onAdd, onUpdate, onRemove, totalAmount, formatCurrency }) {
    const totalAlloc = (allocations || []).reduce((sum, a) => sum + (parseFloat(a.allocation_percent) || 0), 0);

    return (
        <div className="border-t pt-3 space-y-2">
            <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Department Allocations</Label>
                <Button size="sm" variant="outline" onClick={onAdd}>
                    <Plus className="w-3 h-3 mr-1" />
                    Add Department
                </Button>
            </div>
            {(allocations || []).map((alloc, allocIdx) => (
                <div key={allocIdx} className="flex items-end gap-2 bg-white p-2 rounded border border-slate-200">
                    <div className="flex-1">
                        <Label className="text-xs">Τμήμα</Label>
                        <Select value={alloc.department_id} onValueChange={(value) => onUpdate(allocIdx, 'department_id', value)}>
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
                            type="number" placeholder="0" min="0" max="100"
                            value={alloc.allocation_percent}
                            onChange={(e) => onUpdate(allocIdx, 'allocation_percent', e.target.value)}
                            className="h-8"
                        />
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onRemove(allocIdx)}>
                        <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                </div>
            ))}
            <div className={`p-2 rounded text-xs font-semibold ${totalAlloc === 100 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                Total Allocation: {totalAlloc.toFixed(1)}% {totalAlloc === 100 ? '✓' : '(must equal 100%)'}
            </div>
            {totalAlloc > 0 && totalAmount != null && (
                <div className="text-xs text-slate-600 bg-blue-50 p-2 rounded space-y-1">
                    <strong>Allocated amount split:</strong>
                    {(allocations || []).map((alloc, allocIdx) => {
                        const dept = departments.find(d => d.id === alloc.department_id);
                        const deptName = dept ? dept.department_name : alloc.department_id;
                        const allocAmount = (parseFloat(totalAmount) || 0) * (parseFloat(alloc.allocation_percent) || 0) / 100;
                        return <div key={allocIdx}>{deptName}: {formatCurrency(allocAmount)}</div>;
                    })}
                </div>
            )}
        </div>
    );
}