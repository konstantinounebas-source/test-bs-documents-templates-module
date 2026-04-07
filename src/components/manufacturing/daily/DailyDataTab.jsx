import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, parse } from "date-fns";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function DailyDataTab({
  selDate,
  selDept,
  setSelDept,
  departments,
  renderSharedSteps,
  batchHeaders,
  setStep,
  selBatch,
  setSelBatch,
  onAddMsg
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

  // Query attachments for the selected date's batches
  const { data: allDailyAttachments = [] } = useQuery({
    queryKey: ["BatchAttachments-by-date", selDate],
    queryFn: async () => {
      if (!selDate || dateBatches.length === 0) return [];
      const allAtts = [];
      for (const batch of dateBatches) {
        const atts = await base44.entities.BatchAttachment.filter({ batch_header_id: batch.id });
        allAtts.push(...atts);
      }
      return allAtts;
    },
    enabled: !!selDate && allBatches.length > 0,
    staleTime: 0
  });

  const queryClient = useQueryClient();
  const [creatingBatch, setCreatingBatch] = useState(null); // dept name being created

  // Check if bundle is available for a department on a given date
  const hasBundleAvailable = (dept, date) => {
    const da = dailyAssignments.find(a => a.assignment_date === date && a.department_id === dept);
    if (da?.standards_bundle_id) return true;
    return allBundles.some(b => b.department === dept && b.status === "ACTIVE");
  };

  const resolveBundle = (dept, date) => {
    const da = dailyAssignments.find(a => a.assignment_date === date && a.department_id === dept);
    if (da?.standards_bundle_id) return allBundles.find(b => b.id === da.standards_bundle_id);
    return allBundles.find(b => b.department === dept && b.status === "ACTIVE");
  };

  const handleCreateBatch = async (deptName) => {
    const bundle = resolveBundle(deptName, selDate);
    if (!bundle) {
      if (onAddMsg) onAddMsg("bot", `❌ Δεν βρέθηκε ενεργό bundle για το τμήμα "${deptName}".`);
      return;
    }
    setCreatingBatch(deptName);
    try {
      const scheduledData = await base44.entities.ScheduledData.filter({ date: selDate, department_id: deptName });
      const batch = await base44.entities.BatchHeader.create({
        date: selDate,
        department: deptName,
        bundle_id: bundle.id,
        has_scheduled_data: scheduledData.length > 0
      });
      if (scheduledData.length > 0) {
        await base44.entities.Batch_Lines.bulkCreate(
          scheduledData.map(sd => ({
            batch_header_id: batch.id, item_code: sd.item_code,
            scheduled_qty: sd.ops_qty || 0, qty_processed: 0, qty_out_good: 0, qty_scrap: 0
          }))
        );
      }
      await queryClient.invalidateQueries({ queryKey: ["BatchHeader-All"] });
      if (onAddMsg) onAddMsg("bot", `✅ Batch δημιουργήθηκε: ${selDate} · ${deptName}${scheduledData.length > 0 ? `\nΠροστέθηκαν ${scheduledData.length} γραμμές από το πρόγραμμα.` : "\n⚠️ Δεν βρέθηκαν δεδομένα προγράμματος."}`);
    } catch (err) {
      if (onAddMsg) onAddMsg("bot", `❌ Σφάλμα κατά τη δημιουργία batch: ${err?.message}`);
    } finally {
      setCreatingBatch(null);
    }
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

  // Clear selBatch and selDept whenever date changes (fresh start for new date)
  React.useEffect(() => {
    setSelBatch(null);
    setSelDept("");
  }, [selDate]);

  // Get unique departments that have batches for this date
  const departmentsWithBatches = React.useMemo(() => {
    const deptSet = new Set(dateBatches.map(b => b.department));
    return deptSet;
  }, [dateBatches]);

  const deptOrder = ["Pre-paint", "Paint", "Sub-assembly", "Assembly", "Refurbishment", "Delivery"];
  const sortedDepts = [...departments].sort((a, b) => {
    const aIdx = deptOrder.indexOf(a.name);
    const bIdx = deptOrder.indexOf(b.name);
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  return (
    <div className="flex flex-col h-full gap-0">
      {/* Department selector — matches intake styling */}
      <div className="bg-slate-100 border-b border-slate-200 p-2 flex-shrink-0 flex flex-col gap-1" style={{ height: "120px" }}>
        <div className="text-xs font-semibold text-slate-700">Depts</div>
        <div className="grid grid-cols-3 gap-1.5 flex-1 min-h-0">
          {sortedDepts.map(dept => {
            const hasBatch = departmentsWithBatches.has(dept.name);
            const bundleAvailable = hasBatch && selDate ? hasBundleAvailable(dept.name, selDate) : false;
            const attachmentCount = hasBatch
              ? allDailyAttachments.filter(att => {
                  const batch = dateBatches.find(b => b.department === dept.name);
                  return batch && att.batch_header_id === batch.id;
                }).length
              : 0;
            return (
              <div key={dept.id} className="flex flex-col items-center gap-1">
                <button
                  onClick={() => {
                    if (hasBatch) {
                      setSelDept(dept.name);
                      if (setStep) setStep("batch_lines_add");
                      const batch = dateBatches.find(b => b.department === dept.name);
                      if (batch && setSelBatch) setSelBatch(batch);
                    }
                  }}
                  disabled={!hasBatch}
                  className={`px-1.5 py-1.5 rounded text-xs transition-colors flex flex-col items-center gap-0.5 font-medium w-full h-full ${
                    selDept === dept.name
                      ? "bg-blue-600 text-white"
                      : hasBatch
                        ? "bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300"
                        : "bg-slate-100 text-slate-400 border border-slate-200 cursor-default"
                  }`}
                >
                  <span className="text-xs">{dept.name}</span>
                  <div className="flex items-center gap-1 text-xs">
                    <span className={`${bundleAvailable ? (selDept === dept.name ? "text-green-300" : "text-green-600") : "text-red-500 text-xl leading-none"}`}>
                      {hasBatch ? (bundleAvailable ? "✓" : "×") : "×"}
                    </span>
                    <span className={selDept === dept.name ? "text-blue-200" : "text-slate-500"}>({attachmentCount})</span>
                  </div>
                </button>
                {!hasBatch && (
                  <button
                    onClick={() => handleCreateBatch(dept.name)}
                    disabled={creatingBatch === dept.name}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-0.5 disabled:opacity-50 whitespace-nowrap"
                  >
                    {creatingBatch === dept.name
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Plus className="w-3 h-3" />}
                    Νέο Batch
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Steps Content */}
      <div className="flex-1 overflow-y-auto px-3 pt-0">
        {!selDate ? (
          <p className="text-base text-slate-500 text-center py-8">Select a date from the Intake block</p>
        ) : selDept ? (
          renderSharedSteps()
        ) : (
          <p className="text-base text-slate-500 text-center py-8">Select a department to view data.</p>
        )}
      </div>
    </div>
  );
}