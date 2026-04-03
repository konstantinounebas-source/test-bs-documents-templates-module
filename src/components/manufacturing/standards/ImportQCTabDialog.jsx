import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Upload, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ExcelJS from "exceljs";
import { toast } from "sonner";

export default function ImportQCTabDialog({ open, onClose, onImportComplete, bundle }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (open) {
      setError("");
      setSuccess("");
      setFile(null);
    }
  }, [open]);

  const downloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("QC Template");

    worksheet.columns = [
      { header: "Operation*", key: "operation", width: 20 },
      { header: "Item Code*", key: "item_code", width: 20 },
      { header: "QC Type*", key: "qc_type", width: 15 },
      { header: "QC Level*", key: "qc_level", width: 15 },
      { header: "Mode* (percent|fixed)", key: "mode", width: 18 },
      { header: "QC Value*", key: "qc_value", width: 12 },
      { header: "Base Time (min)", key: "base_time_min", width: 15 },
      { header: "Notes", key: "notes", width: 30 }
    ];

    worksheet.addRow({
      operation: "Cutting",
      item_code: "ITEM001",
      qc_type: "Visual",
      qc_level: "Level 1",
      mode: "percent",
      qc_value: "10",
      base_time_min: "5.25",
      notes: "Sample QC rule"
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qc_import_template_${bundle.department}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!file) {
      setError("Please select a file to import");
      return;
    }

    setImporting(true);
    setError("");
    setSuccess("");

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const worksheet = workbook.getWorksheet(1);

      const qcLines = [];
      const errors = [];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        const operation = row.getCell(1).value?.toString().trim();
        const itemCode = row.getCell(2).value?.toString().trim();
        const qcType = row.getCell(3).value?.toString().trim();
        const qcLevel = row.getCell(4).value?.toString().trim();
        const mode = row.getCell(5).value?.toString().trim();
        const qcValue = row.getCell(6).value;

        // Validate required fields
        if (!operation || !itemCode || !qcType || !qcLevel || !mode || qcValue == null) {
          errors.push(`Row ${rowNumber}: Missing required fields`);
          return;
        }

        if (!['percent', 'fixed'].includes(mode)) {
          errors.push(`Row ${rowNumber}: Mode must be "percent" or "fixed"`);
          return;
        }

        const numValue = parseFloat(qcValue);
        if (isNaN(numValue) || numValue < 0) {
          errors.push(`Row ${rowNumber}: Invalid QC Value`);
          return;
        }

        const baseTime = row.getCell(7).value ? parseFloat(row.getCell(7).value) : 0;
        let calculatedExtraTime = 0;
        if (mode === 'percent') {
          calculatedExtraTime = baseTime * (numValue / 100);
        } else {
          calculatedExtraTime = numValue;
        }

        qcLines.push({
          bundle_id: bundle.id,
          operation: operation,
          item_code: itemCode,
          qc_type: qcType,
          qc_level: qcLevel,
          mode: mode,
          qc_value: numValue,
          base_time_min: baseTime,
          calculated_extra_time_min: calculatedExtraTime,
          notes: row.getCell(8).value?.toString().trim() || ''
        });
      });

      if (errors.length > 0) {
        setError(`Import validation failed:\n${errors.join("\n")}`);
        setImporting(false);
        return;
      }

      if (qcLines.length === 0) {
        setError("No valid QC data found in the file");
        setImporting(false);
        return;
      }

      // Bulk create QC lines
      await base44.entities.QCSetLines.bulkCreate(qcLines);

      setSuccess(`Successfully imported ${qcLines.length} QC rules`);
      setTimeout(() => {
        onImportComplete();
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Import error:", err);
      setError("Failed to import QC data. Please check the file format.");
    }

    setImporting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import QC Rules from Excel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <div>
            <Button onClick={downloadTemplate} variant="outline" className="w-full" disabled={importing}>
              <Download className="w-4 h-4 mr-2" />
              Download Excel Template
            </Button>
          </div>

          <div>
            <Label htmlFor="file">Upload Excel File</Label>
            <Input
              id="file"
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files[0])}
              className="mt-2"
              disabled={importing}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={importing}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={importing || !file}>
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}