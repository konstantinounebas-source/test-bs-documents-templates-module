import React, { useState } from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

export default function IntakeBlock({ selDate, selDept, customDate, setCustomDate, onDateSelect, quickDates, onAddMsg }) {
  const [tempDate, setTempDate] = React.useState(customDate);

  return (
    <div className="border-b bg-blue-600 p-3 space-y-3 flex-shrink-0">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-white" />
        <p className="text-xs font-semibold text-white">Intake</p>
      </div>
      
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input type="date" value={tempDate} onChange={e => setTempDate(e.target.value)} className="text-xs h-8 flex-1" max={new Date().toISOString().split('T')[0]} />
          <Button size="sm" className="text-xs px-3 bg-white text-blue-600 hover:bg-slate-100 font-medium" onClick={() => {
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