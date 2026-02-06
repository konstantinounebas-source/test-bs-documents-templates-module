import React from "react";
import ExcelJS from 'exceljs';

export default function ExportOrderTemplateDialog({ filteredItems, stickerItems, stickerTemplates, stops }) {
  const handleExportTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Order Template');

    // Add headers
    worksheet.columns = [
      { header: 'Stop ID', key: 'stop_id', width: 15 },
      { header: 'Sticker Name', key: 'sticker_name', width: 30 },
      { header: 'OK (Yes/No)', key: 'ok', width: 15 }
    ];

    // Add rows for each available item
    filteredItems.forEach(item => {
      const stop = stops.find(s => s.id === item.stop_id);
      const template = stickerTemplates.find(t => t.id === item.sticker_template_id);
      
      worksheet.addRow({
        stop_id: stop?.stop_id || '-',
        sticker_name: template?.sticker_name_category || '-',
        ok: ''
      });
    });

    // Style header row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };

    // Add instructions
    worksheet.addRow({});
    const instructionRow = worksheet.addRow({
      stop_id: 'Instructions:',
      sticker_name: 'Mark "Yes" in OK column for items to order',
      ok: ''
    });
    instructionRow.font = { italic: true, color: { argb: 'FF666666' } };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `order_template_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExportTemplate}
      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
    >
      📄 Export Template
    </button>
  );
}