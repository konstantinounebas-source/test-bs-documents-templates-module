import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, Square } from "lucide-react";

/**
 * BulkOCRPanel: UI for missing OCR detection, selection, and execution.
 * Shows attachment-level list + grouped summary.
 * Supports selective execution and stop control.
 */
export default function BulkOCRPanel({
  departments = [],
  isMissingOcrLoading,
  isBulkOcrRunning,
  bulkOcrProgress,
  bulkOcrDetailedResults,
  missingOcrAttachmentDetails,
  selectedAttachmentIds,
  ocrFilterDept,
  ocrFilterMonth,
  onFilterDeptChange,
  onFilterMonthChange,
  onDetectMissing,
  onRunSelected,
  onStopBulkOCR,
  onAddMsg
}) {
  const handleSelectAll = () => {
    if (selectedAttachmentIds.size === missingOcrAttachmentDetails.length) {
      // Deselect all
      selectedAttachmentIds.clear();
    } else {
      // Select all
      missingOcrAttachmentDetails.forEach(d => selectedAttachmentIds.add(d.attachmentId));
    }
  };

  const allSelected = selectedAttachmentIds.size === missingOcrAttachmentDetails.length && missingOcrAttachmentDetails.length > 0;
  const selectedCount = selectedAttachmentIds.size;

  return (
    <div className="border-t p-3 space-y-3 flex-shrink-0">
      {/* Filters */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-semibold text-slate-500 block mb-1">Department</label>
          <select
            value={ocrFilterDept}
            onChange={e => onFilterDeptChange(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded px-2 py-1"
          >
            <option value="">All</option>
            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-500 block mb-1">Month (YYYY-MM)</label>
          <input
            type="month"
            value={ocrFilterMonth}
            onChange={e => onFilterMonthChange(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded px-2 py-1"
          />
        </div>
      </div>

      {/* Detection & Execution Buttons */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-xs"
          onClick={onDetectMissing}
          disabled={isMissingOcrLoading || isBulkOcrRunning}
        >
          {isMissingOcrLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : "🔍"}
          {isMissingOcrLoading ? "Scanning..." : "Find Missing OCR"}
        </Button>
        {isBulkOcrRunning && (
          <Button
            size="sm"
            className="flex-1 text-xs bg-red-600 hover:bg-red-700"
            onClick={onStopBulkOCR}
          >
            ⏹ Stop OCR
          </Button>
        )}
        {!isBulkOcrRunning && missingOcrAttachmentDetails.length > 0 && (
          <Button
            size="sm"
            className="flex-1 text-xs bg-purple-600 hover:bg-purple-700"
            onClick={() => {
              if (selectedCount === 0) {
                onAddMsg("bot", "⚠️ No attachments selected. Select at least one.");
                return;
              }
              const selected = missingOcrAttachmentDetails.filter(d => selectedAttachmentIds.has(d.attachmentId));
              onRunSelected(selected);
            }}
          >
            ⚡ Run OCR ({selectedCount} selected)
          </Button>
        )}
      </div>

      {/* Progress during bulk OCR */}
      {isBulkOcrRunning && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 space-y-1 text-xs">
          <div className="flex justify-between font-semibold text-blue-900">
            <span>Progress</span>
            <span>{bulkOcrProgress.processed} / {bulkOcrProgress.total}</span>
          </div>
          <div className="flex gap-2 text-[10px] text-blue-700">
            <span>✅ {bulkOcrProgress.completed}</span>
            <span>❌ {bulkOcrProgress.failed}</span>
            <span>⏳ {bulkOcrProgress.total - bulkOcrProgress.processed - bulkOcrProgress.completed - bulkOcrProgress.failed}</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all"
              style={{ width: `${bulkOcrProgress.total > 0 ? (bulkOcrProgress.processed / bulkOcrProgress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Results after OCR completes */}
      {bulkOcrDetailedResults.length > 0 && !isBulkOcrRunning && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1 max-h-48 overflow-y-auto text-[10px]">
          <p className="font-semibold text-slate-700">OCR Results:</p>
          {bulkOcrDetailedResults.map((result, i) => (
            <div key={i} className={`flex items-start gap-1 px-1 py-0.5 rounded ${
              result.status === "completed" ? "bg-green-50 text-green-700" :
              result.status === "failed" ? "bg-red-50 text-red-700" :
              "bg-slate-50 text-slate-600"
            }`}>
              {result.status === "completed" && <CheckCircle2 className="w-3 h-3 flex-shrink-0 mt-0.5" />}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{result.fileName}</p>
                {result.error && <p className="text-[9px]">{result.error}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Attachment list with selection */}
      {missingOcrAttachmentDetails.length > 0 && !isBulkOcrRunning && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1 max-h-64 overflow-y-auto">
          <div className="flex items-center justify-between sticky top-0 bg-slate-50 pb-1 border-b border-slate-200">
            <p className="font-semibold text-slate-700 text-xs">{missingOcrAttachmentDetails.length} Attachments</p>
            <Button
              size="sm"
              variant="ghost"
              className="h-5 px-2 text-[10px]"
              onClick={handleSelectAll}
            >
              {allSelected ? "Deselect All" : "Select All"}
            </Button>
          </div>
          {missingOcrAttachmentDetails.map(att => (
            <div
              key={att.attachmentId}
              className="flex items-start gap-2 px-1 py-0.5 rounded hover:bg-slate-100 text-[10px] cursor-pointer"
              onClick={() => {
                if (selectedAttachmentIds.has(att.attachmentId)) {
                  selectedAttachmentIds.delete(att.attachmentId);
                } else {
                  selectedAttachmentIds.add(att.attachmentId);
                }
              }}
            >
              <div className="mt-0.5">
                {selectedAttachmentIds.has(att.attachmentId) ? (
                  <CheckCircle2 className="w-3 h-3 text-blue-600" />
                ) : (
                  <Square className="w-3 h-3 text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-700 truncate">{att.fileName}</p>
                <p className="text-slate-500">{att.date} • {att.department}</p>
                <p className="text-[9px] text-slate-400">
                  {att.missingProduction && "Prod"}{att.missingProduction && att.missingTeamsTime ? " + " : ""}{att.missingTeamsTime && "Teams"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}