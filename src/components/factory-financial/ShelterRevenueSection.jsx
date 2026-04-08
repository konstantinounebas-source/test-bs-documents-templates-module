import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, Plus, Trash2 } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function ShelterRevenueSection({
    shelterRevenueItems,
    shelterInstances,
    formatCurrency,
    getVariationsTotal,
    getShelterRevenueTotal,
    calculateTotalIncome,
    onAddItem,
    onRemoveItem,
    onUpdateItem,
    onUpdateVariation,
    onRemoveVariation,
    onAddVariation
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    SECTION A — Έσοδα
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">Έσοδα ανά Τύπο Στάσης</h3>
                    <Button size="sm" variant="outline" onClick={onAddItem}>
                        <Plus className="w-4 h-4 mr-1" />
                        Προσθήκη
                    </Button>
                </div>

                <div className="space-y-4">
                    {shelterRevenueItems.map((item, itemIdx) => (
                        <div key={itemIdx} className="p-4 border border-slate-200 rounded-lg space-y-3">
                            <div className="flex items-end gap-2">
                                <div className="flex-1">
                                    <Label className="text-xs">Τύπος Στάσης</Label>
                                    <select
                                        value={String(item.shelter_instance_id || '')}
                                        onChange={(e) => {
                                              const value = e.target.value;
                                              onUpdateItem(itemIdx, 'shelter_instance_id', value || '');
                                          }}
                                        className="w-full h-9 px-3 py-1 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                                    >
                                        <option value="">— Επιλέξτε τύπο —</option>
                                        {(shelterInstances || []).map(instance => (
                                              <option key={instance.id} value={String(instance.id)}>
                                                  {instance.name || instance.id}
                                              </option>
                                          ))}
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <Label className="text-xs">Περιγραφή</Label>
                                    <Input
                                        placeholder="Περιγραφή"
                                        value={item.description}
                                        onChange={(e) => onUpdateItem(itemIdx, 'description', e.target.value)}
                                    />
                                </div>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => onRemoveItem(itemIdx)}
                                >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs">Ποσό Σύμβασης</Label>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        value={item.contract_amount}
                                        onChange={(e) => onUpdateItem(itemIdx, 'contract_amount', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Ποσό από JV</Label>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        value={item.amount_from_jv}
                                        onChange={(e) => onUpdateItem(itemIdx, 'amount_from_jv', e.target.value)}
                                    />
                                </div>
                            </div>

                            <VariationSubsection
                                title="Εγκεκριμένες Παραλλαγές"
                                variations={item.approved_variations}
                                itemIdx={itemIdx}
                                variationType="approved_variations"
                                formatCurrency={formatCurrency}
                                onAddVariation={onAddVariation}
                                onUpdateVariation={onUpdateVariation}
                                onRemoveVariation={onRemoveVariation}
                            />

                            <VariationSubsection
                                title="Δυνητικές Παραλλαγές"
                                variations={item.potential_variations}
                                itemIdx={itemIdx}
                                variationType="potential_variations"
                                formatCurrency={formatCurrency}
                                onAddVariation={onAddVariation}
                                onUpdateVariation={onUpdateVariation}
                                onRemoveVariation={onRemoveVariation}
                            />

                            <div className="pt-2 border-t border-slate-200 grid grid-cols-3 gap-4 text-sm">
                                <div className="bg-blue-50 p-2 rounded">
                                    <Label className="text-xs font-semibold">Σύνολο Εγκ. Παραλλαγών</Label>
                                    <p className="text-lg font-bold text-blue-700">{formatCurrency(getVariationsTotal(item.approved_variations))}</p>
                                </div>
                                <div className="bg-orange-50 p-2 rounded">
                                    <Label className="text-xs font-semibold">Σύνολο Δυν. Παραλλαγών</Label>
                                    <p className="text-lg font-bold text-orange-700">{formatCurrency(getVariationsTotal(item.potential_variations))}</p>
                                </div>
                                <div className="bg-green-50 p-2 rounded">
                                    <Label className="text-xs font-semibold">Σύνολο Στάσης</Label>
                                    <p className="text-lg font-bold text-green-700">{formatCurrency(getShelterRevenueTotal(item))}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

function VariationSubsection({ title, variations, itemIdx, variationType, formatCurrency, onAddVariation, onUpdateVariation, onRemoveVariation }) {
    return (
        <div className="bg-slate-50 p-3 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">{title}</Label>
                <Button size="sm" variant="outline" onClick={() => onAddVariation(itemIdx, variationType)}>
                    <Plus className="w-3 h-3 mr-1" />
                    Προσθήκη
                </Button>
            </div>
            <div className="space-y-2">
                {variations.map((variation, varIdx) => (
                    <div key={varIdx} className="flex items-end gap-2">
                        <Input
                            placeholder="Περιγραφή"
                            value={variation.description}
                            onChange={(e) => onUpdateVariation(itemIdx, variationType, varIdx, 'description', e.target.value)}
                            className="flex-1"
                        />
                        <Input
                            type="number"
                            placeholder="Ποσό"
                            value={variation.amount}
                            onChange={(e) => onUpdateVariation(itemIdx, variationType, varIdx, 'amount', e.target.value)}
                            className="w-28"
                        />
                        <Button size="icon" variant="ghost" onClick={() => onRemoveVariation(itemIdx, variationType, varIdx)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}