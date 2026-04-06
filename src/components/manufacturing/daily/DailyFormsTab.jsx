import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronRight } from "lucide-react";
import AttachmentItemWithForms from "./AttachmentItemWithForms";

export default function DailyFormsTab({
  selDate,
  onOpenProduction,
  onOpenTeams,
  onPreview,
  onOCR,
  onDelete,
  runningOcrAttachmentIds,
  attachmentOcrStatus,
  deleteMutation
}) {
  const [selectedDept, setSelectedDept] = useState("");

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

  // Group data by department with batch info
  const departmentGroups = useMemo(() => {
    const groups = {};
    dailyBatches.forEach(batch => {
      if (!groups[batch.department]) {
        groups[batch.department] = { attachments: [], hasBatch: false };
      }
      groups[batch.department].hasBatch = true;
      const deptAttachments = allDailyAttachments.filter(
        att => att.batch_header_id === batch.id
      );
      groups[batch.department].attachments.push(...deptAttachments);
    });
    return groups;
  }, [dailyBatches, allDailyAttachments]);

  const departments = Object.keys(departmentGroups).sort();
  const currentDeptAttachments = selectedDept ? departmentGroups[selectedDept]?.attachments || [] : [];

  if (!selDate) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-slate-500">Select a date to view daily forms.</p>
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
    <div className="flex h-full gap-4">
      {/* Left: Department List */}
      <div className="w-40 border-r border-slate-200 flex flex-col flex-shrink-0">
        <div className="px-3 py-2 border-b border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase">Departments</p>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
            {departments.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No departments</p>
            ) : (
              departments.map(dept => {
                const deptData = departmentGroups[dept];
                const attachmentCount = deptData.attachments.length;
                const hasBatch = deptData.hasBatch;
                return (
                  <button
                    key={dept}
                    onClick={() => setSelectedDept(dept)}
                    className={`w-full text-left px-2 py-2 rounded text-xs transition-colors ${
                      selectedDept === dept
                        ? "bg-blue-600 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{dept}</p>
                        <p className={`text-[10px] ${selectedDept === dept ? "text-blue-100" : "text-slate-500"}`}>
                          {hasBatch ? "✓ Batch" : "✗ No batch"} · {attachmentCount} file(s)
                        </p>
                      </div>
                      <Badge
                        className={`text-[10px] px-1.5 py-0 flex-shrink-0 ${
                          selectedDept === dept
                            ? "bg-blue-500 text-white"
                            : hasBatch ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {attachmentCount}
                      </Badge>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right: Attachments for Selected Department */}
      <div className="flex-1 flex flex-col">
        {selectedDept ? (
          <>
            <div className="px-4 py-2 border-b border-slate-200 flex-shrink-0">
              <p className="text-xs font-semibold text-slate-700">
                {selectedDept} · {currentDeptAttachments.length} file(s)
              </p>
            </div>
            <ScrollArea className="flex-1 p-4">
              {currentDeptAttachments.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">
                  No attachments for {selectedDept}
                </p>
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
            </ScrollArea>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-slate-500">Select a department to view files.</p>
          </div>
        )}
      </div>
    </div>
  );
}