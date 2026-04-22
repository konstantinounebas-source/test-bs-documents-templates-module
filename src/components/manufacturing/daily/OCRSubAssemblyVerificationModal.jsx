import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ZoomIn, ZoomOut, RotateCw, ChevronDown, ChevronRight } from "lucide-react";

const SUB_ASSEMBLY_SECTIONS = [
  {
    name: "LIGHTBOXES",
    color: "bg-blue-100 border-blue-300",
    items: [
      { id: "light_1", name: "Σύνδεση Σε BOX" },
      { id: "light_2", name: "Τρυπημα" },
      { id: "light_3", name: "Ηλεκτρολογικά" },
      { id: "light_4", name: "Κλειδαρια" },
      { id: "light_5", name: "Φτερό" },
      { id: "light_6", name: "Σύλληψη Σε Καπάκι" },
      { id: "light_7", name: "Βιδώνιο" }
    ]
  },
  {
    name: "GLASS",
    color: "bg-cyan-100 border-cyan-300",
    items: [
      { id: "glass_1", name: "Πόρτα μικρή" },
      { id: "glass_2", name: "Πόρτα μεγάλη" },
      { id: "glass_3", name: "Πόρτες Αδυ. C1" },
      { id: "glass_4", name: "φινίρισμα θρανίς" }
    ]
  },
  {
    name: "PAINTING",
    color: "bg-yellow-100 border-yellow-300",
    items: [
      { id: "paint_1", name: "Τρίψιμο" },
      { id: "paint_2", name: "Στο τελάρο" },
      { id: "paint_3", name: "Βερνίκι 10 χέρι" },
      { id: "paint_4", name: "Βερνίκι 20 χέρι" },
      { id: "paint_5", name: "Συναρμολόγηση" }
    ]
  },
  {
    name: "LIGHTGUIDES",
    color: "bg-purple-100 border-purple-300",
    items: [
      { id: "guide_1", name: "Type A:41x34" },
      { id: "guide_2", name: "Type B:41x34" },
      { id: "guide_3", name: "Type C:13x34" },
      { id: "guide_4", name: "Type C:84.5x34" },
      { id: "guide_5", name: "Type A.B.C:55.5x34" }
    ]
  },
  {
    name: "STATION",
    color: "bg-green-100 border-green-300",
    items: [
      { id: "cosmetic_1", name: "πάνελ ηχείου" },
      { id: "cosmetic_2", name: "πάνελ οροφης B" },
      { id: "cosmetic_3", name: "πάνελ οροφής C μικρό" },
      { id: "cosmetic_4", name: "πάνελ οροφής C μεγάλο" },
      { id: "cosmetic_5", name: "φωτοβολταϊκό Α" },
      { id: "cosmetic_6", name: "blue light κατασκευή" }
    ]
  },
  {
    name: "WORK",
    color: "bg-red-100 border-red-300",
    items: [
      { id: "work_1", name: "τοποθέτηση μπαταρίας" },
      { id: "work_2", name: "τοποθέτηση πινακα" },
      { id: "work_3", name: "καλόδιωση" },
      { id: "work_4", name: "τοποθέτηση φωτοβολταϊκών" }
    ]
  }
];

const COLUMNS = ["A", "B", "C"];
const SUB_COLUMNS = ["Remainder", "Planned", "Actual"];

export default function OCRSubAssemblyVerificationModal({
  open,
  onClose,
  fileUrl,
  fileName,
  ocrResult = {},
  onConfirm,
  onSkip
}) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [date, setDate] = useState(ocrResult?.extracted_data?.date || "");
  const [department, setDepartment] = useState(ocrResult?.extracted_data?.team || "");
  const containerRef = useRef(null);
  const [expandedSections, setExpandedSections] = useState(
    SUB_ASSEMBLY_SECTIONS.reduce((acc, s) => ({ ...acc, [s.name]: true }), {})
  );
  const [entries, setEntries] = useState(() => {
    if (ocrResult?.extracted_data?.entries) {
      return ocrResult.extracted_data.entries;
    }
    const allEntries = [];
    SUB_ASSEMBLY_SECTIONS.forEach(section => {
      section.items.forEach(item => {
        allEntries.push({
          ...item,
          section: section.name,
          A_Remainder: null, A_Planned: null, A_Actual: null,
          B_Remainder: null, B_Planned: null, B_Actual: null,
          C_Remainder: null, C_Planned: null, C_Actual: null
        });
      });
    });
    return allEntries;
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdateEntry = (itemId, column, value) => {
    setEntries(entries.map(entry =>
      entry.id === itemId
        ? { ...entry, [column]: value ? parseFloat(value) : null }
        : entry
    ));
  };

  const toggleSection = (sectionName) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm({
        sub_assembly_entries: entries,
        date,
        department,
        validation: {
          issues: [],
          confidence_score: 1.0
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const gridColDef = "128px repeat(9, 1fr)";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="p-0 overflow-hidden max-w-[98vw] w-[98vw] max-h-[96vh] h-[96vh]">
        <DialogHeader className="px-4 py-2 border-b bg-slate-50 flex-row items-center gap-3">
          <DialogTitle className="text-sm">OCR Sub-Assembly · {fileName}</DialogTitle>
          <DialogDescription className="sr-only">Review and verify sub-assembly OCR data with split-pane document viewer and grouped data entry</DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden" ref={containerRef}>
          {/* LEFT: Image/Document viewer */}
          <div className="border-r bg-slate-100 flex flex-col flex-shrink-0" style={{ width: "35%" }}>
            <div className="flex items-center gap-2 px-3 py-2 border-b bg-white text-xs flex-wrap">
              <span className="text-slate-500 font-medium">Αρχείο</span>
                <div className="flex-1" />
                <button onClick={() => setZoom(Math.max(50, zoom - 10))} className="p-1 hover:bg-slate-100 rounded"><ZoomOut className="w-3.5 h-3.5" /></button>
                <span className="text-slate-400 w-8 text-center">{Math.round(zoom)}%</span>
                <button onClick={() => setZoom(Math.min(200, zoom + 10))} className="p-1 hover:bg-slate-100 rounded"><ZoomIn className="w-3.5 h-3.5" /></button>
                <button onClick={() => setRotation((rotation + 90) % 360)} className="p-1 hover:bg-slate-100 rounded"><RotateCw className="w-3.5 h-3.5" /></button>
              </div>
              <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-4">
                {fileUrl ? (
                  <img
                    src={fileUrl}
                    alt="OCR Document"
                    style={{
                      transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                      maxWidth: "100%",
                      maxHeight: "100%",
                    }}
                    className="transition-transform"
                  />
                ) : (
                  <p className="text-xs text-slate-400">Δεν υπάρχει εικόνα</p>
                )}
              </div>
            </div>

          {/* Drag divider */}
          <div className="w-1.5 bg-slate-200 hover:bg-blue-400 cursor-col-resize flex-shrink-0 transition-colors" />

          {/* RIGHT: Data editor */}
          <div className="flex-1 flex flex-col bg-white min-w-0 overflow-hidden">
            {/* Header row */}
            <div className="px-4 py-2 border-b bg-slate-50 flex items-center gap-3 flex-shrink-0 flex-wrap">
              <span className="text-xs font-semibold text-slate-600">Ημερομηνία:</span>
              <input type="date" value={date || ""} onChange={e => setDate(e.target.value)}
                className="text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400 w-28" />
              <span className="text-xs font-semibold text-slate-600">Τμήμα:</span>
              <select value={department} onChange={e => setDepartment(e.target.value)}
                className="text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400 w-40">
                <option value="">-- Επιλέξτε --</option>
                <option value="Pre-paint">Pre-paint</option>
                <option value="Paint">Paint</option>
                <option value="Sub-assembly">Sub-assembly</option>
                <option value="Assembly">Assembly</option>
              </select>
            </div>

            {/* Fixed header - Grid based */}
            <div className="bg-slate-50 border-b-2 border-slate-300 flex-shrink-0" style={{ display: 'grid', gridTemplateColumns: gridColDef, gap: '0' }}>
              {/* Row 1: Sub-Assemblies label and Column headers A/B/C */}
              <div className="px-2 py-2 text-[10px] font-bold border-r border-slate-300 flex items-center">Sub-Assemblies</div>
              {COLUMNS.map(col => (
                <div key={col} className="text-center py-2 text-[11px] font-bold border-r border-red-500" style={{ gridColumn: 'span 3' }}>
                  {col}
                </div>
              ))}
              
              {/* Row 2: Sub-column headers Ημερ./Σχεδ./Πρ. */}
              <div className="border-r border-slate-300"></div>
              {COLUMNS.map(col => (
                <React.Fragment key={`${col}-headers`}>
                  <div className="text-center py-1 text-[8px] font-semibold border-r border-slate-200">Ημερ.</div>
                  <div className="text-center py-1 text-[8px] font-semibold border-r border-slate-200">Σχεδ.</div>
                  <div className="text-center py-1 text-[8px] font-semibold border-r border-red-500">Πρ.</div>
                </React.Fragment>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {/* Sections content */}
              <div className="px-4">
              {SUB_ASSEMBLY_SECTIONS.map(section => {
                  const sectionItems = entries.filter(e => e.section === section.name);
                  const isExpanded = expandedSections[section.name];

                  return (
                    <div key={section.name} className={`border rounded-lg overflow-hidden ${section.color}`}>
                      <button
                        onClick={() => toggleSection(section.name)}
                        className={`w-full px-3 py-2 flex items-center gap-2 hover:opacity-80 transition-opacity font-semibold text-sm`}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <span>{section.name}</span>
                        <span className="text-xs font-normal text-slate-600 ml-auto">({sectionItems.length} items)</span>
                      </button>

                      {isExpanded && (
                        <div className="p-2 overflow-hidden">
                          <div style={{ display: 'grid', gridTemplateColumns: gridColDef, gap: '0', fontSize: '10px' }}>
                            {sectionItems.map((entry) => (
                              <React.Fragment key={entry.id}>
                                <div className="py-1 px-2 text-left border-b border-slate-200 border-r border-slate-300 flex items-center">{entry.name}</div>
                                {COLUMNS.map(col => (
                                  <React.Fragment key={col}>
                                    {SUB_COLUMNS.map((subCol, idx) => (
                                      <div key={`${col}_${subCol}`} className={`py-0.5 px-0.5 border-b border-slate-200 ${idx === 2 ? 'border-r border-red-500' : 'border-r border-slate-200'}`}>
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={entry[`${col}_${subCol}`] === null ? "" : entry[`${col}_${subCol}`]}
                                          onChange={e => handleUpdateEntry(entry.id, `${col}_${subCol}`, e.target.value)}
                                          className="w-full h-4 text-[8px] text-center border border-slate-300 rounded px-0 py-0.5 focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                                        />
                                      </div>
                                    ))}
                                  </React.Fragment>
                                ))}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    );
                    })}
                    </div>
                    </div>
                    </div>
                    </div>

        {/* Actions footer */}
        <div className="border-t px-4 py-3 flex items-center gap-2 bg-white flex-shrink-0">
          {onSkip && (
            <Button variant="outline" size="sm" className="text-xs" onClick={onSkip} disabled={isLoading}>
              Skip χωρίς αποθήκευση
            </Button>
          )}
          <Button
            size="sm"
            className="flex-1 text-xs bg-green-600 hover:bg-green-700"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
            Επιβεβαίωση δεδομένων OCR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}