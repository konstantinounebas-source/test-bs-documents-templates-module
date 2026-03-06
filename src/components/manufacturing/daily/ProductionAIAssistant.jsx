import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Bot, Send, Paperclip, Upload, X, FileText, ImageIcon,
  Eye, Download, Trash2, Loader2, CalendarDays, Plus,
  CheckCircle2, AlertCircle, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { format, subDays, isMonday, isFriday, isSaturday, isSunday } from "date-fns";
import { productionAIAssistant } from "@/functions/productionAIAssistant";

const TODAY = format(new Date(), "yyyy-MM-dd");
const YESTERDAY = format(subDays(new Date(), 1), "yyyy-MM-dd");

function getSmartDateOptions() {
  const today = new Date();
  const options = [{ label: "Today", value: TODAY }];
  // Yesterday
  const yesterday = subDays(today, 1);
  options.push({ label: "Yesterday", value: YESTERDAY });
  // If today is Monday => also show Friday
  if (isMonday(today)) {
    const friday = subDays(today, 3);
    options.push({ label: `Last Friday (${format(friday, "dd/MM")})`, value: format(friday, "yyyy-MM-dd") });
  }
  // If today is Saturday => also show Friday
  if (isSaturday(today)) {
    const friday = subDays(today, 1);
    options.push({ label: `Friday (${format(friday, "dd/MM")})`, value: format(friday, "yyyy-MM-dd") });
  }
  return options;
}

export default function ProductionAIAssistant() {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hello! I'm your Production Assistant. Select a department and date to get started, and I'll help you manage batch data and attachments." }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [customDate, setCustomDate] = useState("");
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [activeTab, setActiveTab] = useState("batch_lines");
  const [previewFile, setPreviewFile] = useState(null);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const dateOptions = getSmartDateOptions();
  const effectiveDate = useCustomDate ? customDate : selectedDate;

  // Departments
  const { data: departments = [] } = useQuery({
    queryKey: ["Department"],
    queryFn: () => base44.entities.Department.list(),
    staleTime: Infinity
  });

  // Batch headers for selected department
  const { data: batchHeaders = [], refetch: refetchBatches } = useQuery({
    queryKey: ["BatchHeader", selectedDepartment],
    queryFn: () => base44.entities.BatchHeader.filter({ department: selectedDepartment }),
    enabled: !!selectedDepartment,
    staleTime: 0
  });

  // Bundles
  const { data: allBundles = [] } = useQuery({
    queryKey: ["StandardsBundle-All"],
    queryFn: () => base44.entities.StandardsBundle.list(),
    staleTime: 0
  });

  // DailyStandardsAssignments
  const { data: dailyAssignments = [] } = useQuery({
    queryKey: ["DailyStandardsAssignment", selectedDepartment],
    queryFn: () => base44.entities.DailyStandardsAssignment.filter({ department_id: selectedDepartment }),
    enabled: !!selectedDepartment,
    staleTime: 0
  });

  // Attachments for selected batch
  const { data: attachments = [], refetch: refetchAttachments } = useQuery({
    queryKey: ["BatchAttachments", selectedBatch?.id],
    queryFn: () => base44.entities.BatchAttachment.filter({ batch_header_id: selectedBatch.id }),
    enabled: !!selectedBatch?.id,
    staleTime: 0
  });

  // Tab counts
  const { data: batchLines = [] } = useQuery({
    queryKey: ["Batch_Lines", selectedBatch?.id],
    queryFn: () => base44.entities.Batch_Lines.filter({ batch_header_id: selectedBatch.id }),
    enabled: !!selectedBatch?.id
  });
  const { data: qcLines = [] } = useQuery({
    queryKey: ["QC_Initial_Stock", selectedBatch?.id],
    queryFn: () => base44.entities.QC_Initial_Stock.filter({ batch_header_id: selectedBatch.id }),
    enabled: !!selectedBatch?.id
  });
  const { data: operations = [] } = useQuery({
    queryKey: ["Operations", selectedBatch?.id],
    queryFn: () => base44.entities.Operations.filter({ batch_header_id: selectedBatch.id }),
    enabled: !!selectedBatch?.id
  });
  const { data: teamPersons = [] } = useQuery({
    queryKey: ["Team_Time_Persons", selectedBatch?.id],
    queryFn: () => base44.entities.TeamTimePerson.filter({ batch_header_id: selectedBatch.id }),
    enabled: !!selectedBatch?.id
  });

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-select batch when date/dept changes
  useEffect(() => {
    if (!selectedDepartment || !effectiveDate) return;
    const found = batchHeaders.find(b => b.date === effectiveDate && b.department === selectedDepartment);
    if (found) {
      setSelectedBatch(found);
    } else {
      setSelectedBatch(null);
    }
  }, [selectedDepartment, effectiveDate, batchHeaders]);

  const getEffectiveBundle = () => {
    if (!selectedBatch) return null;
    const da = dailyAssignments.find(a => a.assignment_date === selectedBatch.date && a.department_id === selectedBatch.department);
    if (da?.standards_bundle_id) return allBundles.find(b => b.id === da.standards_bundle_id) || null;
    return allBundles.find(b => b.id === selectedBatch.bundle_id) || null;
  };

  const createBatchMutation = useMutation({
    mutationFn: async () => {
      // Resolve bundle
      const da = dailyAssignments.find(a => a.assignment_date === effectiveDate && a.department_id === selectedDepartment);
      let bundleId = da?.standards_bundle_id;
      if (!bundleId) {
        const activeBundle = allBundles.find(b => b.department === selectedDepartment && b.status === "ACTIVE");
        bundleId = activeBundle?.id;
      }
      if (!bundleId) throw new Error("No active standards bundle found for this department.");

      const scheduledData = await base44.entities.ScheduledData.filter({
        date: effectiveDate,
        department_id: selectedDepartment
      });

      const newBatch = await base44.entities.BatchHeader.create({
        date: effectiveDate,
        department: selectedDepartment,
        bundle_id: bundleId,
        has_scheduled_data: scheduledData.length > 0
      });

      if (scheduledData.length > 0) {
        const batchLines = scheduledData.map(sd => ({
          batch_header_id: newBatch.id,
          item_code: sd.item_code,
          scheduled_qty: sd.ops_qty || 0,
          qty_processed: 0,
          qty_out_good: 0,
          qty_scrap: 0
        }));
        await base44.entities.Batch_Lines.bulkCreate(batchLines);
      }

      return newBatch;
    },
    onSuccess: (newBatch) => {
      queryClient.invalidateQueries(["BatchHeader", selectedDepartment]);
      queryClient.invalidateQueries(["Batch_Lines", newBatch.id]);
      setSelectedBatch(newBatch);
      setActiveTab("batch_lines");
      addMessage("assistant", `✅ Batch created for **${effectiveDate}** (${selectedDepartment}). ${newBatch.has_scheduled_data ? "Batch Lines were auto-filled from schedule." : "No scheduled data found — Batch Lines are empty."} You can now add attachments or enter data in any tab.`);
    },
    onError: (err) => {
      addMessage("assistant", `❌ Failed to create batch: ${err.message}`);
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const fileType = file.type.startsWith("image") ? "image" : "pdf";
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const user = await base44.auth.me();
      return base44.entities.BatchAttachment.create({
        batch_header_id: selectedBatch.id,
        department: selectedBatch.department,
        file_url,
        file_name: file.name,
        file_type: fileType,
        uploaded_by: user.email,
        notes: ""
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["BatchAttachments", selectedBatch?.id]);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BatchAttachment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["BatchAttachments", selectedBatch?.id]);
      toast.success("Attachment deleted");
    }
  });

  function addMessage(role, text, extra) {
    setMessages(prev => [...prev, { role, text, ...extra }]);
  }

  const handleSend = async () => {
    const text = input.trim();
    const files = pendingFiles;
    if (!text && files.length === 0) return;

    addMessage("user", text, { files: files.map(f => f.name) });
    setInput("");
    setPendingFiles([]);
    setIsLoading(true);

    try {
      // If files are attached, upload them
      if (files.length > 0) {
        if (!selectedBatch) {
          addMessage("assistant", "⚠️ Please select (or create) a batch first before uploading files.");
          setIsLoading(false);
          return;
        }
        setIsUploading(true);
        for (const file of files) {
          await uploadMutation.mutateAsync(file);
        }
        setIsUploading(false);
        addMessage("assistant", `📎 ${files.length} file(s) attached to batch **${selectedBatch.date}** (${selectedBatch.department}).`);
        if (!text) { setIsLoading(false); return; }
      }

      // Send message to AI
      const context = {
        department: selectedDepartment,
        date: effectiveDate,
        batch_id: selectedBatch?.id || null,
        active_tab: activeTab,
        batch_lines_count: batchLines.length,
        qc_lines_count: qcLines.length,
        operations_count: operations.length,
        team_persons_count: teamPersons.length,
        attachments_count: attachments.length
      };

      const res = await productionAIAssistant({ message: text, context });
      addMessage("assistant", res.data?.reply || "I'm not sure how to help with that.");
    } catch (err) {
      addMessage("assistant", "⚠️ Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setPendingFiles(prev => [...prev, ...files]);
    e.target.value = "";
  };

  const TAB_ITEMS = [
    { key: "batch_lines", label: "Batch Lines", count: batchLines.length },
    { key: "qc_initial", label: "QC Initial", count: qcLines.length },
    { key: "operations", label: "Operations", count: operations.length },
    { key: "team_persons", label: "Team Persons", count: teamPersons.length },
    { key: "attachments", label: "Attachments", count: attachments.length },
  ];

  const bundle = getEffectiveBundle();

  return (
    <div className="flex flex-col h-full max-h-[92vh] bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 flex items-center gap-3">
        <Bot className="w-5 h-5" />
        <div>
          <p className="font-semibold text-sm">Production AI Assistant</p>
          <p className="text-xs opacity-80">Daily Production Entry Helper</p>
        </div>
      </div>

      {/* Dept + Date selectors */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Department</Label>
            <Select value={selectedDepartment} onValueChange={(v) => { setSelectedDepartment(v); setSelectedBatch(null); }}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select dept..." />
              </SelectTrigger>
              <SelectContent>
                {departments.map(d => (
                  <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Date</Label>
            {!useCustomDate ? (
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dateOptions.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label} ({o.value})</SelectItem>
                  ))}
                  <SelectItem value="__custom__" onSelect={() => setUseCustomDate(true)}>📅 Other date...</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex gap-1">
                <Input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="h-8 text-xs flex-1"
                />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setUseCustomDate(false)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Other date link */}
        {!useCustomDate && (
          <button className="text-xs text-blue-500 hover:underline" onClick={() => { setUseCustomDate(true); setCustomDate(""); }}>
            📅 Other date...
          </button>
        )}

        {/* Batch status */}
        {selectedDepartment && effectiveDate && (
          <div className="flex items-center gap-2 flex-wrap">
            {selectedBatch ? (
              <>
                <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Batch: {selectedBatch.date}
                </Badge>
                {bundle && (
                  <Badge variant="outline" className="text-xs">
                    📦 {bundle.version_no} ({bundle.status})
                  </Badge>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  No batch for this date
                </Badge>
                <Button
                  size="sm"
                  className="h-6 text-xs px-2 bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    addMessage("user", `Create batch for ${effectiveDate} - ${selectedDepartment}`);
                    createBatchMutation.mutate();
                  }}
                  disabled={createBatchMutation.isPending}
                >
                  {createBatchMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3 mr-1" />}
                  Create
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tab selector (when batch exists) */}
      {selectedBatch && (
        <div className="px-3 py-2 border-b border-slate-100 overflow-x-auto">
          <div className="flex gap-1">
            {TAB_ITEMS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`text-xs px-1 rounded-full ${activeTab === tab.key ? "bg-white/30" : "bg-slate-300"}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Attachments view (when attachments tab active) */}
      {selectedBatch && activeTab === "attachments" && (
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-700">Attachments ({attachments.length})</p>
            <label className="cursor-pointer">
              <input type="file" multiple accept="image/*,.pdf" className="hidden" onChange={handleFileSelect} />
              <span className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                <Upload className="w-3 h-3" /> Upload
              </span>
            </label>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {attachments.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-2">No attachments yet</p>
            ) : attachments.map(att => (
              <div key={att.id} className="flex items-center gap-2 p-1.5 bg-white rounded border border-slate-200 group">
                {att.file_type === "image" ? (
                  <ImageIcon className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                )}
                <span className="text-xs text-slate-700 flex-1 truncate">{att.file_name}</span>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setPreviewFile(att)}>
                    <Eye className="w-3 h-3" />
                  </Button>
                  <a href={att.file_url} download={att.file_name} className="flex items-center">
                    <Button variant="ghost" size="icon" className="h-5 w-5">
                      <Download className="w-3 h-3" />
                    </Button>
                  </a>
                  <Button
                    variant="ghost" size="icon"
                    className="h-5 w-5 text-red-500 hover:text-red-700"
                    onClick={() => deleteMutation.mutate(att.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-blue-600" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs shadow-sm ${
              msg.role === "user"
                ? "bg-blue-600 text-white rounded-br-none"
                : "bg-slate-100 text-slate-800 rounded-bl-none"
            }`}>
              <p className="whitespace-pre-wrap">{msg.text}</p>
              {msg.files?.length > 0 && (
                <div className="mt-1 text-xs opacity-70">
                  <Paperclip className="w-3 h-3 inline mr-1" />
                  {msg.files.join(", ")}
                </div>
              )}
            </div>
          </div>
        ))}
        {(isLoading || isUploading) && (
          <div className="flex justify-start">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center mr-2 flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="bg-slate-100 rounded-xl px-3 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Pending files preview */}
      {pendingFiles.length > 0 && (
        <div className="px-4 py-2 border-t border-slate-100 bg-amber-50 flex gap-2 flex-wrap">
          {pendingFiles.map((f, i) => (
            <div key={i} className="flex items-center gap-1 bg-white border border-amber-200 rounded px-2 py-0.5 text-xs text-slate-700">
              <Paperclip className="w-3 h-3 text-amber-500" />
              <span className="truncate max-w-[100px]">{f.name}</span>
              <button onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))}>
                <X className="w-3 h-3 text-slate-400 hover:text-red-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="px-3 py-2 border-t border-slate-200 bg-white flex gap-2 items-center">
        <label className="cursor-pointer flex-shrink-0">
          <input type="file" multiple accept="image/*,.pdf" className="hidden" onChange={handleFileSelect} ref={fileInputRef} />
          <div className="w-7 h-7 rounded-md border border-slate-200 hover:bg-slate-50 flex items-center justify-center">
            <Paperclip className="w-4 h-4 text-slate-500" />
          </div>
        </label>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Ask something or type a command..."
          className="text-xs h-8 flex-1"
          disabled={isLoading}
        />
        <Button
          size="icon"
          className="h-7 w-7 bg-blue-600 hover:bg-blue-700 flex-shrink-0"
          onClick={handleSend}
          disabled={isLoading || (!input.trim() && pendingFiles.length === 0)}
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{previewFile?.file_name}</DialogTitle>
          </DialogHeader>
          {previewFile?.file_type === "image" ? (
            <div className="flex items-center justify-center max-h-[65vh] overflow-auto bg-slate-50 rounded-lg p-4">
              <img src={previewFile.file_url} alt={previewFile.file_name} className="max-w-full max-h-full rounded" />
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
    </div>
  );
}