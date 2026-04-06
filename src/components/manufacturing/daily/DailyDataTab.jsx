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

  // Query all bundles to check availability
  const { data: allBundles = [] } = useQuery({
    queryKey: ["StandardsBundle-All"],
    queryFn: () => base44.entities.StandardsBundle.list(),
    staleTime: Infinity
  });

  // Query daily assignments for bundle lookups
  const { data: dailyAssignments = [] } = useQuery({
    queryKey: ["DailyStandardsAssignment-All"],
    queryFn: () => base44.entities.DailyStandardsAssignment.list(),
    staleTime: Infinity
  });

  // Check if bundle is available for a department on a given date
  const hasBundleAvailable = (dept, date) => {
    const da = dailyAssignments.find(a => a.assignment_date === date && a.department_id === dept);
    if (da?.standards_bundle_id) return true;
    return allBundles.some(b => b.department === dept && b.status === "ACTIVE");
  };

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
            <div className="flex flex-wrap gap-2 mb-3">
              {departments.sort((a, b) => {
                const deptOrder = ["Pre-paint", "Paint", "Sub-assembly", "Assembly", "Refurbishment", "Delivery"];
                const aIdx = deptOrder.indexOf(a.name);
                const bIdx = deptOrder.indexOf(b.name);
                if (aIdx === -1) return 1;
                if (bIdx === -1) return -1;
                return aIdx - bIdx;
              }).map(dept => {
                const hasBatch = departmentsWithBatches.has(dept.name);
                const bundleAvailable = hasBatch && selDate ? hasBundleAvailable(dept.name, selDate) : false;
                return (
                  <Button
                    key={dept.id}
                    variant={selDept === dept.name ? "default" : "outline"}
                    size="lg"
                    className={`flex flex-col items-center gap-1 h-auto py-2.5 px-4 text-sm font-medium ${!hasBatch ? "opacity-40 cursor-not-allowed" : ""}`}
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
                    <span>{dept.name}</span>
                    <span className={`text-xs ${bundleAvailable ? "text-green-600 font-semibold" : "text-red-600 text-lg leading-none"}`}>
                      {bundleAvailable ? "✓" : "×"}
                    </span>
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