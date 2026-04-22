import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle2, Trash2, Plus } from "lucide-react";

// Fixed sub-assembly items list - ordered by document sections
const SUB_ASSEMBLY_ITEMS = [
  // Lightboxes - Main components
  { id: "light_1", name: "Σύνδεση Σε BOX", category: "Lightboxes", section: "Lightboxes" },
  { id: "light_2", name: "Τρυπημα", category: "Lightboxes", section: "Lightboxes" },
  { id: "light_3", name: "Ηλεκτρολογικά", category: "Lightboxes", section: "Lightboxes" },
  { id: "light_4", name: "Κλειδαρια", category: "Lightboxes", section: "Lightboxes" },
  { id: "light_5", name: "Φτερό", category: "Lightboxes", section: "Lightboxes" },
  { id: "light_6", name: "Σύλληψη Σε Καπάκι", category: "Lightboxes", section: "Lightboxes" },
  { id: "light_7", name: "Βιδώνιο", category: "Lightboxes", section: "Lightboxes" },
  // Lightboxes - Glass
  { id: "glass_1", name: "Πόρτα μικρή", category: "Lightboxes", section: "Glass" },
  { id: "glass_2", name: "Πόρτα μεγάλη", category: "Lightboxes", section: "Glass" },
  { id: "glass_3", name: "Πόρτες Αδυ. C1", category: "Lightboxes", section: "Glass" },
  { id: "glass_4", name: "φινίρισμα θρανίς", category: "Lightboxes", section: "Glass" },
  // Painting - Panels
  { id: "paint_1", name: "Τρίψιμο", category: "Παγκάκια", section: "Painting" },
  { id: "paint_2", name: "Στο τελάρο", category: "Παγκάκια", section: "Painting" },
  { id: "paint_3", name: "Βερνίκι 10 χέρι", category: "Παγκάκια", section: "Painting" },
  { id: "paint_4", name: "Βερνίκι 20 χέρι", category: "Παγκάκια", section: "Painting" },
  { id: "paint_5", name: "Συναρμολόγηση", category: "Παγκάκια", section: "Painting" },
  // Lightguides
  { id: "guide_1", name: "Type A:41x34", category: "Lightguides", section: "Lightguides" },
  { id: "guide_2", name: "Type B:41x34", category: "Lightguides", section: "Lightguides" },
  { id: "guide_3", name: "Type C:13x34", category: "Lightguides", section: "Lightguides" },
  { id: "guide_4", name: "Type C:84.5x34", category: "Lightguides", section: "Lightguides" },
  { id: "guide_5", name: "Type A.B.C:55.5x34", category: "Lightguides", section: "Lightguides" },
  // Station Cosmetics - Panels
  { id: "cosmetic_1", name: "πάνελ ηχείου", category: "Κομμάτια στάσης", section: "Station" },
  { id: "cosmetic_2", name: "πάνελ οροφης B", category: "Κομμάτια στάσης", section: "Station" },
  { id: "cosmetic_3", name: "πάνελ οροφής C μικρό", category: "Κομμάτια στάσης", section: "Station" },
  { id: "cosmetic_4", name: "πάνελ οροφής C μεγάλο", category: "Κομμάτια στάσης", section: "Station" },
  { id: "cosmetic_5", name: "φωτοβολταϊκό Α", category: "Κομμάτια στάσης", section: "Station" },
  { id: "cosmetic_6", name: "blue light κατασκευή", category: "Κομμάτια στάσης", section: "Station" },
  // Work - Paint Operations
  { id: "work_1", name: "τοποθέτηση μπαταρίας", category: "Εργασίες στη στάση", section: "Work" },
  { id: "work_2", name: "τοποθέτηση πινακα", category: "Εργασίες στη στάση", section: "Work" },
  { id: "work_3", name: "καλόδιωση", category: "Εργασίες στη στάση", section: "Work" },
  { id: "work_4", name: "τοποθέτηση φωτοβολταϊκών", category: "Εργασίες στη στάση", section: "Work" }
];

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
    // Initialize with all fixed items with empty column values
    return SUB_ASSEMBLY_ITEMS.map(item => ({
      ...item,
      column_A: null,
      column_B: null,
      column_C: null,
      column_D: null,
      column_E: null
    }));
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleUpdateEntry = (itemId, column, value) => {
    setEntries(entries.map(entry =>
      entry.id === itemId
        ? { ...entry, [column]: value ? parseFloat(value) : null }
        : entry
    ));
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
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Sub-Assembly OCR Verification</DialogTitle>
          <DialogDescription>{fileName}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {/* Data Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-blue-100 border-b border-slate-200">
                  <tr>
                    <th className="p-2 text-left font-semibold">Sub-Assembly Item</th>
                    <th className="p-2 text-center font-semibold">Column A</th>
                    <th className="p-2 text-center font-semibold">Column B</th>
                    <th className="p-2 text-center font-semibold">Column C</th>
                    <th className="p-2 text-center font-semibold">Column D</th>
                    <th className="p-2 text-center font-semibold">Column E</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, idx) => (
                    <tr key={entry.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="p-2 border-r border-slate-200 font-medium text-slate-700">
                        {entry.name}
                      </td>
                      {['column_A', 'column_B', 'column_C', 'column_D', 'column_E'].map(col => (
                        <td key={col} className="p-1 text-center border-r border-slate-200">
                          <input
                            type="number"
                            step="0.01"
                            value={entry[col] === null ? "" : entry[col]}
                            onChange={e => handleUpdateEntry(entry.id, col, e.target.value)}
                            className="w-12 text-center text-xs border border-slate-200 rounded px-1 py-0.5 outline-none focus:border-blue-400"
                            placeholder="-"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-slate-500">Σύνολο στοιχείων: {entries.length}</p>
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