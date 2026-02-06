import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import ExcelJS from 'exceljs';
import { toast } from 'sonner';

export default function ImportOrderFromFileDialog({ isOpen, onClose, onItemsImported, stickerItems, stops }) {
  const [importedData, setImportedData] = useState([]);
  const [validationResults, setValidationResults] = useState([]);
  const [currentValidationIndex, setCurrentValidationIndex] = useState(0);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
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

  const validateCurrentItem = () => {
    if (currentValidationIndex >= importedData.length) return;

    const item = importedData[currentValidationIndex];
    const stop = stops.find(s => s.stop_id === item.stop_id);

    if (!stop) {
      setValidationResults(prev => {
        const updated = [...prev];
        updated[currentValidationIndex] = {
          isValid: false,
          error: `Stop ID "${item.stop_id}" not found`
        };
        return updated;
      });
      moveToNextItem();
      return;
    }

    const matchingStickerItems = stickerItems.filter(
      si => si.stop_id === stop.id && si.status === "Needed"
    );

    if (matchingStickerItems.length === 0) {
      setValidationResults(prev => {
        const updated = [...prev];
        updated[currentValidationIndex] = {
          isValid: false,
          error: `No stickers needed for Stop ID "${item.stop_id}"`
        };
        return updated;
      });
      moveToNextItem();
      return;
    }

    // Check if sticker name matches
    const matchingByName = matchingStickerItems.filter(si => {
      const template = stickerItems.find(s => s.id === si.sticker_template_id);
      return template && template.sticker_name_category.toLowerCase().includes(item.sticker_name.toLowerCase());
    });

    if (matchingByName.length === 0) {
      setValidationResults(prev => {
        const updated = [...prev];
        updated[currentValidationIndex] = {
          isValid: false,
          error: `No sticker matching "${item.sticker_name}" found for Stop ID "${item.stop_id}"`
        };
        return updated;
      });
      moveToNextItem();
      return;
    }

    // Valid item
    setValidationResults(prev => {
      const updated = [...prev];
      updated[currentValidationIndex] = {
        isValid: true,
        stickerId: matchingByName[0].id,
        error: null
      };
      return updated;
    });
    moveToNextItem();
  };

  const moveToNextItem = () => {
    if (currentValidationIndex < importedData.length - 1) {
      setCurrentValidationIndex(prev => prev + 1);
    } else {
      finishValidation();
    }
  };

  const finishValidation = () => {
    const validItems = validationResults
      .map((result, index) => ({ result, index }))
      .filter(({ result }) => result.isValid)
      .map(({ result }) => result.stickerId);

    onItemsImported(validItems);
    resetDialog();
  };

  const resetDialog = () => {
    setImportedData([]);
    setValidationResults([]);
    setCurrentValidationIndex(0);
    setConfirmDialogOpen(false);
    onClose();
  };

  const currentItem = importedData[currentValidationIndex];
  const currentValidation = validationResults[currentValidationIndex];

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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Validate Import Items</DialogTitle>
          </DialogHeader>

          {importedData.length > 0 && currentItem && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  Item {currentValidationIndex + 1} of {importedData.length}
                </span>
                <span>
                  Valid: {validationResults.filter(r => r.isValid).length}
                </span>
              </div>

              <div className="border rounded-lg p-4 space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Stop ID</label>
                  <p className="text-lg font-semibold">{currentItem.stop_id}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Sticker Name</label>
                  <p className="text-lg font-semibold">{currentItem.sticker_name}</p>
                </div>

                {currentValidation?.isValid === false && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Validation Error</p>
                      <p className="text-sm text-red-700">{currentValidation.error}</p>
                    </div>
                  </div>
                )}

                {currentValidation?.isValid === true && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-green-800">✓ Valid - Item will be added to order</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setConfirmDialogOpen(false);
                    resetDialog();
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={validateCurrentItem}
                  className="flex-1"
                >
                  {currentValidationIndex < importedData.length - 1 ? 'Next' : 'Finish'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}