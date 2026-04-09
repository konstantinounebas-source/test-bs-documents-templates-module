import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { calculatePersonnelDailyCost, calculatePersonnelHourlyCost, createNewPerson } from '../utils/labourModuleCalculations';
import { toast } from 'sonner';

export default function PersonnelMasterSection({ personnel, formatCurrency, onUpdate }) {
  const [isExpanded, setIsExpanded] = useState(personnel && personnel.length > 0);

  const handleAdd = () => {
    const newPerson = createNewPerson();
    const hasDuplicate = personnel.some(p => p.person_name && p.person_name === newPerson.person_name);
    if (hasDuplicate) {
      toast.error('Το όνομα υπάρχει ήδη');
      return;
    }
    onUpdate([newPerson, ...personnel]);
  };

  const handlePersonChange = (idx, field, value) => {
    const updated = [...personnel];
    updated[idx] = { ...updated[idx], [field]: value };
    
    // Check for duplicate person_name when changing name
    if (field === 'person_name') {
      const isDuplicate = updated.some((p, i) => i !== idx && p.person_name && p.person_name === value);
      if (isDuplicate) {
        toast.error('Το όνομα υπάρχει ήδη');
        return;
      }
    }
    
    // Auto-calculate daily and hourly cost when relevant fields change
    if (['employment_type', 'monthly_salary', 'daily_rate', 'day_factor', 'hour_factor'].includes(field)) {
      updated[idx].calculated_daily_cost = calculatePersonnelDailyCost(updated[idx]);
      updated[idx].calculated_hourly_cost = calculatePersonnelHourlyCost(updated[idx]);
    }
    
    onUpdate(updated);
  };

  const handleRemove = (idx) => {
    onUpdate(personnel.filter((_, i) => i !== idx));
  };

  return (
    <Card>
      <CardHeader className="pb-3 cursor-pointer hover:bg-slate-50" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <CardTitle className="text-base font-semibold text-slate-800">
              Α. Μαζί Προσωπικού ({personnel.length})
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
            Προσθήκη Ατόμου
          </Button>
        </div>
      </CardHeader>
      {isExpanded && <CardContent>
        {personnel.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            Δεν υπάρχει προσωπικό. Πατήστε "Προσθήκη Ατόμου" για να ξεκινήσετε.
          </div>
        ) : (
          <div className="space-y-3">
            {personnel.map((person, idx) => {
              const isMonthly = person.employment_type === 'monthly';
              const dailyCost = calculatePersonnelDailyCost(person);
              const hourlyCost = calculatePersonnelHourlyCost(person);
              
              return (
                <div key={idx} className="border border-slate-200 rounded-lg p-3 bg-white hover:border-slate-300 transition-colors">
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 mb-2">
                    <div className="col-span-1">
                      <Label className="text-xs text-slate-600">Όνομα</Label>
                      <Input
                        value={person.person_name || ''}
                        onChange={e => handlePersonChange(idx, 'person_name', e.target.value)}
                        placeholder="Όνομα"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs text-slate-600">Θέση</Label>
                      <Input
                        value={person.position || ''}
                        onChange={e => handlePersonChange(idx, 'position', e.target.value)}
                        placeholder="π.χ. Αρχιτέκτονας"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs text-slate-600">Ρόλος</Label>
                      <Select value={person.role_type || 'technician'} onValueChange={v => handlePersonChange(idx, 'role_type', v)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="supervisor">Επιστάρχης</SelectItem>
                          <SelectItem value="technician">Τεχνικός</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs text-slate-600">Τύπος</Label>
                      <Select value={person.employment_type || 'monthly'} onValueChange={v => handlePersonChange(idx, 'employment_type', v)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Μηνιαίος</SelectItem>
                          <SelectItem value="daily">Ημερήσιος</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {isMonthly ? (
                      <div className="col-span-1">
                        <Label className="text-xs text-slate-600">Μηνιαίος (€)</Label>
                        <Input
                          type="number"
                          value={person.monthly_salary || ''}
                          onChange={e => handlePersonChange(idx, 'monthly_salary', parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm"
                          placeholder="0"
                        />
                      </div>
                    ) : (
                      <div className="col-span-1">
                        <Label className="text-xs text-slate-600">Ημερήσιο (€)</Label>
                        <Input
                          type="number"
                          value={person.daily_rate || ''}
                          onChange={e => handlePersonChange(idx, 'daily_rate', parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm"
                          placeholder="0"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                    <div className="col-span-1">
                      <Label className="text-xs text-slate-600">Ημέρες/μήνα</Label>
                      <Input
                        type="number"
                        value={person.day_factor || ''}
                        onChange={e => handlePersonChange(idx, 'day_factor', parseFloat(e.target.value) || 22)}
                        className="h-8 text-sm"
                        placeholder="22"
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs text-slate-600">Ώρες/ημέρα</Label>
                      <Input
                        type="number"
                        value={person.hour_factor || ''}
                        onChange={e => handlePersonChange(idx, 'hour_factor', parseFloat(e.target.value) || 8)}
                        className="h-8 text-sm"
                        placeholder="8"
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs text-slate-600">Ημερήσιο</Label>
                      <div className="h-8 flex items-center px-3 bg-blue-50 rounded-md text-xs font-semibold text-blue-700 border border-blue-200">
                        {formatCurrency(dailyCost)}
                      </div>
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs text-slate-600">Ωριαίο</Label>
                      <div className="h-8 flex items-center px-3 bg-blue-50 rounded-md text-xs font-semibold text-blue-700 border border-blue-200">
                        {formatCurrency(hourlyCost)}
                      </div>
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs text-slate-600">Ενεργός</Label>
                      <label className="flex items-center gap-2 h-8 px-3 bg-white rounded-md border border-slate-200">
                        <input
                          type="checkbox"
                          checked={person.is_active !== false}
                          onChange={e => handlePersonChange(idx, 'is_active', e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-xs text-slate-600">Ναι</span>
                      </label>
                    </div>
                    <div className="col-span-1 flex items-end">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleRemove(idx)}>
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>}
    </Card>
  );
}