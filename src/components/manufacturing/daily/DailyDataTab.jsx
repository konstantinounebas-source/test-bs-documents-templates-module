import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, parse } from "date-fns";

export default function DailyDataTab({
  selDate,
  selDept,
  setSelDept,
  departments,
  renderSharedSteps,
  batchHeaders,
  setStep,
  selBatch,
  setSelBatch
}) {
  // Get all batches and filter by selected date
  const { data: allBatches = [] } = useQuery({
    queryKey: ["BatchHeader-All"],
    queryFn: () => base44.entities.BatchHeader.list(),
    staleTime: 0
  });

  // Filter batches by selected date (normalize both to yyyy-MM-dd format)
  const dateBatches = React.useMemo(() => {
    if (!selDate) return [];
    const normalizedSelDate = selDate.includes('-') ? selDate : format(parse(selDate, "dd/MM/yyyy", new Date()), "yyyy-MM-dd");
    return allBatches.filter(b => {
      const normalizedBatchDate = b.date.includes('-') ? b.date : format(parse(b.date, "dd/MM/yyyy", new Date()), "yyyy-MM-dd");
      return normalizedBatchDate === normalizedSelDate;
    });
  }, [allBatches, selDate]);

  // Get unique departments that have batches for this date
  const departmentsWithBatches = React.useMemo(() => {
    const deptSet = new Set(dateBatches.map(b => b.department));
    return deptSet;
  }, [dateBatches]);

  return (
    <div className="space-y-0 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex-shrink-0">
        <h3 className="text-sm font-semibold text-slate-800">
          Daily Production Data
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          {selDate ? format(parse(selDate, "yyyy-MM-dd", new Date()), "dd/MM/yyyy") : "Select a date from Intake"}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!selDate ? (
          <p className="text-sm text-slate-500 text-center py-8">
            Select a date from the Intake block
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {departments.map(dept => {
                const hasBatch = departmentsWithBatches.has(dept.name);
                return (
                  <Button
                    key={dept.id}
                    variant={selDept === dept.name ? "default" : hasBatch ? "outline" : "secondary"}
                    size="sm"
                    className="text-xs whitespace-nowrap flex-1 min-w-max"
                    disabled={!hasBatch}
                    onClick={() => {
                      if (hasBatch) {
                        setSelDept(dept.name);
                        if (setStep) setStep("batch_lines_add");
                        const batch = dateBatches.find(b => b.department === dept.name);
                        if (batch && setSelBatch) {
                          setSelBatch(batch);
                        }
                      }
                    }}
                  >
                    {dept.name}
                  </Button>
                );
              })}
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