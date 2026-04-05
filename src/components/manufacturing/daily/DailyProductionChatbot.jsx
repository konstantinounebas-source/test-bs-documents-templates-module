import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Bot, X, Send, Paperclip, Upload, FileText, Image as ImageIcon,
  Download, Eye, Trash2, Calendar,
  Loader2, CheckCircle2, Plus, RotateCw, RotateCcw, SkipForward, FastForward, ZoomIn, ZoomOut, Scan, AlertTriangle, GripHorizontal, Minimize2, Maximize2, Maximize
} from "lucide-react";
import { toast } from "sonner";
import { format, subDays, isMonday } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ExistingLineRow from "./chatbot/ExistingLineRow";
import ItemCodeMultiSelect from "./chatbot/ItemCodeMultiSelect";
import ChatStepQC from "./chatbot/ChatStepQC";
import ChatStepOperations from "./chatbot/ChatStepOperations";
import ChatStepTeamPersons from "./chatbot/ChatStepTeamPersons";
import ChatStepTeamExtra from "./chatbot/ChatStepTeamExtra";
import ChatStepHelpIn from "./chatbot/ChatStepHelpIn";
import ChatStepConsumables from "./chatbot/ChatStepConsumables";
import ChatStepFileUpload from "./chatbot/ChatStepFileUpload";
import OCRVerificationModal from "./OCRVerificationModal";
import OCRTeamsTimeVerificationModal from "./OCRTeamsTimeVerificationModal";
import { ocrProductionForm } from "@/functions/ocrProductionForm";
import { ocrTeamsTimeForm } from "@/functions/ocrTeamsTimeForm";
import { saveOCRData } from "./chatbot/ocrSave";
import { saveOCRTeamsTimeData } from "./chatbot/ocrTeamsTimeSave";

// ─── helpers ────────────────────────────────────────────────────────────────
function todayStr() { return format(new Date(), "yyyy-MM-dd"); }
function yesterdayStr() { return format(subDays(new Date(), 1), "yyyy-MM-dd"); }

function normalizeItemCode(code) {
  if (!code) return code;
  const match = code.match(/^([A-Za-z]+)(\d+)$/);
  if (match) {
    const [, letters, number] = match;
    return letters + String(parseInt(number)).padStart(2, '0');
  }
  return code;
}

function getQuickDates() {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun,1=Mon,...,6=Sat
  const dates = [{ label: "Today", value: todayStr() }];

  // Yesterday (always)
  dates.push({ label: "Yesterday", value: yesterdayStr() });

  // If today is Monday → also offer Friday (2 days back = last working day)
  if (dow === 1) {
    dates.push({ label: "Last Friday", value: format(subDays(today, 3), "yyyy-MM-dd") });
  }
  // If today is Saturday → offer Friday
  if (dow === 6) {
    dates.push({ label: "Friday", value: format(subDays(today, 1), "yyyy-MM-dd") });
  }
  // If today is Sunday → offer Friday & Saturday
  if (dow === 0) {
    dates.push({ label: "Saturday", value: format(subDays(today, 1), "yyyy-MM-dd") });
    dates.push({ label: "Friday",   value: format(subDays(today, 2), "yyyy-MM-dd") });
  }

  dates.push({ label: "Other date…", value: "__picker__" });
  return dates;
}

// ─── File type detector ───────────────────────────────────────────────────────
function getFileType(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext) ? 'image' : 'pdf';
}

// ─── Attachment item ─────────────────────────────────────────────────────────
function AttachmentItem({ att, onDelete, onPreview, onOCR, isDeleting, isOcrLoading }) {
  const fileType = getFileType(att.file_name);
  return (
    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg group hover:bg-slate-100 transition-colors">
      {fileType === "image"
        ? <ImageIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
        : <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />}
      <a href={att.file_url} target="_blank" rel="noopener noreferrer"
         className="text-xs text-blue-600 hover:underline truncate flex-1">{att.file_name}</a>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-6 w-6 text-purple-600 hover:bg-purple-50" onClick={() => onOCR(att)} disabled={isOcrLoading} title="OCR Εξαγωγή">
          {isOcrLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Scan className="w-3 h-3" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onPreview(att)} title="Preview">
          <Eye className="w-3 h-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" title="Download"
          onClick={async () => {
            const res = await fetch(att.file_url);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = att.file_name; a.click();
            URL.revokeObjectURL(url);
          }}>
          <Download className="w-3 h-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
          onClick={() => onDelete(att.id)} disabled={isDeleting} title="Delete">
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// ─── Drop zone ───────────────────────────────────────────────────────────────
function DropZone({ onFiles, isUploading }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handle = (files) => {
    const valid = Array.from(files).filter(f => {
      if (f.size > 50 * 1024 * 1024) { toast.error(`${f.name} exceeds 50 MB`); return false; }
      return true;
    });
    if (valid.length) onFiles(valid);
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files); }}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
        ${dragging ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50 hover:border-slate-400"}`}
    >
      <input ref={inputRef} type="file" multiple accept="image/*,.pdf" className="hidden"
        onChange={e => handle(e.target.files)} />
      {isUploading
        ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400 mb-1" />
        : <Upload className="w-5 h-5 mx-auto text-slate-400 mb-1" />}
      <p className="text-xs font-medium text-slate-600">Drag & drop files here</p>
      <p className="text-xs text-slate-400">or click to browse</p>
    </div>
  );
}

// ─── Main Chatbot ─────────────────────────────────────────────────────────────
export default function DailyProductionChatbot({ departments = [], isSplitLayout = false, onClose }) {
  const queryClient = useQueryClient();

  // panel state
  const [open, setOpen]       = useState(false);
  const [minimized, setMin]   = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [position, setPosition] = useState("right"); // "left" or "right"
  const [splitFullscreen, setSplitFullscreen] = useState(false);
  const [splitClosed, setSplitClosed] = useState(false);
  
  // dragging & resizing state
  const [panelPos, setPanelPos] = useState({ x: window.innerWidth - 450 - 24, y: 64 });
  const [panelSize, setPanelSize] = useState({ width: 450, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef();

  // wizard state
  const [step, setStep]         = useState("file_upload");   // file_upload | dept | date | batch | attachments | batch_lines_review | batch_lines_add | qc | operations | team_persons | team_extra | help_in | consumables
  const [selDept, setSelDept]   = useState("");
  const [selDate, setSelDate]   = useState("");
  const [customDate, setCustomDate] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [selBatch, setSelBatch] = useState(null);

  // batch lines state
  const [blReviewItems, setBlReviewItems]   = useState([]); // [{item_code, scheduled_qty, qty_processed, qty_out_good, qty_scrap}]
  const [blCurrentIdx, setBlCurrentIdx]     = useState(0);
  const [blAddForm, setBlAddForm]           = useState({ item_code: "", qty_processed: "", qty_out_good: "", qty_scrap: "" });

  // attachment preview
  const [previewFile, setPreviewFile] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);

  // OCR state
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrTargetAtt, setOcrTargetAtt] = useState(null);
  const [ocrResult, setOcrResult] = useState(null);
  const [showOcrModal, setShowOcrModal] = useState(false);
  // Teams Time OCR state
  const [showTeamsTimeOcrModal, setShowTeamsTimeOcrModal] = useState(false);
  const [teamsTimeOcrResult, setTeamsTimeOcrResult] = useState(null);
  // Dual-form: pending teams time result to show after production modal confirmed
  const [pendingTeamsTimeOcr, setPendingTeamsTimeOcr] = useState(null);

  // free-text input
  const [userInput, setUserInput] = useState("");
  const inputRef = useRef();

  // messages (chat log)
  const [messages, setMessages] = useState([
    { role: "bot", text: "Γεια σου! 👋 Μπορείς να ανεβάσεις αρχεία παραγωγής ή να επιλέξεις τμήμα για να ξεκινήσουμε." }
  ]);

  const addMsg = (role, text, extra = {}) =>
    setMessages(p => [...p, { role, text, ...extra }]);

  const scrollRef = useRef();
  const messagesEndRef = useRef();
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── data ──────────────────────────────────────────────────────────────────
  // All batch headers (for file upload step batch matching)
  const { data: allBatchHeaders = [] } = useQuery({
    queryKey: ["BatchHeader-All"],
    queryFn: () => base44.entities.BatchHeader.list(),
    staleTime: 0
  });

  const { data: batchHeaders = [] } = useQuery({
    queryKey: ["BatchHeader", selDept],
    queryFn: () => base44.entities.BatchHeader.filter({ department: selDept }),
    enabled: !!selDept && step !== "dept",
    staleTime: 0
  });

  const { data: allBundles = [] } = useQuery({
    queryKey: ["StandardsBundle-All"],
    queryFn: () => base44.entities.StandardsBundle.list(),
    staleTime: 0
  });

  const { data: dailyAssignments = [] } = useQuery({
    queryKey: ["DailyStandardsAssignment-All"],
    queryFn: () => base44.entities.DailyStandardsAssignment.list(),
    staleTime: 5 * 60 * 1000
  });

  const { data: scheduledDayHeaders = [] } = useQuery({
    queryKey: ["ScheduledDayHeader-All"],
    queryFn: () => base44.entities.ScheduledDayHeader.list(),
    staleTime: 5 * 60 * 1000
  });

  const { data: attachments = [], isLoading: loadingAtts } = useQuery({
    queryKey: ["BatchAttachments", selBatch?.id],
    queryFn: () => base44.entities.BatchAttachment.filter({ batch_header_id: selBatch?.id }),
    enabled: !!selBatch?.id,
    staleTime: 0
  });

  // fetch existing batch lines for review
  const { data: existingBatchLines = [] } = useQuery({
    queryKey: ["Batch_Lines", selBatch?.id],
    queryFn: () => base44.entities.Batch_Lines.filter({ batch_header_id: selBatch?.id }),
    enabled: !!selBatch?.id,
    staleTime: 0
  });

  // fetch item codes from bundle for "add extra" dropdown
  // Try both: batch's bundle_id AND daily assignment
  const { data: bundleItemCodes = [] } = useQuery({
    queryKey: ["BundleItemCodes", selBatch?.id, selBatch?.date, selDept],
    queryFn: async () => {
      if (!selBatch) return [];
      let bundleId = selBatch.bundle_id;
      
      // If batch has no bundle_id, try daily assignment
      if (!bundleId && selBatch.date && selDept) {
        const da = await base44.entities.DailyStandardsAssignment.filter({
          assignment_date: selBatch.date,
          department_id: selDept
        });
        if (da.length > 0 && da[0].standards_bundle_id) {
          bundleId = da[0].standards_bundle_id;
        }
      }
      
      if (!bundleId) return [];
      
      const lines = await base44.entities.StdSetLines.filter({ bundle_id: bundleId });
      // Return original item codes as-is (without normalization) for OCR comparison
      const codes = [...new Set(lines.map(l => l.item_code))].filter(Boolean).sort();
      console.log(`✓ Bundle ${bundleId.slice(0,8)}: Loaded ${codes.length} item codes:`, codes.slice(0, 20));
      return codes;
    },
    enabled: !!selBatch,
    staleTime: Infinity
  });

  // ── bundle resolver ───────────────────────────────────────────────────────
  const resolveBundle = (date, dept) => {
    const da = dailyAssignments.find(a => a.assignment_date === date && a.department_id === dept);
    if (da?.standards_bundle_id) return allBundles.find(b => b.id === da.standards_bundle_id);
    const sh = scheduledDayHeaders.find(h => h.date === date);
    if (sh?.source_bundle_id) return allBundles.find(b => b.id === sh.source_bundle_id);
    return allBundles.find(b => b.department === dept && b.status === "ACTIVE");
  };

  // ── create batch mutation ─────────────────────────────────────────────────
  const createBatchMutation = useMutation({
    mutationFn: async ({ date, dept, bundleId }) => {
      const scheduledData = await base44.entities.ScheduledData.filter({ date, department_id: dept });
      const newBatch = await base44.entities.BatchHeader.create({
        date, department: dept, bundle_id: bundleId,
        has_scheduled_data: scheduledData.length > 0
      });
      if (scheduledData.length > 0) {
        const lines = scheduledData.map(sd => ({
          batch_header_id: newBatch.id, item_code: sd.item_code,
          scheduled_qty: sd.ops_qty || 0, qty_processed: 0, qty_out_good: 0, qty_scrap: 0
        }));
        await base44.entities.Batch_Lines.bulkCreate(lines);
        const opsMap = new Map();
        scheduledData.filter(sd => sd.operation && sd.ops_qty).forEach(sd => {
          const key = `${sd.item_code}|${sd.operation}`;
          if (opsMap.has(key)) {
            const ex = opsMap.get(key);
            ex.qty_operation += sd.ops_qty || 0;
            ex.operation_time_min += (sd.ops_qty || 0) * (sd.std_min_pc || 0);
          } else {
            opsMap.set(key, {
              batch_header_id: newBatch.id, item_code: sd.item_code, operation: sd.operation,
              qty_operation: sd.ops_qty || 0, remake_qty: 0, source_type: "SCHEDULE",
              std_min_pc_lookup: sd.std_min_pc || 0,
              operation_time_min: (sd.ops_qty || 0) * (sd.std_min_pc || 0)
            });
          }
        });
        const ops = Array.from(opsMap.values());
        if (ops.length) await base44.entities.Operations.bulkCreate(ops);
      }
      return newBatch;
    },
    onSuccess: (batch) => {
      queryClient.invalidateQueries(["BatchHeader", selDept]);
      queryClient.invalidateQueries(["Batch_Lines", batch.id]);
      setSelBatch(batch);
      setStep("attachments");
      addMsg("bot",
        `✅ Batch δημιουργήθηκε για ${batch.date} – ${batch.department}.\n` +
        (batch.has_scheduled_data ? "Οι γραμμές παραγωγής προσυμπληρώθηκαν από το πρόγραμμα.\n\nΠρόσθεσε συνημμένα ή πάτα 'Συνέχεια → Batch Lines'." : "⚠️ Δεν βρέθηκαν δεδομένα προγράμματος.\n\nΠρόσθεσε συνημμένα ή πάτα 'Συνέχεια → Batch Lines'.")
      );
    },
    onError: (err) => { 
      console.error("Batch creation error:", err);
      toast.error("Αποτυχία δημιουργίας batch: " + (err?.message || "Άγνωστο σφάλμα")); 
      addMsg("bot", "❌ Σφάλμα κατά τη δημιουργία batch: " + (err?.message || "Άγνωστο σφάλμα")); 
    }
  });

  // ── upload state ──────────────────────────────────────────────────────────
  const [uploadingCount, setUploadingCount] = useState(0);

  const [pendingDuplicates, setPendingDuplicates] = useState([]);

  const uploadFile = async (file, forceUpload = false) => {
    // Check for duplicate
    if (!forceUpload) {
      const existing = attachments.find(a => a.file_name === file.name);
      if (existing) {
        setPendingDuplicates(prev => [...prev, file]);
        return;
      }
    }
    setUploadingCount(c => c + 1);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const me = await base44.auth.me();
      const att = await base44.entities.BatchAttachment.create({
        batch_header_id: selBatch.id, department: selBatch.department,
        file_url, file_name: file.name, uploaded_by: me.email, notes: ""
      });
      queryClient.invalidateQueries(["BatchAttachments", selBatch?.id]);
      addMsg("bot", `📎 Αρχείο "${att.file_name}" ανέβηκε επιτυχώς!`);
    } catch (err) {
      console.error("Upload error:", err);
      addMsg("bot", `❌ Αποτυχία ανεβάσματος "${file.name}": ${err?.message || "Άγνωστο σφάλμα"}`);
    } finally {
      setUploadingCount(c => c - 1);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BatchAttachment.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["BatchAttachments", selBatch?.id])
  });

  const handleOCR = async (att) => {
    setOcrTargetAtt(att);
    setOcrLoading(true);

    try {
      // Step 1: Detect which forms exist in the file
      addMsg("bot", `🔍 Σάρωση αρχείου για ανίχνευση φορμών...`);
      const detectResult = await base44.functions.invoke("detectFormType", { file_url: att.file_url });
      const detectedForms = detectResult?.pages ? Object.values(detectResult.pages).map(p => p?.form_type).filter(Boolean) : [];
      
      if (!detectedForms.length) {
        addMsg("bot", `❌ Δεν ανιχνεύθηκε καμία γνωστή φόρμα στο αρχείο.`);
        setOcrLoading(false);
        return;
      }

      // Display detailed detection results per page
      const detectionDetails = Object.entries(detectResult.pages || {})
        .map(([page, data]) => `Σελ.${page} = ${data?.form_type || 'unknown'}`)
        .join(', ');
      addMsg("bot", `🔍 **Σάρωση ολοκληρώθηκε!**\n📋 Ανιχνεύθηκε: ${detectionDetails}`);
      addMsg("bot", `📋 Διαθέσιμα item codes (${bundleItemCodes?.length || 0}): ${bundleItemCodes?.join(", ") || "Κανένα"}`);

      // Step 2: Call OCR functions for detected forms
      const ocrPromises = [];
      
      if (detectedForms.includes("production")) {
        ocrPromises.push(
          ocrProductionForm({ file_url: att.file_url }).then(res => ({ type: "production", data: res.data }))
        );
      }
      
      if (detectedForms.includes("teams_time")) {
        ocrPromises.push(
          ocrTeamsTimeForm({ file_url: att.file_url, file_name: att.file_name }).then(res => ({ type: "teams_time", data: res.data }))
        );
      }

      const results = await Promise.all(ocrPromises);
      
      // Step 3: Route to correct modals based on what was found
      const prodResult = results.find(r => r.type === "production");
      const teamsResult = results.find(r => r.type === "teams_time");

      if (prodResult) {
        setOcrResult(prodResult.data);
      }
      
      if (teamsResult) {
        // If production also exists, store teams_time to show after production confirm
        if (prodResult) {
          setPendingTeamsTimeOcr({ result: teamsResult.data, att });
        } else {
          // If only teams_time, show it directly
          setTeamsTimeOcrResult(teamsResult.data);
        }
      }

      // Show modals
      if (prodResult) {
        setShowOcrModal(true);
        addMsg("bot", `✅ OCR ολοκληρώθηκε! ${prodResult.data?.extracted_data?.production_lines?.length || 0} γραμμές παραγωγής${teamsResult ? ` · ${teamsResult.data?.extracted_data?.team_persons?.length || 0} άτομα Teams Time` : ""}. Επιβεβαίωσε τα δεδομένα.`);
      } else if (teamsResult) {
        setShowTeamsTimeOcrModal(true);
        addMsg("bot", `✅ OCR ολοκληρώθηκε! Βρέθηκαν ${teamsResult.data?.extracted_data?.team_persons?.length || 0} άτομα · ${teamsResult.data?.extracted_data?.team_extra?.length || 0} extra. Επιβεβαίωσε τα δεδομένα.`);
      }

    } catch (err) {
      addMsg("bot", `❌ OCR αποτυχία: ${err?.message || "Network error"}`);
    } finally {
      setOcrLoading(false);
    }
  };

  const handleOcrConfirm = (confirmedData) => {
    setShowOcrModal(false);
    addMsg("bot", 
      `✅ OCR επιβεβαιώθηκε! Αποθηκεύω ${confirmedData.production_lines?.length || 0} γραμμές...`
    );
    if (selBatch?.id) {
      saveOCRData(confirmedData, selBatch.id, () => {
        queryClient.invalidateQueries(["Batch_Lines", selBatch.id]);
        queryClient.invalidateQueries(["QC_Initial_Stock", selBatch.id]);
        queryClient.invalidateQueries(["Operations", selBatch.id]);
        addMsg("bot", `📦 OCR δεδομένα αποθηκεύτηκαν στο batch ${selBatch.date} · ${selBatch.department}.`);
      });
    } else {
      addMsg("bot", "⚠️ Δεν υπάρχει ενεργό batch. Επίλεξε batch πρώτα.");
    }
    // If this was a dual-form OCR, automatically open Teams Time modal next
    if (pendingTeamsTimeOcr) {
      const { result, att } = pendingTeamsTimeOcr;
      setPendingTeamsTimeOcr(null);
      setTeamsTimeOcrResult(result);
      setOcrTargetAtt(att);
      setShowTeamsTimeOcrModal(true);
      addMsg("bot", `📋 Τώρα επιβεβαίωσε τα δεδομένα Teams Time (Σελ.2): ${result?.extracted_data?.team_persons?.length || 0} άτομα · ${result?.extracted_data?.team_extra?.length || 0} extra.`);
    }
  };

  const handleTeamsTimeOcrConfirm = (confirmedData) => {
    setShowTeamsTimeOcrModal(false);
    addMsg("bot", `✅ Teams Time OCR επιβεβαιώθηκε! Αποθηκεύω...`);
    if (selBatch?.id) {
      saveOCRTeamsTimeData(confirmedData, selBatch.id, () => {
        queryClient.invalidateQueries(["Team_Time_Persons", selBatch.id]);
        queryClient.invalidateQueries(["Team_Time_Extra", selBatch.id]);
        addMsg("bot", `📦 Teams Time δεδομένα αποθηκεύτηκαν στο batch ${selBatch.date} · ${selBatch.department}.`);
      }, selBatch.department);
    } else {
      addMsg("bot", "⚠️ Δεν υπάρχει ενεργό batch. Επίλεξε batch πρώτα.");
    }
  };

  // ── step handlers ─────────────────────────────────────────────────────────
  const handleDeptSelect = (dept) => {
    setSelDept(dept);
    setStep("date");
    addMsg("user", dept);
    addMsg("bot", `Επέλεξες **${dept}**. Για ποια ημερομηνία;`);
  };

  const handleDateSelect = (dateVal) => {
    if (dateVal === "__picker__") { setShowPicker(true); return; }
    const date = dateVal;
    setSelDate(date);
    setShowPicker(false);
    addMsg("user", date);

    const existing = batchHeaders.find(b => b.date === date && b.department === selDept);
    if (existing) {
      setSelBatch(existing);
      setStep("attachments");
      const bundle = resolveBundle(date, selDept);
      addMsg("bot",
        `✅ Batch ήδη υπάρχει για ${date} – ${selDept}.\n` +
        (bundle ? `📦 Bundle: ${bundle.version_no || bundle.version}\n\n📎 **Πρόσθεσε αρχεία ή πάτα OCR** | 'Συνέχεια → Batch Lines'` : "⚠️ Χωρίς bundle.\n\n📎 **Πρόσθεσε αρχεία** | 'Συνέχεια → Batch Lines'")
      );
    } else {
      setStep("batch");
      const bundle = resolveBundle(date, selDept);
      addMsg("bot",
        `Δεν υπάρχει batch για ${date} – ${selDept}.\n` +
        (bundle
          ? `Θα χρησιμοποιηθεί bundle: **${bundle.version_no || bundle.version}** (${bundle.status}).\nΔημιουργώ batch;`
          : "⚠️ Δεν βρέθηκε ενεργό bundle για αυτό το τμήμα.")
      );
    }
  };

  const handleConfirmCreate = () => {
    const bundle = resolveBundle(selDate, selDept);
    if (!bundle) { addMsg("bot", "❌ Δεν βρέθηκε bundle. Αδύνατη η δημιουργία batch."); return; }
    addMsg("user", "Ναι, δημιούργησε batch");
    addMsg("bot", "⏳ Δημιουργία batch...");
    createBatchMutation.mutate({ date: selDate, dept: selDept, bundleId: bundle.id });
  };

  const handleFiles = (files) => {
    files.forEach(f => uploadFile(f));
  };

  const [isAiThinking, setIsAiThinking] = useState(false);

  const handleReset = () => {
    setStep("file_upload"); setSelDept(""); setSelDate(""); setSelBatch(null);
    setBlReviewItems([]); setBlCurrentIdx(0);
    setBlAddForm({ item_code: "", qty_processed: "", qty_out_good: "", qty_scrap: "" });
    setMessages([{ role: "bot", text: "Γεια σου! 👋 Επέλεξε τμήμα για να ξεκινήσουμε." }]);
  };

  // ── step navigation helpers ───────────────────────────────────────────────
  const stepSequence = ["batch_lines_add", "qc", "operations", "team_persons", "team_extra", "help_in", "consumables"];
  const goNextStep = (fromStep, botMsg) => {
    if (botMsg) addMsg("bot", botMsg);
    const idx = stepSequence.indexOf(fromStep);
    if (idx >= 0 && idx < stepSequence.length - 1) {
      const next = stepSequence[idx + 1];
      setStep(next);
      const labels = {
        qc: "QC Initial Stock",
        operations: "Operations",
        team_persons: "Team Time - Persons",
        team_extra: "Team Time - Extra",
        help_in: "Help In",
        consumables: "Consumables"
      };
      if (labels[next]) addMsg("bot", `📋 Βήμα: **${labels[next]}**`);
    } else {
      setStep("done");
      addMsg("bot", "🎉 Η καταχώριση ολοκληρώθηκε! Μπορείς να κλείσεις το chat ή να ξεκινήσεις νέα καταχώριση.");
    }
  };

  const skipStep = (fromStep) => {
    addMsg("user", "Παράλειψη");
    goNextStep(fromStep, null);
  };

  const goPrevStep = (fromStep) => {
    const idx = stepSequence.indexOf(fromStep);
    if (idx > 0) {
      const prev = stepSequence[idx - 1];
      setStep(prev);
      addMsg("bot", `↩ Επιστροφή στο προηγούμενο βήμα.`);
    } else {
      // go back to batch_lines_add
      setStep("batch_lines_add");
      addMsg("bot", `↩ Επιστροφή στα Batch Lines.`);
    }
  };

  // ── batch lines: enter review mode after attachments ─────────────────────
  const startBatchLinesReview = () => {
    if (existingBatchLines.length === 0) {
      setStep("batch_lines_add");
      addMsg("bot", "Δεν υπάρχουν γραμμές παραγωγής. Μπορείς να προσθέσεις item codes παρακάτω.");
      return;
    }
    // Build review list pre-filled with scheduled qty as both processed & out good
    const items = existingBatchLines.map(bl => ({
      id: bl.id,
      item_code: bl.item_code,
      scheduled_qty: bl.scheduled_qty || 0,
      qty_processed: bl.qty_processed > 0 ? bl.qty_processed : (bl.scheduled_qty || 0),
      qty_out_good:  bl.qty_out_good  > 0 ? bl.qty_out_good  : (bl.scheduled_qty || 0),
      qty_scrap:     bl.qty_scrap     || 0,
    }));
    setBlReviewItems(items);
    setBlCurrentIdx(0);
    setStep("batch_lines_review");
    showBatchLinePrompt(items, 0);
  };

  const showBatchLinePrompt = (items, idx) => {
    const item = items[idx];
    addMsg("bot",
      `📦 Item ${idx + 1}/${items.length}: **${item.item_code}**\n` +
      `Scheduled: ${item.scheduled_qty}\n` +
      `Processed: ${item.qty_processed} | Out Good: ${item.qty_out_good} | Scrap: ${item.qty_scrap}\n\n` +
      `Επιβεβαίωσε ή άλλαξε τιμές (π.χ. "ok", "processed=50 good=48 scrap=2").`
    );
  };

  const [isSavingLine, setIsSavingLine] = useState(false);

  const saveBatchLine = async (item) => {
    setIsSavingLine(true);
    try {
      await base44.entities.Batch_Lines.update(item.id, {
        qty_processed: item.qty_processed,
        qty_out_good:  item.qty_out_good,
        qty_scrap:     item.qty_scrap,
      });
      queryClient.invalidateQueries(["Batch_Lines", selBatch?.id]);
    } finally {
      setIsSavingLine(false);
    }
  };

  const handleBatchLineConfirm = async (updatedItem) => {
    if (!updatedItem._skip) {
      await saveBatchLine(updatedItem);
      addMsg("bot", `💾 Item **${updatedItem.item_code}** - Processed: ${updatedItem.qty_processed} | Good: ${updatedItem.qty_out_good} | Scrap: ${updatedItem.qty_scrap}`);
    } else {
      addMsg("bot", `⏭️ Item **${updatedItem.item_code}** - Παράλειψη`);
    }
    const nextIdx = blCurrentIdx + 1;
    if (nextIdx >= blReviewItems.length) {
      setStep("batch_lines_add");
      addMsg("bot", `✅ Όλα τα items καταχωρήθηκαν!\nΘέλεις να προσθέσεις επιπλέον item code; Επέλεξε από τη λίστα ή πες "τέλος".`);
    } else {
      setBlCurrentIdx(nextIdx);
      showBatchLinePrompt(blReviewItems, nextIdx);
    }
  };

  // Parse user input for batch line values (e.g. "ok", "processed=50 good=48 scrap=2", "50 48 2")
  const parseBatchLineInput = (text, currentItem) => {
    const lower = text.toLowerCase().trim();
    if (lower === "ok" || lower === "ναι" || lower === "yes" || lower === "σωστό" || lower === "next") {
      return { ...currentItem }; // keep as-is
    }
    const updated = { ...currentItem };
    // parse "processed=X good=Y scrap=Z" or "p=X g=Y s=Z"
    const pMatch = text.match(/(?:processed|proc|p)\s*=\s*([\d.]+)/i);
    const gMatch = text.match(/(?:out.?good|good|g)\s*=\s*([\d.]+)/i);
    const sMatch = text.match(/(?:scrap|s)\s*=\s*([\d.]+)/i);
    if (pMatch) updated.qty_processed = parseFloat(pMatch[1]);
    if (gMatch) updated.qty_out_good  = parseFloat(gMatch[1]);
    if (sMatch) updated.qty_scrap     = parseFloat(sMatch[1]);
    // plain 3 numbers: "50 48 2"
    if (!pMatch && !gMatch && !sMatch) {
      const nums = text.match(/[\d.]+/g);
      if (nums && nums.length >= 1) updated.qty_processed = parseFloat(nums[0]);
      if (nums && nums.length >= 2) updated.qty_out_good  = parseFloat(nums[1]);
      if (nums && nums.length >= 3) updated.qty_scrap     = parseFloat(nums[2]);
    }
    return updated;
  };

  const handleBatchLineMessage = async (text) => {
    const currentItem = blReviewItems[blCurrentIdx];
    const updated = parseBatchLineInput(text, currentItem);
    // update local state
    const newItems = blReviewItems.map((it, i) => i === blCurrentIdx ? updated : it);
    setBlReviewItems(newItems);
    addMsg("bot", `💾 Αποθηκεύω: Processed=${updated.qty_processed} | Good=${updated.qty_out_good} | Scrap=${updated.qty_scrap}...`);
    await handleBatchLineConfirm(updated);
  };

  const handleAddExtraLine = async () => {
    const { item_codes = [], qty_processed, qty_out_good, qty_scrap } = blAddForm;
    if (!item_codes.length) { addMsg("bot", "Επίλεξε τουλάχιστον ένα item code πρώτα."); return; }
    const proc = parseFloat(qty_processed) || 0;
    const good = parseFloat(qty_out_good)  || 0;
    const scrap= parseFloat(qty_scrap)     || 0;
    try {
      await base44.entities.Batch_Lines.bulkCreate(
        item_codes.map(code => ({
          batch_header_id: selBatch.id,
          item_code: normalizeItemCode(code), scheduled_qty: 0,
          qty_processed: proc, qty_out_good: good, qty_scrap: scrap
        }))
      );
      queryClient.invalidateQueries(["Batch_Lines", selBatch?.id]);
      addMsg("bot", `✅ Προστέθηκαν: ${item_codes.join(", ")} | Processed=${proc} | Good=${good} | Scrap=${scrap}`);
      setBlAddForm({ item_codes: [], qty_processed: "", qty_out_good: "", qty_scrap: "" });
    } catch {
      addMsg("bot", "❌ Σφάλμα κατά την προσθήκη.");
    }
  };

  const askAI = async (text, lower) => {
    setIsAiThinking(true);
    try {
      const deptList = departments.map(d => d.name);
      const context = [
        selDept && `Επιλεγμένο τμήμα: ${selDept}`,
        selDate && `Επιλεγμένη ημερομηνία: ${selDate}`,
        selBatch && `Ενεργό batch: ID=${selBatch.id}, Ημ=${selBatch.date}, Τμήμα=${selBatch.department}`,
        attachments.length > 0 && `Υπάρχοντα attachments: ${attachments.map(a => a.file_name).join(", ")}`,
        allBundles.length > 0 && `Διαθέσιμα bundles: ${allBundles.map(b => `${b.version_no || b.version} (${b.status}, dept: ${b.department})`).join("; ")}`,
        batchHeaders.length > 0 && `Batches τμήματος: ${batchHeaders.map(b => b.date).join(", ")}`,
      ].filter(Boolean).join("\n");

      // Ask AI to detect intent AND respond
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Είσαι βοηθός παραγωγής για manufacturing σύστημα. Απαντάς ΠΑΝΤΑ στα ελληνικά, σύντομα και φιλικά.
Σημερινή ημερομηνία: ${todayStr()}
Διαθέσιμα τμήματα: ${deptList.join(", ")}
Τρέχον βήμα wizard: ${step} (dept=επιλογή τμήματος, date=επιλογή ημερομηνίας, batch=επιβεβαίωση δημιουργίας batch, attachments=διαχείριση αρχείων)
${context}

Μήνυμα χρήστη: "${text}"

Αναλύσε την πρόθεση του χρήστη και επέστρεψε ΠΑΝΤΑ ένα από τα παρακάτω JSON:

1. Επιλογή τμήματος (ακόμα και με ορθογραφικά λάθη, greeklish, ή μερική αναγνώριση):
{"action": "select_dept", "dept": "<ακριβές όνομα από τη λίστα>", "reply": "..."}

2. Επιλογή ημερομηνίας (π.χ. "σήμερα", "χθες", "2026-03-07", "7 Μαρτίου", greeklish):
{"action": "select_date", "date": "<YYYY-MM-DD>", "reply": "..."}

3. Επιβεβαίωση δημιουργίας batch (π.χ. "ναι", "yes", "ok", "φτιάξε", "δημιούργησε"):
{"action": "confirm_batch", "reply": "..."}

4. Ακύρωση / επανεκκίνηση (π.χ. "όχι", "ακύρωση", "reset", "αρχή", "νέα αναζήτηση"):
{"action": "reset", "reply": "..."}

5. Οποιοδήποτε άλλο ερώτημα ή σχόλιο:
{"action": "reply", "reply": "<απάντηση>"}`,
        response_json_schema: {
          type: "object",
          properties: {
            action: { type: "string" },
            dept: { type: "string" },
            date: { type: "string" },
            reply: { type: "string" }
          },
          required: ["action", "reply"]
        }
      });

      if (result.action === "select_dept" && result.dept) {
        const match = departments.find(d => d.name === result.dept);
        if (match) {
          handleDeptSelect(match.name);
          return;
        }
      }
      if (result.action === "select_date" && result.date) {
        handleDateSelect(result.date);
        return;
      }
      if (result.action === "confirm_batch") {
        addMsg("bot", result.reply || "Εντάξει, δημιουργώ batch...");
        handleConfirmCreate();
        return;
      }
      if (result.action === "reset") {
        addMsg("bot", result.reply || "Εντάξει, επανεκκίνηση.");
        handleReset();
        return;
      }
      addMsg("bot", result.reply || "Δεν κατάλαβα. Δοκίμασε ξανά.");
    } catch (err) {
      addMsg("bot", "❌ Σφάλμα επικοινωνίας με AI.");
    } finally {
      setIsAiThinking(false);
    }
  };

  // ── dragging & resizing ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e) => {
      if (isDragging) {
        setPanelPos({
          x: Math.max(0, e.clientX - dragOffset.x),
          y: Math.max(0, e.clientY - dragOffset.y)
        });
      } else if (isResizing) {
        const newWidth = Math.max(300, e.clientX - panelPos.x);
        const newHeight = Math.max(300, e.clientY - panelPos.y);
        setPanelSize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset, panelPos]);

  const handleDragStart = (e) => {
    if (e.target.closest("input, button, [role='combobox']")) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - panelPos.x,
      y: e.clientY - panelPos.y
    });
  };

  const handleUserMessage = () => {
    const text = userInput.trim();
    if (!text) return;
    setUserInput("");
    addMsg("user", text);

    // batch lines review: handle inline without AI call
    if (step === "batch_lines_review") {
      handleBatchLineMessage(text);
      return;
    }
    // batch lines add: "τέλος" or similar → reset
    if (step === "batch_lines_add") {
      const lower = text.toLowerCase();
      if (lower.includes("τέλος") || lower.includes("done") || lower.includes("finish") || lower.includes("ok") || lower.includes("ναι") === false) {
        addMsg("bot", "Εντάξει! Η καταχώριση Batch Lines ολοκληρώθηκε. 🎉\nΜπορείς να συνεχίσεις με τις υπόλοιπες καρτέλες από τη σελίδα.");
        return;
      }
    }

    // default: AI
    askAI(text, text.toLowerCase());
  };

  const quickDates = getQuickDates();

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Toggle Button - Only shown in floating mode */}
      {!isSplitLayout && !open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed right-6 bottom-6 z-40 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-2xl transition-all"
          title="Open AI Production Assistant"
        >
          <Bot className="w-6 h-6" />
        </button>
      )}

      {/* Floating Panel - Draggable & Resizable (floating mode only) */}
      {!isSplitLayout && open && (
        <div 
          ref={panelRef}
          className={fullscreen ? "fixed inset-0 z-40 shadow-2xl border-0 bg-white flex flex-col overflow-hidden" : "fixed z-40 shadow-2xl border border-slate-200 bg-white flex flex-col rounded-lg overflow-hidden"}
          style={fullscreen ? {} : {
            left: `${panelPos.x}px`,
            top: `${panelPos.y}px`,
            width: minimized ? "300px" : `${panelSize.width}px`,
            height: minimized ? "auto" : `${panelSize.height}px`,
            cursor: isDragging ? "grabbing" : "default"
          }}
        >
          {/* Header - Draggable */}
          <div 
            className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white border-b border-blue-700 cursor-grab active:cursor-grabbing select-none"
            onMouseDown={handleDragStart}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <GripHorizontal className="w-4 h-4 flex-shrink-0 opacity-70" />
              <Bot className="w-5 h-5 flex-shrink-0" />
              <span className="font-semibold text-sm truncate">AI Production Assistant</span>
              {selBatch && !minimized && (
                <Badge className="bg-blue-500 text-white text-[10px] px-1.5 py-0 flex-shrink-0">
                  {selBatch.date} · {selDept}
                </Badge>
              )}
            </div>
            <div className="flex gap-1 ml-2">
              {!fullscreen && (
                <button 
                  onClick={() => setMin(!minimized)} 
                  className="hover:bg-blue-700 rounded p-1"
                  title={minimized ? "Maximize" : "Minimize"}
                >
                  {minimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </button>
              )}
              <button 
                onClick={() => setFullscreen(!fullscreen)} 
                className="hover:bg-blue-700 rounded p-1"
                title={fullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                <Maximize className="w-4 h-4" />
              </button>
              <button onClick={() => setOpen(false)} className="hover:bg-blue-700 rounded p-1" title="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>


        {!minimized && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Chat log */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] text-sm px-3 py-2 rounded-2xl whitespace-pre-wrap
                      ${m.role === "user"
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-slate-100 text-slate-800 rounded-bl-sm"}`}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {(createBatchMutation.isPending || uploadingCount > 0 || isAiThinking || isSavingLine) && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-3 py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Step: file upload (initial) */}
            {step === "file_upload" && (
              <ChatStepFileUpload
                departments={departments}
                batchHeaders={allBatchHeaders}
                allBundles={allBundles}
                dailyAssignments={dailyAssignments}
                scheduledDayHeaders={scheduledDayHeaders}
                onFilesSaved={(fileName, batch, errorInfo) => {
                  if (errorInfo?.error === "no_bundle") {
                    addMsg("bot", `❌ Δεν βρέθηκε bundle για το τμήμα "${errorInfo.dept}". Αδύνατη η δημιουργία batch.`);
                  } else if (batch) {
                    addMsg("bot", `📎 Αρχείο "${fileName}" αποθηκεύτηκε στο batch ${batch.date} · ${batch.department}.`);
                  }
                }}
                onBatchReady={({ dept, date }) => {
                  setSelDept(dept);
                  setSelDate(date);
                  addMsg("user", `${dept} · ${date}`);
                  // Check if batch already exists
                  const existing = allBatchHeaders.find(b => b.date === date && b.department === dept);
                  if (existing) {
                    setSelBatch(existing);
                    setStep("attachments");
                    addMsg("bot", `✅ Βρέθηκε batch για ${date} – ${dept}.\nΠρόσθεσε συνημμένα ή πάτα 'Συνέχεια → Batch Lines'.`);
                  } else {
                    setStep("batch");
                    const bundle = resolveBundle(date, dept);
                    addMsg("bot",
                      `Δεν υπάρχει batch για ${date} – ${dept}.\n` +
                      (bundle
                        ? `Θα χρησιμοποιηθεί bundle: **${bundle.version_no || bundle.version}** (${bundle.status}).\nΔημιουργώ batch;`
                        : "⚠️ Δεν βρέθηκε ενεργό bundle για αυτό το τμήμα.")
                    );
                  }
                }}
                onSkip={() => {
                  setStep("dept");
                  addMsg("bot", "Επέλεξε τμήμα για να ξεκινήσουμε.");
                }}
              />
            )}

            {/* Step: choose department */}
            {step === "dept" && (
              <div className="border-t p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 font-medium">Επέλεξε τμήμα:</p>
                  <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => setStep("file_upload")}>
                    ↩ Ανέβασμα αρχείων
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {departments.map(d => (
                    <Button key={d.id} variant="outline" size="sm"
                      className="text-xs justify-start" onClick={() => handleDeptSelect(d.name)}>
                      {d.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Step: choose date */}
            {step === "date" && (
              <div className="border-t p-3 space-y-2">
                <p className="text-xs text-slate-500 font-medium">Επέλεξε ημερομηνία:</p>
                <div className="flex flex-wrap gap-2">
                  {quickDates.map(qd => (
                    <Button key={qd.value} variant="outline" size="sm"
                      className="text-xs" onClick={() => handleDateSelect(qd.value)}>
                      <Calendar className="w-3 h-3 mr-1" />
                      {qd.label}
                    </Button>
                  ))}
                </div>
                {showPicker && (
                  <div className="flex gap-2 mt-1">
                    <Input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)}
                      className="text-xs h-8 flex-1" max={todayStr()} />
                    <Button size="sm" className="h-8 text-xs"
                      disabled={!customDate} onClick={() => handleDateSelect(customDate)}>
                      OK
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Step: confirm create batch */}
            {step === "batch" && (
              <div className="border-t p-3 space-y-2">
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 text-xs bg-green-600 hover:bg-green-700"
                    onClick={handleConfirmCreate} disabled={createBatchMutation.isPending}>
                    <Plus className="w-3 h-3 mr-1" /> Ναι, δημιούργησε batch
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs" onClick={handleReset}>
                    Ακύρωση
                  </Button>
                </div>
              </div>
            )}

            {/* Step: attachments management */}
            {step === "attachments" && selBatch && (
              <div className="border-t p-3 space-y-3 overflow-y-auto max-h-64">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-700">
                    Attachments · {selBatch.date} · {selDept}
                    {attachments.length > 0 && (
                      <Badge className="ml-2 text-[10px]">{attachments.length}</Badge>
                    )}
                  </p>
                  <Button variant="ghost" size="sm" className="text-xs h-6" onClick={handleReset}>
                    ↩ Νέα αναζήτηση
                  </Button>
                </div>

                <DropZone onFiles={handleFiles} isUploading={uploadingCount > 0} />

                {loadingAtts ? (
                  <div className="flex justify-center py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  </div>
                ) : attachments.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2">Δεν υπάρχουν attachments ακόμα.</p>
                ) : (
                  <div className="space-y-1">
                    {attachments.map(att => (
                      <AttachmentItem key={att.id} att={att}
                        onDelete={id => deleteMutation.mutate(id)}
                        onPreview={setPreviewFile}
                        onOCR={(a) => { setShowAttachmentsModal(false); handleOCR(a); }}
                        isOcrLoading={ocrLoading && ocrTargetAtt?.id === att.id}
                        isDeleting={deleteMutation.isPending} />
                    ))}
                  </div>
                )}

                <Button size="sm" className="w-full text-xs bg-blue-600 hover:bg-blue-700"
                  onClick={startBatchLinesReview}>
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Συνέχεια → Batch Lines
                </Button>
              </div>
            )}

            {/* Step: batch lines review */}
              {step === "batch_lines_review" && blReviewItems.length > 0 && (
                <div className="border-t p-3 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-slate-500 font-medium">
                      Item {blCurrentIdx + 1}/{blReviewItems.length}: <span className="font-bold text-slate-800">{blReviewItems[blCurrentIdx]?.item_code}</span>
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-6"
                      onClick={() => setShowAttachmentsModal(true)}
                    >
                      <Paperclip className="w-3 h-3 mr-1" /> Attachments
                    </Button>
                  </div>
                {/* Editable fields inline */}
                <div className="grid grid-cols-3 gap-1">
                  {["qty_processed","qty_out_good","qty_scrap"].map(field => (
                    <div key={field}>
                      <p className="text-[10px] text-slate-500 mb-0.5">{field === "qty_processed" ? "Processed" : field === "qty_out_good" ? "Out Good" : "Scrap"}</p>
                      <input
                        type="number" min="0"
                        value={blReviewItems[blCurrentIdx]?.[field] ?? ""}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          setBlReviewItems(prev => prev.map((it, i) => i === blCurrentIdx ? { ...it, [field]: val } : it));
                        }}
                        className="w-full text-sm border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 flex-wrap">
                   <Button size="sm" className="flex-1 text-xs bg-green-600 hover:bg-green-700"
                     disabled={isSavingLine}
                     onClick={() => {
                       const item = blReviewItems[blCurrentIdx];
                       addMsg("user", `ok · Processed=${item.qty_processed} Good=${item.qty_out_good} Scrap=${item.qty_scrap}`);
                       handleBatchLineConfirm(item);
                     }}>
                     {isSavingLine ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                     Επιβεβαίωση
                   </Button>
                   <Button size="sm" variant="outline" className="text-xs"
                     disabled={isSavingLine}
                     onClick={() => {
                       addMsg("user", "Skip - next item");
                       handleBatchLineConfirm({ ...blReviewItems[blCurrentIdx], _skip: true });
                     }}>
                     Skip - next item
                   </Button>
                   <Button size="sm" variant="outline" className="flex-1 text-xs bg-orange-100 text-orange-700 hover:bg-orange-200"
                     onClick={() => {
                       addMsg("user", "⏭️ Skip All Confirmations");
                       setStep("batch_lines_add");
                     }}>
                     <FastForward className="w-3 h-3 mr-1" /> Skip All
                   </Button>
                 </div>
              </div>
            )}

            {/* Step: add extra batch lines */}
             {step === "batch_lines_add" && (
               <div className="space-y-3">
                 <div className="flex justify-end px-3 pt-3">
                   <Button
                     variant="outline"
                     size="sm"
                     className="text-xs h-7"
                     onClick={() => setShowAttachmentsModal(true)}
                   >
                     <Paperclip className="w-3 h-3 mr-1" /> Attachments
                   </Button>
                 </div>
                 <div className="border-t p-3 space-y-3 overflow-y-auto max-h-80">
                   {/* Missing item codes warning */}
                   {existingBatchLines.length > 0 && bundleItemCodes.length > 0 && (
                     <div className="space-y-1.5">
                       {existingBatchLines.map((bl) => {
                         const blCode = bl.item_code?.trim() || "";
                         // Exact match only
                         const exists = bundleItemCodes.includes(blCode);
                         console.log(`Check "${blCode}": exists=${exists}, bundleHas=${bundleItemCodes.slice(0, 5)}`);
                         if (exists) return null;
                         return (
                           <div key={bl.id} className="bg-red-50 border border-red-200 rounded px-2 py-1.5 flex items-start gap-2">
                             <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-red-600" />
                             <div className="text-xs text-red-700">
                               <p className="font-semibold">{blCode} - Δεν υπάρχει στα standards</p>
                               <p className="text-red-600 mt-0.5">Διαθέσιμα: {bundleItemCodes.slice(0, 3).join(", ")}{bundleItemCodes.length > 3 ? "..." : ""}</p>
                             </div>
                           </div>
                         );
                       })}
                     </div>
                   )}

                   <div className="flex items-center justify-between">
                       <p className="text-xs font-semibold text-slate-700">Batch Lines</p>
                       <div className="flex gap-1">
                         <Button variant="ghost" size="sm" className="text-xs h-6" onClick={handleReset}>↩ Αρχή</Button>
                         <Button variant="ghost" size="sm" className="text-xs h-6 text-slate-400"
                           onClick={() => skipStep("batch_lines_add")}>
                           <SkipForward className="w-3 h-3 mr-1" /> Παράλειψη
                         </Button>
                       </div>
                     </div>

                {/* Add new line */}
                <div className="space-y-1 pt-1 border-b pb-3">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Προσθήκη Νέας Γραμμής</p>
                  {/* Searchable multi-select for item codes */}
                   <ItemCodeMultiSelect
                     available={bundleItemCodes.filter(c => !existingBatchLines.find(bl => normalizeItemCode(bl.item_code) === c))}
                     selected={blAddForm.item_codes || []}
                     onChange={codes => setBlAddForm(f => ({ ...f, item_codes: codes }))}
                   />
                  <div className="grid grid-cols-3 gap-1">
                    {[["qty_processed","Processed"],["qty_out_good","Out Good"],["qty_scrap","Scrap"]].map(([field, label]) => (
                      <div key={field}>
                        <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
                        <input type="number" min="0" placeholder="0"
                          value={blAddForm[field]}
                          onChange={e => setBlAddForm(f => ({ ...f, [field]: e.target.value }))}
                          className="w-full text-sm border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400"
                        />
                      </div>
                    ))}
                  </div>
                  <Button size="sm" className="w-full text-xs bg-blue-600 hover:bg-blue-700"
                    onClick={handleAddExtraLine} disabled={!blAddForm.item_codes?.length}>
                    <Plus className="w-3 h-3 mr-1" /> Προσθήκη Line(s)
                  </Button>
                </div>

                {/* Existing lines editable table */}
                {existingBatchLines.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Καταχωρημένες Γραμμές</p>
                    <div className="flex gap-1 text-[10px] font-semibold text-slate-400 px-1">
                      <span className="flex-1 min-w-0">Item</span>
                      <span className="w-8 text-center flex-shrink-0">Sched.</span>
                      <span className="w-12 text-center flex-shrink-0">Proc.</span>
                      <span className="w-12 text-center flex-shrink-0">Good</span>
                      <span className="w-12 text-center flex-shrink-0">Scrap</span>
                      <span className="w-4 flex-shrink-0"></span>
                    </div>
                    {existingBatchLines.map(bl => (
                      <ExistingLineRow key={bl.id} bl={bl}
                        onSave={async (id, data) => {
                          await base44.entities.Batch_Lines.update(id, data);
                          queryClient.invalidateQueries(["Batch_Lines", selBatch?.id]);
                        }}
                        onDelete={async (id) => {
                          await base44.entities.Batch_Lines.delete(id);
                          queryClient.invalidateQueries(["Batch_Lines", selBatch?.id]);
                          toast.success("Γραμμή διαγράφηκε");
                        }}
                      />
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 text-xs bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      goNextStep("batch_lines_add", "✅ Batch Lines ολοκληρώθηκαν!");
                    }}>
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Συνέχεια → QC
                  </Button>
                </div>
                </div>
              </div>
            )}

            {/* Step: QC Initial Stock */}
            {step === "qc" && selBatch && (
              <div className="space-y-3">
                <div className="flex justify-end px-3 pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setShowAttachmentsModal(true)}
                  >
                    <Paperclip className="w-3 h-3 mr-1" /> Attachments
                  </Button>
                </div>
                <ChatStepQC
                  batchId={selBatch.id}
                  department={selDept}
                  onNext={(msg) => goNextStep("qc", msg)}
                  onSkip={() => skipStep("qc")}
                  onBack={() => goPrevStep("qc")}
                />
              </div>
            )}

            {/* Step: Operations */}
            {step === "operations" && selBatch && (
              <div className="space-y-3">
                <div className="flex justify-end px-3 pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setShowAttachmentsModal(true)}
                  >
                    <Paperclip className="w-3 h-3 mr-1" /> Attachments
                  </Button>
                </div>
                <ChatStepOperations
                  batchId={selBatch.id}
                  onNext={(msg) => goNextStep("operations", msg)}
                  onSkip={() => skipStep("operations")}
                  onBack={() => goPrevStep("operations")}
                />
              </div>
            )}

            {/* Step: Team Time - Persons */}
            {step === "team_persons" && selBatch && (
              <div className="space-y-3">
                <div className="flex justify-end px-3 pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setShowAttachmentsModal(true)}
                  >
                    <Paperclip className="w-3 h-3 mr-1" /> Attachments
                  </Button>
                </div>
                <ChatStepTeamPersons
                  batchId={selBatch.id}
                  onNext={(msg) => goNextStep("team_persons", msg)}
                  onSkip={() => skipStep("team_persons")}
                  onBack={() => goPrevStep("team_persons")}
                />
              </div>
            )}

            {/* Step: Team Time - Extra */}
            {step === "team_extra" && selBatch && (
              <div className="space-y-3">
                <div className="flex justify-end px-3 pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setShowAttachmentsModal(true)}
                  >
                    <Paperclip className="w-3 h-3 mr-1" /> Attachments
                  </Button>
                </div>
                <ChatStepTeamExtra
                  batchId={selBatch.id}
                  onNext={(msg) => goNextStep("team_extra", msg)}
                  onSkip={() => skipStep("team_extra")}
                  onBack={() => goPrevStep("team_extra")}
                />
              </div>
            )}

            {/* Step: Help In */}
            {step === "help_in" && selBatch && (
              <div className="space-y-3">
                <div className="flex justify-end px-3 pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setShowAttachmentsModal(true)}
                  >
                    <Paperclip className="w-3 h-3 mr-1" /> Attachments
                  </Button>
                </div>
                <ChatStepHelpIn
                  batchId={selBatch.id}
                  department={selDept}
                  onNext={(msg) => goNextStep("help_in", msg)}
                  onSkip={() => skipStep("help_in")}
                  onBack={() => goPrevStep("help_in")}
                />
              </div>
            )}

            {/* Step: Consumables */}
            {step === "consumables" && selBatch && (
              <div className="space-y-3">
                <div className="flex justify-end px-3 pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setShowAttachmentsModal(true)}
                  >
                    <Paperclip className="w-3 h-3 mr-1" /> Attachments
                  </Button>
                </div>
                <ChatStepConsumables
                  batchId={selBatch.id}
                  onNext={(msg) => goNextStep("consumables", msg)}
                  onSkip={() => skipStep("consumables")}
                  onBack={() => goPrevStep("consumables")}
                />
              </div>
            )}

            {/* Step: Done */}
            {step === "done" && (
              <div className="border-t p-3 space-y-2">
                <Button size="sm" className="w-full text-xs bg-blue-600 hover:bg-blue-700" onClick={handleReset}>
                  ↩ Νέα Καταχώριση
                </Button>
              </div>
            )}

            {/* Free-text input bar — always visible */}
            <div className="border-t bg-white p-2 flex gap-2 items-center">
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleUserMessage(); } }}
                placeholder="Γράψε μήνυμα..."
                className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 bg-slate-50"
              />
              <button
                onClick={handleUserMessage}
                disabled={!userInput.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl p-2 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Resize Handle */}
        {!minimized && !fullscreen && (
          <div
            className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize bg-blue-600 opacity-30 hover:opacity-60 rounded-tl-lg"
            onMouseDown={() => setIsResizing(true)}
            title="Drag to resize"
          />
        )}
      </div>
    )}

                {/* Duplicate file confirmation dialog */}
                {pendingDuplicates.length > 0 && (
          <Dialog open={true} onOpenChange={() => setPendingDuplicates([])}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-base">Αρχείο υπάρχει ήδη</DialogTitle>
              </DialogHeader>
              <div className="py-2 space-y-2">
                {pendingDuplicates.map((f, i) => (
                  <p key={i} className="text-sm text-slate-700">
                    Το αρχείο <span className="font-semibold">"{f.name}"</span> υπάρχει ήδη. Θέλεις να το καταχωρίσεις ξανά;
                  </p>
                ))}
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setPendingDuplicates([])}>
                  Ακύρωση
                </Button>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => {
                  const files = [...pendingDuplicates];
                  setPendingDuplicates([]);
                  files.forEach(f => uploadFile(f, true));
                }}>
                  Ναι, ανέβασέ το
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

      {/* Preview dialog */}
      <Dialog open={!!previewFile} onOpenChange={open => { if (!open) { setPreviewFile(null); setRotation(0); setZoom(1); } }}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>{previewFile?.file_name}</DialogTitle>
            <div className="flex gap-2 items-center mr-6">
              {previewFile && getFileType(previewFile.file_name) === "image" && (
                <>
                  <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} className="text-slate-500 hover:text-slate-700 p-1" title="Zoom Out">
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-slate-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
                  <button onClick={() => setZoom(z => Math.min(4, z + 0.25))} className="text-slate-500 hover:text-slate-700 p-1" title="Zoom In">
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <div className="w-px h-4 bg-slate-200 mx-1" />
                </>
              )}
              {previewFile && (
                <>
                  <button onClick={() => setRotation(r => r - 90)} className="text-slate-500 hover:text-slate-700 p-1" title="Rotate Left">
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button onClick={() => setRotation(r => r + 90)} className="text-slate-500 hover:text-slate-700 p-1" title="Rotate Right">
                    <RotateCw className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                onClick={async () => {
                  const res = await fetch(previewFile.file_url);
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = previewFile.file_name; a.click();
                  URL.revokeObjectURL(url);
                }}
                className="text-blue-600 hover:text-blue-700 p-1" title="Download">
                <Download className="w-5 h-5" />
              </button>
            </div>
          </DialogHeader>
          {previewFile && getFileType(previewFile.file_name) === "image" ? (
            <div className="flex items-center justify-center max-h-[65vh] overflow-auto bg-slate-50 rounded-lg">
              <img
                src={previewFile.file_url}
                alt={previewFile.file_name}
                style={{
                  transform: `rotate(${rotation}deg) scale(${zoom})`,
                  transition: "transform 0.3s ease",
                  transformOrigin: "center center",
                  maxWidth: zoom > 1 ? "none" : "100%",
                }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center max-h-[65vh] overflow-auto bg-slate-50 rounded-lg" style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.3s ease' }}>
              <iframe
                src={`https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(previewFile?.file_url || "")}`}
                className="w-full h-[600px] border-0 rounded-lg"
                title={previewFile?.file_name}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* OCR Verification Modal - Production Form */}
      {showOcrModal && ocrResult && ocrTargetAtt && (
        <OCRVerificationModal
          open={showOcrModal}
          onClose={() => setShowOcrModal(false)}
          fileUrl={ocrTargetAtt.file_url}
          fileName={ocrTargetAtt.file_name}
          ocrResult={ocrResult}
          onConfirm={handleOcrConfirm}
          department={selDept || ocrTargetAtt?.department}
          availableItemCodes={bundleItemCodes}
        />
      )}

      {/* OCR Verification Modal - Teams Time Form */}
      {showTeamsTimeOcrModal && teamsTimeOcrResult && ocrTargetAtt && (
        <OCRTeamsTimeVerificationModal
          open={showTeamsTimeOcrModal}
          onClose={() => setShowTeamsTimeOcrModal(false)}
          fileUrl={ocrTargetAtt.file_url}
          fileName={ocrTargetAtt.file_name}
          ocrResult={teamsTimeOcrResult}
          onConfirm={handleTeamsTimeOcrConfirm}
          totalPages={teamsTimeOcrResult?.page_count || 1}
          defaultPage={1}
        />
      )}

      {/* Split Layout - Inline Chat Panel */}
      {isSplitLayout && (
        <div className={`flex flex-col bg-white ${splitFullscreen ? "fixed inset-x-0 bottom-0 z-50" : "h-full"}`} style={splitFullscreen ? { top: "64px" } : {}}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white border-b border-blue-700 select-none flex-shrink-0">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Bot className="w-5 h-5 flex-shrink-0" />
              <span className="font-semibold text-sm truncate">AI Production Assistant</span>
              {selBatch && (
                <Badge className="bg-blue-500 text-white text-[10px] px-1.5 py-0 flex-shrink-0">
                  {selBatch.date} · {selDept}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleReset} className="hover:bg-blue-700 rounded p-1 opacity-70 hover:opacity-100" title="Reset">
                <RotateCcw className="w-4 h-4" />
              </button>
              <button onClick={() => setSplitFullscreen(f => !f)} className="hover:bg-blue-700 rounded p-1 opacity-70 hover:opacity-100" title={splitFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
                {splitFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
              <button onClick={() => { setSplitFullscreen(false); onClose && onClose(); }} className="hover:bg-blue-700 rounded p-1 opacity-70 hover:opacity-100" title="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat log */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] text-sm px-3 py-2 rounded-2xl whitespace-pre-wrap
                    ${m.role === "user"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-slate-100 text-slate-800 rounded-bl-sm"}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {(createBatchMutation.isPending || uploadingCount > 0 || isAiThinking || isSavingLine) && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-3 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Step UI - same as floating panel */}
          {step === "file_upload" && (
            <ChatStepFileUpload
              departments={departments}
              batchHeaders={allBatchHeaders}
              allBundles={allBundles}
              dailyAssignments={dailyAssignments}
              scheduledDayHeaders={scheduledDayHeaders}
              onFilesSaved={(fileName, batch, errorInfo) => {
                if (errorInfo?.error === "no_bundle") {
                  addMsg("bot", `❌ Δεν βρέθηκε bundle για το τμήμα "${errorInfo.dept}".`);
                } else if (batch) {
                  addMsg("bot", `📎 Αρχείο "${fileName}" αποθηκεύτηκε στο batch ${batch.date} · ${batch.department}.`);
                }
              }}
              onBatchReady={({ dept, date }) => {
                setSelDept(dept); setSelDate(date);
                addMsg("user", `${dept} · ${date}`);
                const existing = allBatchHeaders.find(b => b.date === date && b.department === dept);
                if (existing) {
                  setSelBatch(existing); setStep("attachments");
                  addMsg("bot", `✅ Βρέθηκε batch για ${date} – ${dept}.\nΠρόσθεσε συνημμένα ή πάτα 'Συνέχεια → Batch Lines'.`);
                } else {
                  setStep("batch");
                  const bundle = resolveBundle(date, dept);
                  addMsg("bot", `Δεν υπάρχει batch για ${date} – ${dept}.\n` + (bundle ? `Bundle: **${bundle.version_no || bundle.version}**.\nΔημιουργώ batch;` : "⚠️ Δεν βρέθηκε bundle."));
                }
              }}
              onSkip={() => { setStep("dept"); addMsg("bot", "Επέλεξε τμήμα για να ξεκινήσουμε."); }}
            />
          )}
          {step === "dept" && (
            <div className="border-t p-3 space-y-2 flex-shrink-0">
              <p className="text-xs text-slate-500 font-medium">Επέλεξε τμήμα:</p>
              <div className="grid grid-cols-2 gap-2">
                {departments.map(d => (
                  <Button key={d.id} variant="outline" size="sm" className="text-xs justify-start" onClick={() => handleDeptSelect(d.name)}>
                    {d.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {step === "date" && (
            <div className="border-t p-3 space-y-2 flex-shrink-0">
              <p className="text-xs text-slate-500 font-medium">Επέλεξε ημερομηνία:</p>
              <div className="flex flex-wrap gap-2">
                {quickDates.map(qd => (
                  <Button key={qd.value} variant="outline" size="sm" className="text-xs" onClick={() => handleDateSelect(qd.value)}>
                    <Calendar className="w-3 h-3 mr-1" />{qd.label}
                  </Button>
                ))}
              </div>
              {showPicker && (
                <div className="flex gap-2 mt-1">
                  <Input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} className="text-xs h-8 flex-1" max={todayStr()} />
                  <Button size="sm" className="h-8 text-xs" disabled={!customDate} onClick={() => handleDateSelect(customDate)}>OK</Button>
                </div>
              )}
            </div>
          )}
          {step === "batch" && (
            <div className="border-t p-3 space-y-2 flex-shrink-0">
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 text-xs bg-green-600 hover:bg-green-700" onClick={handleConfirmCreate} disabled={createBatchMutation.isPending}>
                  <Plus className="w-3 h-3 mr-1" /> Ναι, δημιούργησε batch
                </Button>
                <Button size="sm" variant="outline" className="text-xs" onClick={handleReset}>Ακύρωση</Button>
              </div>
            </div>
          )}
          {step === "attachments" && selBatch && (
            <div className="border-t p-3 space-y-3 overflow-y-auto max-h-64 flex-shrink-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-700">Attachments · {selBatch.date} · {selDept}{attachments.length > 0 && <Badge className="ml-2 text-[10px]">{attachments.length}</Badge>}</p>
                <Button variant="ghost" size="sm" className="text-xs h-6" onClick={handleReset}>↩ Νέα αναζήτηση</Button>
              </div>
              <DropZone onFiles={handleFiles} isUploading={uploadingCount > 0} />
              {attachments.map(att => (
                <AttachmentItem key={att.id} att={att} onDelete={id => deleteMutation.mutate(id)} onPreview={setPreviewFile} onOCR={(a) => handleOCR(a)} isOcrLoading={ocrLoading && ocrTargetAtt?.id === att.id} isDeleting={deleteMutation.isPending} />
              ))}
              <Button size="sm" className="w-full text-xs bg-blue-600 hover:bg-blue-700" onClick={startBatchLinesReview}>
                <CheckCircle2 className="w-3 h-3 mr-1" /> Συνέχεια → Batch Lines
              </Button>
            </div>
          )}
          {step === "batch_lines_review" && blReviewItems.length > 0 && (
            <div className="border-t p-3 space-y-2 flex-shrink-0">
              <p className="text-xs text-slate-500 font-medium">Item {blCurrentIdx + 1}/{blReviewItems.length}: <span className="font-bold text-slate-800">{blReviewItems[blCurrentIdx]?.item_code}</span></p>
              <div className="grid grid-cols-3 gap-1">
                {["qty_processed","qty_out_good","qty_scrap"].map(field => (
                  <div key={field}>
                    <p className="text-[10px] text-slate-500 mb-0.5">{field === "qty_processed" ? "Processed" : field === "qty_out_good" ? "Out Good" : "Scrap"}</p>
                    <input type="number" min="0" value={blReviewItems[blCurrentIdx]?.[field] ?? ""} onChange={e => { const val = parseFloat(e.target.value) || 0; setBlReviewItems(prev => prev.map((it, i) => i === blCurrentIdx ? { ...it, [field]: val } : it)); }} className="w-full text-sm border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400" />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 text-xs bg-green-600 hover:bg-green-700" disabled={isSavingLine} onClick={() => { const item = blReviewItems[blCurrentIdx]; handleBatchLineConfirm(item); }}>
                  {isSavingLine ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />} Επιβεβαίωση
                </Button>
                <Button size="sm" variant="outline" className="text-xs" disabled={isSavingLine} onClick={() => handleBatchLineConfirm({ ...blReviewItems[blCurrentIdx], _skip: true })}>Skip</Button>
                <Button size="sm" variant="outline" className="text-xs bg-orange-100 text-orange-700 hover:bg-orange-200" onClick={() => { setStep("batch_lines_add"); }}>
                  <FastForward className="w-3 h-3 mr-1" /> Skip All
                </Button>
              </div>
            </div>
          )}
          {step === "batch_lines_add" && (
            <div className="border-t p-3 space-y-2 overflow-y-auto max-h-72 flex-shrink-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-700">Batch Lines</p>
                <Button variant="ghost" size="sm" className="text-xs h-6 text-slate-400" onClick={() => skipStep("batch_lines_add")}><SkipForward className="w-3 h-3 mr-1" /> Παράλειψη</Button>
              </div>
              <ItemCodeMultiSelect available={bundleItemCodes.filter(c => !existingBatchLines.find(bl => normalizeItemCode(bl.item_code) === c))} selected={blAddForm.item_codes || []} onChange={codes => setBlAddForm(f => ({ ...f, item_codes: codes }))} />
              <div className="grid grid-cols-3 gap-1">
                {[["qty_processed","Processed"],["qty_out_good","Out Good"],["qty_scrap","Scrap"]].map(([field, label]) => (
                  <div key={field}>
                    <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
                    <input type="number" min="0" placeholder="0" value={blAddForm[field]} onChange={e => setBlAddForm(f => ({ ...f, [field]: e.target.value }))} className="w-full text-sm border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400" />
                  </div>
                ))}
              </div>
              <Button size="sm" className="w-full text-xs bg-blue-600 hover:bg-blue-700" onClick={handleAddExtraLine} disabled={!blAddForm.item_codes?.length}><Plus className="w-3 h-3 mr-1" /> Προσθήκη Line(s)</Button>
              <Button size="sm" className="w-full text-xs bg-green-600 hover:bg-green-700" onClick={() => goNextStep("batch_lines_add", "✅ Batch Lines ολοκληρώθηκαν!")}>
                <CheckCircle2 className="w-3 h-3 mr-1" /> Συνέχεια → QC
              </Button>
            </div>
          )}
          {step === "qc" && selBatch && (
            <ChatStepQC batchId={selBatch.id} department={selDept} onNext={(msg) => goNextStep("qc", msg)} onSkip={() => skipStep("qc")} onBack={() => goPrevStep("qc")} />
          )}
          {step === "operations" && selBatch && (
            <ChatStepOperations batchId={selBatch.id} onNext={(msg) => goNextStep("operations", msg)} onSkip={() => skipStep("operations")} onBack={() => goPrevStep("operations")} />
          )}
          {step === "team_persons" && selBatch && (
            <ChatStepTeamPersons batchId={selBatch.id} onNext={(msg) => goNextStep("team_persons", msg)} onSkip={() => skipStep("team_persons")} onBack={() => goPrevStep("team_persons")} />
          )}
          {step === "team_extra" && selBatch && (
            <ChatStepTeamExtra batchId={selBatch.id} onNext={(msg) => goNextStep("team_extra", msg)} onSkip={() => skipStep("team_extra")} onBack={() => goPrevStep("team_extra")} />
          )}
          {step === "help_in" && selBatch && (
            <ChatStepHelpIn batchId={selBatch.id} department={selDept} onNext={(msg) => goNextStep("help_in", msg)} onSkip={() => skipStep("help_in")} onBack={() => goPrevStep("help_in")} />
          )}
          {step === "consumables" && selBatch && (
            <ChatStepConsumables batchId={selBatch.id} onNext={(msg) => goNextStep("consumables", msg)} onSkip={() => skipStep("consumables")} onBack={() => goPrevStep("consumables")} />
          )}
          {step === "done" && (
            <div className="border-t p-3 flex-shrink-0">
              <Button size="sm" className="w-full text-xs bg-blue-600 hover:bg-blue-700" onClick={handleReset}>↩ Νέα Καταχώριση</Button>
            </div>
          )}

          {/* Free-text input */}
          <div className="border-t bg-white p-2 flex gap-2 items-center flex-shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleUserMessage(); } }}
              placeholder="Γράψε μήνυμα..."
              className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 bg-slate-50"
            />
            <button onClick={handleUserMessage} disabled={!userInput.trim()} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl p-2 transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Attachments Modal - Accessible from any tab */}
      <Dialog open={showAttachmentsModal} onOpenChange={setShowAttachmentsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Attachments · {selBatch?.date} · {selDept}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <DropZone onFiles={handleFiles} isUploading={uploadingCount > 0} />

            {loadingAtts ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              </div>
            ) : attachments.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Δεν υπάρχουν attachments ακόμα.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700">
                  Υπάρχοντα Attachments ({attachments.length})
                </p>
                <div className="space-y-1">
                  {attachments.map(att => (
                    <AttachmentItem key={att.id} att={att}
                      onDelete={id => deleteMutation.mutate(id)}
                      onPreview={setPreviewFile}
                      onOCR={handleOCR}
                      isOcrLoading={ocrLoading && ocrTargetAtt?.id === att.id}
                      isDeleting={deleteMutation.isPending} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      </>
      );
      }