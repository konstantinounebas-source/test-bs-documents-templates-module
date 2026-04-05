import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Loader2, ZoomIn, ZoomOut, RotateCw, RotateCcw, Scan, Info, Maximize2, Minimize2 } from "lucide-react";

// Parse filename e.g. "2-3-26_FA_Prepaint_1Fr.pdf" → date, dept
function parseFileName(fileName) {
  if (!fileName) return { date: null, dept: null };
  // date: leading "D-M-YY" or "DD-MM-YY"
  const dateMatch = fileName.match(/^(\d{1,2})-(\d{1,2})-(\d{2})/);
  let date = null;
  if (dateMatch) {
    const [, d, m, y] = dateMatch;
    date = `${d.padStart(2,'0')}/${m.padStart(2,'0')}/20${y}`;
  }
  // dept
  const lc = fileName.toLowerCase();
  let dept = null;
  if (lc.includes('prepaint') || lc.includes('pre-paint') || lc.includes('pre_paint')) dept = "Pre-Paint";
  else if (lc.includes('assembly') || lc.includes('ass')) dept = "Assembly";
  else if (lc.includes('subass') || lc.includes('sub-ass')) dept = "Sub-Assembly";
  else if (lc.includes('refurb') || lc.includes('ref')) dept = "Refurbishment";
  return { date, dept };
}

export default function OCRTeamsTimeVerificationModal({ open, onClose, fileUrl, fileName, ocrResult, onConfirm }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [modalFullscreen, setModalFullscreen] = useState(false);
  const [imagePanelWidth, setImagePanelWidth] = useState(40);
  const isDragging = useRef(false);
  const containerRef = useRef(null);
  const [confirmed, setConfirmed] = useState(false);

  const fileParsed = parseFileName(fileName);

  const [date, setDate] = useState(
    ocrResult?.extracted_data?.date || fileParsed.date || ""
  );

  const [persons, setPersons] = useState(
    () => (ocrResult?.extracted_data?.team_persons || []).map(p => ({ ...p, break_min: p.break_min ?? 45 }))
  );
  const [extras, setExtras] = useState(
    () => ocrResult?.extracted_data?.team_extra || []
  );

  const warnings = ocrResult?.warnings || [];
  const confidence = ocrResult?.confidence_score ?? null;
  const isImage = fileName && ['jpg','jpeg','png','gif','webp','bmp'].includes(fileName.split('.').pop().toLowerCase());

  const handleDividerMouseDown = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    const onMove = (ev) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setImagePanelWidth(Math.min(75, Math.max(15, pct)));
    };
    const onUp = () => { isDragging.current = false; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  const updatePerson = (i, field, val) =>
    setPersons(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p));

  const updateExtra = (i, field, val) =>
    setExtras(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e));

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent
        className={`p-0 overflow-hidden transition-all duration-200 ${modalFullscreen ? "max-w-[100vw] w-[100vw] max-h-[100vh] h-[100vh] rounded-none" : "max-w-[98vw] w-[98vw] max-h-[96vh]"}`}
        style={modalFullscreen ? { position: "fixed", top: 0, left: 0, transform: "none", borderRadius: 0 } : {}}
      >
        <DialogHeader className="px-4 py-2 border-b bg-slate-50 flex-row items-center gap-3">
          <Scan className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <DialogTitle className="text-sm">OCR Teams Time · {fileName}</DialogTitle>
          {confidence !== null && (
            <Badge className={`text-xs ${confidence >= 80 ? "bg-green-100 text-green-700" : confidence >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
              Εμπιστοσύνη: {confidence}%
            </Badge>
          )}
          <button onClick={() => setModalFullscreen(v => !v)} className="ml-auto mr-8 p-1.5 hover:bg-slate-200 rounded">
            {modalFullscreen ? <Minimize2 className="w-4 h-4 text-blue-600" /> : <Maximize2 className="w-4 h-4 text-slate-500" />}
          </button>
        </DialogHeader>

        <div className={`flex ${modalFullscreen ? "h-[calc(100vh-100px)]" : "h-[calc(96vh-100px)]"}`} ref={containerRef}>
          {/* LEFT: Image/PDF viewer */}
          <div className="border-r bg-slate-100 flex flex-col flex-shrink-0" style={{ width: `${imagePanelWidth}%` }}>
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
                  style={{ transform: `rotate(${rotation}deg)`, minHeight: "500px" }}
                />
              )}
            </div>
          </div>

          {/* Drag divider */}
          <div onMouseDown={handleDividerMouseDown} className="w-1.5 bg-slate-200 hover:bg-blue-400 cursor-col-resize flex-shrink-0 transition-colors" />

          {/* RIGHT: Data editor */}
          <div className="flex-1 flex flex-col bg-white min-w-0 overflow-hidden">
            {/* Header row */}
            <div className="px-4 py-2 border-b bg-slate-50 flex items-center gap-3 flex-shrink-0 flex-wrap">
              <span className="text-xs font-semibold text-slate-600">Ημερομηνία:</span>
              <input type="text" value={date} onChange={e => setDate(e.target.value)}
                placeholder="dd/mm/yyyy"
                className="text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400 w-28" />
              {fileParsed.date && fileParsed.date !== date && (
                <span className="text-xs text-amber-600">⚠ Αρχείο: {fileParsed.date}</span>
              )}
              {fileParsed.dept && (
                <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1">
                  Τμήμα: {fileParsed.dept}
                </span>
              )}
              {ocrResult?.extracted_data?.completed_by && (
                <span className="text-xs text-slate-500">Συμπλ.: {ocrResult.extracted_data.completed_by}</span>
              )}
            </div>

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="px-4 py-2 border-b bg-amber-50 flex-shrink-0 space-y-1">
                {warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-amber-700">
                    <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-6">

              {/* ── Section 1: Team Persons ── */}
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                  Ενότητα 1 – Συνολικές ώρες Εργασίας
                  <Badge className="bg-blue-100 text-blue-700 text-[10px]">{persons.length} άτομα</Badge>
                </h3>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Ονοματεπώνυμο</th>
                      <th className="border border-slate-200 px-2 py-1 text-center font-semibold">Από</th>
                      <th className="border border-slate-200 px-2 py-1 text-center font-semibold">Έως</th>
                      <th className="border border-slate-200 px-2 py-1 text-center font-semibold">Break (min)</th>
                      <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Σχόλια</th>
                    </tr>
                  </thead>
                  <tbody>
                    {persons.map((p, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="border border-slate-200 p-1">
                          <input value={p.person_name || ""} onChange={e => updatePerson(i, "person_name", e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded px-1.5 py-1 outline-none focus:border-blue-400" />
                        </td>
                        <td className="border border-slate-200 p-1">
                          <input value={p.time_from || ""} onChange={e => updatePerson(i, "time_from", e.target.value)}
                            placeholder="HH:MM"
                            className="w-20 text-xs border border-slate-200 rounded px-1.5 py-1 outline-none focus:border-blue-400 text-center" />
                        </td>
                        <td className="border border-slate-200 p-1">
                          <input value={p.time_to || ""} onChange={e => updatePerson(i, "time_to", e.target.value)}
                            placeholder="HH:MM"
                            className="w-20 text-xs border border-slate-200 rounded px-1.5 py-1 outline-none focus:border-blue-400 text-center" />
                        </td>
                        <td className="border border-slate-200 p-1">
                          <input type="number" value={p.break_min ?? 45} onChange={e => updatePerson(i, "break_min", parseInt(e.target.value) || 0)}
                            className="w-16 text-xs border border-blue-200 bg-blue-50 rounded px-1.5 py-1 outline-none focus:border-blue-400 text-center" />
                        </td>
                        <td className="border border-slate-200 p-1">
                          <input value={p.notes || ""} onChange={e => updatePerson(i, "notes", e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded px-1.5 py-1 outline-none focus:border-blue-400" />
                        </td>
                      </tr>
                    ))}
                    {persons.length === 0 && (
                      <tr><td colSpan={5} className="text-center py-4 text-slate-400">Δεν βρέθηκαν γραμμές</td></tr>
                    )}
                  </tbody>
                </table>
                <Button variant="outline" size="sm" className="text-xs mt-2"
                  onClick={() => setPersons(p => [...p, { person_name: "", time_from: "", time_to: "", break_min: 45, notes: "" }])}>
                  + Προσθήκη
                </Button>
              </div>

              {/* ── Section 2: Team Extra ── */}
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                  Ενότητα 2 – Εργασίες εκτός φόρμας
                  <Badge className="bg-purple-100 text-purple-700 text-[10px]">{extras.length} εγγραφές</Badge>
                </h3>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Ονοματεπώνυμο</th>
                      <th className="border border-slate-200 px-2 py-1 text-center font-semibold">HR</th>
                      <th className="border border-slate-200 px-2 py-1 text-center font-semibold">Min</th>
                      <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Είδος</th>
                      <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Περιγραφή</th>
                      <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Τμήμα</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extras.map((e, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="border border-slate-200 p-1">
                          <input value={e.person_name || ""} onChange={ev => updateExtra(i, "person_name", ev.target.value)}
                            className="w-full text-xs border border-slate-200 rounded px-1.5 py-1 outline-none focus:border-blue-400" />
                        </td>
                        <td className="border border-slate-200 p-1">
                          <input type="number" min="0" value={e.duration_hours ?? ""} onChange={ev => updateExtra(i, "duration_hours", parseFloat(ev.target.value) || 0)}
                            className={`w-12 text-xs border rounded px-1.5 py-1 outline-none focus:border-blue-400 text-center ${(e.duration_hours || 0) > 4 ? "border-amber-400 bg-amber-50" : "border-slate-200"}`} />
                        </td>
                        <td className="border border-slate-200 p-1">
                          <input type="number" min="0" max="59" value={e.duration_mins ?? ""} onChange={ev => updateExtra(i, "duration_mins", parseFloat(ev.target.value) || 0)}
                            className="w-12 text-xs border border-slate-200 rounded px-1.5 py-1 outline-none focus:border-blue-400 text-center" />
                        </td>
                        <td className="border border-slate-200 p-1">
                          <input value={e.work_type || ""} onChange={ev => updateExtra(i, "work_type", ev.target.value)}
                            className="w-full text-xs border border-slate-200 rounded px-1.5 py-1 outline-none focus:border-blue-400" />
                        </td>
                        <td className="border border-slate-200 p-1">
                          <input value={e.description || ""} onChange={ev => updateExtra(i, "description", ev.target.value)}
                            className="w-full text-xs border border-slate-200 rounded px-1.5 py-1 outline-none focus:border-blue-400" />
                        </td>
                        <td className="border border-slate-200 p-1">
                          <input value={e.charge_dept || ""} onChange={ev => updateExtra(i, "charge_dept", ev.target.value)}
                            className="w-full text-xs border border-slate-200 rounded px-1.5 py-1 outline-none focus:border-blue-400" />
                        </td>
                      </tr>
                    ))}
                    {extras.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-4 text-slate-400">Δεν βρέθηκαν εγγραφές</td></tr>
                    )}
                  </tbody>
                </table>
                <Button variant="outline" size="sm" className="text-xs mt-2"
                  onClick={() => setExtras(ex => [...ex, { person_name: "", duration_hours: 0, duration_mins: 0, work_type: "", description: "", charge_dept: "" }])}>
                  + Προσθήκη
                </Button>
              </div>
            </div>

            {/* Confirm footer */}
            <div className="border-t px-4 py-3 flex items-center gap-3 bg-white flex-shrink-0">
              <Button variant="outline" size="sm" className="text-xs" onClick={onClose}>Ακύρωση</Button>
              <div className="text-xs text-slate-500 flex-1">
                {persons.length} άτομα · {extras.length} extra
              </div>
              <Button size="sm" className="text-xs bg-green-600 hover:bg-green-700"
                onClick={() => { setConfirmed(true); onConfirm({ date, team_persons: persons, team_extra: extras }); }}
                disabled={confirmed}>
                {confirmed ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                Επιβεβαίωση OCR
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}