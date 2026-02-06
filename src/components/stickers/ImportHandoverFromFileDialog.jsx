import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import ExcelJS from 'exceljs';
import { toast } from 'sonner';

export default function ImportHandoverFromFileDialog({ isOpen, onClose, onItemsImported, stops, stickerItems, stickerTemplates }) {
  const [importedData, setImportedData] = useState([]);
  const [validationResults, setValidationResults] = useState([]);
  const [step, setStep] = useState("idle"); // idle, validating, review
  const [selectedValidIds, setSelectedValidIds] = useState([]);
  const [validationProgress, setValidationProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Auto-start validation when dialog opens with data
  useEffect(() => {
    if (step === "validating" && importedData.length > 0) {
      const timer = setTimeout(() => {
        validateAllItems();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [step, importedData]);

  const resetDialog = () => {
    setImportedData([]);
    setValidationResults([]);
    setStep("idle");
    setSelectedValidIds([]);
    setValidationProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateAllItems = async () => {
    // Pre-build lookup maps for faster access
    const stopMap = new Map(stops.map(s => [s.stop_id, s]));
    const templateMap = new Map(stickerTemplates.map(t => [t.id, t]));
    const stickersByStopId = new Map();
    
    stickerItems.forEach(si => {
      if (!stickersByStopId.has(si.stop_id)) {
        stickersByStopId.set(si.stop_id, []);
      }
      stickersByStopId.get(si.stop_id).push(si);
    });

    const results = importedData.map((item, idx) => {
      setValidationProgress(Math.round(((idx + 1) / importedData.length) * 100));
      
      const stop = stopMap.get(item.stop_id);
      if (!stop) {
        return {
          isValid: false,
          error: `Stop ID "${item.stop_id}" not found`
        };
      }

      // For handovers, we need items that are "Received" and available (In Stock or With Technician)
      const matchingStickerItems = (stickersByStopId.get(stop.id) || []).filter(si => 
        si.status === "Received" && 
        (si.custody_status === "In Stock" || si.custody_status === "With Technician")
      );

      if (matchingStickerItems.length === 0) {
        return {
          isValid: false,
          error: `No available stickers for Stop ID "${item.stop_id}"`
        };
      }

      const matchingByName = matchingStickerItems.find(si => {
        const template = templateMap.get(si.sticker_template_id);
        return template && template.sticker_name_category.toLowerCase().includes(item.sticker_name.toLowerCase());
      });

      if (!matchingByName) {
        return {
          isValid: false,
          error: `No sticker matching "${item.sticker_name}" found for Stop ID "${item.stop_id}"`
        };
      }

      return {
        isValid: true,
        stickerId: matchingByName.id,
        quantity: parseInt(item.quantity) || 1,
        notes: item.notes || "",
        error: null
      };
    });

    setValidationResults(results);
    setValidationProgress(100);
    const validIds = results
      .map((result) => result.isValid ? result.stickerId : null)
      .filter(Boolean);
    
    setSelectedValidIds(validIds);
    setStep("review");
    setValidationProgress(0);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.getWorksheet('Handover Template');
      if (!worksheet) {
        toast.error('Invalid file format - expected "Handover Template" sheet');
        return;
      }

      const rows = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        const stopId = row.getCell('A').value;
        const stickerName = row.getCell('B').value;
        const quantity = row.getCell('C').value;
        const notes = row.getCell('D').value;
        const ok = row.getCell('E').value;

        if (stopId && stickerName && ok === 'x') {
          rows.push({
            stop_id: String(stopId).trim(),
            sticker_name: String(stickerName).trim(),
            quantity: quantity || 1,
            notes: notes ? String(notes).trim() : ""
          });
        }
      });

      if (rows.length === 0) {
        toast.error('No valid items found in file');
        return;
      }

      setImportedData(rows);
      setValidationResults(rows.map(() => ({ isValid: null, error: null })));
      setStep("validating");
    } catch (error) {
      console.error("Error reading file:", error);
      toast.error('Error reading file');
    }
  };

  const toggleValidItem = (stickerId) => {
    setSelectedValidIds(prev => 
      prev.includes(stickerId) 
        ? prev.filter(id => id !== stickerId)
        : [...prev, stickerId]
    );
  };

  const handleConfirmImport = () => {
    const itemsToImport = validationResults
      .map((result, index) => result.isValid ? { ...result, index } : null)
      .filter(Boolean)
      .filter(item => selectedValidIds.includes(item.stickerId));

    if (itemsToImport.length === 0) {
      toast.error('No items selected');
      return;
    }

    onItemsImported(itemsToImport);
    resetDialog();
    onClose();
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />
      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
        📥 Import Handover Data
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) resetDialog();
        onClose();
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Handover Data</DialogTitle>
          </DialogHeader>

          {step === "idle" && (
            <div className="space-y-4 py-4">
              <p className="text-gray-600">Load the handover template file to import sticker items for technician handover.</p>
              <Button onClick={() => fileInputRef.current?.click()} className="w-full">
                Select Handover File
              </Button>
            </div>
          )}

          {step === "validating" && importedData.length > 0 && (
            <div className="space-y-4 py-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <p className="text-lg font-semibold">Validating {importedData.length} items...</p>
                </div>
                <p className="text-sm text-gray-600 mt-2">{validationProgress}%</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${validationProgress}%` }}
                  />
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  resetDialog();
                  onClose();
                }}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          )}

          {step === "review" && validationResults.length > 0 && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="font-semibold text-green-900">Valid Items</p>
                  <p className="text-2xl font-bold text-green-600">{validationResults.filter(r => r.isValid).length}</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="font-semibold text-red-900">Invalid Items</p>
                  <p className="text-2xl font-bold text-red-600">{validationResults.filter(r => !r.isValid).length}</p>
                </div>
              </div>

              {/* Valid Items */}
              {validationResults.filter(r => r.isValid).length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-green-700">✓ Valid Items to Import</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const validIds = validationResults
                            .map((r, idx) => r.isValid ? r.stickerId : null)
                            .filter(Boolean);
                          setSelectedValidIds(validIds);
                        }}
                        className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => setSelectedValidIds([])}
                        className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-[30vh] overflow-y-auto">
                    {validationResults.map((result, idx) => result.isValid && (
                      <div key={idx} className="p-2 border rounded bg-green-50 flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedValidIds.includes(result.stickerId)}
                          onChange={() => toggleValidItem(result.stickerId)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm flex-1">{importedData[idx].stop_id} - {importedData[idx].sticker_name} (Qty: {result.quantity})</span>
                        <Check className="w-4 h-4 text-green-600" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Invalid Items */}
              {validationResults.filter(r => !r.isValid).length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-red-700">✗ Invalid Items (Will be skipped)</h3>
                  <div className="space-y-2 max-h-[20vh] overflow-y-auto">
                    {validationResults.map((result, idx) => !result.isValid && (
                      <div key={idx} className="p-2 border rounded bg-red-50 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{importedData[idx].stop_id} - {importedData[idx].sticker_name}</p>
                          <p className="text-xs text-red-600">{result.error}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              resetDialog();
              onClose();
            }}>
              Cancel
            </Button>
            {step === "review" && (
              <Button onClick={handleConfirmImport} className="bg-blue-600">
                Import {selectedValidIds.length} Item{selectedValidIds.length !== 1 ? 's' : ''}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}