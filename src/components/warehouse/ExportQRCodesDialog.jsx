import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Download, FileSpreadsheet, FileText } from "lucide-react";
import QRCode from "qrcode";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";

export default function ExportQRCodesDialog({ open, onClose, selectedProducts }) {
  const [exportFormat, setExportFormat] = useState("pdf");
  const [isExporting, setIsExporting] = useState(false);
  const [labelsPerRow, setLabelsPerRow] = useState("2");

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (exportFormat === "pdf") {
        await exportToPDF();
      } else {
        await exportToExcel();
      }
    } catch (error) {
      console.error("Export error:", error);
      alert("Σφάλμα κατά την εξαγωγή. Παρακαλώ δοκιμάστε ξανά.");
    }
    setIsExporting(false);
  };

  const generateQRCodeDataURL = async (text) => {
    try {
      return await QRCode.toDataURL(text, {
        width: 200,
        margin: 1,
        errorCorrectionLevel: 'M'
      });
    } catch (error) {
      console.error("QR Code generation error:", error);
      return null;
    }
  };

  const exportToPDF = async () => {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const labelWidth = labelsPerRow === "2" ? 105 : 70; // Width per label
    const labelHeight = 37; // Height per label (standard label size)
    const labelsPerRowNum = parseInt(labelsPerRow);
    const labelsPerPage = labelsPerRowNum * Math.floor(pageHeight / labelHeight);
    
    let labelIndex = 0;

    for (const product of selectedProducts) {
      const qrDataURL = await generateQRCodeDataURL(product.sku || product.id);
      if (!qrDataURL) continue;

      const row = Math.floor(labelIndex % labelsPerPage / labelsPerRowNum);
      const col = labelIndex % labelsPerRowNum;

      const x = col * labelWidth;
      const y = row * labelHeight;

      // Draw border (optional - comment out if not needed)
      pdf.setDrawColor(200);
      pdf.rect(x, y, labelWidth, labelHeight);

      // Add QR Code
      const qrSize = 25;
      pdf.addImage(qrDataURL, 'PNG', x + 5, y + 5, qrSize, qrSize);

      // Add SKU
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(product.sku || 'N/A', x + qrSize + 10, y + 10);

      // Add Product Name
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      const productName = product.name || 'Unknown Product';
      const maxWidth = labelWidth - qrSize - 20;
      const splitName = pdf.splitTextToSize(productName, maxWidth);
      pdf.text(splitName.slice(0, 2), x + qrSize + 10, y + 17);

      labelIndex++;

      // Add new page if needed
      if (labelIndex % labelsPerPage === 0 && labelIndex < selectedProducts.length) {
        pdf.addPage();
      }
    }

    pdf.save(`QR_Labels_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('QR Codes');

    // Set column widths
    worksheet.columns = [
      { width: 5 },
      { width: 20 },
      { width: 35 },
      { width: 20 }
    ];

    let currentRow = 1;

    for (const product of selectedProducts) {
      const qrDataURL = await generateQRCodeDataURL(product.sku || product.id);
      if (!qrDataURL) continue;

      // Set row height for QR code (approximately 100 pixels)
      worksheet.getRow(currentRow).height = 100;

      // Add product info
      worksheet.getCell(`B${currentRow}`).value = product.sku || 'N/A';
      worksheet.getCell(`B${currentRow}`).font = { bold: true, size: 12 };
      
      worksheet.getCell(`C${currentRow}`).value = product.name || 'Unknown Product';
      worksheet.getCell(`C${currentRow}`).font = { size: 10 };

      // Add QR Code image
      const qrImageId = workbook.addImage({
        base64: qrDataURL.split(',')[1],
        extension: 'png',
      });

      worksheet.addImage(qrImageId, {
        tl: { col: 3, row: currentRow - 1 },
        ext: { width: 120, height: 120 }
      });

      currentRow += 2; // Add some spacing between rows
    }

    // Generate buffer and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `QR_Codes_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Εξαγωγή QR Κωδικών</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <p className="text-sm text-slate-600 mb-2">
              Επιλεγμένα προϊόντα: <span className="font-semibold">{selectedProducts.length}</span>
            </p>
          </div>

          <div className="space-y-2">
            <Label>Μορφή Εξαγωγής</Label>
            <RadioGroup value={exportFormat} onValueChange={setExportFormat}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="w-4 h-4" />
                  PDF - Έτοιμο για εκτύπωση καρτελών
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excel" id="excel" />
                <Label htmlFor="excel" className="flex items-center gap-2 cursor-pointer">
                  <FileSpreadsheet className="w-4 h-4" />
                  Excel - Με QR codes ενσωματωμένα
                </Label>
              </div>
            </RadioGroup>
          </div>

          {exportFormat === "pdf" && (
            <div className="space-y-2">
              <Label>Καρτέλες ανά σειρά</Label>
              <RadioGroup value={labelsPerRow} onValueChange={setLabelsPerRow}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="2" id="2cols" />
                  <Label htmlFor="2cols" className="cursor-pointer">
                    2 ετικέτες (105mm × 37mm - Rayfilm)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="3" id="3cols" />
                  <Label htmlFor="3cols" className="cursor-pointer">
                    3 ετικέτες (70mm × 37mm)
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              {exportFormat === "pdf" 
                ? "Το PDF θα περιέχει καρτέλες έτοιμες για εκτύπωση με QR codes, SKU και όνομα προϊόντος."
                : "Το Excel θα περιέχει τα QR codes ως εικόνες μαζί με τα στοιχεία των προϊόντων."}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Ακύρωση
          </Button>
          <Button onClick={handleExport} disabled={isExporting || selectedProducts.length === 0}>
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Εξαγωγή...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Εξαγωγή
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}