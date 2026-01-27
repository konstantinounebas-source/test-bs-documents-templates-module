import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Upload, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ExcelJS from "exceljs";

export default function ImportStopsDialog({ open, onClose, onImportComplete }) {
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
    const worksheet = workbook.addWorksheet("Stops Template");

    worksheet.columns = [
      { header: "Stop ID*", key: "stop_id", width: 15 },
      { header: "English Name*", key: "english_name", width: 30 },
      { header: "Greek Name*", key: "greek_name", width: 30 },
      { header: "Shelter Type Initial ID", key: "shelter_type_initial_id", width: 20 },
      { header: "Shelter Type Approved ID", key: "shelter_type_approved_id", width: 20 },
      { header: "Planned Installation Date* (YYYY-MM-DD)", key: "current_planned_installation_date", width: 30 },
      { header: "Shelter Installed (Yes/No)", key: "shelter_installed", width: 20 },
      { header: "Comments", key: "comments", width: 40 }
    ];

    worksheet.addRow({
      stop_id: "STOP001",
      english_name: "Main Street Stop",
      greek_name: "Στάση Κεντρικής Οδού",
      shelter_type_initial_id: "TYPE-A",
      shelter_type_approved_id: "TYPE-B",
      current_planned_installation_date: "2026-02-15",
      shelter_installed: "No",
      comments: "Sample stop"
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stops_import_template.xlsx";
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

      const shelterTypes = await base44.entities.ShelterType.list();
      const shelterTypeMap = {};
      shelterTypes.forEach(st => {
        shelterTypeMap[st.shelter_type_id] = st.id;
      });

      const stops = [];
      const errors = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        // Helper function to convert Excel date to YYYY-MM-DD format
        const formatExcelDate = (dateValue) => {
          if (!dateValue) return "";
          if (dateValue instanceof Date) {
            return dateValue.toISOString().split('T')[0];
          }
          const dateStr = dateValue.toString().trim();
          // If it's already in YYYY-MM-DD format, return as is
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return dateStr;
          }
          // Try to parse other date formats
          try {
            const date = new Date(dateStr);
            if (!isNaN(date)) {
              return date.toISOString().split('T')[0];
            }
          } catch (e) {}
          return dateStr;
        };

        const stop = {
          stop_id: row.getCell(1).value?.toString().trim(),
          english_name: row.getCell(2).value?.toString().trim(),
          greek_name: row.getCell(3).value?.toString().trim(),
          shelter_type_initial_id: "",
          shelter_type_approved_id: "",
          current_planned_installation_date: formatExcelDate(row.getCell(6).value),
          shelter_installed: false,
          comments: row.getCell(8).value?.toString().trim() || ""
        };

        // Validate required fields
        if (!stop.stop_id || !stop.english_name || !stop.greek_name) {
          errors.push(`Row ${rowNumber}: Missing Stop ID, English Name, or Greek Name`);
          return;
        }

        const initialTypeId = row.getCell(4).value?.toString().trim();
        const approvedTypeId = row.getCell(5).value?.toString().trim();

        // Initial Type is mandatory
        if (!initialTypeId) {
          errors.push(`Row ${rowNumber} (Stop ${stop.stop_id}): Initial Type is required`);
          return;
        }

        if (!shelterTypeMap[initialTypeId]) {
          errors.push(`Row ${rowNumber} (Stop ${stop.stop_id}): Initial Type "${initialTypeId}" does not exist`);
          return;
        }

        stop.shelter_type_initial_id = shelterTypeMap[initialTypeId];

        if (approvedTypeId && shelterTypeMap[approvedTypeId]) {
          stop.shelter_type_approved_id = shelterTypeMap[approvedTypeId];
        }

        const shelterInstalledValue = row.getCell(7).value?.toString().toLowerCase().trim();
        stop.shelter_installed = shelterInstalledValue === "yes" || shelterInstalledValue === "true";

        // Either Planned Installation Date or Shelter Installed must be provided
        if (!stop.current_planned_installation_date && !stop.shelter_installed) {
          errors.push(`Row ${rowNumber} (Stop ${stop.stop_id}): Planned Installation Date or Shelter Installed (Yes) is required`);
          return;
        }

        stop.english_count_letters = stop.english_name.length;
        stop.greek_count_letters = stop.greek_name.length;
        stops.push(stop);
      });

      if (errors.length > 0) {
        setError(`Import validation failed:\n${errors.join("\n")}`);
        setImporting(false);
        return;
      }

      if (stops.length === 0) {
        setError("No valid stops found in the file");
        setImporting(false);
        return;
      }

      // Check for duplicate Stop IDs within the import file
      const importStopIds = new Set();
      const duplicatesInFile = [];
      stops.forEach(stop => {
        if (importStopIds.has(stop.stop_id)) {
          duplicatesInFile.push(stop.stop_id);
        }
        importStopIds.add(stop.stop_id);
      });

      if (duplicatesInFile.length > 0) {
        setError(`The following Stop IDs appear multiple times in the file: ${[...new Set(duplicatesInFile)].join(", ")}`);
        setImporting(false);
        return;
      }

      // Check for duplicate Stop IDs in database
      const existingStops = await base44.entities.Stop.list();
      const existingStopIds = new Set(existingStops.map(s => s.stop_id));
      const duplicates = stops.filter(s => existingStopIds.has(s.stop_id));

      if (duplicates.length > 0) {
        setError(`The following Stop IDs already exist: ${duplicates.map(d => d.stop_id).join(", ")}`);
        setImporting(false);
        return;
      }

      await base44.entities.Stop.bulkCreate(stops);

      setSuccess(`Successfully imported ${stops.length} stops`);
      setTimeout(() => {
        onImportComplete();
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Import error:", err);
      setError("Failed to import stops. Please check the file format.");
    }

    setImporting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Stops from Excel</DialogTitle>
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
            <Button onClick={downloadTemplate} variant="outline" className="w-full">
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