import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, Plus, Trash2 } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function DepreciationModuleSection({
    depreciationInvestments,
    estimatedRevenues,
    additionalRevenues,
    departments,
    busStopTypes,
    formatCurrency,
    getAllocationTotal,
    getDeptName,
    calculateDepreciationInvestmentsTotal,
    calculateEstimatedRevenuesTotal,
    calculateAdditionalRevenuesTotal,
    onAddDeprecInv,
    onRemoveDeprecInv,
    onUpdateDeprecInv,
    onAddDeptAllocDepr,
    onRemoveDeptAllocDepr,
    onUpdateDeptAllocDepr,
    onAddEstRevenue,
    onRemoveEstRevenue,
    onUpdateEstRevenue,
    onAddAddRevenue,
    onRemoveAddRevenue,
    onUpdateAddRevenue
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-amber-600" />
                    Depreciation Module
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* A. Investments */}
                <DeprecInvestmentsSubsection
                    depreciationInvestments={depreciationInvestments}
                    departments={departments}
                    formatCurrency={formatCurrency}
                    getAllocationTotal={getAllocationTotal}
                    getDeptName={getDeptName}
                    calculateDepreciationInvestmentsTotal={calculateDepreciationInvestmentsTotal}
                    onAdd={onAddDeprecInv}
                    onRemove={onRemoveDeprecInv}
                    onUpdate={onUpdateDeprecInv}
                    onAddDeptAlloc={onAddDeptAllocDepr}
                    onRemoveDeptAlloc={onRemoveDeptAllocDepr}
                    onUpdateDeptAlloc={onUpdateDeptAllocDepr}
                />

                {/* B. Estimated Revenues */}
                <EstRevenuesSubsection
                    estimatedRevenues={estimatedRevenues}
                    busStopTypes={busStopTypes}
                    formatCurrency={formatCurrency}
                    calculateEstimatedRevenuesTotal={calculateEstimatedRevenuesTotal}
                    onAdd={onAddEstRevenue}
                    onRemove={onRemoveEstRevenue}
                    onUpdate={onUpdateEstRevenue}
                />

                {/* C. Additional Revenues */}
                <AddRevenuesSubsection
                    additionalRevenues={additionalRevenues}
                    formatCurrency={formatCurrency}
                    calculateAdditionalRevenuesTotal={calculateAdditionalRevenuesTotal}
                    onAdd={onAddAddRevenue}
                    onRemove={onRemoveAddRevenue}
                    onUpdate={onUpdateAddRevenue}
                />
            </CardContent>
        </Card>
    );
}

function DeprecInvestmentsSubsection({
    depreciationInvestments,
    departments,
    formatCurrency,
    getAllocationTotal,
    getDeptName,
    calculateDepreciationInvestmentsTotal,
    onAdd,
    onRemove,
    onUpdate,
    onAddDeptAlloc,
    onRemoveDeptAlloc,
    onUpdateDeptAlloc
}) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">A. Investments</h3>
                <Button size="sm" variant="outline" onClick={onAdd}>
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
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs">Περιγραφή</Label>
                                    <Input
                                        placeholder="Περιγραφή επένδυσης"
                                        value={item.description}
                                        onChange={(e) => onUpdate(idx, 'description', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Κατηγορία</Label>
                                    <Select value={item.category} onValueChange={(value) => onUpdate(idx, 'category', value)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="materials">Materials</SelectItem>
                                            <SelectItem value="labor">Labor</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs">Συνολικό Ποσό</Label>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={item.total_amount}
                                    onChange={(e) => onUpdate(idx, 'total_amount', e.target.value)}
                                />
                            </div>
                            <div className="border-t pt-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-semibold">Department Allocations</Label>
                                    <Button size="sm" variant="outline" onClick={() => onAddDeptAlloc(idx)}>
                                        <Plus className="w-3 h-3 mr-1" />
                                        Add Department
                                    </Button>
                                </div>
                                {(item.department_allocations || []).map((alloc, allocIdx) => (
                                    <div key={allocIdx} className="flex items-end gap-2 bg-white p-2 rounded border border-slate-200">
                                        <div className="flex-1">
                                            <Label className="text-xs">Τμήμα</Label>
                                            <Select value={alloc.department_id} onValueChange={(value) => onUpdateDeptAlloc(idx, allocIdx, 'department_id', value)}>
                                                <SelectTrigger className="h-8"><SelectValue placeholder="Επιλέξτε τμήμα" /></SelectTrigger>
                                                <SelectContent position="popper" sideOffset={5}>{departments.map(dept => (<SelectItem key={dept.id} value={dept.id}>{dept.department_name}</SelectItem>))}</SelectContent>
                                            </Select>
                                        </div>
                                        <div className="w-24">
                                            <Label className="text-xs">Allocation %</Label>
                                            <Input
                                                type="number"
                                                placeholder="0"
                                                min="0"
                                                max="100"
                                                value={alloc.allocation_percent}
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
                                ))}
                            </div>
                            <div className={`p-2 rounded text-xs font-semibold ${totalAlloc === 100 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                Total Allocation: {totalAlloc.toFixed(1)}% {totalAlloc === 100 ? '✓' : '(must equal 100%)'}
                            </div>
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
                            <div className="flex justify-end">
                                <Button size="icon" variant="ghost" onClick={() => onRemove(idx)}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="pt-2 text-sm font-medium text-slate-700">
                Σύνολο Επενδύσεων: {formatCurrency(calculateDepreciationInvestmentsTotal())}
            </div>
        </div>
    );
}

function EstRevenuesSubsection({
    estimatedRevenues,
    busStopTypes,
    formatCurrency,
    calculateEstimatedRevenuesTotal,
    onAdd,
    onRemove,
    onUpdate
}) {
    return (
        <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">B. Estimated Revenues</h3>
                <Button size="sm" variant="outline" onClick={onAdd}>
                    <Plus className="w-4 h-4 mr-1" />
                    Προσθήκη Εκτιμώμενου Εσόδου
                </Button>
            </div>
            <div className="space-y-3">
                {estimatedRevenues.map((item, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-lg space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs">Τύπος Στάσης</Label>
                                <Select value={item.bus_stop_type_id} onValueChange={(value) => onUpdate(idx, 'bus_stop_type_id', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Επιλέξτε τύπο" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {busStopTypes.map(type => (
                                            <SelectItem key={type.id} value={type.id}>
                                                {type.type_code} - {type.type_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs">Περιγραφή</Label>
                                <Input
                                    placeholder="Περιγραφή"
                                    value={item.description}
                                    onChange={(e) => onUpdate(idx, 'description', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <Label className="text-xs">Εκκρεμής Ποσότητα</Label>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={item.pending_quantity}
                                    onChange={(e) => onUpdate(idx, 'pending_quantity', e.target.value)}
                                />
                            </div>
                            <div>
                                <Label className="text-xs">Ποσό Ανά Μονάδα</Label>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={item.unit_revenue}
                                    onChange={(e) => onUpdate(idx, 'unit_revenue', e.target.value)}
                                />
                            </div>
                            <div>
                                <Label className="text-xs">Συνολικό Έσοδο</Label>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={item.total_revenue}
                                    disabled
                                    className="bg-blue-50"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button size="icon" variant="ghost" onClick={() => onRemove(idx)}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="pt-2 text-sm font-medium text-slate-700">
                Σύνολο Εκτιμώμενων Εσόδων: {formatCurrency(calculateEstimatedRevenuesTotal())}
            </div>
        </div>
    );
}

function AddRevenuesSubsection({
    additionalRevenues,
    formatCurrency,
    calculateAdditionalRevenuesTotal,
    onAdd,
    onRemove,
    onUpdate
}) {
    return (
        <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">C. Additional Revenues</h3>
                <Button size="sm" variant="outline" onClick={onAdd}>
                    <Plus className="w-4 h-4 mr-1" />
                    Προσθήκη Πρόσθετου Εσόδου
                </Button>
            </div>
            <div className="space-y-3">
                {additionalRevenues.map((item, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-lg space-y-3">
                        <div className="flex items-end gap-2">
                            <div className="flex-1">
                                <Label className="text-xs">Περιγραφή</Label>
                                <Input
                                    placeholder="Περιγραφή πρόσθετου εσόδου"
                                    value={item.description}
                                    onChange={(e) => onUpdate(idx, 'description', e.target.value)}
                                />
                            </div>
                            <div className="w-32">
                                <Label className="text-xs">Ποσό</Label>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={item.total_amount}
                                    onChange={(e) => onUpdate(idx, 'total_amount', e.target.value)}
                                />
                            </div>
                            <Button size="icon" variant="ghost" onClick={() => onRemove(idx)}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="pt-2 text-sm font-medium text-slate-700">
                Σύνολο Πρόσθετων Εσόδων: {formatCurrency(calculateAdditionalRevenuesTotal())}
            </div>
        </div>
    );
}