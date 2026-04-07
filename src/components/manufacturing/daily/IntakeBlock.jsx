import React, { useState } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

export default function IntakeBlock({ selDate, selDept, customDate, setCustomDate, onDateSelect, quickDates, onAddMsg }) {
  const [tempDate, setTempDate] = React.useState(customDate);

  return (
    <div className="bg-slate-100 border-b border-slate-200 p-3 space-y-3 flex-shrink-0" style={{ minHeight: "110px" }}>
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-slate-600" />
        <p className="text-xs font-semibold text-slate-700">Intake</p>
      </div>
      
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input type="date" value={tempDate} onChange={e => setTempDate(e.target.value)} className="text-xs h-8 flex-1" max={new Date().toISOString().split('T')[0]} />
          <Button size="sm" className="text-xs px-3 bg-blue-600 hover:bg-blue-700 text-white font-medium" onClick={() => {
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


    </div>
  );
}