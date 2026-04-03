import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Upload, FileText, Image as ImageIcon, CheckCircle2, AlertCircle, SkipForward, X, Eye, Plus, Calendar, ZoomIn, ZoomOut, RotateCw, RotateCcw, Scan } from "lucide-react";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import { ocrProductionForm } from "@/functions/ocrProductionForm";
import OCRVerificationModal from "../OCRVerificationModal";
import { saveOCRData } from "./useOCRSave";

function todayStr() { return format(new Date(), "yyyy-MM-dd"); }

function getQuickDates() {
  const today = new Date();
  const dow = today.getDay();
  const dates = [
    { label: "Σήμερα", value: todayStr() },
    { label: "Χθες", value: format(subDays(today, 1), "yyyy-MM-dd") },
  ];
  if (dow === 1) dates.push({ label: "Παρ. Παρασκευή", value: format(subDays(today, 3), "yyyy-MM-dd") });
  if (dow === 6) dates.push({ label: "Παρασκευή", value: format(subDays(today, 1), "yyyy-MM-dd") });
  if (dow === 0) {
    dates.push({ label: "Σάββατο", value: format(subDays(today, 1), "yyyy-MM-dd") });
    dates.push({ label: "Παρασκευή", value: format(subDays(today, 2), "yyyy-MM-dd") });
  }
  return dates;
}

// ── Parse filename via AI ─────────────────────────────────────────────────────
async function parseFilenameWithAI(fileName, departments) {
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
  const today = todayStr();
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Αναλύσε το παρακάτω όνομα αρχείου και εξήγαγε πληροφορίες από αυτό.
Σημερινή ημερομηνία: ${today}
Διαθέσιμα τμήματα: ${departments.join(", ")}
Όνομα αρχείου: "${nameWithoutExt}"

Η αναμενόμενη μορφή είναι: [Ημερομηνία]_[Τμήμα]_[ΑριθμόςΣελίδαςFromΣυνολικέςΣελίδες]_[Περιγραφή]

ΚΡΙΣΙΜΟ - Αναγνώριση ημερομηνίας από το όνομα αρχείου:
Η ημερομηνία βρίσκεται ΠΑΝΤΑ στην ΑΡΧΗ του ονόματος, πριν τον κάτω παύλα (_).
Υποστηριζόμενες μορφές (με παραδείγματα):
  - D-M-YY  → "3-2-26" = 3 Φεβρουαρίου 2026 → "2026-02-03"
  - D-M-YYYY → "3-2-2026" = 3 Φεβρουαρίου 2026 → "2026-02-03"  
  - DD-MM-YY → "03-02-26" = 3 Φεβρουαρίου 2026 → "2026-02-03"
  - DD-MM-YYYY → "03-02-2026" → "2026-02-03"
  - YYYYMMDD → "20260203" → "2026-02-03"
  - YYYY-MM-DD → "2026-02-03" → "2026-02-03"
  - Αν δεν υπάρχει ημερομηνία στην αρχή → date=null (ΜΗΝ χρησιμοποιείς τη σημερινή ημερομηνία)

ΠΡΟΣΟΧΗ: Αν το πρώτο τμήμα (πριν _) ξεκινά με αριθμό, είναι ΣΙΓΟΥΡΑ ημερομηνία. 
Παράδειγμα: "3-2-26_FA_SubAssembly_1From5" → ημερομηνία=3/2/2026, τμήμα=Sub-assembly (από λίστα)
Παράδειγμα: "20260316_Assembly_1From3_DailyReport" → ημερομηνία=2026-03-16, τμήμα=Assembly

Κανόνες:
- Το τμήμα μπορεί να είναι παρόμοιο με τη λίστα (π.χ. "SubAssembly" ή "FA_SubAssembly" → "Sub-assembly")
- Ο αριθμός σελίδας εμφανίζεται ως "1From5" (σελίδα 1 από 5)
- Αν δεν μπορείς να αναγνωρίσεις το τμήμα, βάλε department=null

Επέστρεψε JSON με τα εξής πεδία:
- date: string (YYYY-MM-DD) ή null — ΠΟΤΕ μη βάζεις τη σημερινή αν δεν υπάρχει στο όνομα
- department: string (ακριβές όνομα από τη λίστα) ή null
- page_number: number ή null
- total_pages: number ή null  
- description: string ή null
- confidence: "high" | "medium" | "low"`,
    response_json_schema: {
      type: "object",
      properties: {
        date: { type: "string" },
        department: { type: "string" },
        page_number: { type: "number" },
        total_pages: { type: "number" },
        description: { type: "string" },
        confidence: { type: "string" }
      }
    }
  });
  return result;
}

// ── File Preview Dialog ───────────────────────────────────────────────────────
function FilePreviewDialog({ file, onClose }) {
  const [objectUrl, setObjectUrl] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const isImage = file?.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const isPdf = file?.name.match(/\.pdf$/i);

  useEffect(() => {
    if (!file) return;
    setZoom(1);
    setRotation(0);
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <Dialog open={!!file} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl w-[90vw]">
        <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b">
          <DialogTitle className="text-sm truncate max-w-xs">{file?.name}</DialogTitle>
          {isImage && (
            <div className="flex gap-1 items-center">
              <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} className="text-slate-500 hover:text-slate-700 p-1.5 rounded hover:bg-slate-100" title="Zoom Out">
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(4, z + 0.25))} className="text-slate-500 hover:text-slate-700 p-1.5 rounded hover:bg-slate-100" title="Zoom In">
                <ZoomIn className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-slate-200 mx-1" />
              <button onClick={() => setRotation(r => r - 90)} className="text-slate-500 hover:text-slate-700 p-1.5 rounded hover:bg-slate-100" title="Rotate Left">
                <RotateCcw className="w-4 h-4" />
              </button>
              <button onClick={() => setRotation(r => r + 90)} className="text-slate-500 hover:text-slate-700 p-1.5 rounded hover:bg-slate-100" title="Rotate Right">
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          )}
        </DialogHeader>
        <div className="flex items-center justify-center bg-slate-50 rounded-lg overflow-auto" style={{ maxHeight: "70vh" }}>
          {!objectUrl ? (
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          ) : isImage ? (
            <img
              src={objectUrl}
              alt={file?.name}
              style={{
                transform: `rotate(${rotation}deg) scale(${zoom})`,
                transition: 'transform 0.3s ease',
                transformOrigin: 'center center',
                maxWidth: zoom > 1 ? 'none' : '100%',
              }}
            />
          ) : isPdf ? (
            <iframe src={objectUrl} className="w-full border-0 rounded-lg" style={{ height: '70vh' }} title={file?.name} />
          ) : (
            <iframe src={objectUrl} className="w-full h-[60vh] border-0 rounded-lg" title={file?.name} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Single file result card ───────────────────────────────────────────────────
function FileResultCard({ item, departments, batchHeaders, allBundles, dailyAssignments, scheduledDayHeaders, onConfirm, onSkip }) {
  const [date, setDate] = useState(item.parsed?.date || "");
  const [dept, setDept] = useState(item.parsed?.department || "");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState(null);

  const handleOCR = async () => {
    setOcrLoading(true);
    try {
      // Upload file first to get a URL for OCR
      let fileUrl = uploadedUrl;
      if (!fileUrl) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: item.file });
        fileUrl = file_url;
        setUploadedUrl(file_url);
      }
      const result = await ocrProductionForm({ file_url: fileUrl });
      setOcrResult(result.data);
      setShowOcrModal(true);
    } catch (err) {
      toast.error(`OCR σφάλμα: ${err?.message || "Άγνωστο σφάλμα"}`);
    } finally {
      setOcrLoading(false);
    }
  };

  const matchedBatch = batchHeaders.find(b => b.date === date && b.department === dept);

  return (
    <>
      <FilePreviewDialog file={previewOpen ? item.file : null} onClose={() => setPreviewOpen(false)} />
      {showOcrModal && ocrResult && (
        <OCRVerificationModal
          open={showOcrModal}
          onClose={() => setShowOcrModal(false)}
          fileUrl={uploadedUrl || URL.createObjectURL(item.file)}
          fileName={item.file.name}
          ocrResult={ocrResult}
          department={dept}
          departments={departments}
          onConfirm={(confirmed) => {
            setShowOcrModal(false);
            const batch = batchHeaders.find(b => b.date === date && b.department === dept);
            if (batch) {
              saveOCRData(confirmed, batch.id, () => {});
            } else {
              toast.warning("Αποθηκεύτηκε OCR αλλά δεν βρέθηκε batch για αποθήκευση δεδομένων.");
            }
          }}
        />
      )}

      <div className="border rounded-lg p-3 space-y-2 bg-white text-xs">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {item.file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)
              ? <ImageIcon className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
              : <FileText className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
            <span className="truncate font-medium text-slate-700">{item.file.name}</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={handleOCR}
              disabled={ocrLoading}
              className="text-purple-500 hover:text-purple-700 p-0.5 disabled:opacity-50"
              title="OCR Εξαγωγή δεδομένων"
            >
              {ocrLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scan className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => setPreviewOpen(true)} className="text-slate-400 hover:text-blue-600" title="Προεπισκόπηση">
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onSkip(item.file.name)} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {item.parsed?.description && (
          <p className="text-slate-500 text-[10px]">📝 {item.parsed.description}</p>
        )}
        {item.parsed?.page_number && item.parsed?.total_pages && (
          <p className="text-slate-500 text-[10px]">📄 Σελίδα {item.parsed.page_number} / {item.parsed.total_pages}</p>
        )}

        {item.parsed?.confidence === "low" && (
          <div className="flex items-center gap-1 text-orange-600 bg-orange-50 rounded p-1.5 text-[10px]">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            Χαμηλή βεβαιότητα ανάλυσης — επιβεβαίωσε τα στοιχεία
          </div>
        )}

        <div>
          <p className="text-[10px] font-semibold text-slate-500 mb-0.5">Τμήμα *</p>
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Επίλεξε τμήμα" />
            </SelectTrigger>
            <SelectContent>
              {departments.map(d => (
                <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <p className="text-[10px] font-semibold text-slate-500 mb-0.5">
            Ημερομηνία *
            {!item.parsed?.date && <span className="text-orange-500 ml-1">(δεν βρέθηκε στο όνομα)</span>}
          </p>
          <Input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="h-7 text-xs"
            max={todayStr()}
          />
        </div>

        {date && dept && (() => {
          const activeBundle = resolveBundle(date, dept, allBundles, dailyAssignments, scheduledDayHeaders);
          return (
            <>
              <div className={`flex items-center gap-1.5 rounded p-1.5 text-[10px] ${
                matchedBatch ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"
              }`}>
                {matchedBatch
                  ? <><CheckCircle2 className="w-3 h-3" /> Batch βρέθηκε: {matchedBatch.date} · {matchedBatch.department}</>
                  : <><AlertCircle className="w-3 h-3" /> Δεν βρέθηκε batch — θα δημιουργηθεί νέο</>
                }
              </div>
              {!matchedBatch && !activeBundle && (
                <div className="flex items-center gap-1.5 rounded p-1.5 text-[10px] bg-red-50 text-red-700">
                  <AlertCircle className="w-3 h-3" /> Δεν βρέθηκε bundle. Αδύνατη η δημιουργία batch.
                </div>
              )}
            </>
          );
        })()}

        <div className="flex gap-1.5">
          <Button
            size="sm"
            className={`flex-1 text-xs ${matchedBatch ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}`}
            disabled={!date || !dept}
            onClick={() => onConfirm(item.file, { date, dept, matchedBatch, parsed: item.parsed })}
          >
            {matchedBatch
              ? <><CheckCircle2 className="w-3 h-3 mr-1" /> Αποθήκευση στο Batch</>
              : <><Plus className="w-3 h-3 mr-1" /> Δημιουργία Batch & Αποθήκευση</>
            }
          </Button>
          <Button size="sm" variant="outline" className="text-xs" onClick={() => onSkip(item.file.name)}>
            Παράλειψη
          </Button>
        </div>
      </div>
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
function resolveBundle(date, dept, allBundles, dailyAssignments, scheduledDayHeaders) {
  const da = dailyAssignments.find(a => a.assignment_date === date && a.department_id === dept);
  if (da?.standards_bundle_id) return allBundles.find(b => b.id === da.standards_bundle_id);
  const sh = scheduledDayHeaders.find(h => h.date === date && h.department_id === dept);
  if (sh?.source_bundle_id) return allBundles.find(b => b.id === sh.source_bundle_id);
  return allBundles.find(b => b.department === dept && b.status === "ACTIVE");
}

export default function ChatStepFileUpload({ departments = [], batchHeaders = [], allBundles = [], dailyAssignments = [], scheduledDayHeaders = [], onFilesSaved, onBatchReady, onSkip }) {
  const [dragging, setDragging] = useState(false);
  const [queue, setQueue] = useState([]);
  const [isParsing, setIsParsing] = useState(false);
  const [uploadingNames, setUploadingNames] = useState(new Set());
  const inputRef = useRef();

  // Manual dept/date selection (for "continue without files")
  const [manualDept, setManualDept] = useState("");
  const [manualDate, setManualDate] = useState(todayStr());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDate, setCustomDate] = useState("");

  const quickDates = getQuickDates();
  const deptNames = departments.map(d => d.name || d).filter(Boolean);

  const handleFiles = async (files) => {
    const validFiles = Array.from(files).filter(f => {
      if (f.size > 50 * 1024 * 1024) { toast.error(`${f.name} υπερβαίνει 50MB`); return false; }
      return true;
    });
    if (!validFiles.length) return;

    const newItems = validFiles.map(f => ({ file: f, status: "parsing", parsed: null }));
    setQueue(prev => [...prev, ...newItems]);
    setIsParsing(true);

    const parsed = await Promise.all(
      validFiles.map(f => parseFilenameWithAI(f.name, deptNames).catch(() => null))
    );

    setQueue(prev => {
      const updated = [...prev];
      validFiles.forEach((f, i) => {
        const idx = updated.findIndex(q => q.file === f && q.status === "parsing");
        if (idx >= 0) {
          updated[idx] = { file: f, status: "ready", parsed: parsed[i] };
        }
      });
      return updated;
    });
    setIsParsing(false);
  };

  const handleConfirm = async (file, { date, dept, matchedBatch, parsed }) => {
    setUploadingNames(prev => new Set([...prev, file.name]));
    try {
      let batch = matchedBatch;

      if (!batch) {
        const bundle = resolveBundle(date, dept, allBundles, dailyAssignments, scheduledDayHeaders);
        if (!bundle) {
          onFilesSaved && onFilesSaved(file.name, null, { error: "no_bundle", dept, date });
          toast.error(`❌ Δεν βρέθηκε ενεργό bundle για το τμήμα "${dept}". Αδύνατη η δημιουργία batch.`);
          return;
        }
        const scheduledData = await base44.entities.ScheduledData.filter({ date, department_id: dept });
        const batchData = {
          date,
          department: dept,
          has_scheduled_data: scheduledData.length > 0,
          bundle_id: bundle.id
        };
        batch = await base44.entities.BatchHeader.create(batchData);
        if (scheduledData.length > 0) {
          const lines = scheduledData.map(sd => ({
            batch_header_id: batch.id, item_code: sd.item_code,
            scheduled_qty: sd.ops_qty || 0, qty_processed: 0, qty_out_good: 0, qty_scrap: 0
          }));
          await base44.entities.Batch_Lines.bulkCreate(lines);
        }
        toast.info(`📦 Batch δημιουργήθηκε: ${date} · ${dept}`);
      }

      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const me = await base44.auth.me();

      await base44.entities.BatchAttachment.create({
        file_url,
        file_name: file.name,
        department: dept,
        batch_header_id: batch.id,
        uploaded_by: me.email,
        notes: [
          parsed?.description,
          parsed?.page_number && parsed?.total_pages ? `Σελίδα ${parsed.page_number}/${parsed.total_pages}` : null
        ].filter(Boolean).join(" | ")
      });

      setQueue(prev => prev.map(q => q.file === file ? { ...q, status: "done", batch } : q));
      onFilesSaved && onFilesSaved(file.name, batch);
      toast.success(`✅ "${file.name}" αποθηκεύτηκε`);
    } catch (err) {
      toast.error(`❌ Σφάλμα: ${err?.message}`);
    } finally {
      setUploadingNames(prev => { const n = new Set(prev); n.delete(file.name); return n; });
    }
  };

  const handleSkip = (fileName) => {
    setQueue(prev => prev.map(q => q.file.name === fileName ? { ...q, status: "skipped" } : q));
  };

  // "Continue without files" → pass dept+date to parent so it can proceed to dept/date/batch steps
  const handleContinueWithoutFiles = () => {
    if (!manualDept) { toast.error("Επίλεξε τμήμα πρώτα"); return; }
    if (!manualDate) { toast.error("Επίλεξε ημερομηνία πρώτα"); return; }
    onBatchReady && onBatchReady({ dept: manualDept, date: manualDate });
  };

  const readyCount = queue.filter(q => q.status === "ready").length;
  const doneCount = queue.filter(q => q.status === "done").length;
  const parsingCount = queue.filter(q => q.status === "parsing").length;
  const allProcessed = queue.length > 0 && queue.every(q => q.status === "done" || q.status === "skipped");

  return (
    <div className="border-t p-3 space-y-3 overflow-y-auto max-h-[520px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-700">📎 Ανέβασμα Αρχείων</p>
        <Button variant="ghost" size="sm" className="text-xs h-6 text-slate-400" onClick={onSkip}>
          <SkipForward className="w-3 h-3 mr-1" /> Παράλειψη
        </Button>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
          ${dragging ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50 hover:border-slate-400"}`}
      >
        <input ref={inputRef} type="file" multiple accept="image/*,application/pdf,.pdf" className="hidden"
          onChange={e => handleFiles(e.target.files)} />
        {isParsing
          ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-400 mb-1" />
          : <Upload className="w-5 h-5 mx-auto text-slate-400 mb-1" />}
        <p className="text-xs font-medium text-slate-600">Drag & drop ή κάνε κλικ</p>
        <p className="text-[10px] text-slate-400">Πολλαπλά αρχεία · PDF & εικόνες · max 50MB</p>
      </div>

      {/* Parsing indicator */}
      {parsingCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 rounded p-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Ανάλυση {parsingCount} αρχείο(ων) με AI...
        </div>
      )}

      {/* Summary */}
      {queue.length > 0 && (
        <div className="text-[10px] text-slate-500 flex gap-3">
          <span>Σύνολο: {queue.length}</span>
          {readyCount > 0 && <span className="text-orange-600">⏳ Εκκρεμή: {readyCount}</span>}
          {doneCount > 0 && <span className="text-green-600">✅ Αποθηκεύτηκαν: {doneCount}</span>}
        </div>
      )}

      {/* File cards */}
      <div className="space-y-2">
        {queue
          .filter(q => q.status === "ready")
          .map((item, i) => (
            <FileResultCard
              key={`${item.file.name}-${i}`}
              item={item}
              departments={deptNames}
              batchHeaders={batchHeaders}
              allBundles={allBundles}
              dailyAssignments={dailyAssignments}
              scheduledDayHeaders={scheduledDayHeaders}
              onConfirm={handleConfirm}
              onSkip={handleSkip}
            />
          ))}
      </div>

      {/* Done items */}
      {doneCount > 0 && (
        <div className="space-y-1">
          {queue.filter(q => q.status === "done").map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px] text-green-700 bg-green-50 rounded px-2 py-1">
              <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{item.file.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Continue with a batch (with or without files) ── */}
      <div className="border rounded-lg p-3 space-y-2 bg-slate-50">
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
          {allProcessed ? "✅ Συνέχεια για καταχώριση παραγωγής" : "Ή συνέχισε χωρίς αρχεία"}
        </p>

        {/* Department selector */}
        <div>
          <p className="text-[10px] font-semibold text-slate-500 mb-0.5">Τμήμα *</p>
          <Select value={manualDept} onValueChange={setManualDept}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Επίλεξε τμήμα" />
            </SelectTrigger>
            <SelectContent>
              {deptNames.map(d => (
                <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quick date buttons */}
        <div>
          <p className="text-[10px] font-semibold text-slate-500 mb-1">Ημερομηνία *</p>
          <div className="flex flex-wrap gap-1">
            {quickDates.map(qd => (
              <button
                key={qd.value}
                onClick={() => { setManualDate(qd.value); setShowDatePicker(false); }}
                className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                  manualDate === qd.value
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-300 hover:border-blue-400"
                }`}
              >
                {qd.label}
              </button>
            ))}
            <button
              onClick={() => setShowDatePicker(v => !v)}
              className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                showDatePicker ? "bg-blue-100 text-blue-700 border-blue-400" : "bg-white text-slate-600 border-slate-300 hover:border-blue-400"
              }`}
            >
              <Calendar className="w-3 h-3 inline mr-0.5" /> Άλλη...
            </button>
          </div>
          {showDatePicker && (
            <div className="flex gap-1 mt-1">
              <Input
                type="date"
                value={customDate}
                onChange={e => setCustomDate(e.target.value)}
                className="h-7 text-xs flex-1"
                max={todayStr()}
              />
              <Button size="sm" className="h-7 text-xs" disabled={!customDate}
                onClick={() => { setManualDate(customDate); setShowDatePicker(false); }}>
                OK
              </Button>
            </div>
          )}
          {manualDate && (
            <p className="text-[10px] text-blue-700 mt-0.5">📅 {manualDate}</p>
          )}
        </div>

        <Button
          size="sm"
          className="w-full text-xs bg-blue-600 hover:bg-blue-700"
          disabled={!manualDept || !manualDate}
          onClick={handleContinueWithoutFiles}
        >
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Συνέχεια → Batch {allProcessed ? "(αρχεία αποθηκεύτηκαν)" : ""}
        </Button>
      </div>
    </div>
  );
}