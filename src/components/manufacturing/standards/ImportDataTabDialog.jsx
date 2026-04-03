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

export default function ImportDataTabDialog({ open, onClose, onImportComplete, bundle }) {
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
    const worksheet = workbook.addWorksheet("Data Template");

    // Get operations and department
    const [operations, departments] = await Promise.all([
      base44.entities.Operation.filter({ is_active: true }),
      base44.entities.Department.filter({ name: bundle.department })
    ]);

    const deptId = departments[0]?.id;
    const deptOps = operations
      .filter(op => {
        if (!op.department_ids || op.department_ids.length === 0) return true;
        return deptId ? op.department_ids.includes(deptId) : true;
      })
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .slice(0, 10);

    const columns = [
      { header: "Item Code*", key: "item_code", width: 20 },
      ...deptOps.map(op => ({ header: `${op.name} (min)`, key: op.name, width: 15 })),
      { header: "Surface Area (m²)", key: "surface_area_m2", width: 18 },
      { header: "Notes", key: "notes", width: 30 }
    ];

    worksheet.columns = columns;

    // Add sample row
    const sampleRow = {
      item_code: "ITEM001",
      surface_area_m2: "2.5",
      notes: "Sample item"
    };
    deptOps.forEach((op) => {
      sampleRow[op.name] = (Math.random() * 10 + 5).toFixed(2);
    });
    worksheet.addRow(sampleRow);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `data_import_template_${bundle.department}.xlsx`;
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

      // Get operations to map column headers
      const operations = await base44.entities.Operation.filter({ is_active: true });
      const operationMap = {};
      operations.forEach(op => {
        operationMap[op.name] = op.id;
      });

      const lines = [];
      const errors = [];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        const itemCode = row.getCell(1).value?.toString().trim();
        if (!itemCode) {
          errors.push(`Row ${rowNumber}: Missing Item Code`);
          return;
        }

        // Parse operations columns (skip first, last 2 columns)
        let colIdx = 2;
        for (const opName of Object.keys(operationMap)) {
          const cell = row.getCell(colIdx);
          const value = cell.value;
          
          if (value != null && value !== '') {
            const numValue = parseFloat(value);
            if (!isNaN(numValue) && numValue >= 0) {
              lines.push({
                bundle_id: bundle.id,
                item_code: itemCode,
                operation: opName,
                std_min_per_pc: numValue,
                surface_area_m2: row.getCell(colIdx + 10)?.value ? parseFloat(row.getCell(colIdx + 10).value) : null,
                notes: row.getCell(colIdx + 11)?.value?.toString().trim() || ''
              });
            }
          }
          colIdx++;
        }
      });

      if (errors.length > 0) {
        setError(`Import validation failed:\n${errors.join("\n")}`);
        setImporting(false);
        return;
      }

      if (lines.length === 0) {
        setError("No valid data found in the file");
        setImporting(false);
        return;
      }

      // Bulk create lines
      await base44.entities.StdSetLines.bulkCreate(lines);

      setSuccess(`Successfully imported ${lines.length} standard lines`);
      setTimeout(() => {
        onImportComplete();
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Import error:", err);
      setError("Failed to import data. Please check the file format.");
    }

    setImporting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Data from Excel</DialogTitle>
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