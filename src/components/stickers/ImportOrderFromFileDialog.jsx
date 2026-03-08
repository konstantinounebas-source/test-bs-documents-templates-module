import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, Check, Loader2 } from "lucide-react";
import { toast } from 'sonner';

export default function ImportOrderFromFileDialog({ isOpen, onClose, onItemsImported, stickerItems, stops, stickerTemplates }) {
  const [importedData, setImportedData] = useState([]);
  const [validationResults, setValidationResults] = useState([]);
  const [currentValidationIndex, setCurrentValidationIndex] = useState(0);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
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

  const handleFileSelect = async (event) => {
    toast.error('Excel import is not available');
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

      const matchingStickerItems = (stickersByStopId.get(stop.id) || []).filter(si => si.status === "Needed" && !si.total_ordered_quantity);

      if (matchingStickerItems.length === 0) {
        return {
          isValid: false,
          error: `No stickers needed for Stop ID "${item.stop_id}"`
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
                  setConfirmDialogOpen(false);
                  resetDialog();
                }}
                className="w-full"
              >
                Cancel
              </Button>
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