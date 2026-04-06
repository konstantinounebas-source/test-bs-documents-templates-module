import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Loader2, ZoomIn, ZoomOut, RotateCw, RotateCcw, Scan, Info, Maximize2, Minimize2, AlertCircle, Users, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { datesMismatch } from "@/lib/ocrDateValidationHelpers";

// Parse filename → date, dept
function parseFileName(fileName) {
  if (!fileName) return { date: null, dept: null };
  
  // Try both date formats: dd-mm-yy and dd/mm/yyyy
  let date = null;
  const dateMatch1 = fileName.match(/^(\d{1,2})-(\d{1,2})-(\d{2})/);
  const dateMatch2 = fileName.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  
  if (dateMatch1) {
    const [, d, m, y] = dateMatch1;
    date = `${d.padStart(2,'0')}/${m.padStart(2,'0')}/20${y}`;
  } else if (dateMatch2) {
    const [, d, m, y] = dateMatch2;
    date = `${d.padStart(2,'0')}/${m.padStart(2,'0')}/${y}`;
  }
  
  const lc = fileName.toLowerCase();
  let dept = null;
  if (lc.includes('prepaint') || lc.includes('pre-paint') || lc.includes('pre_paint')) dept = "Pre-Paint";
  else if (lc.includes('subass') || lc.includes('sub-ass')) dept = "Sub-Assembly";
  else if (lc.includes('assembly') || lc.includes('ass')) dept = "Assembly";
  else if (lc.includes('refurb') || lc.includes('ref')) dept = "Refurbishment";
  
  return { date, dept };
}

// Parse "HH:MM" → total minutes
function timeToMins(t) {
  if (!t) return null;
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return parseInt(m[1]) * 60 + parseInt(m[2]);
}

// Find closest string match using Levenshtein-like similarity
function findClosestMatch(input, options, threshold = 0.6) {
  if (!input || !options.length) return null;
  const inputLower = input.toLowerCase().trim();
  
  let bestMatch = null;
  let bestScore = threshold;
  
  options.forEach(opt => {
    const optLower = opt.toLowerCase().trim();
    const score = stringSimilarity(inputLower, optLower);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = opt;
    }
  });
  
  return bestMatch;
}

// Simple similarity score (0-1)
function stringSimilarity(a, b) {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

// Calculate edit distance between two strings
function getEditDistance(a, b) {
  const costs = [];
  for (let i = 0; i <= a.length; i++) {
    let lastVal = i;
    for (let j = 0; j <= b.length; j++) {
      if (i === 0) costs[j] = j;
      else if (j > 0) {
        const newVal = Math.min(
          costs[j] + 1,
          costs[j - 1] + 1,
          lastVal + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
        costs[j - 1] = lastVal;
        lastVal = newVal;
      }
    }
    if (i > 0) costs[b.length] = lastVal;
  }
  return costs[b.length];
}

// Calculate available minutes for a person
function calcAvailableMins(p) {
  const from = timeToMins(p.time_from);
  const to = timeToMins(p.time_to);
  if (from === null || to === null) return null;
  let diff = to - from;
  if (diff < 0) diff += 24 * 60; // overnight shift
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

// OCR Work Type variants mapping
const OCR_WORK_TYPE_MAPPINGS = {
  "Υποστηρικτικές": "Supportive Works",
  "Υποστρακτικές": "Supportive Works", // OCR typo variant
  "Υποσ": "Supportive Works",
  "Υποστ": "Supportive Works",
  "Υποστ.": "Supportive Works",
  "Supportive Works": "Supportive Works",
  "Άλλες Εργασίες": "Other Departments Works",
  "ΑΛλες": "Other Departments Works",
  "Other Departments Works": "Other Departments Works",
  "Μη Εκτέλεσης": "Non Execution Time",
  "Μη Εκ.": "Non Execution Time",
  "Non Execution Time": "Non Execution Time"
};

export default function OCRTeamsTimeVerificationModal({ open, onClose, fileUrl, fileName, ocrResult, onConfirm, onSkip, totalPages, defaultPage, detectedForms }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [currentPage, setCurrentPage] = useState(defaultPage || 1);
  const [modalFullscreen, setModalFullscreen] = useState(false);
  const [imagePanelWidth, setImagePanelWidth] = useState(40);
  const isDragging = useRef(false);
  const containerRef = useRef(null);
  const [confirmed, setConfirmed] = useState(false);
  const [referencePersons, setReferencePersons] = useState([]);

  // Determine which pages to display based on detected form types
  const visiblePages = [];
  if (detectedForms) {
    // Page 1: show only if production or unknown (shouldn't show Teams Time data on page 1)
    if (detectedForms[1]?.form_type === "production" || detectedForms[1]?.form_type === "unknown") {
      visiblePages.push(1);
    }
    // Page 2: show only if teams_time or unknown (shouldn't show Production data on page 2)
    if (detectedForms[2]?.form_type === "teams_time" || detectedForms[2]?.form_type === "unknown") {
      visiblePages.push(2);
    }
  } else {
    // Fallback: show all pages if form detection not provided
    visiblePages.push(1, 2);
  }

  const fileParsed = parseFileName(fileName);

  // Resolve dept: OCR result > filename (filter out "null" string)
  const resolvedDept = ocrResult?.extracted_data?.team || fileParsed.dept;
  const cleanDept = (resolvedDept && resolvedDept !== "null") ? resolvedDept : "";

  const [date, setDate] = useState(ocrResult?.extracted_data?.date || fileParsed.date || "");
  const [dept, setDept] = useState(cleanDept);

  const [persons, setPersons] = useState(
    () => (ocrResult?.extracted_data?.team_persons || []).map(p => ({ ...p, break_min: p.break_min ?? 45 }))
  );

  // Calculate section1Names before extras initialization
  const initialSection1Names = useMemo(
    () => new Set((ocrResult?.extracted_data?.team_persons || []).map(p => (p.person_name || "").trim().toLowerCase()).filter(Boolean)),
    [ocrResult]
  );

  const [extras, setExtras] = useState(
    () => (ocrResult?.extracted_data?.team_extra || []).map(e => {
      const personName = (e.person_name || "").trim().toLowerCase();
      const isExternal = personName && !initialSection1Names.has(personName);
      // Auto-map OCR work type variant to stored value
      const workType = e.work_type || "";
      const mappedWorkType = OCR_WORK_TYPE_MAPPINGS[workType] || workType;
      return {
        ...e,
        work_type: mappedWorkType, // Store the mapped value directly
        charge_dept: (e.charge_dept === null || e.charge_dept === undefined || e.charge_dept === "null") ? "" : e.charge_dept,
        is_help_in: isExternal
      };
    })
  );

  const ocrWarnings = ocrResult?.warnings || [];
  const dittoRows = useMemo(() => new Set(ocrResult?.extracted_data?.ditto_rows || []), [ocrResult]);
  const confidence = ocrResult?.confidence_score ?? null;
  const isImage = fileName && ['jpg','jpeg','png','gif','webp','bmp'].includes(fileName.split('.').pop().toLowerCase());
  const isPdf = !isImage;
  const pageCount = totalPages || ocrResult?.page_count || (isPdf ? 2 : 1);

  // Set of person names in Section 1 (lowercased for comparison)
  const section1Names = useMemo(
    () => new Set(persons.map(p => (p.person_name || "").trim().toLowerCase()).filter(Boolean)),
    [persons]
  );

  // Calculate available mins per person name
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

  // Calculate total extra mins per person name in Section 2
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

  // Auto-derive Help In entries: persons in Section 2 marked as is_help_in
  const helpInEntries = useMemo(() => {
    const helpInMap = {};
    const receivingDeptMap = {};
    extras.forEach(e => {
      if (!e.is_help_in) return;
      const name = (e.person_name || "").trim();
      if (!name) return;
      const mins = (e.duration_hours || 0) * 60 + (e.duration_mins || 0);
      helpInMap[name] = (helpInMap[name] || 0) + mins;
      // Capture charge_dept as receiving_dept (where the help goes to)
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

  // Fetch reference persons on mount
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

  // Rehydrate all state from ocrResult when it changes, open status changes, or fileName changes
  useEffect(() => {
    // Rehydrate persons from ocrResult
    const newPersons = (ocrResult?.extracted_data?.team_persons || []).map(p => ({ ...p, break_min: p.break_min ?? 45 }));
    setPersons(newPersons);
    
    // Rehydrate extras from ocrResult
    const initialSectionNames = new Set((ocrResult?.extracted_data?.team_persons || []).map(p => (p.person_name || "").trim().toLowerCase()).filter(Boolean));
    const newExtras = (ocrResult?.extracted_data?.team_extra || []).map(e => {
      const personName = (e.person_name || "").trim().toLowerCase();
      const isExternal = personName && !initialSectionNames.has(personName);
      const workType = e.work_type || "";
      const mappedWorkType = OCR_WORK_TYPE_MAPPINGS[workType] || workType;
      return {
        ...e,
        work_type: mappedWorkType,
        charge_dept: (e.charge_dept === null || e.charge_dept === undefined || e.charge_dept === "null") ? "" : e.charge_dept,
        is_help_in: isExternal
      };
    });
    setExtras(newExtras);
    
    // Rehydrate date and dept
    const resolvedDept = ocrResult?.extracted_data?.team || fileParsed.dept;
    const cleanDept = (resolvedDept && resolvedDept !== "null") ? resolvedDept : "";
    setDate(ocrResult?.extracted_data?.date || fileParsed.date || "");
    setDept(cleanDept);
    
    // Reset other form state
    setConfirmed(false);
  }, [ocrResult, open, fileName]);

  // Auto-sync helpInList when helpInEntries change (when extras/persons change)
  // But preserve user-edited providing_dept values
  useEffect(() => {
    setHelpInList(prev => {
      return helpInEntries.map(newEntry => {
        const existing = prev.find(p => p.person_name === newEntry.person_name);
        return existing ? { ...newEntry, providing_dept: existing.providing_dept } : newEntry;
      });
    });
  }, [helpInEntries]);

  // Reference person names (lowercased for matching)
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
    // If person name changed, unmark Help In for that person in Section 2
    if (field === 'person_name') {
      const newName = (val || "").trim().toLowerCase();
      setExtras(prev => prev.map(e => {
        const eName = (e.person_name || "").trim().toLowerCase();
        return eName === newName ? { ...e, is_help_in: false } : e;
      }));
    }
  };

  const updateExtra = (i, field, val) => {
    setExtras(prev => prev.map((e, idx) => {
      if (idx !== i) return e;
      const updated = { ...e, [field]: val };
      // Auto-update is_help_in based on whether person is in section1Names
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
               {isPdf && visiblePages.length > 1 && (
                 <div className="flex items-center gap-1 bg-slate-100 rounded px-1">
                   {visiblePages.map(pg => {
                     const formType = detectedForms?.[pg]?.form_type || "unknown";
                     const formLabel = formType === "production" ? "Παραγωγή" : formType === "teams_time" ? "Team Time" : "Σελ.";
                     return (
                       <button key={pg} onClick={() => setCurrentPage(pg)}
                         className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${currentPage === pg ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-200"}`}>
                         {formLabel} {pg}
                       </button>
                     );
                   })}
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
                 // Only show page if it's in visiblePages
                 visiblePages.includes(currentPage) ? (
                   <iframe src={`https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(fileUrl)}#page=${currentPage}`}
                     key={currentPage} className="w-full h-full border-0 rounded" title={fileName}
                     style={{ transform: `rotate(${rotation}deg)`, minHeight: "500px" }}
                   />
                 ) : (
                   <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                     Σελίδα {currentPage} δεν εμφανίζεται (δεν ανιχνεύθηκε σχετική φόρμα)
                   </div>
                 )
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
              {ocrResult?.extracted_data?.completed_by && (
                <span className="text-xs text-slate-500">Συμπλ.: {ocrResult.extracted_data.completed_by}</span>
              )}
            </div>

            {/* OCR Warnings */}
            {ocrWarnings.length > 0 && (
              <div className="px-4 py-2 border-b bg-amber-50 flex-shrink-0 space-y-1">
                {ocrWarnings.map((w, i) => (
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
                      <th className="border border-slate-200 px-2 py-1 text-center font-semibold">Available</th>
                      <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Σχόλια</th>
                      <th className="border border-slate-200 px-2 py-1 text-center font-semibold">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {persons.map((p, i) => {
                       const avail = calcAvailableMins(p);
                       const isDitto = dittoRows.has(i);
                       const personName = (p.person_name || "").trim();
                       const isValidPerson = personName && refPersonNames.has(personName.toLowerCase());
                       const isMissing = personName && !isValidPerson;
                       return (
                         <tr key={i} className={`${i % 2 === 0 ? "bg-white" : "bg-slate-50"} ${isDitto ? "ring-1 ring-inset ring-amber-300" : ""}`}>
                           <td className="border border-slate-200 p-1">
                             <div className="flex items-center gap-1">
                               <select value={personName} onChange={e => updatePerson(i, "person_name", e.target.value)}
                                 className={`w-full text-xs border rounded px-1.5 py-1 outline-none focus:border-blue-400 ${isMissing ? "border-red-400 bg-red-50" : "border-slate-200"}`}>
                                 <option value={personName}>{personName || "-- Επιλέξτε --"}</option>
                                 {referencePersons.map(p => (
                                   <option key={p.id} value={p.name}>{p.name}</option>
                                 ))}
                               </select>
                               {isDitto && (
                                 <span title="Ditto mark – τιμή αντιγράφηκε αυτόματα">
                                   <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                                 </span>
                               )}
                               {isMissing && <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" title="Δεν βρέθηκε στα αποθηκευμένα άτομα" />}
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
                          <td className="border border-slate-200 p-1">
                            <input value={p.notes || ""} onChange={e => updatePerson(i, "notes", e.target.value)}
                              className="w-full text-xs border border-slate-200 rounded px-1.5 py-1 outline-none focus:border-blue-400" />
                          </td>
                          <td className="border border-slate-200 p-1 text-center">
                            <button onClick={() => setPersons(prev => prev.filter((_, idx) => idx !== i))}
                              className="text-red-500 hover:text-red-700">
                              ✕
                            </button>
                          </td>
                          </tr>
                      );
                    })}
                    {persons.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-4 text-slate-400">Δεν βρέθηκαν γραμμές</td></tr>
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
                      <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Τμήμα (Charge)</th>
                      <th className="border border-slate-200 px-2 py-1 text-center font-semibold">Help In</th>
                      <th className="border border-slate-200 px-2 py-1 text-center font-semibold">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extras.map((e, i) => {
                       const name = (e.person_name || "").trim().toLowerCase();
                       const isExternal = name && !section1Names.has(name);
                       const totalExtraMins = extraMinsByName[name] || 0;
                       const availMins = availableByName[name];
                       const isOvertime = availMins !== undefined && totalExtraMins > availMins;
                       const rowBg = isOvertime ? "bg-red-50" : isExternal ? "bg-orange-50" : i % 2 === 0 ? "bg-white" : "bg-slate-50";

                       // Find closest match for person name
                       const personName = (e.person_name || "").trim();
                       const isValidPerson = personName && refPersonNames.has(personName.toLowerCase());
                       const suggestedPerson = !isValidPerson && personName ? findClosestMatch(personName, referencePersons.map(p => p.name)) : null;

                       return (
                         <tr key={i} className={rowBg}>
                           <td className="border border-slate-200 p-1">
                             {(() => {
                               return (
                                 <div className="space-y-1">
                                   <div className="flex items-center gap-1">
                                     <select
                                       value={personName}
                                       onChange={ev => updateExtra(i, "person_name", ev.target.value)}
                                       className={`w-full text-xs border rounded px-1.5 py-1 outline-none focus:border-blue-400 ${!isValidPerson ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                                     >
                                       <option value={personName}>{personName || "-- Επιλέξτε --"}</option>
                                       {referencePersons.map(p => (
                                         <option key={p.id} value={p.name}>{p.name}</option>
                                       ))}
                                     </select>
                                     {isValidPerson && <Check className="w-3 h-3 text-green-600 flex-shrink-0" />}
                                   </div>
                                   {!isValidPerson && suggestedPerson && (
                                     <button
                                       type="button"
                                       onClick={() => updateExtra(i, "person_name", suggestedPerson)}
                                       className="text-xs text-blue-600 hover:underline"
                                       title="Χρησιμοποιήστε την προτεινόμενη τιμή"
                                     >
                                       💡 Υπόδειξη: {suggestedPerson}
                                     </button>
                                   )}
                                 </div>
                               );
                             })()}
                           </td>
                          <td className="border border-slate-200 p-1">
                            <input type="number" min="0" value={e.duration_hours ?? ""} onChange={ev => updateExtra(i, "duration_hours", parseFloat(ev.target.value) || 0)}
                              className={`w-12 text-xs border rounded px-1.5 py-1 outline-none focus:border-blue-400 text-center ${isOvertime ? "border-red-400 bg-red-100" : (e.duration_hours || 0) > 4 ? "border-amber-400 bg-amber-50" : "border-slate-200"}`} />
                          </td>
                          <td className="border border-slate-200 p-1">
                            <input type="number" min="0" max="59" value={e.duration_mins ?? ""} onChange={ev => updateExtra(i, "duration_mins", parseFloat(ev.target.value) || 0)}
                              className="w-12 text-xs border border-slate-200 rounded px-1.5 py-1 outline-none focus:border-blue-400 text-center" />
                          </td>
                          <td className="border border-slate-200 p-1">
                            {(() => {
                              const workType = e.work_type || "";
                              const isValid = !workType || VALID_WORK_TYPES.includes(workType);
                              const isMissing = !workType;
                              const suggestedWorkType = !isValid && workType ? findClosestMatch(workType, VALID_WORK_TYPES) : null;
                              
                              return (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1">
                                    <select
                                      value={workType}
                                      onChange={ev => updateExtra(i, "work_type", ev.target.value)}
                                      className={`w-full text-xs border rounded px-1.5 py-1 outline-none focus:border-blue-400 ${isMissing ? "border-amber-400 bg-amber-50" : !isValid ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                                    >
                                      <option value={workType}>{workType || "-- Επιλέξτε --"}</option>
                                      {VALID_WORK_TYPES.map(wt => (
                                        <option key={wt} value={wt}>{wt}</option>
                                      ))}
                                    </select>
                                    {isValid && workType && <Check className="w-3 h-3 text-green-600 flex-shrink-0" />}
                                  </div>
                                  {!isValid && suggestedWorkType && (
                                    <button
                                      type="button"
                                      onClick={() => updateExtra(i, "work_type", suggestedWorkType)}
                                      className="text-xs text-blue-600 hover:underline"
                                      title="Χρησιμοποιήστε την προτεινόμενη τιμή"
                                    >
                                      💡 Υπόδειξη: {suggestedWorkType}
                                    </button>
                                  )}
                                  {!isValid && !suggestedWorkType && (
                                    <span className="text-xs text-red-600">⚠ Μη έγκυρο είδος εργασίας</span>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="border border-slate-200 p-1">
                            <input value={e.description || ""} onChange={ev => updateExtra(i, "description", ev.target.value)}
                              className="w-full text-xs border border-slate-200 rounded px-1.5 py-1 outline-none focus:border-blue-400" />
                          </td>
                          <td className="border border-slate-200 p-1">
                           {(() => {
                             const chargeDept = e.charge_dept || "";
                             const isEmpty = !chargeDept.trim();
                             const isValid = !chargeDept || VALID_DEPARTMENTS.includes(chargeDept);
                             return (
                               <div className="flex items-center gap-1">
                                 <select
                                   value={chargeDept}
                                   onChange={ev => updateExtra(i, "charge_dept", ev.target.value)}
                                   className={`w-full text-xs border rounded px-1.5 py-1 outline-none focus:border-blue-400 ${isEmpty ? "border-amber-400 bg-amber-50" : !isValid ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                                 >
                                   <option value="">-- Επιλέξτε --</option>
                                   {VALID_DEPARTMENTS.map(d => (
                                     <option key={d} value={d}>{d}</option>
                                   ))}
                                 </select>
                                 {isEmpty && (
                                   <button
                                     type="button"
                                     onClick={() => updateExtra(i, "charge_dept", dept)}
                                     title="Συμπλήρωση με τμήμα από κεφαλίδα"
                                     className="p-0.5 hover:bg-amber-100 rounded"
                                   >
                                     <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 cursor-pointer" />
                                   </button>
                                 )}
                                 {!isEmpty && !isValid && <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" title="Μη έγκυρο τμήμα" />}
                                 {isValid && chargeDept && <Check className="w-3 h-3 text-green-600 flex-shrink-0" />}
                               </div>
                             );
                           })()}
                          </td>
                          <td className="border border-slate-200 p-1 text-center">
                            <input
                              type="checkbox"
                              checked={e.is_help_in || false}
                              onChange={ev => updateExtra(i, "is_help_in", ev.target.checked)}
                              className="w-4 h-4 accent-blue-600"
                            />
                          </td>
                          <td className="border border-slate-200 p-1 text-center">
                            <button onClick={() => setExtras(prev => prev.filter((_, idx) => idx !== i))}
                              className="text-red-500 hover:text-red-700">
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {extras.length === 0 && (
                      <tr><td colSpan={7} className="text-center py-4 text-slate-400">Δεν βρέθηκαν εγγραφές</td></tr>
                    )}
                  </tbody>
                </table>
                <Button variant="outline" size="sm" className="text-xs mt-2"
                  onClick={() => setExtras(ex => [...ex, { person_name: "", duration_hours: 0, duration_mins: 0, work_type: "", description: "", charge_dept: "" }])}>
                  + Προσθήκη
                </Button>
              </div>

              {/* ── Section 3: Help In (auto-derived) ── */}
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-2">
                  Ενότητα 3 – Help In (Εξωτερικά Άτομα)
                  <Badge className="bg-orange-100 text-orange-700 text-[10px]">{helpInList.length} εγγραφές</Badge>
                </h3>
                <p className="text-[10px] text-slate-500 mb-2">Άτομα που αναφέρονται στην Ενότητα 2 αλλά όχι στην Ενότητα 1. Επιλέξτε ποιο τμήμα θα λαμβάνει την βοήθεια:</p>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-orange-50">
                      <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Ονοματεπώνυμο</th>
                      <th className="border border-slate-200 px-2 py-1 text-center font-semibold">Χρόνος (min)</th>
                      <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Τμήμα Λήψης (Receiving)</th>
                      <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Από Τμήμα (Providing)</th>
                      <th className="border border-slate-200 px-2 py-1 text-left font-semibold">Ενέργεια</th>
                    </tr>
                  </thead>
                  <tbody>
                    {helpInList.map((h, i) => (
                      <tr key={i} className="bg-orange-50/50">
                        <td className="border border-slate-200 p-1 font-medium">
                          {h.person_name}
                        </td>
                        <td className="border border-slate-200 p-1 text-center">
                          <input type="number" value={h.help_time_min || 0} onChange={e => updateHelpInRow(i, "help_time_min", parseInt(e.target.value) || 0)}
                            className="w-20 text-xs border border-slate-200 rounded px-1.5 py-1 outline-none focus:border-orange-400 text-center" />
                        </td>
                        <td className="border border-slate-200 p-1">
                          <select value={h.receiving_dept || ""} onChange={e => updateHelpInRow(i, "receiving_dept", e.target.value)}
                            className="w-full text-xs border border-orange-300 bg-orange-50 rounded px-1.5 py-1 outline-none focus:border-orange-400">
                            <option value="">-- Επιλέξτε --</option>
                            {VALID_DEPARTMENTS.map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </td>
                        <td className="border border-slate-200 p-1">
                          <select value={h.providing_dept || ""} onChange={e => updateHelpInRow(i, "providing_dept", e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded px-1.5 py-1 outline-none focus:border-orange-400">
                            <option value="">-- Επιλέξτε --</option>
                            {VALID_DEPARTMENTS.map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </td>
                        <td className="border border-slate-200 p-1 text-center">
                          <button onClick={() => setHelpInList(prev => prev.filter((_, idx) => idx !== i))}
                            className="text-red-500 hover:text-red-700">
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                    {helpInList.length === 0 && (
                      <tr><td colSpan={4} className="text-center py-4 text-slate-400">Δεν υπάρχουν εξωτερικά άτομα</td></tr>
                    )}
                  </tbody>
                </table>
                <Button variant="outline" size="sm" className="text-xs mt-2"
                  onClick={() => setHelpInList(h => [...h, { person_name: "", help_time_min: 0, receiving_dept: "", providing_dept: "" }])}>
                  + Προσθήκη
                </Button>
              </div>

            </div>

            {/* Confirm footer */}
            <div className="border-t px-4 py-3 flex items-center gap-3 bg-white flex-shrink-0">
              <div className="text-xs text-slate-500 flex-1">
                {persons.length} άτομα · {extras.length} extra
                {helpInList.length > 0 && ` · ${helpInList.length} help-in`}
              </div>
              {onSkip && (
                <Button variant="outline" size="sm" className="text-xs" onClick={onSkip}>Skip χωρίς αποθήκευση</Button>
              )}
              <Button size="sm" className="text-xs bg-green-600 hover:bg-green-700"
                onClick={() => {
                  setConfirmed(true);
                  // Only save non-help-in extras to team_extra; help_in rows go to help_in section
                  const teamExtra = extras.filter(e => !e.is_help_in);
                  onConfirm({ date, dept, team_persons: persons, team_extra: teamExtra, help_in: helpInList });
                }}
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