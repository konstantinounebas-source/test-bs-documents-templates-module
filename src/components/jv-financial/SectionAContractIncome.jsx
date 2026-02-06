import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

export default function SectionAContractIncome({ shelterTypeId, onTotalsChange }) {
    const [contractAmount, setContractAmount] = useState('');
    const [approvedVariations, setApprovedVariations] = useState([]);
    const [potentialVariations, setPotentialVariations] = useState([]);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editAmount, setEditAmount] = useState('');

    const addApprovedVariation = () => {
        setApprovedVariations([...approvedVariations, { id: Date.now(), description: '', amount: '' }]);
    };

    const removeApprovedVariation = (id) => {
        setApprovedVariations(approvedVariations.filter(v => v.id !== id));
    };

    const updateApprovedVariation = (id, field, value) => {
        setApprovedVariations(approvedVariations.map(v =>
            v.id === id ? { ...v, [field]: value } : v
        ));
    };

    const addPotentialVariation = () => {
        setPotentialVariations([...potentialVariations, { id: Date.now(), description: '', amount: '' }]);
    };

    const removePotentialVariation = (id) => {
        setPotentialVariations(potentialVariations.filter(v => v.id !== id));
    };

    const updatePotentialVariation = (id, field, value) => {
        setPotentialVariations(potentialVariations.map(v =>
            v.id === id ? { ...v, [field]: value } : v
        ));
    };

    const totalApprovedVariations = approvedVariations.reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0);
    const totalPotentialVariations = potentialVariations.reduce((sum, v) => sum + (parseFloat(v.amount) || 0), 0);
    const totalContractIncome = (parseFloat(contractAmount) || 0) + totalApprovedVariations + totalPotentialVariations;

    useEffect(() => {
        if (onTotalsChange) {
            onTotalsChange({ contractIncome: totalContractIncome });
        }
    }, [totalContractIncome, onTotalsChange]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>SECTION A — Contract & Income</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
                {/* Contract Amount */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Contract Amount</label>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-sm font-medium text-slate-900">
                            €{parseFloat(contractAmount || 0).toFixed(2)}
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                setEditAmount(contractAmount);
                                setShowEditDialog(true);
                            }}
                            className="flex items-center gap-1"
                        >
                            <Edit2 className="w-4 h-4" />
                            Edit
                        </Button>
                    </div>
                </div>

                {/* Approved Variations */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <label className="block text-sm font-medium text-slate-700">Approved Variations</label>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={addApprovedVariation}
                            className="flex items-center gap-1"
                        >
                            <Plus className="w-4 h-4" />
                            Add
                        </Button>
                    </div>
                    <div className="space-y-3">
                        {approvedVariations.map((variation) => (
                            <div key={variation.id} className="flex gap-3 items-end">
                                <div className="flex-1">
                                    <Input
                                        placeholder="Description"
                                        value={variation.description}
                                        onChange={(e) => updateApprovedVariation(variation.id, 'description', e.target.value)}
                                    />
                                </div>
                                <div className="w-32">
                                    <Input
                                        type="number"
                                        placeholder="Amount"
                                        value={variation.amount}
                                        onChange={(e) => updateApprovedVariation(variation.id, 'amount', e.target.value)}
                                    />
                                </div>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => removeApprovedVariation(variation.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                        {approvedVariations.length > 0 && (
                            <div className="text-right text-sm font-medium text-slate-700 pt-2">
                                Subtotal: €{totalApprovedVariations.toFixed(2)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Potential Variations */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <label className="block text-sm font-medium text-slate-700">Potential Variations</label>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={addPotentialVariation}
                            className="flex items-center gap-1"
                        >
                            <Plus className="w-4 h-4" />
                            Add
                        </Button>
                    </div>
                    <div className="space-y-3">
                        {potentialVariations.map((variation) => (
                            <div key={variation.id} className="flex gap-3 items-end">
                                <div className="flex-1">
                                    <Input
                                        placeholder="Description"
                                        value={variation.description}
                                        onChange={(e) => updatePotentialVariation(variation.id, 'description', e.target.value)}
                                    />
                                </div>
                                <div className="w-32">
                                    <Input
                                        type="number"
                                        placeholder="Amount"
                                        value={variation.amount}
                                        onChange={(e) => updatePotentialVariation(variation.id, 'amount', e.target.value)}
                                    />
                                </div>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => removePotentialVariation(variation.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                        {potentialVariations.length > 0 && (
                            <div className="text-right text-sm font-medium text-slate-700 pt-2">
                                Subtotal: €{totalPotentialVariations.toFixed(2)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Total Contract Income */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold text-slate-900">Total Contract Income</span>
                        <span className="text-2xl font-bold text-blue-600">€{totalContractIncome.toFixed(2)}</span>
                    </div>
                </div>
                </CardContent>
                </Card>

                {/* Edit Contract Amount Dialog */}
                <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Contract Amount</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Amount</label>
                        <Input
                            type="number"
                            placeholder="0.00"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="w-full"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={() => {
                            setContractAmount(editAmount);
                            setShowEditDialog(false);
                        }}
                    >
                        Save
                    </Button>
                </DialogFooter>
                </DialogContent>
                </Dialog>
                );
                }