import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function DailyDataTab({
  selDate,
  selDept,
  setSelDept,
  departments,
  renderSharedSteps,
  batchHeaders
}) {
  // Get batches for the selected date
  const { data: dateBatches = [] } = useQuery({
    queryKey: ["BatchHeader", "byDate", selDate],
    queryFn: () =>
      base44.entities.BatchHeader.filter({ date: selDate }),
    enabled: !!selDate,
    staleTime: 0
  });

  // Get unique departments that have batches for this date
  const departmentsWithBatches = React.useMemo(() => {
    const deptSet = new Set(dateBatches.map(b => b.department));
    return departments.filter(d => deptSet.has(d.name));
  }, [dateBatches, departments]);

  return (
    <div className="space-y-0 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex-shrink-0">
        <h3 className="text-sm font-semibold text-slate-800">
          Daily Production Data
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          {selDate ? `${selDate}` : "Select a date from Intake"}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!selDate ? (
          <p className="text-sm text-slate-500 text-center py-8">
            Select a date from the Intake block
          </p>
        ) : departmentsWithBatches.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">
            No batches found for {selDate}
          </p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {departmentsWithBatches.map(dept => (
                <Button
                  key={dept.id}
                  variant={selDept === dept.name ? "default" : "outline"}
                  size="sm"
                  className="text-xs justify-start"
                  onClick={() => setSelDept(dept.name)}
                >
                  {dept.name}
                </Button>
              ))}
            </div>

            {selDept && (
              <div className="border-t pt-3">
                {renderSharedSteps()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}