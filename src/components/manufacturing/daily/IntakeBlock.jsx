import React, { useState } from "react";
import { Calendar, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

export default function IntakeBlock({ selDate, selDept, customDate, setCustomDate, onDateSelect, quickDates, onAddMsg, departments, selDept: currentDept, setSelDept, dateBatches, setSelBatch, setStep, departmentProps }) {
  const [tempDate, setTempDate] = React.useState(customDate);

  // Use passed props or extract from departmentProps
  const deptList = departments || departmentProps?.departments || [];
  const deptBatches = dateBatches || departmentProps?.dateBatches || [];
  const handleDeptSelect = setSelDept || departmentProps?.setSelDept;
  const handleSetBatch = setSelBatch || departmentProps?.setSelBatch;
  const handleSetStep = setStep || departmentProps?.setStep;

  return (
    <div className="border-b bg-slate-50 p-3 space-y-3 flex-shrink-0">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-slate-600" />
        <p className="text-xs font-semibold text-slate-700">Intake</p>
      </div>
      
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input type="date" value={tempDate} onChange={e => setTempDate(e.target.value)} className="text-xs h-8 flex-1" max={new Date().toISOString().split('T')[0]} />
          <Button size="sm" className="text-xs px-3 bg-blue-600 hover:bg-blue-700" onClick={() => {
            onDateSelect(tempDate);
            if (onAddMsg) onAddMsg("user", tempDate);
          }}>
            OK
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickDates.filter(qd => qd.value !== "__picker__").map(qd => (
            <Button key={qd.value} variant={selDate === qd.value ? "default" : "outline"} size="sm" className="text-xs" onClick={() => {
              setTempDate(qd.value);
              onDateSelect(qd.value);
              if (onAddMsg) onAddMsg("user", qd.label);
            }}>
              {qd.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Departments - only show if departments are provided */}
      {deptList.length > 0 && (
        <div className="border-t pt-3 space-y-1">
          <p className="text-xs font-semibold text-slate-700 uppercase">Departments</p>
          <div className="flex flex-wrap gap-2">
            {deptList.map(dept => {
              const hasBatch = deptBatches.some(b => b.department === dept.name);
              return (
                <button
                  key={dept.id}
                  onClick={() => {
                    if (hasBatch && handleDeptSelect) {
                      handleDeptSelect(dept.name);
                      if (handleSetStep) handleSetStep("batch_lines_add");
                      const batch = deptBatches.find(b => b.department === dept.name);
                      if (batch && handleSetBatch) handleSetBatch(batch);
                    }
                  }}
                  disabled={!hasBatch}
                  className={`px-3 py-1.5 rounded text-xs transition-colors font-medium ${
                    currentDept === dept.name
                      ? "bg-blue-600 text-white"
                      : hasBatch
                        ? "bg-white text-slate-800 hover:bg-slate-50 border border-slate-300"
                        : "bg-white text-slate-400 border border-slate-200 cursor-default"
                  }`}
                >
                  {dept.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}