import React from "react";
import { Calendar } from "lucide-react";
import { format } from "date-fns";

export default function IntakeBlock({ selDate, selDept }) {
  return (
    <div className="border-b bg-slate-50 p-3 space-y-2 flex-shrink-0">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-slate-600" />
        <p className="text-xs font-semibold text-slate-700">Intake</p>
      </div>
      <div className="text-xs text-slate-600">
        <p className="font-medium">{selDate ? format(new Date(selDate), "dd/MM/yyyy") : "—"}</p>
        {selDept && <p className="text-slate-500">{selDept}</p>}
      </div>
    </div>
  );
}