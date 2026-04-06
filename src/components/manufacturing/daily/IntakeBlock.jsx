import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "lucide-react";
import { format } from "date-fns";

export default function IntakeBlock({ quickDates, customDate, setCustomDate, showPicker, setShowPicker, onDateSelect, selDate, selDept }) {
  return (
    <div className="border-b bg-slate-50 p-3 space-y-3 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-600" />
          <p className="text-xs font-semibold text-slate-700">Intake</p>
        </div>
        {selDept && selDate && (
          <span className="text-xs text-slate-500">
            {selDept} · {format(new Date(selDate), "dd/MM/yyyy")}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {quickDates.slice(0, 3).map(qd => (
          <Button
            key={qd.value}
            variant={selDate === qd.value ? "default" : "outline"}
            size="sm"
            className="text-xs"
            onClick={() => onDateSelect(qd.value)}
          >
            {qd.label}
          </Button>
        ))}
      </div>

      {showPicker && (
        <div className="flex gap-2">
          <Input
            type="date"
            value={customDate}
            onChange={e => setCustomDate(e.target.value)}
            className="text-xs h-8 flex-1"
            max={format(new Date(), "yyyy-MM-dd")}
          />
          <Button
            size="sm"
            className="h-8 text-xs"
            disabled={!customDate}
            onClick={() => onDateSelect(customDate)}
          >
            OK
          </Button>
        </div>
      )}
    </div>
  );
}