import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import {
  getActiveSupervisors,
  getPersonById,
  calculatePersonnelDailyCost,
  calculateSupervisorAllocatedDailyCost,
  calculateTotalSupervisorDailyCost,
  createNewSupervisorAllocation,
} from '../utils/labourModuleCalculations';

export default function SupervisorDailyCostSection({ 
  supervisorAllocations, 
  labourPersonnel, 
  formatCurrency, 
  onUpdate 
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const activeSupervisors = getActiveSupervisors(labourPersonnel);

  useEffect(() => {
    setIsExpanded(supervisorAllocations && supervisorAllocations.length > 0);
  }, [supervisorAllocations]);
  
  const handleAdd = () => {
    const newAlloc = createNewSupervisorAllocation();
    console.log('🐒 Adding new supervisor allocation:', newAlloc);
    onUpdate([newAlloc, ...supervisorAllocations]);
  };

  const handleChange = (idx, field, value) => {
    const updated = [...supervisorAllocations];
    updated[idx] = { ...updated[idx], [field]: value };
    console.log('🚵 Updated supervisor allocation row', idx, ':', updated[idx]);
    onUpdate(updated);
  };

  const handleRemove = (idx) => {
    onUpdate(supervisorAllocations.filter((_, i) => i !== idx));
  };

  const totalDailyCost = calculateTotalSupervisorDailyCost(supervisorAllocations, labourPersonnel);

  return (
    <Card>
      <CardHeader className="pb-3 cursor-pointer hover:bg-slate-50" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <CardTitle className="text-base font-semibold text-slate-800">
              Β. Ημερήσιο Κόστος Επιστάρχη ({supervisorAllocations.length})
            </CardTitle>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={(e) => {
              e.stopPropagation();
              handleAdd();
            }} 
            className="gap-1 text-xs"
          >
            <Plus className="w-3 h-3" />
            Προσθήκη Κατανομής
          </Button>
        </div>
        {isExpanded && <p className="text-xs text-slate-500 mt-1">
          Επιλέξτε επιστάρχες και ορίστε τον παράγοντα κατανομής τους.
        </p>}
      </CardHeader>
      {isExpanded && <CardContent className="space-y-3">
        {supervisorAllocations.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            Δεν υπάρχουν κατανομές. Πατήστε "Προσθήκη Κατανομής" για να ξεκινήσετε.
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {supervisorAllocations.map((row, idx) => {
                const person = getPersonById(labourPersonnel, row.personnel_id);
                const dailyCost = person ? calculatePersonnelDailyCost(person) : 0;
                const allocatedCost = calculateSupervisorAllocatedDailyCost(row, labourPersonnel);
                
                return (
                  <div key={idx} className="border border-slate-200 rounded-lg p-3 bg-white hover:border-slate-300 transition-colors">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
                      <div className="col-span-1">
                        <Label className="text-xs text-slate-600">Επιστάρχης</Label>
                        <Select value={row.personnel_id || ''} onValueChange={v => handleChange(idx, 'personnel_id', v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Επιλογή..." />
                          </SelectTrigger>
                          <SelectContent>
                            {activeSupervisors.map(sup => (
                              <SelectItem key={sup.id} value={sup.id}>
                                {sup.person_name || '(χωρίς όνομα)'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-1">
                        <Label className="text-xs text-slate-600">Θέση</Label>
                        <div className="h-8 flex items-center px-3 bg-slate-50 rounded-md text-xs text-slate-700 border border-slate-200">
                          {person?.position || '—'}
                        </div>
                      </div>
                      <div className="col-span-1">
                        <Label className="text-xs text-slate-600">Ημερήσιο</Label>
                        <div className="h-8 flex items-center px-3 bg-blue-50 rounded-md text-xs font-semibold text-blue-700 border border-blue-200">
                          {formatCurrency(dailyCost)}
                        </div>
                      </div>
                      <div className="col-span-1">
                        <Label className="text-xs text-slate-600">Παράγοντας</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={row.allocation_factor || ''}
                          onChange={e => handleChange(idx, 'allocation_factor', parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm"
                          placeholder="1"
                        />
                      </div>
                      <div className="col-span-1">
                        <Label className="text-xs text-slate-600">Κατανεμημένο</Label>
                        <div className="h-8 flex items-center px-3 bg-green-50 rounded-md text-xs font-semibold text-green-700 border border-green-200">
                          {formatCurrency(allocatedCost)}
                        </div>
                      </div>
                      <div className="col-span-1 flex items-end">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleRemove(idx)}>
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 mt-2">
                      <div>
                        <Label className="text-xs text-slate-600">Σχόλια</Label>
                        <Input
                          value={row.comments || ''}
                          onChange={e => handleChange(idx, 'comments', e.target.value)}
                          placeholder="Προαιρετικά σχόλια"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-blue-900">Σύνολο Ημερήσιου Κόστους Επιστάρχη</span>
                <span className="text-lg font-bold text-blue-700">{formatCurrency(totalDailyCost)}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>}
    </Card>
  );
}