import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Plus, Trash2, Lock, AlertCircle } from 'lucide-react';
import DeptAllocationRows from './DeptAllocationRows';

/**
 * Reusable Expense Table Section Component
 * Displays a table of expense items (Fixed, Operational, etc.)
 * with frequency selector, amount input, and calculated daily amounts
 */
export default function ExpenseTableSection({
    title,                      // e.g. "Σταθερά Κόστη (Fixed Costs)"
    sectionKey,                // e.g. "fixedCosts"
    expenseItems,              // Array of expense rows
    departments,               // Array of department objects
    expandedSections,          // State of collapsible sections
    totalWorkingDays,          // Days in period
    formatCurrency,            // Currency formatter function
    convertCostToDaily,        // Function to convert amount to daily
    calculateCostTotal,        // Function to calculate section total
    onToggleSection,           // Handler for collapsible toggle
    onAddItem,                 // Handler to add new row
    onRemoveItem,              // Handler to remove row
    onUpdateItem,              // Handler to update row field
    onAddDeptAlloc,            // Handler to add dept allocation
    onUpdateDeptAlloc,         // Handler to update dept allocation
    onRemoveDeptAlloc,         // Handler to remove dept allocation
    hideAddButton = false,     // Option to hide "Add" button (for predefined rows)
}) {
    const [expandedItems, setExpandedItems] = useState({});

    // Calculate total daily cost for all items
    const totalDailyCost = expenseItems.reduce((sum, item) => {
        const dailyAmount = convertCostToDaily(item.amount, item.frequency_type, 22, 260, totalWorkingDays, item.conversion_factor);
        return sum + dailyAmount;
    }, 0);
    return (
        <Collapsible open={expandedSections[sectionKey]} onOpenChange={() => onToggleSection(sectionKey)}>
            <Card className="border border-slate-200 bg-white">
                <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {expandedSections[sectionKey] ? (
                                    <ChevronDown className="w-5 h-5" />
                                ) : (
                                    <ChevronRight className="w-5 h-5" />
                                )}
                                <CardTitle>{title}</CardTitle>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-sm text-slate-600 font-medium">
                                    Σύνολο ανά ημέρα: {formatCurrency(totalDailyCost)}
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <CardContent className="p-0">
                         {/* Table Section */}
                         <div className="border-t border-slate-200">
                             {/* Table Body */}
                             <div className="divide-y divide-slate-200">
                                 {expenseItems.map((item, idx) => {
                                      const dailyAmount = convertCostToDaily(item.amount, item.frequency_type, 22, 260, totalWorkingDays, item.conversion_factor);
                                      const periodTotal = dailyAmount * totalWorkingDays;
                                      const isExpanded = expandedItems[idx] || false;

                                     return (
                                         <div key={idx}>
                                              {/* Collapsed Header Row */}
                                              <div 
                                                  onClick={() => setExpandedItems(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                                  className="grid grid-cols-5 gap-3 p-3 items-center bg-white hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100"
                                              >
                                                  <div className="flex items-center gap-2">
                                                      {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                                      <span className="font-medium text-slate-900">{item.description || 'Νέα σειρά'}</span>
                                                  </div>
                                                  <div className="text-right">
                                                      <div className="font-medium text-slate-900">{formatCurrency(item.amount)}</div>
                                                      <div className="text-xs text-slate-500">{item.frequency_type === 'monthly' ? 'Μηνιαίο' : item.frequency_type === 'yearly' ? 'Ετήσιο' : 'Ημερήσιο'}</div>
                                                  </div>
                                                  <div className="text-right">
                                                      <div className="text-xs text-slate-500">Factor</div>
                                                      <div className="font-medium text-slate-900">{item.conversion_factor || '-'}</div>
                                                  </div>
                                                  <div className="text-right bg-blue-50 p-2 rounded border border-blue-200">
                                                      <div className="text-xs text-slate-500">Ημερήσιο</div>
                                                      <div className="font-medium text-slate-900">{formatCurrency(dailyAmount)}</div>
                                                  </div>
                                                  <div className="flex justify-end gap-1">
                                                     <Button
                                                         size="icon"
                                                         variant="ghost"
                                                         className="h-8 w-8"
                                                         onClick={(e) => { e.stopPropagation(); onAddDeptAlloc(idx); }}
                                                         title="Προσθήκη κατανομής τμήματος"
                                                     >
                                                         <Plus className="w-4 h-4 text-slate-400" />
                                                     </Button>
                                                     <Button
                                                         size="icon"
                                                         variant="ghost"
                                                         className="h-8 w-8"
                                                         onClick={(e) => { e.stopPropagation(); onRemoveItem(idx); }}
                                                         title="Διαγραφή σειράς"
                                                     >
                                                         <Trash2 className="w-4 h-4 text-red-500" />
                                                     </Button>
                                                 </div>
                                             </div>

                                             {/* Expanded Details */}
                                             {isExpanded && (
                                                 <div className="bg-slate-50 p-4 border-t border-slate-200 space-y-3">
                                                     <div className="grid grid-cols-2 gap-4">
                                                         <div>
                                                             <label className="text-xs font-semibold text-slate-700 block mb-1">Περιγραφή</label>
                                                             <Input
                                                                 placeholder="π.χ. Ενοίκιο"
                                                                 value={item.description}
                                                                 onChange={(e) => onUpdateItem(idx, 'description', e.target.value)}
                                                                 disabled={item.is_locked_description}
                                                                 className="h-8 text-sm"
                                                             />
                                                         </div>
                                                         <div>
                                                             <label className="text-xs font-semibold text-slate-700 block mb-1">Ποσό</label>
                                                             <Input
                                                                 type="number"
                                                                 placeholder="0.00"
                                                                 value={item.amount || ''}
                                                                 onChange={(e) => onUpdateItem(idx, 'amount', parseFloat(e.target.value) || 0)}
                                                                 className="h-8 text-sm"
                                                             />
                                                         </div>
                                                         <div>
                                                             <label className="text-xs font-semibold text-slate-700 block mb-1">Συχνότητα</label>
                                                             <Select
                                                                 value={item.frequency_type}
                                                                 onValueChange={(value) => onUpdateItem(idx, 'frequency_type', value)}
                                                             >
                                                                 <SelectTrigger className="h-8 text-sm">
                                                                     <SelectValue />
                                                                 </SelectTrigger>
                                                                 <SelectContent>
                                                                     <SelectItem value="daily">Ημερήσιο</SelectItem>
                                                                     <SelectItem value="monthly">Μηνιαίο</SelectItem>
                                                                     <SelectItem value="yearly">Ετήσιο</SelectItem>
                                                                 </SelectContent>
                                                             </Select>
                                                         </div>
                                                         <div>
                                                             <label className="text-xs font-semibold text-slate-700 block mb-1">Factor Μετατροπής</label>
                                                             <Input
                                                                     type="number"
                                                                     placeholder="22"
                                                                     value={item.conversion_factor || ''}
                                                                     onChange={(e) => {
                                                                       const val = e.target.value;
                                                                       onUpdateItem(idx, 'conversion_factor', val ? parseFloat(val) : null);
                                                                     }}
                                                                     className="h-8 text-sm"
                                                                 />
                                                         </div>
                                                     </div>
                                                     <div>
                                                         <label className="text-xs font-semibold text-slate-700 block mb-1">Σχόλια</label>
                                                         <Input
                                                             placeholder="π.χ. Κατά έξη μηνών"
                                                             value={item.notes || ''}
                                                             onChange={(e) => onUpdateItem(idx, 'notes', e.target.value)}
                                                             className="h-8 text-sm"
                                                         />
                                                     </div>
                                                 </div>
                                             )}

                                             {/* Department Allocations Row */}
                                             {item.department_allocations && item.department_allocations.length > 0 && (
                                                 <div className="bg-slate-50 px-3 py-3 border-t border-slate-200">
                                                     <div className="text-xs font-semibold text-slate-700 mb-3">Κατανομή ανά Τμήμα</div>
                                                     <DeptAllocationRows
                                                         allocations={item.department_allocations}
                                                         departments={departments}
                                                         totalAmount={periodTotal}
                                                         formatCurrency={formatCurrency}
                                                         onAdd={() => onAddDeptAlloc(idx)}
                                                         onUpdate={(allocIdx, field, value) => onUpdateDeptAlloc(idx, allocIdx, field, value)}
                                                         onRemove={(allocIdx) => onRemoveDeptAlloc(idx, allocIdx)}
                                                     />
                                                 </div>
                                             )}

                                             {/* No Allocations Prompt */}
                                             {(!item.department_allocations || item.department_allocations.length === 0) && item.amount > 0 && (
                                                 <div className="bg-amber-50 px-3 py-2 border-t border-amber-200 flex items-center gap-2">
                                                     <AlertCircle className="w-4 h-4 text-amber-600" />
                                                     <span className="text-xs text-amber-700">Χωρίς κατανομή τμήματος</span>
                                                 </div>
                                             )}
                                         </div>
                                     );
                                 })}
                             </div>

                            {/* Add Row Button */}
                            {!hideAddButton && (
                                <div className="bg-slate-50 p-3 border-t border-slate-200">
                                    <Button
                                        onClick={onAddItem}
                                        variant="outline"
                                        size="sm"
                                        className="w-full flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Προσθήκη Κόστους
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    );
}