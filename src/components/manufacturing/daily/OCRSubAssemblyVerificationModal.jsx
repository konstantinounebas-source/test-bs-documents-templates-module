import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";

// Fixed sub-assembly items grouped by sections
const SUB_ASSEMBLY_SECTIONS = [
  {
    name: "LIGHTBOXES",
    color: "bg-blue-50",
    headerColor: "bg-blue-100",
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
    color: "bg-cyan-50",
    headerColor: "bg-cyan-100",
    items: [
      { id: "glass_1", name: "Πόρτα μικρή" },
      { id: "glass_2", name: "Πόρτα μεγάλη" },
      { id: "glass_3", name: "Πόρτες Αδυ. C1" },
      { id: "glass_4", name: "φινίρισμα θρανίς" }
    ]
  },
  {
    name: "PAINTING",
    color: "bg-amber-50",
    headerColor: "bg-amber-100",
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
    color: "bg-purple-50",
    headerColor: "bg-purple-100",
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
    color: "bg-green-50",
    headerColor: "bg-green-100",
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
    color: "bg-red-50",
    headerColor: "bg-red-100",
    items: [
      { id: "work_1", name: "τοποθέτηση μπαταρίας" },
      { id: "work_2", name: "τοποθέτηση πινακα" },
      { id: "work_3", name: "καλόδιωση" },
      { id: "work_4", name: "τοποθέτηση φωτοβολταϊκών" }
    ]
  }
];

const COLUMN_HEADERS = ["Column A", "Column B", "Column C", "Column D", "Column E"];

export default function OCRSubAssemblyVerificationModal({
  open,
  onClose,
  fileUrl,
  fileName,
  ocrResult = {},
  onConfirm,
  onSkip
}) {
  const [entries, setEntries] = useState(() => {
    if (ocrResult?.extracted_data?.entries) {
      return ocrResult.extracted_data.entries;
    }
    // Initialize with all items from all sections
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

  const [expandedSections, setExpandedSections] = useState(
    SUB_ASSEMBLY_SECTIONS.reduce((acc, s) => ({ ...acc, [s.name]: true }), {})
  );
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
      const filledEntries = entries.filter(e => 
        e.column_A !== null || e.column_B !== null || e.column_C !== null || 
        e.column_D !== null || e.column_E !== null
      );
      
      await onConfirm({
        sub_assembly_entries: filledEntries,
        validation: {
          issues: filledEntries.length === 0 ? ["No data entered"] : [],
          confidence_score: filledEntries.length > 0 ? 1.0 : 0
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Sub-Assembly OCR Verification</DialogTitle>
          <DialogDescription>{fileName}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-3">
            {SUB_ASSEMBLY_SECTIONS.map(section => {
              const sectionEntries = entries.filter(e => e.section === section.name);
              const isExpanded = expandedSections[section.name];

              return (
                <div key={section.name} className={`border border-slate-200 rounded-lg overflow-hidden ${section.color}`}>
                  {/* Section Header */}
                  <button
                    onClick={() => toggleSection(section.name)}
                    className={`w-full ${section.headerColor} px-4 py-3 flex items-center gap-3 hover:opacity-80 transition-opacity`}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-700" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-700" />
                    )}
                    <span className="font-semibold text-slate-800">{section.name}</span>
                    <span className="text-xs text-slate-600 ml-auto">({sectionEntries.length} items)</span>
                  </button>

                  {/* Section Content */}
                  {isExpanded && (
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100 border-b border-slate-200">
                        <tr>
                          <th className="p-2 text-left font-semibold text-slate-700 sticky left-0 bg-slate-100 z-10">Item</th>
                          {COLUMN_HEADERS.map(col => (
                            <th key={col} className="p-2 text-center font-semibold text-slate-700 w-16">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sectionEntries.map((entry, idx) => (
                          <tr key={entry.id} className={idx % 2 === 0 ? "bg-white" : section.color}>
                            <td className="p-2 border-r border-slate-200 font-medium text-slate-700 sticky left-0 bg-inherit">
                              {entry.name}
                            </td>
                            {['column_A', 'column_B', 'column_C', 'column_D', 'column_E'].map(col => (
                              <td key={col} className="p-1 text-center border-r border-slate-200">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={entry[col] === null ? "" : entry[col]}
                                  onChange={e => handleUpdateEntry(entry.id, col, e.target.value)}
                                  className="w-14 text-center text-xs border border-slate-200 rounded px-1 py-0.5 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                                  placeholder="-"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
            <p className="text-xs text-slate-500 py-2">Σύνολο στοιχείων: {entries.length}</p>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button
            variant="outline"
            onClick={onSkip}
            disabled={isLoading}
            className="text-sm"
          >
            Skip
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="text-sm bg-green-600 hover:bg-green-700"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
            Επιβεβαίωση
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}