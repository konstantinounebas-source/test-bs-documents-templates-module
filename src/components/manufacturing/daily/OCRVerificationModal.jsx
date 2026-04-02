import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Loader2, ZoomIn, ZoomOut, RotateCw, RotateCcw, Scan, Info, Check } from "lucide-react";

// Columns in the exact order of the physical form
const COLUMNS = [
  // Περιγραφή Κομματιών και Προγραμματισμός
  { key: "item_code",                           label: "Κωδικός Κομματιών",              group: "Περιγραφή & Προγρ/σμός" },
  { key: "batch_number",                        label: "Αρ. Παρτίδας",                   group: "Περιγραφή & Προγρ/σμός" },
  { key: "scheduled_quantity",                  label: "Ποσ. Προγρ/σμού",               group: "Περιγραφή & Προγρ/σμός" },
  { key: "initial_qc_stock_pull",               label: "Αντλ. από Stock",                group: "Περιγραφή & Προγρ/σμός", boolean: true },
  { key: "initial_qc_remake",                   label: "Remake",                         group: "Περιγραφή & Προγρ/σμός", boolean: true },
  // Ποιοτικός Έλεγχος Αρχικού Stock
  { key: "initial_qc_rusty",                    label: "Σκουριασμένα",                   group: "QC Αρχικού Stock", boolean: true },
  { key: "initial_qc_scratches_dents",          label: "Γδαρσίματα / Κτυπήματα",         group: "QC Αρχικού Stock", boolean: true },
  { key: "initial_qc_oils_primers_dirt",        label: "Λάδια / Αστάρια / Ακαθαρσίες",  group: "QC Αρχικού Stock", boolean: true },
  { key: "initial_qc_other_issues",             label: "Άλλα",                           group: "QC Αρχικού Stock", boolean: true },
  // Απαιτούμενες Συνήθεις Κατεργασίες
  { key: "required_treatments_zink",            label: "Zink",                           group: "Απαιτ. Κατεργασίες", boolean: true },
  { key: "required_treatments_sanding",         label: "Τρίψιμο",                        group: "Απαιτ. Κατεργασίες", boolean: true },
  { key: "required_treatments_color_masking",   label: "Διχρωμίες – Masking",            group: "Απαιτ. Κατεργασίες", boolean: true },
  { key: "required_treatments_fillers_silicone",label: "Ισοπό, Σιλικόνη, ΚΤΛ",          group: "Απαιτ. Κατεργασίες", boolean: true },
  // Επιπρόσθετες Κατεργασίες
  { key: "additional_treatments_total_pieces",  label: "Σύνολο κομματιών",               group: "Επιπρόσθ. Κατεργασίες" },
  { key: "additional_treatments_time_mins",     label: "Εκτίμηση Χρόνου (λεπτά)",       group: "Επιπρόσθ. Κατεργασίες" },
  // Προετοιμασία Βαφής
  { key: "paint_preparation_hanging",           label: "Κρέμασμα",                       group: "Προετ. Βαφής", boolean: true },
  { key: "paint_preparation_oven_cleaning",     label: "Καθαρ. Φούρνου",                group: "Προετ. Βαφής", boolean: true },
  // Τελευταία πεδία
  { key: "rework_from_dept_head",               label: "Επαναπροωθήσεις από Τμηματάρχη", group: "Λοιπά" },
  { key: "total_delivery_quantity",             label: "Συνολική Ποσότητα Παράδοσης",    group: "Λοιπά" },
  { key: "destroyed_beyond_repair",             label: "Καταστροφή – Πέραν Επιδιόρθωσης",group: "Λοιπά", boolean: true },
];

const GROUP_COLORS = {
  "Περιγραφή & Προγρ/σμός":  "bg-slate-100 text-slate-700",
  "QC Αρχικού Stock":         "bg-amber-50 text-amber-800",
  "Απαιτ. Κατεργασίες":       "bg-blue-50 text-blue-800",
  "Επιπρόσθ. Κατεργασίες":    "bg-purple-50 text-purple-800",
  "Προετ. Βαφής":             "bg-green-50 text-green-800",
  "Λοιπά":                    "bg-rose-50 text-rose-800",
};

export default function OCRVerificationModal({ open, onClose, fileUrl, fileName, ocrResult, onConfirm, department }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [lines, setLines] = useState(() => ocrResult?.corrected_data?.production_lines || ocrResult?.extracted_data?.production_lines || []);
  const [date, setDate] = useState(ocrResult?.corrected_data?.date || ocrResult?.extracted_data?.date || "");
  const [confirmed, setConfirmed] = useState(false);
  const [acceptedIssues, setAcceptedIssues] = useState(new Set());

  const issues = ocrResult?.validation?.issues || [];
  const confidence = ocrResult?.validation?.confidence_score ?? null;
  const isImage = fileName && ['jpg','jpeg','png','gif','webp','bmp'].includes(fileName.split('.').pop().toLowerCase());

  const getIssueKey = (iss, i) => `${iss.line_index}-${iss.field}-${i}`;

  const acceptIssue = (issueKey) => setAcceptedIssues(prev => new Set([...prev, issueKey]));

  const getActiveIssuesForCell = (lineIdx, field) =>
    issues.filter((iss, i) => iss.line_index === lineIdx && iss.field === field && !acceptedIssues.has(getIssueKey(iss, i)));

  const updateLine = (lineIdx, field, value) =>
    setLines(prev => prev.map((l, i) => i === lineIdx ? { ...l, [field]: value } : l));

  const errorCount = issues.filter((iss, i) => iss.severity === "error" && !acceptedIssues.has(getIssueKey(iss, i))).length;
  const warningCount = issues.filter((iss, i) => iss.severity === "warning" && !acceptedIssues.has(getIssueKey(iss, i))).length;

  // Group columns for header
  const groups = [];
  let lastGroup = null;
  COLUMNS.forEach(col => {
    if (col.group !== lastGroup) {
      groups.push({ label: col.group, count: 1 });
      lastGroup = col.group;
    } else {
      groups[groups.length - 1].count++;
    }
  });

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[98vw] w-[98vw] max-h-[96vh] p-0 overflow-hidden">
        <DialogHeader className="px-4 py-2 border-b bg-slate-50 flex-row items-center gap-3">
          <Scan className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <DialogTitle className="text-sm">OCR Επιβεβαίωση · {fileName}</DialogTitle>
          {confidence !== null && (
            <Badge className={`text-xs ${confidence >= 80 ? "bg-green-100 text-green-700" : confidence >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
              Εμπιστοσύνη: {confidence}%
            </Badge>
          )}
          {errorCount > 0 && <Badge className="bg-red-100 text-red-700 text-xs">{errorCount} Σφάλματα</Badge>}
          {warningCount > 0 && <Badge className="bg-amber-100 text-amber-700 text-xs">{warningCount} Προειδοποιήσεις</Badge>}
        </DialogHeader>

        <div className="flex h-[calc(96vh-100px)]">
          {/* LEFT: Image/PDF viewer */}
          <div className="w-[35%] border-r bg-slate-100 flex flex-col flex-shrink-0">
            <div className="flex items-center gap-2 px-3 py-2 border-b bg-white text-xs">
              <span className="text-slate-500 font-medium flex-1">Αρχείο</span>
              {isImage && (
                <>
                  <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} className="p-1 hover:bg-slate-100 rounded"><ZoomOut className="w-3.5 h-3.5" /></button>
                  <span className="text-slate-400 w-8 text-center">{Math.round(zoom*100)}%</span>
                  <button onClick={() => setZoom(z => Math.min(4, z + 0.25))} className="p-1 hover:bg-slate-100 rounded"><ZoomIn className="w-3.5 h-3.5" /></button>
                </>
              )}
              <button onClick={() => setRotation(r => r - 90)} className="p-1 hover:bg-slate-100 rounded"><RotateCcw className="w-3.5 h-3.5" /></button>
              <button onClick={() => setRotation(r => r + 90)} className="p-1 hover:bg-slate-100 rounded"><RotateCw className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex-1 overflow-auto flex items-start justify-center p-4">
              {isImage ? (
                <img src={fileUrl} alt={fileName}
                  style={{ transform: `rotate(${rotation}deg) scale(${zoom})`, transformOrigin: "top center", transition: "transform 0.2s", maxWidth: zoom > 1 ? "none" : "100%" }}
                />
              ) : (
                <iframe src={`https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(fileUrl)}`}
                  className="w-full h-full border-0 rounded" title={fileName}
                  style={{ transform: `rotate(${rotation}deg)`, transition: "transform 0.2s", minHeight: "500px" }}
                />
              )}
            </div>
          </div>

          {/* RIGHT: Horizontal table editor */}
          <div className="flex-1 flex flex-col bg-white min-w-0">
            {/* Date + department row */}
            <div className="px-4 py-2 border-b bg-slate-50 flex items-center gap-3 flex-shrink-0">
              <span className="text-xs font-semibold text-slate-600">Ημερομηνία:</span>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400" />
              {department && (
                <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1">{department}</span>
              )}
              <span className="text-xs text-slate-400 ml-auto">{lines.length} γραμμ{lines.length === 1 ? "ή" : "ές"}</span>
            </div>

            {/* Issues panel */}
            {issues.filter((iss, i) => !acceptedIssues.has(getIssueKey(iss, i))).length > 0 && (
              <div className="px-4 py-2 border-b bg-amber-50 flex-shrink-0 max-h-24 overflow-y-auto">
                {issues.map((iss, i) => {
                  const key = getIssueKey(iss, i);
                  if (acceptedIssues.has(key)) return null;
                  return (
                    <div key={i} className={`flex items-start gap-2 text-xs mb-1 ${iss.severity === "error" ? "text-red-700" : "text-amber-700"}`}>
                      {iss.severity === "error" ? <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> : <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
                      <span className="flex-1">
                        <strong>Γρ.{iss.line_index + 1} · {COLUMNS.find(c=>c.key===iss.field)?.label || iss.field}:</strong> {iss.message}{iss.suggested_fix ? ` → ${iss.suggested_fix}` : ""}
                      </span>
                      <button onClick={() => acceptIssue(key)}
                        className="flex-shrink-0 p-0.5 rounded bg-white border border-current hover:bg-green-50 hover:text-green-700 hover:border-green-400 transition-colors"
                        title="Αποδοχή">
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Horizontal table */}
            <div className="flex-1 overflow-auto">
              <table className="text-xs border-collapse w-max min-w-full">
                <thead className="sticky top-0 z-10">
                  {/* Group header row */}
                  <tr>
                    {groups.map((g, gi) => (
                      <th key={gi} colSpan={g.count}
                        className={`text-center px-1 py-1 border border-slate-300 font-semibold text-[10px] ${GROUP_COLORS[g.label] || "bg-slate-100"}`}>
                        {g.label}
                      </th>
                    ))}
                    <th className="bg-slate-100 border border-slate-300 px-1 py-1 text-[10px] text-slate-500">✓</th>
                  </tr>
                  {/* Column label row */}
                  <tr style={{ height: "80px" }}>
                    {COLUMNS.map(col => (
                      <th key={col.key}
                        className="bg-white border border-slate-200 font-medium text-slate-600 text-[10px] align-bottom p-0"
                        style={{ maxWidth: col.boolean ? "28px" : "52px", width: col.boolean ? "28px" : "52px" }}>
                        <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", padding: "4px 2px", lineHeight: "1.2", whiteSpace: "normal", maxHeight: "88px", overflow: "hidden" }}>
                          {col.label}
                        </div>
                      </th>
                    ))}
                    <th className="bg-white border border-slate-200 px-1 text-slate-400 text-[10px]" style={{ width: "28px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, lineIdx) => {
                    const lineIssues = issues.filter(iss => iss.line_index === lineIdx);
                    const allLineAccepted = lineIssues.length > 0 && lineIssues.every(iss => acceptedIssues.has(getIssueKey(iss, issues.indexOf(iss))));
                    const lineHasError = !allLineAccepted && lineIssues.some(iss => iss.severity === "error");
                    const lineHasWarn = !allLineAccepted && lineIssues.some(iss => iss.severity === "warning");
                    const rowBg = lineHasError ? "bg-red-50" : lineHasWarn ? "bg-amber-50" : lineIdx % 2 === 0 ? "bg-white" : "bg-slate-50";

                    return (
                      <tr key={lineIdx} className={rowBg}>
                        {COLUMNS.map(col => {
                          const cellIssues = getActiveIssuesForCell(lineIdx, col.key);
                          const hasErr = cellIssues.some(i => i.severity === "error");
                          const hasWarn = cellIssues.some(i => i.severity === "warning");
                          const allAccepted = issues.filter(iss => iss.line_index === lineIdx && iss.field === col.key)
                            .every(iss => acceptedIssues.has(getIssueKey(iss, issues.indexOf(iss))));
                          const origIssues = issues.filter(iss => iss.line_index === lineIdx && iss.field === col.key);
                          const cellBorder = hasErr ? "border-red-400" : hasWarn ? "border-amber-400" : "border-slate-200";
                          const cellBg = hasErr ? "bg-red-50" : hasWarn ? "bg-amber-50" : "";

                          return (
                            <td key={col.key}
                              className={`border border-slate-200 p-0 ${hasErr ? "bg-red-50" : hasWarn ? "bg-amber-50" : ""}`}
                              style={{ width: col.boolean ? "28px" : "52px" }}>
                              <div className="flex items-center justify-center gap-0.5 px-0.5 py-1">
                                {col.boolean ? (
                                  <input type="checkbox" checked={!!line[col.key]}
                                    onChange={e => updateLine(lineIdx, col.key, e.target.checked)}
                                    className="h-3.5 w-3.5 accent-blue-600" />
                                ) : (
                                  <input
                                    type={typeof line[col.key] === "number" ? "number" : "text"}
                                    value={line[col.key] ?? ""}
                                    onChange={e => updateLine(lineIdx, col.key, typeof line[col.key] === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
                                    min={0}
                                    className={`w-full text-xs border rounded px-1 py-0.5 outline-none focus:border-blue-400 ${cellBorder} ${cellBg}`}
                                  />
                                )}
                                {origIssues.length > 0 && (
                                  <button
                                    onClick={() => origIssues.forEach(iss => acceptIssue(getIssueKey(iss, issues.indexOf(iss))))}
                                    className={`flex-shrink-0 rounded border transition-colors ${
                                      allAccepted
                                        ? "border-green-400 text-green-600 bg-green-50 cursor-default"
                                        : hasErr ? "border-red-400 text-red-500 hover:bg-green-50 hover:text-green-700 hover:border-green-400"
                                        : "border-amber-400 text-amber-500 hover:bg-green-50 hover:text-green-700 hover:border-green-400"
                                    }`}
                                    title={allAccepted ? "Αποδεκτό" : "Αποδοχή"}
                                  >
                                    <Check className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          );
                        })}
                        {/* Accept all issues for this row */}
                        <td className="border border-slate-200 px-1 py-0.5 text-center">
                          {lineIssues.length > 0 && (
                            <button
                              onClick={() => lineIssues.forEach(iss => acceptIssue(getIssueKey(iss, issues.indexOf(iss))))}
                              className={`p-0.5 rounded border transition-colors ${
                                allLineAccepted
                                  ? "border-green-400 text-green-600 bg-green-50 cursor-default"
                                  : "border-amber-400 text-amber-500 bg-amber-50 hover:bg-green-50 hover:text-green-700 hover:border-green-400"
                              }`}
                              title={allLineAccepted ? "Όλα αποδεκτά" : "Αποδοχή όλων της γραμμής"}
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {lines.length === 0 && (
                    <tr>
                      <td colSpan={COLUMNS.length + 1} className="text-center py-8 text-slate-400 text-sm">
                        Δεν βρέθηκαν γραμμές παραγωγής στο OCR.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Confirm footer */}
            <div className="border-t px-4 py-3 flex items-center gap-3 bg-white flex-shrink-0">
              <Button variant="outline" size="sm" className="text-xs" onClick={onClose}>Ακύρωση</Button>
              <Button size="sm" className="flex-1 text-xs bg-green-600 hover:bg-green-700"
                onClick={() => { setConfirmed(true); onConfirm({ date, production_lines: lines }); }}
                disabled={confirmed}>
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