import React from "react";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";


export default function ExportReceiptTemplateDialog({ orderedItems, stops, stickerTemplates }) {
  const handleExportTemplate = async () => {
    const { Workbook } = await import('https://cdn.jsdelivr.net/npm/exceljs@4.4.0/+esm');
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Receipt Template');

    // Headers
    worksheet.columns = [
      { header: 'Stop ID', key: 'stop_id', width: 15 },
      { header: 'Sticker Name', key: 'sticker_name', width: 30 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Notes', key: 'notes', width: 40 },
      { header: 'ok', key: 'ok', width: 8 }
    ];

    // Add items
    orderedItems.forEach(item => {
      const stop = stops.find(s => s.id === item.stop_id);
      const template = stickerTemplates.find(t => t.id === item.sticker_template_id);
      
      worksheet.addRow({
        stop_id: stop?.stop_id || '',
        sticker_name: template?.sticker_name_category || '',
        quantity: 1,
        notes: '',
        ok: 'Yes'
      });
    });

    // Format header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add instructions
    const lastRow = orderedItems.length + 2;
    worksheet.addRow({});
    worksheet.addRow({});
    worksheet.getCell(`A${lastRow + 2}`).value = "Instructions:";
    worksheet.getCell(`A${lastRow + 2}`).font = { bold: true, size: 12 };
    worksheet.getCell(`A${lastRow + 3}`).value = "1. Fill in the Quantity column with the received quantity";
    worksheet.getCell(`A${lastRow + 4}`).value = "2. Add any notes in the Notes column (optional)";
    worksheet.getCell(`A${lastRow + 5}`).value = "3. Keep the 'ok' column as is (marks valid rows)";
    worksheet.getCell(`A${lastRow + 6}`).value = "4. Save the file and import it back to create receipts";

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipt_template_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExportTemplate}>
      <FileDown className="w-4 h-4 mr-2" />
      Export Receipt Template
    </Button>
  );
}