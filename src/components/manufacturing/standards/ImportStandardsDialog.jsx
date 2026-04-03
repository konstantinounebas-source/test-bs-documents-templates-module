import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export default function ImportStandardsDialog({ open, onOpenChange, onImport, isLoading = false }) {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState([]);

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrors([]);
    setIsProcessing(true);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      if (!worksheet) {
        throw new Error('No worksheet found in the Excel file');
      }

      // Convert to JSON - get headers from first row
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length < 2) {
        throw new Error('Excel file must have headers + at least 1 data row');
      }

      const headers = jsonData[0];
      const dataRows = jsonData.slice(1);

      // Validate headers - must have Item Code at minimum
      const itemCodeIndex = headers.findIndex(h => 
        typeof h === 'string' && h.toLowerCase().includes('item')
      );

      if (itemCodeIndex === -1) {
        throw new Error('Excel file must have an "Item Code" column');
      }

      // Parse data
      const validationErrors = [];
      const parsed = dataRows
        .map((row, idx) => {
          const rowNum = idx + 2; // +2 because of header row and 1-based numbering
          const itemCode = row[itemCodeIndex]?.toString().trim();

          if (!itemCode) {
            validationErrors.push(`Row ${rowNum}: Item Code is required`);
            return null;
          }

          const rowObj = {
            item_code: itemCode,
            operations: {},
            notes: ''
          };

          // Parse operation columns (any column that's not Item Code)
          headers.forEach((header, colIdx) => {
            if (colIdx === itemCodeIndex) return; // Skip Item Code column

            const headerStr = header?.toString().trim();
            if (!headerStr || headerStr.toLowerCase() === 'notes') {
              if (headerStr.toLowerCase() === 'notes') {
                rowObj.notes = row[colIdx]?.toString().trim() || '';
              }
              return;
            }

            const value = row[colIdx];
            
            // Only process if there's a value
            if (value != null && value !== '') {
              const numValue = parseFloat(value);
              
              if (isNaN(numValue) || numValue < 0) {
                validationErrors.push(`Row ${rowNum}, Column "${headerStr}": Must be a non-negative number`);
                return;
              }

              // Extract operation name (remove "(min)" if present)
              const operation = headerStr.replace(/\s*\(min\)\s*$/i, '').trim();
              rowObj.operations[operation] = numValue;
            }
          });

          return rowObj;
        })
        .filter(Boolean);

      if (validationErrors.length > 0) {
        setErrors(validationErrors.slice(0, 10)); // Show first 10 errors
        setIsProcessing(false);
        return;
      }

      setPreviewData(parsed);
      setIsProcessing(false);
    } catch (err) {
      setErrors([err.message || 'Failed to parse Excel file']);
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (previewData.length === 0) {
      toast.error('No data to import');
      return;
    }

    // Convert preview format to StdSetLines format
    const records = [];
    for (const row of previewData) {
      for (const [operation, value] of Object.entries(row.operations)) {
        if (value != null && value !== '') {
          records.push({
            item_code: row.item_code,
            operation,
            std_min_per_pc: value,
            notes: row.notes || ''
          });
        }
      }
    }

    try {
      await onImport(records);
      setFile(null);
      setPreviewData([]);
      setErrors([]);
      onOpenChange(false);
      toast.success(`✅ Imported ${records.length} standards records`);
    } catch (err) {
      toast.error('Failed to import: ' + err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Standards from Excel</DialogTitle>
          <DialogDescription>
            Upload an Excel file with Item Codes and operation times. Format: Item Code in first column, operations in other columns.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Upload */}
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              disabled={isProcessing || isLoading}
              className="hidden"
              id="excel-input"
            />
            <label htmlFor="excel-input" className="cursor-pointer">
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-slate-400" />
                <div className="text-sm">
                  <p className="font-medium">Click to upload or drag and drop</p>
                  <p className="text-slate-500">Excel files (.xlsx, .xls, .csv)</p>
                </div>
              </div>
            </label>
          </div>

          {file && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Selected: <strong>{file.name}</strong>
              </AlertDescription>
            </Alert>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="space-y-1 text-sm">
                  {errors.map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                  {errors.length > 10 && <li>... and more</li>}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {previewData.length > 0 && errors.length === 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Preview ({previewData.length} items)</p>
              <div className="max-h-48 overflow-y-auto border rounded-lg p-3 bg-slate-50 text-sm">
                {previewData.slice(0, 5).map((row, i) => (
                  <div key={i} className="mb-2 pb-2 border-b last:border-0 last:mb-0">
                    <div className="font-medium">{row.item_code}</div>
                    <div className="text-slate-600 text-xs">
                      {Object.entries(row.operations)
                        .map(([op, val]) => `${op}: ${val}`)
                        .join(', ')}
                    </div>
                  </div>
                ))}
                {previewData.length > 5 && (
                  <div className="text-slate-500 text-xs">... and {previewData.length - 5} more items</div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing || isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={previewData.length === 0 || isProcessing || isLoading}
          >
            {isProcessing || isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import {previewData.length} Items
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}