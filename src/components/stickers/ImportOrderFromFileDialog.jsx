import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, Check } from "lucide-react";
import ExcelJS from 'exceljs';
import { toast } from 'sonner';

export default function ImportOrderFromFileDialog({ isOpen, onClose, onItemsImported, stickerItems, stops, stickerTemplates }) {
  const [importedData, setImportedData] = useState([]);
  const [validationResults, setValidationResults] = useState([]);
  const [currentValidationIndex, setCurrentValidationIndex] = useState(0);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [step, setStep] = useState("idle"); // idle, validating, review
  const [selectedValidIds, setSelectedValidIds] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.getWorksheet('Order Template');

      if (!worksheet) {
        toast.error('Sheet "Order Template" not found in Excel file');
        return;
      }

      const rows = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        if (!row.values[1]) return; // Skip empty rows

        const stopId = row.values[1]?.toString().trim();
        const stickerName = row.values[2]?.toString().trim();
        const okValue = row.values[3]?.toString().trim().toLowerCase();

        if (stopId && stickerName && okValue === 'yes') {
          rows.push({
            rowNumber: rowNumber,
            stop_id: stopId,
            sticker_name: stickerName,
            ok: okValue === 'yes'
          });
        }
      });

      if (rows.length === 0) {
        toast.error('No valid rows found with OK = "Yes"');
        return;
      }

      setImportedData(rows);
      setValidationResults(rows.map(() => ({ isValid: null, error: null })));
      setCurrentValidationIndex(0);
      setStep("validating");
      setConfirmDialogOpen(true);
    } catch (error) {
      console.error('Error reading Excel file:', error);
      toast.error('Error reading Excel file: ' + error.message);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateAllItems = async () => {
    const results = importedData.map((item) => {
      const stop = stops.find(s => s.stop_id === item.stop_id);

      if (!stop) {
        return {
          isValid: false,
          error: `Stop ID "${item.stop_id}" not found`
        };
      }

      const matchingStickerItems = stickerItems.filter(
        si => si.stop_id === stop.id && si.status === "Needed"
      );

      if (matchingStickerItems.length === 0) {
        return {
          isValid: false,
          error: `No stickers needed for Stop ID "${item.stop_id}"`
        };
      }

      const matchingByName = matchingStickerItems.filter(si => {
        const template = stickerTemplates.find(t => t.id === si.sticker_template_id);
        return template && template.sticker_name_category.toLowerCase().includes(item.sticker_name.toLowerCase());
      });

      if (matchingByName.length === 0) {
        return {
          isValid: false,
          error: `No sticker matching "${item.sticker_name}" found for Stop ID "${item.stop_id}"`
        };
      }

      return {
        isValid: true,
        stickerId: matchingByName[0].id,
        error: null
      };
    });

    setValidationResults(results);
    const validIds = results
      .map((result, index) => ({ result, index }))
      .filter(({ result }) => result.isValid)
      .map(({ result }) => result.stickerId);
    
    setSelectedValidIds(validIds);
    setStep("review");
    setCurrentValidationIndex(0);
  };

  const moveToNextInvalidItem = () => {
    const invalidIndices = validationResults
      .map((r, idx) => !r.isValid ? idx : null)
      .filter(idx => idx !== null);
    
    const currentInvalidIdx = invalidIndices.indexOf(currentValidationIndex);
    
    if (currentInvalidIdx < invalidIndices.length - 1) {
      setCurrentValidationIndex(invalidIndices[currentInvalidIdx + 1]);
    } else {
      finishReview();
    }
  };

  const finishReview = () => {
    onItemsImported(selectedValidIds);
    resetDialog();
  };

  const resetDialog = () => {
    setImportedData([]);
    setValidationResults([]);
    setCurrentValidationIndex(0);
    setConfirmDialogOpen(false);
    setStep("idle");
    setSelectedValidIds([]);
    onClose();
  };

  const currentItem = importedData[currentValidationIndex];
  const currentValidation = validationResults[currentValidationIndex];
  const validItems = validationResults
    .map((r, idx) => ({ result: r, index: idx }))
    .filter(({ result }) => result.isValid);
  const invalidItems = validationResults
    .map((r, idx) => ({ result: r, index: idx, data: importedData[idx] }))
    .filter(({ result }) => !result.isValid);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        onChange={handleFileSelect}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
      >
        📥 Import from File
      </button>

      {/* Validation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {step === "validating" ? "Validating Import..." : "Review Import Results"}
            </DialogTitle>
          </DialogHeader>

          {step === "validating" && importedData.length > 0 && (
            <div className="space-y-4 py-4">
              <div className="text-center">
                <p className="text-lg font-semibold">Processing {importedData.length} items...</p>
                <p className="text-sm text-gray-600 mt-2">This will validate all items automatically.</p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setConfirmDialogOpen(false);
                    resetDialog();
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={validateAllItems} className="bg-blue-600">
                  Start Validation
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === "review" && (
            <div className="space-y-4 py-4">
              {validItems.length > 0 && (
                <div className="border rounded-lg p-4 bg-green-50">
                  <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <Check className="w-5 h-5" />
                    Valid Items ({validItems.length})
                  </h3>
                  <div className="space-y-2">
                    {validItems.map(({ result, index }) => (
                      <div key={index} className="flex items-center justify-between bg-white p-2 rounded border border-green-200">
                        <span className="text-sm">
                          <span className="font-medium">{importedData[index].stop_id}</span>
                          {" - "}
                          <span>{importedData[index].sticker_name}</span>
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedValidIds(prev => prev.filter(id => id !== result.stickerId))}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {invalidItems.length > 0 && (
                <div className="border rounded-lg p-4 bg-red-50">
                  <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Invalid Items ({invalidItems.length})
                  </h3>
                  {invalidItems.map(({ result, data }, displayIdx) => (
                    <div key={displayIdx} className="bg-white p-3 rounded border border-red-200 mb-2">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">{data.stop_id} - {data.sticker_name}</p>
                        <p className="text-red-700 text-xs mt-1">{result.error}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setConfirmDialogOpen(false);
                    resetDialog();
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={finishReview} 
                  className="bg-blue-600"
                  disabled={selectedValidIds.length === 0}
                >
                  Create Order with {selectedValidIds.length} Items
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}