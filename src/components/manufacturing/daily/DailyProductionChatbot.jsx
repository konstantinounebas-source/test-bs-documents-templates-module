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
  Download, Eye, Trash2, ChevronDown, ChevronUp, Calendar,
  Loader2, CheckCircle2, Minimize2, Maximize2, Plus, RotateCw, RotateCcw, MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import { format, subDays, isMonday } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// ─── helpers ────────────────────────────────────────────────────────────────
function todayStr() { return format(new Date(), "yyyy-MM-dd"); }
function yesterdayStr() { return format(subDays(new Date(), 1), "yyyy-MM-dd"); }

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

// ─── Attachment item ─────────────────────────────────────────────────────────
function AttachmentItem({ att, onDelete, onPreview, isDeleting }) {
  return (
    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg group hover:bg-slate-100 transition-colors">
      {att.file_type === "image"
        ? <ImageIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
        : <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />}
      <a href={att.file_url} target="_blank" rel="noopener noreferrer"
         className="text-xs text-blue-600 hover:underline truncate flex-1">{att.file_name}</a>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
export default function DailyProductionChatbot({ departments = [] }) {
  const queryClient = useQueryClient();

  // panel state
  const [open, setOpen]       = useState(false);
  const [minimized, setMin]   = useState(false);

  // wizard state
  const [step, setStep]         = useState("dept");   // dept | date | batch | attachments
  const [selDept, setSelDept]   = useState("");
  const [selDate, setSelDate]   = useState("");
  const [customDate, setCustomDate] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [selBatch, setSelBatch] = useState(null);

  // attachment preview
  const [previewFile, setPreviewFile] = useState(null);
  const [rotation, setRotation] = useState(0);

  // free-text input
  const [userInput, setUserInput] = useState("");
  const inputRef = useRef();

  // messages (chat log)
  const [messages, setMessages] = useState([
    { role: "bot", text: "Γεια σου! 👋 Επέλεξε τμήμα για να ξεκινήσουμε." }
  ]);

  const addMsg = (role, text, extra = {}) =>
    setMessages(p => [...p, { role, text, ...extra }]);

  const scrollRef = useRef();
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // ── data ──────────────────────────────────────────────────────────────────
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
    queryKey: ["DailyStandardsAssignment", selDept],
    queryFn: () => base44.entities.DailyStandardsAssignment.filter({ department_id: selDept }),
    enabled: !!selDept,
    staleTime: 0
  });

  const { data: scheduledDayHeaders = [] } = useQuery({
    queryKey: ["ScheduledDayHeader", selDept],
    queryFn: () => base44.entities.ScheduledDayHeader.filter({ department_id: selDept }),
    enabled: !!selDept,
    staleTime: 0
  });

  const { data: attachments = [], isLoading: loadingAtts } = useQuery({
    queryKey: ["BatchAttachments", selBatch?.id],
    queryFn: () => base44.entities.BatchAttachment.filter({ batch_header_id: selBatch?.id }),
    enabled: !!selBatch?.id,
    staleTime: 0
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
      setSelBatch(batch);
      setStep("attachments");
      addMsg("bot",
        `✅ Batch δημιουργήθηκε για ${batch.date} – ${batch.department}.\n` +
        (batch.has_scheduled_data ? "Οι γραμμές παραγωγής προσυμπληρώθηκαν από το πρόγραμμα." : "⚠️ Δεν βρέθηκαν δεδομένα προγράμματος.")
      );
    },
    onError: () => { toast.error("Αποτυχία δημιουργίας batch"); addMsg("bot", "❌ Σφάλμα κατά τη δημιουργία batch."); }
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
        `✅ Βρέθηκε batch για ${date} – ${selDept}.\n` +
        (bundle ? `📦 Bundle: ${bundle.version_no || bundle.version} (${bundle.status})` : "⚠️ Χωρίς bundle.")
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
    setStep("dept"); setSelDept(""); setSelDate(""); setSelBatch(null);
    setMessages([{ role: "bot", text: "Γεια σου! 👋 Επέλεξε τμήμα για να ξεκινήσουμε." }]);
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
        prompt: `Είσαι βοηθός παραγωγής για manufacturing σύστημα. 

Διαθέσιμα τμήματα: ${deptList.join(", ")}
Τρέχον βήμα wizard: ${step}
${context}

Μήνυμα χρήστη: "${text}"

Αν το μήνυμα αναφέρεται σε επιλογή τμήματος (ακόμα και με ορθογραφικά λάθη ή greeklish), επέστρεψε JSON με:
{"action": "select_dept", "dept": "<ακριβές όνομα τμήματος από τη λίστα>", "reply": "<σύντομη απάντηση>"}

Αν το μήνυμα αναφέρεται σε επιλογή ημερομηνίας, επέστρεψε JSON με:
{"action": "select_date", "date": "<YYYY-MM-DD>", "reply": "<σύντομη απάντηση>"}

Αλλιώς επέστρεψε JSON με:
{"action": "reply", "reply": "<απάντηση στα ελληνικά, σύντομη>"}`,
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
          addMsg("bot", result.reply || `Επέλεξα το τμήμα ${match.name}.`);
          handleDeptSelect(match.name);
          return;
        }
      }
      if (result.action === "select_date" && result.date) {
        addMsg("bot", result.reply || `Επέλεξα ημερομηνία ${result.date}.`);
        handleDateSelect(result.date);
        return;
      }
      addMsg("bot", result.reply || "Δεν κατάλαβα. Δοκίμασε ξανά.");
    } catch (err) {
      addMsg("bot", "❌ Σφάλμα επικοινωνίας με AI.");
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleUserMessage = () => {
    const text = userInput.trim();
    if (!text) return;
    setUserInput("");
    addMsg("user", text);

    const lower = text.toLowerCase();

    if (step === "dept") {
      const match = departments.find(d => lower.includes(d.name.toLowerCase()));
      if (match) { handleDeptSelect(match.name); return; }
      // fallback to AI
      askAI(text, lower);
      return;
    }

    if (step === "date") {
      const dateMatch = text.match(/\d{4}-\d{2}-\d{2}/);
      if (dateMatch) { handleDateSelect(dateMatch[0]); return; }
      if (lower.includes("σήμερ") || lower.includes("today")) { handleDateSelect(todayStr()); return; }
      if (lower.includes("χθες") || lower.includes("yester")) {
        const d = new Date(); d.setDate(d.getDate() - 1);
        handleDateSelect(d.toISOString().split("T")[0]); return;
      }
      // fallback to AI
      askAI(text, lower);
      return;
    }

    if (step === "batch") {
      if (lower.includes("ναι") || lower.includes("yes") || lower.includes("δημιούργ")) {
        handleConfirmCreate(); return;
      }
      if (lower.includes("όχι") || lower.includes("no") || lower.includes("ακύρ")) {
        handleReset(); return;
      }
      askAI(text, lower);
      return;
    }

    if (step === "attachments") {
      if (lower.includes("επανεκκίν") || lower.includes("reset") || lower.includes("νέα αναζήτ") || lower.includes("αρχή")) {
        handleReset(); return;
      }
      // All other messages → AI
      askAI(text, lower);
      return;
    }

    askAI(text, lower);
  };

  const quickDates = getQuickDates();

  // ── UI ────────────────────────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-2xl transition-all flex items-center gap-2"
      >
        <Bot className="w-5 h-5" />
        <span className="text-sm font-medium pr-1">AI Assistant</span>
      </button>
    );
  }

  return (
    <>
      <div className={`fixed bottom-6 right-6 z-50 w-[400px] shadow-2xl rounded-2xl border border-slate-200 bg-white flex flex-col transition-all
        ${minimized ? "h-14" : "h-[620px]"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-blue-600 rounded-t-2xl text-white">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            <span className="font-semibold text-sm">AI Production Assistant</span>
            {selBatch && (
              <Badge className="bg-blue-500 text-white text-[10px] px-1.5 py-0">
                {selBatch.date} · {selDept}
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            <button onClick={() => setMin(m => !m)} className="hover:bg-blue-700 rounded p-1">
              {minimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
            <button onClick={() => setOpen(false)} className="hover:bg-blue-700 rounded p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!minimized && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Chat log */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
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
                {(createBatchMutation.isPending || uploadingCount > 0 || isAiThinking) && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-3 py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Step: choose department */}
            {step === "dept" && (
              <div className="border-t p-3 space-y-2">
                <p className="text-xs text-slate-500 font-medium">Επέλεξε τμήμα:</p>
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
                        isDeleting={deleteMutation.isPending} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Free-text input bar — always visible */}
            <div className="border-t bg-white p-2 flex gap-2 items-center rounded-b-2xl">
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
      </div>

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
      <Dialog open={!!previewFile} onOpenChange={open => { if (!open) { setPreviewFile(null); setRotation(0); } }}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>{previewFile?.file_name}</DialogTitle>
            <div className="flex gap-2 items-center mr-6">
              {previewFile?.file_type === "image" && (
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
          {previewFile?.file_type === "image" ? (
            <div className="flex items-center justify-center max-h-[65vh] overflow-auto bg-slate-50 rounded-lg">
              <img
                src={previewFile.file_url}
                alt={previewFile.file_name}
                style={{ transform: `rotate(${rotation}deg)`, transition: "transform 0.3s ease" }}
                className="max-w-full max-h-full"
              />
            </div>
          ) : (
            <iframe
              src={`https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(previewFile?.file_url || "")}`}
              className="w-full h-[600px] border-0 rounded-lg"
              title={previewFile?.file_name}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}