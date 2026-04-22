import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, AlertCircle, CheckCircle2, Plus, Trash2 } from "lucide-react";

const SUB_ASSEMBLY_CATEGORIES = {
  lightboxes: [
    "Σύνδεση 2E BOX",
    "Φωτισμός",
    "Ηλεκτρολογικά",
    "Κλείσιμο",
    "Φτερό",
    "Σύλληψη Σε Καπάκι",
    "Βιδώνιο"
  ],
  team: [
    "Ποότα μεσαία",
    "Ποότα μεγάλη",
    "Πόρτες Αδυ. G1",
    "Φωτισμα θρανίς"
  ],
  painting: [
    "Τάλιμο",
    "Στο τελάρο",
    "Βραδες 10-15cm",
    "Βραδες 20-25cm",
    "Φωτοβολεασία"
  ],
  lightguides: [
    "Type A:41x34",
    "Type B:41x34",
    "Type C:13x34",
    "Type C:84.5x34",
    "Type A.B.G:55.5x34"
  ],
  stationCosmetics: [
    "πολύ πρέιν",
    "πάνελ ορθοθέτηθ",
    "πάνελ ορθοθέτης C μικρο",
    "πάνελ ορθοθέτης C μεγάλο",
    "φωτοβολταϊκό Λ",
    "blue light κατασκευή"
  ],
  workPaint: [
    "τοποθέτηση μπαταρίας",
    "τοποθέτηση πινακα",
    "χαλούδιωνη",
    "τοποθέτηση φωτοβολταϊκών"
  ]
};

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
    return [];
  });

  const [newEntry, setNewEntry] = useState({
    category: "",
    item: "",
    quantity: ""
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleAddEntry = () => {
    if (!newEntry.category || !newEntry.item) return;
    
    setEntries([...entries, {
      ...newEntry,
      id: Date.now(),
      quantity: newEntry.quantity || "1"
    }]);
    
    setNewEntry({ category: "", item: "", quantity: "" });
  };

  const handleDeleteEntry = (id) => {
    setEntries(entries.filter(e => e.id !== id));
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm({
        sub_assembly_entries: entries,
        validation: {
          issues: entries.length === 0 ? ["No entries added"] : [],
          confidence_score: entries.length > 0 ? 1.0 : 0
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const categoryKeys = Object.keys(SUB_ASSEMBLY_CATEGORIES);
  const currentCategoryItems = newEntry.category 
    ? SUB_ASSEMBLY_CATEGORIES[newEntry.category] || [] 
    : [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Sub-Assembly OCR Verification</DialogTitle>
          <DialogDescription>{fileName}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 p-4 space-y-4">
          {/* Current Entries */}
          {entries.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-slate-700">Καταχωρημένα στοιχεία:</h3>
              <div className="space-y-1">
                {entries.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
                    <span>
                      <strong>{entry.item}</strong> ({entry.category}) × {entry.quantity}
                    </span>
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New Entry */}
          <div className="space-y-3 p-3 border border-slate-200 rounded-lg bg-slate-50">
            <h3 className="font-semibold text-sm text-slate-700">Προσθήκη νέας γραμμής:</h3>
            
            {/* Category Select */}
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Κατηγορία</label>
              <select
                value={newEntry.category}
                onChange={e => setNewEntry({ ...newEntry, category: e.target.value, item: "" })}
                className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-blue-400"
              >
                <option value="">-- Επιλογή Κατηγορίας --</option>
                {categoryKeys.map(key => (
                  <option key={key} value={key}>
                    {key.replace(/([A-Z])/g, ' $1').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Item Select */}
            {currentCategoryItems.length > 0 && (
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Στοιχείο</label>
                <select
                  value={newEntry.item}
                  onChange={e => setNewEntry({ ...newEntry, item: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 outline-none focus:border-blue-400"
                >
                  <option value="">-- Επιλογή Στοιχείου --</option>
                  {currentCategoryItems.map(item => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Quantity Input */}
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Ποσότητα</label>
              <Input
                type="number"
                min="1"
                value={newEntry.quantity}
                onChange={e => setNewEntry({ ...newEntry, quantity: e.target.value })}
                placeholder="1"
                className="text-sm"
              />
            </div>

            {/* Add Button */}
            <Button
              onClick={handleAddEntry}
              disabled={!newEntry.category || !newEntry.item}
              className="w-full text-sm bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-1" /> Προσθήκη
            </Button>
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
            disabled={isLoading || entries.length === 0}
            className="text-sm bg-green-600 hover:bg-green-700"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
            Επιβεβαίωση ({entries.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}