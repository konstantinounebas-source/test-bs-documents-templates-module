import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, Square, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

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
  setSelectedAttachmentIds,
  ocrFilterDept,
  ocrFilterMonth,
  onFilterDeptChange,
  onFilterMonthChange,
  onDetectMissing,
  onRunSelected,
  onStopBulkOCR,
  onAddMsg
}) {
  const [expandPanel, setExpandPanel] = useState(false);
  const [expandResults, setExpandResults] = useState(false);
  const [expandAttachments, setExpandAttachments] = useState(false);

  const handleSelectAll = () => {
    if (selectedAttachmentIds.size === missingOcrAttachmentDetails.length) {
      // Deselect all — immutable update
      setSelectedAttachmentIds(new Set());
    } else {
      // Select all — immutable update
      const next = new Set(selectedAttachmentIds);
      missingOcrAttachmentDetails.forEach(d => next.add(d.attachmentId));
      setSelectedAttachmentIds(next);
    }
  };

  const allSelected = selectedAttachmentIds.size === missingOcrAttachmentDetails.length && missingOcrAttachmentDetails.length > 0;
  const selectedCount = selectedAttachmentIds.size;

  return (
    <div className="border-t flex-shrink-0">
      {/* Collapsible Panel Header */}
      <button
        onClick={() => setExpandPanel(!expandPanel)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 font-semibold text-xs text-slate-700 border-b border-slate-100"
      >
        <span>🔍 Find Missing OCR {!expandPanel && missingOcrAttachmentDetails.length > 0 && <span className="ml-1 text-[10px] text-slate-500">({missingOcrAttachmentDetails.length})</span>}</span>
        {expandPanel ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {expandPanel && (
      <div className="p-3 space-y-3">
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
              // Selected detail items contain attachmentId only - caller must map to full attachment objects
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

      {/* Results after OCR completes - Collapsible */}
      {bulkOcrDetailedResults.length > 0 && !isBulkOcrRunning && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg">
          <button
            onClick={() => setExpandResults(!expandResults)}
            className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-slate-100 font-semibold text-xs text-slate-700"
          >
            <span>OCR Results: {bulkOcrDetailedResults.filter(r => r.status === "completed").length} ✅ {bulkOcrDetailedResults.filter(r => r.status === "failed").length} ❌ {bulkOcrDetailedResults.filter(r => r.status === "no_valid_forms").length} ⚠️</span>
            {expandResults ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
          {expandResults && (
            <div className="p-2 space-y-1 max-h-40 overflow-y-auto border-t border-slate-200 text-[10px]">
              {bulkOcrDetailedResults.map((result, i) => (
                <div key={i} className={`flex items-start gap-1 px-1 py-0.5 rounded ${
                  result.status === "completed" ? "bg-green-50 text-green-700" :
                  result.status === "failed" ? "bg-red-50 text-red-700" :
                  result.status === "no_valid_forms" ? "bg-amber-50 text-amber-700" :
                  "bg-slate-50 text-slate-600"
                }`}>
                  {result.status === "completed" && <CheckCircle2 className="w-3 h-3 flex-shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{result.fileName}</p>
                    {result.error && <p className="text-[9px]">{result.error}</p>}
                    {result.message && <p className="text-[9px]">{result.message}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Attachment list with selection - Collapsible */}
      {missingOcrAttachmentDetails.length > 0 && !isBulkOcrRunning && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg">
          <button
            onClick={() => setExpandAttachments(!expandAttachments)}
            className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-slate-100 font-semibold text-xs text-slate-700"
          >
            <span>{missingOcrAttachmentDetails.length} Attachments</span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-5 px-1 text-[10px]"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectAll();
                }}
              >
                {allSelected ? "Deselect All" : "Select All"}
              </Button>
              {expandAttachments ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </div>
          </button>
          {expandAttachments && (
            <div className="p-2 space-y-1 max-h-40 overflow-y-auto border-t border-slate-200">
              {missingOcrAttachmentDetails.map(att => (
                <div
                  key={att.attachmentId}
                  className="flex items-start gap-2 px-1 py-0.5 rounded hover:bg-slate-100 text-[10px] cursor-pointer"
                  onClick={() => {
                    // Immutable Set update
                    setSelectedAttachmentIds(prev => {
                      const next = new Set(prev);
                      if (next.has(att.attachmentId)) {
                        next.delete(att.attachmentId);
                      } else {
                        next.add(att.attachmentId);
                      }
                      return next;
                    });
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
                    <p className="text-slate-500 text-[9px]">{att.date} • {att.department}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}
        </div>
        )}
        </div>
        );
        }