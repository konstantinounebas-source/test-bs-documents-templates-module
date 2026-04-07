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

export default function BomCostSection({
    bomCosts,
    busStopTypes,
    expandedSections,
    formatCurrency,
    calculateBomTotal,
    onToggleSection,
    onAddItem,
    onRemoveItem,
    onUpdateItem,
    onBusStopTypeChange
}) {
    return (
        <Collapsible open={expandedSections.bom} onOpenChange={() => onToggleSection('bom')}>
            <div>
                <div className="flex items-center justify-between mb-3">
                    <CollapsibleTrigger asChild>
                        <div className="flex items-center gap-2 cursor-pointer hover:text-blue-700 transition-colors">
                            {expandedSections.bom ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <Label className="text-base font-semibold cursor-pointer">Κόστος Υλικών (Bill of Materials) - από Warehouse</Label>
                        </div>
                    </CollapsibleTrigger>
                    <Button size="sm" variant="outline" onClick={onAddItem}>
                        <Plus className="w-4 h-4 mr-1" />
                        Προσθήκη
                    </Button>
                </div>
                <CollapsibleContent>
                    <div className="space-y-2">
                        {bomCosts.map((item, idx) => (
                            <div key={idx} className="p-3 bg-slate-50 rounded-lg space-y-2">
                                <div className="flex items-center gap-2">
                                    <Select
                                        value={item.bus_stop_type_id}
                                        onValueChange={(value) => onBusStopTypeChange(idx, value)}
                                    >
                                        <SelectTrigger className="w-64">
                                            <SelectValue placeholder="Επιλέξτε Τύπο Στάσης" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {busStopTypes.map(type => (
                                                <SelectItem key={type.id} value={type.id}>
                                                    {type.type_code} - {type.type_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        placeholder="Product ID"
                                        value={item.product_identifier}
                                        disabled
                                        className="w-32"
                                    />
                                    <Input
                                        placeholder="Περιγραφή"
                                        value={item.description}
                                        onChange={(e) => onUpdateItem(idx, 'description', e.target.value)}
                                        className="flex-1"
                                    />
                                    <Input
                                        type="number"
                                        placeholder="Ποσότητα"
                                        value={item.quantity}
                                        onChange={(e) => onUpdateItem(idx, 'quantity', e.target.value)}
                                        className="w-24"
                                    />
                                    <Input
                                        type="number"
                                        placeholder="Κόστος BOM"
                                        value={item.calculated_bom_cost}
                                        className="w-32 bg-blue-50"
                                        disabled
                                    />
                                    <Button size="icon" variant="ghost" onClick={() => onRemoveItem(idx)}>
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                </div>
                                <div className="text-xs text-slate-600 bg-blue-50 p-2 rounded">
                                    <strong>Υπολογισμός:</strong> {formatCurrency(item.calculated_bom_cost)} × {item.quantity} τεμάχια = {formatCurrency((parseFloat(item.calculated_bom_cost) || 0) * (parseFloat(item.quantity) || 1))}
                                </div>
                            </div>
                        ))}
                    </div>
                </CollapsibleContent>
                <div className="mt-2 text-sm font-medium text-slate-700">
                    Σύνολο Υλικών: {formatCurrency(calculateBomTotal())}
                </div>
            </div>
        </Collapsible>
    );
}