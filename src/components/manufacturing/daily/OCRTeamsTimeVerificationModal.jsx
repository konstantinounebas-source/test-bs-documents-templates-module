import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Loader2, ZoomIn, ZoomOut, RotateCw, RotateCcw, Scan, Info, Maximize2, Minimize2, AlertCircle, Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";

function timeToMins(t) {
  if (!t) return null;
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1]) * 60 + parseInt(m[2]);
}

function calcAvailableMins(p) {
  const from = timeToMins(p.time_from);
  const to = timeToMins(p.time_to);
  if (from === null || to === null) return null;
  let diff = to - from;
  if (diff < 0) diff += 24 * 60;
  return diff - (p.break_min ?? 45);
}

function fmtMins(mins) {
  if (mins === null || mins === undefined) return "–";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m > 0 ? m + 'm' : ''}`.trim();
}

const VALID_WORK_TYPES = ["Non Execution Time", "Other Departments Works", "Supportive Works"];
const VALID_DEPARTMENTS = ["Delivery", "Refurbishment", "Assembly", "Sub-assembly", "Paint", "Pre-paint"];

export default function OCRTeamsTimeVerificationModal({ open, onClose, fileUrl, fileName, ocrResult, onConfirm }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalFullscreen, setModalFullscreen] = useState(false);
  const [imagePanelWidth, setImagePanelWidth] = useState(40);
  const isDragging = useRef(false);
  const containerRef = useRef(null);
  const [confirmed, setConfirmed] = useState(false);
  const [referencePersons, setReferencePersons] = useState([]);

  const pageCount = 2; // Default for teams time forms
  const isImage = fileName && ['jpg','jpeg','png','gif','webp','bmp'].includes(fileName.split('.').pop().toLowerCase());
  const isPdf = !isImage;

  const [date, setDate] = useState(ocrResult?.extracted_data?.date || "");
  const [dept, setDept] = useState(ocrResult?.extracted_data?.team || "");
  
  const [persons, setPersons] = useState(
    () => (ocrResult?.extracted_data?.team_persons || []).map(p => ({ ...p, break_min: p.break_min ?? 45 }))
  );

  const [extras, setExtras] = useState(
    () => (ocrResult?.extracted_data?.team_extra || []).map(e => ({
      ...e,
      charge_dept: (e.charge_dept === null || e.charge_dept === undefined) ? "" : e.charge_dept,
      is_help_in: false
    }))
  );

  const section1Names = useMemo(
    () => new Set(persons.map(p => (p.person_name || "").trim().toLowerCase()).filter(Boolean)),
    [persons]
  );

  const availableByName = useMemo(() => {
    const map = {};
    persons.forEach(p => {
      const name = (p.person_name || "").trim().toLowerCase();
      if (!name) return;
      const avail = calcAvailableMins(p);
      if (avail !== null) map[name] = (map[name] || 0) + avail;
    });
    return map;
  }, [persons]);

  const extraMinsByName = useMemo(() => {
    const map = {};
    extras.forEach(e => {
      const name = (e.person_name || "").trim().toLowerCase();
      if (!name) return;
      const mins = (e.duration_hours || 0) * 60 + (e.duration_mins || 0);
      map[name] = (map[name] || 0) + mins;
    });
    return map;
  }, [extras]);

  const helpInEntries = useMemo(() => {
    const helpInMap = {};
    const receivingDeptMap = {};
    extras.forEach(e => {
      if (!e.is_help_in) return;
      const name = (e.person_name || "").trim();
      if (!name) return;
      const mins = (e.duration_hours || 0) * 60 + (e.duration_mins || 0);
      helpInMap[name] = (helpInMap[name] || 0) + mins;
      if (e.charge_dept && !receivingDeptMap[name]) {
        receivingDeptMap[name] = e.charge_dept;
      }
    });
    return Object.entries(helpInMap).map(([name, mins]) => ({
      person_name: name,
      help_time_min: mins,
      receiving_dept: receivingDeptMap[name] || "",
      providing_dept: ""
    }));
  }, [extras]);

  const [helpInList, setHelpInList] = useState(helpInEntries);

  useEffect(() => {
    const fetchPersons = async () => {
      try {
        const persons = await base44.entities.Person.list();
        setReferencePersons(persons || []);
      } catch (error) {
        console.error("Failed to fetch reference persons:", error);
      }
    };
    fetchPersons();
  }, []);

  useEffect(() => {
    setHelpInList(helpInEntries);
  }, [helpInEntries]);

  const refPersonNames = useMemo(
    () => new Set(referencePersons.map(p => (p.name || "").trim().toLowerCase()).filter(Boolean)),
    [referencePersons]
  );

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

  const updatePerson = (i, field, val) => {
    setPersons(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p));
  };

  const updateExtra = (i, field, val) => {
    setExtras(prev => prev.map((e, idx) => {
      if (idx !== i) return e;
      const updated = { ...e, [field]: val };
      if (field === 'person_name') {
        const personName = (val || "").trim().toLowerCase();
        updated.is_help_in = personName && !section1Names.has(personName);
      }
      return updated;
    }));
  };

  const updateHelpInRow = (i, field, val) =>
    setHelpInList(prev => prev.map((h, idx) => idx === i ? { ...h, [field]: val } : h));

  const noDept = !dept;
  const confidence = ocrResult?.confidence_score ?? null;

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
          {/* LEFT: PDF/Image viewer */}
          <div className="border-r bg-slate-100 flex flex-col flex-shrink-0" style={{ width: `${imagePanelWidth}%` }}>
            <div className="flex items-center gap-2 px-3 py-2 border-b bg-white text-xs flex-wrap">
              <span className="text-slate-500 font-medium">Αρχείο</span>
              {isPdf && (
                <div className="flex items-center gap-1 bg-slate-100 rounded px-1">
                  <button onClick={() => setCurrentPage(1)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${currentPage === 1 ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-200"}`}>
                    Σελ. 1
                  </button>
                  <button onClick={() => setCurrentPage(2)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${currentPage === 2 ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-200"}`}>
                    Σελ. 2
                  </button>
                </div>
              )}
              <div className="flex-1" />
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
                <iframe src={`https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(fileUrl)}#page=${currentPage}`}
                  key={currentPage} className="w-full h-full border-0 rounded" title={fileName}
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
              <span className="text-xs font-semibold text-slate-600">Τμήμα:</span>
              <select value={dept} onChange={e => setDept(e.target.value)}
                className={`text-xs border rounded px-2 py-1 outline-none focus:border-blue-400 w-40 ${noDept ? "border-amber-400 bg-amber-50" : "border-slate-200"}`}>
                <option value="">-- Επιλέξτε --</option>
                {VALID_DEPARTMENTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              {noDept && (
                <span className="text-xs text-amber-700 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Δεν βρέθηκε τμήμα
                </span>
              )}
            </div>

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
                      <th className="border border-slate-200 px-2 py-1 text-center font-semibold">Available</th>
                      <th className="border border-slate-200 px-2 py-1 text-center font-semibold">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {persons.map((p, i) => {
                       const avail = calcAvailableMins(p);
                       const personName = (p.person_name || "").trim();
                       const isValidPerson = personName && refPersonNames.has(personName.toLowerCase());
                       const isMissing = personName && !isValidPerson;
                       return (
                         <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                           <td className="border border-slate-200 p-1">
                             <div className="flex items-center gap-1">
                               <select value={personName} onChange={e => updatePerson(i, "person_name", e.target.value)}
                                 className={`w-full text-xs border rounded px-1.5 py-1 outline-none focus:border-blue-400 ${isMissing ? "border-red-400 bg-red-50" : "border-slate-200"}`}>
                                 <option value={personName}>{personName || "-- Επιλέξτε --"}</option>
                                 {referencePersons.map(p => (
                                   <option key={p.id} value={p.name}>{p.name}</option>
                                 ))}
                               </select>
                               {isMissing && <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />}
                               {isValidPerson && <Check className="w-3 h-3 text-green-600 flex-shrink-0" />}
                             </div>
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
                          <td className="border border-slate-200 p-1 text-center">
                            {avail !== null ? (
                              <span className="text-green-700 font-medium">{fmtMins(avail)}</span>
                            ) : (
                              <span className="text-slate-300">–</span>
                            )}
                          </td>
                          <td className="border border-slate-200 p-1 text-center">
                            <button onClick={() => setPersons(prev => prev.filter((_, idx) => idx !== i))}
                              className="text-red-500 hover:text-red-700">✕</button>
                          </td>
                          </tr>
                      );
                    })}
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
                      <th className="border border-slate-200 px-2 py-1 text-center font-semibold">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extras.map((e, i) => {
                       const name = (e.person_name || "").trim().toLowerCase();
                       const isExternal = name && !section1Names.has(name);
                       return (
                         <tr key={i} className={isExternal ? "bg-orange-50" : i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                           <td className="border border-slate-200 p-1">
                             <input value={e.person_name || ""} onChange={ev => updateExtra(i, "person_name", ev.target.value)}
                               className="w-full text-xs border border-slate-200 rounded px-1.5 py-1 outline-none focus:border-blue-400" />
                           </td>
                          <td className="border border-slate-200 p-1">
                            <input type="number" min="0" value={e.duration_hours ?? ""} onChange={ev => updateExtra(i, "duration_hours", parseFloat(ev.target.value) || 0)}
                              className="w-12 text-xs border border-slate-200 rounded px-1.5 py-1 outline-none focus:border-blue-400 text-center" />
                          </td>
                          <td className="border border-slate-200 p-1">
                            <input type="number" min="0" max="59" value={e.duration_mins ?? ""} onChange={ev => updateExtra(i, "duration_mins", parseFloat(ev.target.value) || 0)}
                              className="w-12 text-xs border border-slate-200 rounded px-1.5 py-1 outline-none focus:border-blue-400 text-center" />
                          </td>
                          <td className="border border-slate-200 p-1">
                            <select value={e.work_type || ""} onChange={ev => updateExtra(i, "work_type", ev.target.value)}
                              className="w-full text-xs border border-slate-200 rounded px-1.5 py-1 outline-none focus:border-blue-400">
                              <option value="">-- Επιλέξτε --</option>
                              {VALID_WORK_TYPES.map(wt => (
                                <option key={wt} value={wt}>{wt}</option>
                              ))}
                            </select>
                          </td>
                          <td className="border border-slate-200 p-1 text-center">
                            <button onClick={() => setExtras(prev => prev.filter((_, idx) => idx !== i))}
                              className="text-red-500 hover:text-red-700">✕</button>
                          </td>
                        </tr>
                      );
                    })}
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
                {persons.length} άτομα · {extras.length} extra · {helpInList.length} help-in
              </div>
              <Button size="sm" className="text-xs bg-green-600 hover:bg-green-700"
                onClick={() => {
                  setConfirmed(true);
                  const teamExtra = extras.filter(e => !e.is_help_in);
                  onConfirm({ date, dept, team_persons: persons, team_extra: teamExtra, help_in: helpInList });
                }}
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