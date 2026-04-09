import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import {
  getActiveTechnicians,
  getPersonById,
  calculatePersonnelHourlyCost,
  calculateDepartmentAverageHourlyCost,
  createNewDepartmentBlock,
  createNewTechnicianRow,
} from '../utils/labourModuleCalculations';

function DepartmentBlock({ 
  block, 
  blockIdx, 
  departments, 
  labourPersonnel, 
  formatCurrency, 
  onUpdate, 
  onRemoveBlock 
}) {
  const [expanded, setExpanded] = React.useState(false);
  const activeTechnicians = getActiveTechnicians(labourPersonnel);
  const deptName = departments.find(d => d.id === block.department_id)?.department_name || 'Επιλογή τμήματος...';
  const averageCost = calculateDepartmentAverageHourlyCost(block, labourPersonnel);

  const handleDeptChange = (value) => {
    const updated = { ...block, department_id: value };
    onUpdate(blockIdx, updated);
  };

  const handleAddTechnician = () => {
    const updated = {
      ...block,
      technician_rows: [createNewTechnicianRow(), ...(block.technician_rows || [])],
    };
    onUpdate(blockIdx, updated);
  };

  const handleTechChange = (techIdx, field, value) => {
    const updated = {
      ...block,
      technician_rows: (block.technician_rows || []).map((t, i) => 
        i === techIdx ? { ...t, [field]: value } : t
      ),
    };
    onUpdate(blockIdx, updated);
  };

  const handleRemoveTech = (techIdx) => {
    const updated = {
      ...block,
      technician_rows: (block.technician_rows || []).filter((_, i) => i !== techIdx),
    };
    onUpdate(blockIdx, updated);
  };

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden hover:border-slate-300 transition-colors">
      {/* Department header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-slate-400 hover:text-slate-600 flex-shrink-0"
        >
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <div className="flex-1">
          <Label className="text-xs text-slate-600 block mb-1">Τμήμα</Label>
          <Select value={block.department_id || ''} onValueChange={handleDeptChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Επιλογή τμήματος..." />
            </SelectTrigger>
            <SelectContent>
              {departments.map(d => (
                <SelectItem key={d.id} value={d.id}>
                  {d.department_name || d.name || d.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-right flex-shrink-0">
          <Label className="text-xs text-slate-600 block mb-1">Μ.Ο. Ωριαίο</Label>
          <div className="text-sm font-semibold text-slate-800">
            {formatCurrency(averageCost)}
          </div>
        </div>

        <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0" onClick={() => onRemoveBlock(blockIdx)}>
          <Trash2 className="w-3.5 h-3.5 text-red-500" />
        </Button>
      </div>

      {/* Technician rows */}
      {expanded && (
        <div className="px-4 py-3 space-y-3">
          {(block.technician_rows || []).length === 0 ? (
            <div className="text-center py-4 text-sm text-slate-400 bg-slate-50 rounded border border-dashed border-slate-200">
              Δεν υπάρχουν τεχνικοί. Πατήστε "Προσθήκη Τεχνικού".
            </div>
          ) : (
            <div className="space-y-2">
              {block.technician_rows.map((techRow, techIdx) => {
                const person = getPersonById(labourPersonnel, techRow.personnel_id);
                const hourlyCost = person ? calculatePersonnelHourlyCost(person) : 0;
                
                return (
                  <div key={techIdx} className="border border-slate-100 rounded p-2 bg-white">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                      <div>
                        <Label className="text-xs text-slate-600">Τεχνικός</Label>
                        <Select value={techRow.personnel_id || ''} onValueChange={v => handleTechChange(techIdx, 'personnel_id', v)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Επιλογή..." />
                          </SelectTrigger>
                          <SelectContent>
                            {activeTechnicians.map(tech => (
                              <SelectItem key={tech.id} value={tech.id}>
                                {tech.person_name || '(χωρίς όνομα)'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-600">Θέση</Label>
                        <div className="h-8 flex items-center px-3 bg-slate-50 rounded-md text-xs text-slate-700 border border-slate-200">
                          {person?.position || '—'}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-600">Ωριαίο</Label>
                        <div className="h-8 flex items-center px-3 bg-blue-50 rounded-md text-xs font-semibold text-blue-700 border border-blue-200">
                          {formatCurrency(hourlyCost)}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-slate-600">Σχόλια</Label>
                        <Input
                          value={techRow.comments || ''}
                          onChange={e => handleTechChange(techIdx, 'comments', e.target.value)}
                          placeholder="Σχόλια"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleRemoveTech(techIdx)}>
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Button size="sm" variant="outline" onClick={handleAddTechnician} className="gap-1 text-xs w-full">
            <Plus className="w-3 h-3" />
            Προσθήκη Τεχνικού
          </Button>
        </div>
      )}
    </div>
  );
}

export default function DepartmentTechnicianHourlyCostSection({ 
  departmentAssignments, 
  labourPersonnel, 
  departments, 
  formatCurrency, 
  onUpdate 
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  console.log('[DeptTechSection] labourPersonnel:', labourPersonnel);
  console.log('[DeptTechSection] activeTechnicians:', getActiveTechnicians(labourPersonnel));

  const handleAdd = () => {
    onUpdate([createNewDepartmentBlock(), ...departmentAssignments]);
  };

  const handleUpdateBlock = (blockIdx, updatedBlock) => {
    const updated = [...departmentAssignments];
    updated[blockIdx] = updatedBlock;
    onUpdate(updated);
  };

  const handleRemoveBlock = (blockIdx) => {
    onUpdate(departmentAssignments.filter((_, i) => i !== blockIdx));
  };

  return (
    <Card>
      <CardHeader className="pb-3 cursor-pointer hover:bg-slate-50" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <CardTitle className="text-base font-semibold text-slate-800">
              Γ. Ημερομήνιο Τεχνικό Κόστος ανά Τμήμα ({departmentAssignments.length})
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
            Προσθήκη Τμήματος
          </Button>
        </div>
        {isExpanded && <p className="text-xs text-slate-500 mt-1">
          Ορίστε τεχνικούς ανά τμήμα και υπολογίστε το μέσο ωριαίο κόστος.
        </p>}
      </CardHeader>
      {isExpanded && <CardContent className="space-y-3">
        {departmentAssignments.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            Δεν υπάρχουν τμήματα. Πατήστε "Προσθήκη Τμήματος" για να ξεκινήσετε.
          </div>
        ) : (
          <div className="space-y-3">
            {departmentAssignments.map((block, blockIdx) => (
              <DepartmentBlock
                key={blockIdx}
                block={block}
                blockIdx={blockIdx}
                departments={departments}
                labourPersonnel={labourPersonnel}
                formatCurrency={formatCurrency}
                onUpdate={handleUpdateBlock}
                onRemoveBlock={handleRemoveBlock}
              />
            ))}
          </div>
        )}
      </CardContent>}
    </Card>
  );
}