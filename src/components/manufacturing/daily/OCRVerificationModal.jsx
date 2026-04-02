import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, CheckCircle2, Loader2, ZoomIn, ZoomOut, RotateCw, RotateCcw, Scan, Info, Check } from "lucide-react";

const FIELD_LABELS = {
  item_code: "Κωδικός",
  batch_number: "Αρ. Παρτίδας",
  scheduled_quantity: "Ποσ. Προγρ/σμού",
  initial_qc_stock_pull: "Αντλ. Stock",
  initial_qc_remake: "Remake",
  initial_qc_rusty: "Σκουριασμένα",
  initial_qc_scratches_dents: "Γδαρσίματα",
  initial_qc_oils_primers_dirt: "Λάδια/Αστάρια",
  initial_qc_other_issues: "Άλλα",
  required_treatments_zink: "Zink",
  required_treatments_sanding: "Τρίψιμο",
  required_treatments_color_masking: "Masking",
  required_treatments_fillers_silicone: "Ισοπό/Σιλικόνη",
  additional_treatments_total_pieces: "Σύνολο κομματιών",
  additional_treatments_time_mins: "Χρόνος (λεπτά)",
  paint_preparation_hanging: "Κρέμασμα",
  paint_preparation_oven_cleaning: "Καθαρ. Φούρνου",
  rework_from_dept_head: "Επαναπροωθήσεις",
  total_delivery_quantity: "Σύν. Παράδοσης",
  destroyed_beyond_repair: "Καταστροφή"
};

const BOOLEAN_FIELDS = [
  "initial_qc_stock_pull","initial_qc_remake","initial_qc_rusty","initial_qc_scratches_dents",
  "initial_qc_oils_primers_dirt","initial_qc_other_issues","required_treatments_zink",
  "required_treatments_sanding","required_treatments_color_masking","required_treatments_fillers_silicone",
  "paint_preparation_hanging","paint_preparation_oven_cleaning","destroyed_beyond_repair"
];

function FieldCell({ fieldKey, value, issuesForField, onChange, disabled }) {
  const hasError = issuesForField?.some(i => i.severity === "error");
  const hasWarning = issuesForField?.some(i => i.severity === "warning");
  const borderClass = hasError ? "border-red-400 bg-red-50" : hasWarning ? "border-amber-400 bg-amber-50" : "border-slate-200";

  if (BOOLEAN_FIELDS.includes(fieldKey)) {
    return (
      <input
        type="checkbox"
        checked={!!value}
        onChange={e => onChange(e.target.checked)}
        disabled={disabled}
        className="h-4 w-4 accent-blue-600"
      />
    );
  }

  return (
    <input
      type={typeof value === "number" ? "number" : "text"}
      value={value ?? ""}
      onChange={e => onChange(typeof value === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
      disabled={disabled}
      min={0}
      className={`w-full text-xs border rounded px-1.5 py-1 outline-none focus:border-blue-400 ${borderClass}`}
    />
  );
}

export default function OCRVerificationModal({ open, onClose, fileUrl, fileName, ocrResult, onConfirm }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [lines, setLines] = useState(() => ocrResult?.corrected_data?.production_lines || ocrResult?.extracted_data?.production_lines || []);
  const [date, setDate] = useState(ocrResult?.corrected_data?.date || ocrResult?.extracted_data?.date || "");
  const [activeLineIdx, setActiveLineIdx] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [acceptedIssues, setAcceptedIssues] = useState(new Set());

  const issues = ocrResult?.validation?.issues || [];
  const confidence = ocrResult?.validation?.confidence_score ?? null;

  const acceptIssue = (issueKey) => {
    setAcceptedIssues(prev => new Set([...prev, issueKey]));
  };

  const getIssueKey = (iss, i) => `${iss.line_index}-${iss.field}-${i}`;
  const isImage = fileName && ['jpg','jpeg','png','gif','webp','bmp'].includes(fileName.split('.').pop().toLowerCase());

  const getIssuesForLine = (lineIdx, field) =>
    issues.filter((iss, i) => iss.line_index === lineIdx && iss.field === field && !acceptedIssues.has(getIssueKey(iss, issues.indexOf(iss))));

  const updateLine = (lineIdx, field, value) => {
    setLines(prev => prev.map((l, i) => i === lineIdx ? { ...l, [field]: value } : l));
  };

  const allFields = Object.keys(FIELD_LABELS);
  const activeLine = lines[activeLineIdx];
  const activeLineIssues = issues.filter((iss, i) => iss.line_index === activeLineIdx && !acceptedIssues.has(getIssueKey(iss, i)));
  const errorCount = issues.filter((iss, i) => iss.severity === "error" && !acceptedIssues.has(getIssueKey(iss, i))).length;
  const warningCount = issues.filter((iss, i) => iss.severity === "warning" && !acceptedIssues.has(getIssueKey(iss, i))).length;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[98vw] w-[98vw] max-h-[96vh] p-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b bg-slate-50 flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <Scan className="w-5 h-5 text-blue-600" />
            <DialogTitle className="text-base">OCR Επιβεβαίωση · {fileName}</DialogTitle>
            {confidence !== null && (
              <Badge className={`text-xs ${confidence >= 80 ? "bg-green-100 text-green-700" : confidence >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                Εμπιστοσύνη: {confidence}%
              </Badge>
            )}
            {errorCount > 0 && <Badge className="bg-red-100 text-red-700 text-xs">{errorCount} Σφάλματα</Badge>}
            {warningCount > 0 && <Badge className="bg-amber-100 text-amber-700 text-xs">{warningCount} Προειδοποιήσεις</Badge>}
          </div>
        </DialogHeader>

        <div className="flex h-[calc(96vh-120px)]">
          {/* LEFT: Image/PDF viewer */}
          <div className="w-[65%] border-r bg-slate-100 flex flex-col">
            <div className="flex items-center gap-2 px-3 py-2 border-b bg-white text-xs">
              <span className="text-slate-500 font-medium flex-1">Αρχείο</span>
              {isImage && (
                <>
                  <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} className="p-1 hover:bg-slate-100 rounded">
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-slate-400 w-8 text-center">{Math.round(zoom*100)}%</span>
                  <button onClick={() => setZoom(z => Math.min(4, z + 0.25))} className="p-1 hover:bg-slate-100 rounded">
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              <button onClick={() => setRotation(r => r - 90)} className="p-1 hover:bg-slate-100 rounded"><RotateCcw className="w-3.5 h-3.5" /></button>
              <button onClick={() => setRotation(r => r + 90)} className="p-1 hover:bg-slate-100 rounded"><RotateCw className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex-1 overflow-auto flex items-start justify-center p-4">
              {isImage ? (
                <img
                  src={fileUrl}
                  alt={fileName}
                  style={{ transform: `rotate(${rotation}deg) scale(${zoom})`, transformOrigin: "top center", transition: "transform 0.2s", maxWidth: zoom > 1 ? "none" : "100%" }}
                />
              ) : (
                <iframe
                  src={`https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(fileUrl)}`}
                  className="w-full h-full border-0 rounded"
                  title={fileName}
                  style={{ transform: `rotate(${rotation}deg)`, transition: "transform 0.2s", minHeight: "500px" }}
                />
              )}
            </div>
          </div>

          {/* RIGHT: Data editor */}
          <div className="w-[35%] flex flex-col bg-white">
            {/* Date row */}
            <div className="px-4 py-2 border-b bg-slate-50 flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-600">Ημερομηνία:</span>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400"
              />
              <span className="text-xs text-slate-400 ml-auto">{lines.length} γραμμ{lines.length === 1 ? "ή" : "ές"}</span>
            </div>

            {/* Line tabs */}
            {lines.length > 1 && (
              <div className="flex gap-1 px-4 pt-2 flex-wrap border-b pb-2 bg-slate-50">
                {lines.map((l, i) => {
                  const lIssues = issues.filter(iss => iss.line_index === i);
                  const hasErr = lIssues.some(iss => iss.severity === "error");
                  const hasWarn = lIssues.some(iss => iss.severity === "warning");
                  return (
                    <button
                      key={i}
                      onClick={() => setActiveLineIdx(i)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        activeLineIdx === i ? "bg-blue-600 text-white border-blue-600" :
                        hasErr ? "border-red-400 text-red-600 bg-red-50" :
                        hasWarn ? "border-amber-400 text-amber-600 bg-amber-50" :
                        "border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {l.item_code || `Γραμμή ${i+1}`}
                      {hasErr && " ⚠️"}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Active line issues */}
            {activeLineIssues.length > 0 && (
              <div className="px-4 py-2 space-y-1 border-b bg-amber-50">
                {activeLineIssues.map((iss, i) => {
                  const issueKey = getIssueKey(iss, issues.indexOf(iss));
                  return (
                    <div key={i} className={`flex items-start gap-2 text-xs ${iss.severity === "error" ? "text-red-700" : "text-amber-700"}`}>
                      {iss.severity === "error" ? <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> : <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
                      <span className="flex-1"><strong>{FIELD_LABELS[iss.field] || iss.field}:</strong> {iss.message}{iss.suggested_fix ? ` → ${iss.suggested_fix}` : ""}</span>
                      <button
                        onClick={() => acceptIssue(issueKey)}
                        className="flex-shrink-0 p-0.5 rounded bg-white border border-current hover:bg-green-50 hover:text-green-700 hover:border-green-400 transition-colors"
                        title="Αποδοχή - αγνόησε αυτή την προειδοποίηση"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Fields grid */}
            <ScrollArea className="flex-1 px-4 py-3">
              {activeLine ? (
                <div className="space-y-2">
                  {allFields.map(field => {
                    const fieldIssues = getIssuesForLine(activeLineIdx, field);
                    return (
                      <div key={field} className="flex items-center gap-2">
                        <label className="text-xs text-slate-500 w-36 flex-shrink-0">{FIELD_LABELS[field]}</label>
                        <div className="flex-1">
                          <FieldCell
                            fieldKey={field}
                            value={activeLine[field]}
                            issuesForField={fieldIssues}
                            onChange={v => updateLine(activeLineIdx, field, v)}
                          />
                        </div>
                        {(() => {
                          const allAccepted = issues
                            .filter(iss => iss.line_index === activeLineIdx && iss.field === field)
                            .every((iss, _, arr) => acceptedIssues.has(getIssueKey(iss, issues.indexOf(iss))));
                          const originalIssues = issues.filter(iss => iss.line_index === activeLineIdx && iss.field === field);
                          if (originalIssues.length === 0) return null;
                          return (
                            <button
                              onClick={() => {
                                if (!allAccepted) {
                                  originalIssues.forEach(iss => acceptIssue(getIssueKey(iss, issues.indexOf(iss))));
                                }
                              }}
                              className={`flex-shrink-0 p-0.5 rounded border transition-colors ${
                                allAccepted
                                  ? "border-green-400 text-green-600 bg-green-50 cursor-default"
                                  : `hover:bg-green-50 hover:text-green-700 hover:border-green-400 ${originalIssues[0].severity === "error" ? "border-red-400 text-red-500 bg-red-50" : "border-amber-400 text-amber-500 bg-amber-50"}`
                              }`}
                              title={allAccepted ? "Αποδεκτό" : `Αποδοχή: ${originalIssues[0].message}`}
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-8">Δεν βρέθηκαν γραμμές παραγωγής στο OCR.</p>
              )}
            </ScrollArea>

            {/* Confirm footer */}
            <div className="border-t px-4 py-3 flex items-center gap-3 bg-white">
              <Button variant="outline" size="sm" className="text-xs" onClick={onClose}>
                Ακύρωση
              </Button>
              <Button
                size="sm"
                className="flex-1 text-xs bg-green-600 hover:bg-green-700"
                onClick={() => {
                  setConfirmed(true);
                  onConfirm({ date, production_lines: lines });
                }}
                disabled={confirmed}
              >
                {confirmed ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                Επιβεβαίωση δεδομένων OCR
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}