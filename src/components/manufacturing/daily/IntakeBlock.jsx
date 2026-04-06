import React from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

export default function IntakeBlock({ selDate, selDept, customDate, setCustomDate, onDateSelect, quickDates }) {
  return (
    <div className="border-b bg-slate-50 p-3 space-y-3 flex-shrink-0">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-slate-600" />
        <p className="text-xs font-semibold text-slate-700">Intake</p>
      </div>
      
      <div className="space-y-2">
        <Input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} className="text-xs h-8" max={format(new Date(), "yyyy-MM-dd")} />
        <div className="flex flex-wrap gap-2">
          {quickDates.map(qd => (
            <Button key={qd.value} variant={selDate === qd.value ? "default" : "outline"} size="sm" className="text-xs" onClick={() => onDateSelect(qd.value)}>
              {qd.label}
            </Button>
          ))}
        </div>
      </div>

      {selDate && (
        <div className="pt-2 border-t text-xs text-slate-600">
          <p className="font-medium">{format(new Date(selDate), "dd/MM/yyyy")}</p>
          {selDept && <p className="text-slate-500">{selDept}</p>}
        </div>
      )}
    </div>
  );
}