import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import AttachmentItemWithForms from "./AttachmentItemWithForms";

export default function DailyFormsTab({
  selDate,
  onOpenProduction,
  onOpenTeams,
  onPreview,
  onOCR,
  onDelete,
  onHandleFiles,
  runningOcrAttachmentIds,
  attachmentOcrStatus,
  deleteMutation,
  onAddMsg
}) {
  const [selectedDept, setSelectedDept] = useState("");
  const [dragging, setDragging] = useState(false);
  const [creatingBatch, setCreatingBatch] = useState(null);
  const queryClient = useQueryClient();

  // Query all departments
  const { data: allDepartments = [] } = useQuery({
    queryKey: ["Department"],
    queryFn: () => base44.entities.Department.list(),
    staleTime: Infinity
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

  // Query all batches for the selected date
  const { data: dailyBatches = [], isLoading: loadingBatches } = useQuery({
    queryKey: ["BatchHeaders-by-date", selDate],
    queryFn: async () => {
      if (!selDate) return [];
      const batches = await base44.entities.BatchHeader.filter({ date: selDate });
      return batches;
    },
    enabled: !!selDate,
    staleTime: 0
  });

  // Query all attachments for the selected date's batches
  const { data: allDailyAttachments = [], isLoading: loadingAttachments } = useQuery({
    queryKey: ["BatchAttachments-by-date", selDate],
    queryFn: async () => {
      if (!selDate || dailyBatches.length === 0) return [];
      const allAtts = [];
      for (const batch of dailyBatches) {
        const atts = await base44.entities.BatchAttachment.filter({
          batch_header_id: batch.id
        });
        allAtts.push(...atts);
      }
      return allAtts;
    },
    enabled: !!selDate && dailyBatches.length > 0,
    staleTime: 0
  });

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
      await queryClient.invalidateQueries({ queryKey: ["BatchHeaders-by-date", selDate] });
      await queryClient.invalidateQueries({ queryKey: ["BatchHeader-All"] });
      if (onAddMsg) onAddMsg("bot", `✅ Batch δημιουργήθηκε: ${selDate} · ${deptName}${scheduledData.length > 0 ? `\nΠροστέθηκαν ${scheduledData.length} γραμμές από το πρόγραμμα.` : "\n⚠️ Δεν βρέθηκαν δεδομένα προγράμματος."}`);
    } catch (err) {
      if (onAddMsg) onAddMsg("bot", `❌ Σφάλμα κατά τη δημιουργία batch: ${err?.message}`);
    } finally {
      setCreatingBatch(null);
    }
  };

  // Group data by department
  const departmentGroups = useMemo(() => {
    const groups = {};
    allDepartments.forEach(dept => {
      groups[dept.name] = { attachments: [], hasBatch: false, bundleAvailable: false };
    });
    dailyBatches.forEach(batch => {
      if (groups[batch.department]) {
        groups[batch.department].hasBatch = true;
        groups[batch.department].bundleAvailable = hasBundleAvailable(batch.department, batch.date);
        const deptAttachments = allDailyAttachments.filter(
          att => att.batch_header_id === batch.id
        );
        groups[batch.department].attachments.push(...deptAttachments);
      }
    });
    return groups;
  }, [allDepartments, dailyBatches, allDailyAttachments, allBundles, dailyAssignments]);

  const deptOrder = ["Pre-paint", "Paint", "Sub-assembly", "Assembly", "Refurbishment", "Delivery"];
  const departments = Object.keys(departmentGroups).sort((a, b) => {
    const aIdx = deptOrder.indexOf(a);
    const bIdx = deptOrder.indexOf(b);
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });
  const currentDeptAttachments = selectedDept ? departmentGroups[selectedDept]?.attachments || [] : [];

  if (!selDate) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-base text-slate-500">Select a date to view daily forms.</p>
      </div>
    );
  }

  if (loadingBatches || loadingAttachments) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Horizontal Department List */}
      <div className="bg-slate-100 border border-slate-200 rounded-lg p-3 flex-shrink-0 overflow-y-auto" style={{ maxHeight: "140px" }}>
        <div className="flex flex-wrap gap-2">
          {departments.length === 0 ? (
            <p className="text-xs text-slate-400">No departments</p>
          ) : (
            departments.map(dept => {
            const deptData = departmentGroups[dept];
            const attachmentCount = deptData.attachments.length;
            const hasBatch = deptData.hasBatch;
            const bundleAvailable = deptData.bundleAvailable;
            return (
              <div key={dept} className="flex flex-col items-center gap-1">
                <button
                  onClick={() => setSelectedDept(dept)}
                  disabled={!hasBatch}
                  className={`px-4 py-2.5 rounded text-base transition-colors flex flex-col items-center gap-1 font-medium min-w-max disabled:opacity-50 disabled:cursor-not-allowed ${
                    selectedDept === dept
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300 disabled:hover:bg-slate-100"
                  }`}
                >
                  <span>{dept}</span>
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`${bundleAvailable ? (selectedDept === dept ? "text-green-300" : "text-green-600") : "text-red-500 text-xl leading-none"}`}>
                      {bundleAvailable ? "✓" : "×"}
                    </span>
                    <span className={selectedDept === dept ? "text-blue-200" : "text-slate-500"}>({attachmentCount})</span>
                  </div>
                </button>
                {!hasBatch && (
                  <button
                    onClick={() => handleCreateBatch(dept)}
                    disabled={creatingBatch === dept}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-0.5 disabled:opacity-50"
                  >
                    {creatingBatch === dept
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Plus className="w-3 h-3" />}
                    Νέο Batch
                  </button>
                )}
              </div>
            );
            })
          )}
        </div>
      </div>

          {/* Attachments Area with Drag-Drop */}
      <div className="flex-1 flex flex-col min-h-0 px-4">
        {selectedDept ? (
          <>
            <p className="text-sm font-semibold text-slate-700 mb-2">
              {selectedDept} · {currentDeptAttachments.length} file(s)
            </p>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => {
                e.preventDefault();
                setDragging(false);
                if (onHandleFiles) onHandleFiles(Array.from(e.dataTransfer.files));
              }}
              className={`flex-1 border-2 border-dashed rounded-lg p-4 transition-colors min-h-0 overflow-y-auto flex flex-col ${
                dragging ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50 hover:border-slate-400"
              }`}
            >
              {currentDeptAttachments.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Drop files here</p>
                    <p className="text-xs text-slate-400">or use the processing panel above</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {currentDeptAttachments.map(att => (
                    <AttachmentItemWithForms
                      key={att.id}
                      att={att}
                      onDelete={onDelete}
                      onPreview={onPreview}
                      onOCR={onOCR}
                      onOpenProduction={onOpenProduction}
                      onOpenTeams={onOpenTeams}
                      isOcrLoading={runningOcrAttachmentIds.has(att.id)}
                      isAnyOcrLoading={runningOcrAttachmentIds.size > 0}
                      isDeleting={deleteMutation.isPending && deleteMutation.variables === att.id}
                      ocrStatus={attachmentOcrStatus[att.id] || {}}
                      selDept={selectedDept}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center flex-1">
            <p className="text-base text-slate-500">Select a department to view files.</p>
          </div>
        )}
      </div>
    </div>
  );
}