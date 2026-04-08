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
import DepreciationInvestmentsSection from './DepreciationInvestmentsSection';

export default function DepreciationModuleSection({
    depreciationInvestments,
    estimatedRevenues,
    additionalRevenues,
    departments,
    busStopTypes,
    shelterInstances,
    shelterRevenueItems,
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
                <DepreciationInvestmentsSection
                    depreciationInvestments={depreciationInvestments}
                    departments={departments}
                    formatCurrency={formatCurrency}
                    getAllocationTotal={getAllocationTotal}
                    getDeptName={getDeptName}
                    calculateDepreciationInvestmentsTotal={calculateDepreciationInvestmentsTotal}
                    onAddItem={onAddDeprecInv}
                    onRemoveItem={onRemoveDeprecInv}
                    onUpdateItem={onUpdateDeprecInv}
                    onAddDeptAlloc={onAddDeptAllocDepr}
                    onRemoveDeptAlloc={onRemoveDeptAllocDepr}
                    onUpdateDeptAlloc={onUpdateDeptAllocDepr}
                />

                {/* B. Estimated Revenues */}
                <EstRevenuesSubsection
                    estimatedRevenues={estimatedRevenues}
                    shelterInstances={shelterInstances}
                    shelterRevenueItems={shelterRevenueItems}
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

function EstRevenuesSubsection({
    estimatedRevenues,
    shelterInstances,
    shelterRevenueItems,
    formatCurrency,
    calculateEstimatedRevenuesTotal,
    onAdd,
    onRemove,
    onUpdate
}) {
    const getShelterRevenueValue = (shelterId) => {
        const shelter = shelterRevenueItems.find(item => item.shelter_instance_id === shelterId);
        if (shelter) {
            // Calculate total revenue per unit
            const baseAmount = parseFloat(shelter.contract_amount) || 0;
            const approviedVariations = shelter.approved_variations || [];
            const approviedTotal = approviedVariations.reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0);
            return baseAmount + approviedTotal;
        }
        return 0;
    };

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
                                <Label className="text-xs">Shelter Instance</Label>
                                <select
                                    value={item.shelter_instance_id || ''}
                                    onChange={(e) => onUpdate(idx, 'shelter_instance_id', e.target.value)}
                                    className="w-full h-9 px-3 py-1 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                                    disabled={!!item.shelter_instance_id}
                                >
                                    <option value="">— Επιλέξτε Shelter —</option>
                                    {(shelterInstances || []).map(shelter => (
                                        <option key={shelter.id} value={String(shelter.id)}>
                                            {shelter.name || shelter.id}
                                        </option>
                                    ))}
                                </select>
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
                                <Label className="text-xs">Ποσό Ανά Μονάδα (Σύμβασης)</Label>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={item.unit_revenue}
                                    disabled
                                    className="bg-slate-100"
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