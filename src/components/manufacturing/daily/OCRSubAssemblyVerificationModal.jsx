import React, { useState } from "react";
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

const COLUMNS = ["A", "B", "C", "D", "E"];

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
          column_A: null,
          column_B: null,
          column_C: null,
          column_D: null,
          column_E: null
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Sub-Assembly OCR Verification</span>
            <span className="text-sm text-slate-500 font-normal">{fileName}</span>
          </DialogTitle>
          <DialogDescription>Review and verify sub-assembly OCR data with split-pane document viewer and grouped data entry</DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-3 overflow-hidden">
          {/* Top Controls: Date, Department */}
          <div className="flex gap-4 items-end px-6 py-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-600 block mb-1">Ημερομηνία</label>
              <Input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-600 block mb-1">Τμήμα</label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Επιλέξτε Τμήμα" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pre-paint">Pre-paint</SelectItem>
                  <SelectItem value="Paint">Paint</SelectItem>
                  <SelectItem value="Sub-assembly">Sub-assembly</SelectItem>
                  <SelectItem value="Assembly">Assembly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Split Pane: Image Left, Form Right */}
          <div className="flex-1 flex gap-4 overflow-hidden">
            {/* Image Viewer Left */}
            <div className="w-1/3 flex flex-col border border-slate-300 rounded-lg bg-white overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50">
                <span className="text-xs font-medium text-slate-600">Προεπισκόπηση Εγγράφου</span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setZoom(Math.max(50, zoom - 10))}
                  >
                    <ZoomOut className="w-3 h-3" />
                  </Button>
                  <span className="text-xs text-slate-600 w-8 text-center">{zoom}%</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setZoom(Math.min(200, zoom + 10))}
                  >
                    <ZoomIn className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setRotation((rotation + 90) % 360)}
                  >
                    <RotateCw className="w-3 h-3" />
                  </Button>
                </div>
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

            {/* Form Right */}
            <div className="w-2/3 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto space-y-3 pr-4">
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
                        <div className="p-3 max-h-48 overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-1 px-2 font-medium">Item</th>
                                {COLUMNS.map(col => (
                                  <th key={col} className="text-center py-1 px-1 font-medium w-12">{col}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {sectionItems.map((entry) => (
                                <tr key={entry.id} className="border-b hover:bg-white/50">
                                  <td className="py-1 px-2 text-left">{entry.name}</td>
                                  {['column_A', 'column_B', 'column_C', 'column_D', 'column_E'].map((col, idx) => (
                                    <td key={col} className="py-1 px-1 text-center">
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={entry[col] === null ? "" : entry[col]}
                                        onChange={e => handleUpdateEntry(entry.id, col, e.target.value)}
                                        className="w-10 h-6 text-xs text-center border border-slate-300 rounded px-1 focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                                      />
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button
            variant="outline"
            onClick={onSkip}
            disabled={isLoading}
            className="text-sm"
          >
            Skip χωρίς αποθήκευση
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="text-sm bg-green-600 hover:bg-green-700"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Επιβεβαίωση
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}