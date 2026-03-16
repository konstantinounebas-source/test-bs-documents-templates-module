import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Upload, FileText, Image as ImageIcon, CheckCircle2, AlertCircle, SkipForward, X, Eye, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

function todayStr() { return format(new Date(), "yyyy-MM-dd"); }

// ── Parse filename via AI ─────────────────────────────────────────────────────
async function parseFilenameWithAI(fileName, departments) {
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
  const today = todayStr();
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Αναλύσε το παρακάτω όνομα αρχείου και εξήγαγε πληροφορίες από αυτό.
Σημερινή ημερομηνία: ${today}
Διαθέσιμα τμήματα: ${departments.join(", ")}
Όνομα αρχείου: "${nameWithoutExt}"

Η αναμενόμενη μορφή είναι: [Ημερομηνία]_[Τμήμα]_[ΑριθμόςΣελίδαςFrom ΣυνολικέςΣελίδες]_[Περιγραφή]
Παραδείγματα: "20260316_Assembly_1From3_DailyReport", "Assembly_2From5", "20260316_Paint", "Report_Assembly"

Κανόνες:
- Η ημερομηνία μπορεί να είναι σε μορφές: YYYYMMDD, DD-MM-YYYY, YYYY-MM-DD, ή να ΛΕΙΠΕΙ εντελώς (τότε date=null)
- Το τμήμα μπορεί να είναι παρόμοιο με τη λίστα (π.χ. "Assembl" → "Assembly")
- Ο αριθμός σελίδας μπορεί να ΛΕΙΠΕΙ (τότε page_number=null, total_pages=null)
- Η περιγραφή μπορεί να ΛΕΙΠΕΙ (τότε description=null)
- Αν δεν μπορείς να αναγνωρίσεις το τμήμα, βάλε department=null

Επέστρεψε JSON με τα εξής πεδία:
- date: string (YYYY-MM-DD) ή null
- department: string (ακριβές όνομα από τη λίστα) ή null
- page_number: number ή null
- total_pages: number ή null  
- description: string ή null
- confidence: "high" | "medium" | "low" (πόσο σίγουρος είσαι για την ανάλυση)`,
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
  const isImage = file?.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <Dialog open={!!file} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-sm truncate">{file?.name}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center bg-slate-50 rounded-lg overflow-auto" style={{ maxHeight: "65vh" }}>
          {objectUrl && isImage ? (
            <img src={objectUrl} alt={file?.name} className="max-w-full max-h-full object-contain" />
          ) : objectUrl ? (
            <iframe src={objectUrl} className="w-full h-[60vh] border-0 rounded-lg" title={file?.name} />
          ) : (
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Single file processing result card ───────────────────────────────────────
function FileResultCard({ item, departments, batchHeaders, onConfirm, onSkip }) {
  const [date, setDate] = useState(item.parsed?.date || "");
  const [dept, setDept] = useState(item.parsed?.department || "");
  const [previewOpen, setPreviewOpen] = useState(false);

  const matchedBatch = batchHeaders.find(b => b.date === date && b.department === dept);

  return (
    <>
      <FilePreviewDialog file={previewOpen ? item.file : null} onClose={() => setPreviewOpen(false)} />

      <div className="border rounded-lg p-3 space-y-2 bg-white text-xs">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {item.file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)
              ? <ImageIcon className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
              : <FileText className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
            <span className="truncate font-medium text-slate-700">{item.file.name}</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => setPreviewOpen(true)} className="text-slate-400 hover:text-blue-600" title="Προεπισκόπηση">
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onSkip(item.file.name)} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Parsed info */}
        {item.parsed?.description && (
          <p className="text-slate-500 text-[10px]">📝 {item.parsed.description}</p>
        )}
        {item.parsed?.page_number && item.parsed?.total_pages && (
          <p className="text-slate-500 text-[10px]">📄 Σελίδα {item.parsed.page_number} / {item.parsed.total_pages}</p>
        )}

        {/* Confidence warning */}
        {item.parsed?.confidence === "low" && (
          <div className="flex items-center gap-1 text-orange-600 bg-orange-50 rounded p-1.5 text-[10px]">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            Χαμηλή βεβαιότητα ανάλυσης — επιβεβαίωσε τα στοιχεία
          </div>
        )}

        {/* Department selector */}
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

        {/* Date */}
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

        {/* Batch status */}
        {date && dept && (
          <div className={`flex items-center gap-1.5 rounded p-1.5 text-[10px] ${
            matchedBatch ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"
          }`}>
            {matchedBatch
              ? <><CheckCircle2 className="w-3 h-3" /> Batch βρέθηκε: {matchedBatch.date} · {matchedBatch.department}</>
              : <><AlertCircle className="w-3 h-3" /> Δεν βρέθηκε batch — θα δημιουργηθεί νέο</>
            }
          </div>
        )}

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
export default function ChatStepFileUpload({ departments = [], batchHeaders = [], allBundles = [], onFilesSaved, onSkip }) {
  const [dragging, setDragging] = useState(false);
  const [queue, setQueue] = useState([]); // [{file, status: "pending"|"parsing"|"ready"|"uploading"|"done"|"skipped", parsed}]
  const [isParsing, setIsParsing] = useState(false);
  const [uploadingNames, setUploadingNames] = useState(new Set());
  const inputRef = useRef();

  const deptNames = departments.map(d => d.name || d).filter(Boolean);

  const handleFiles = async (files) => {
    const validFiles = Array.from(files).filter(f => {
      if (f.size > 50 * 1024 * 1024) { toast.error(`${f.name} υπερβαίνει 50MB`); return false; }
      return true;
    });
    if (!validFiles.length) return;

    // Add to queue as "parsing"
    const newItems = validFiles.map(f => ({ file: f, status: "parsing", parsed: null }));
    setQueue(prev => [...prev, ...newItems]);
    setIsParsing(true);

    // Parse each filename with AI
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

      // If no batch exists, create one
      if (!batch) {
        const bundle = allBundles.find(b => b.department === dept && b.status === "ACTIVE");
        const scheduledData = await base44.entities.ScheduledData.filter({ date, department_id: dept });
        batch = await base44.entities.BatchHeader.create({
          date,
          department: dept,
          bundle_id: bundle?.id || null,
          has_scheduled_data: scheduledData.length > 0
        });
        // Create batch lines from scheduled data if any
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

      setQueue(prev => prev.map(q => q.file === file ? { ...q, status: "done" } : q));
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

  const readyCount = queue.filter(q => q.status === "ready").length;
  const doneCount = queue.filter(q => q.status === "done").length;
  const parsingCount = queue.filter(q => q.status === "parsing").length;

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
        <input ref={inputRef} type="file" multiple accept="image/*,.pdf" className="hidden"
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

      {/* File cards — only show "ready" items */}
      <div className="space-y-2">
        {queue
          .filter(q => q.status === "ready")
          .map((item, i) => (
            <FileResultCard
              key={`${item.file.name}-${i}`}
              item={item}
              departments={deptNames}
              batchHeaders={batchHeaders}
              onConfirm={handleConfirm}
              onSkip={handleSkip}
            />
          ))}
      </div>

      {/* Done items summary */}
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

      {/* Continue button */}
      {(doneCount > 0 || queue.every(q => q.status === "skipped" || q.status === "done")) && queue.length > 0 && (
        <Button size="sm" className="w-full text-xs bg-blue-600 hover:bg-blue-700"
          onClick={onSkip}>
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Συνέχεια → Επιλογή Τμήματος
        </Button>
      )}
    </div>
  );
}