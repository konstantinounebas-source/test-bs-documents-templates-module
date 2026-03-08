import React from "react";

export default function ExportOrderTemplateDialog({ filteredItems, stickerItems, stickerTemplates, stops }) {
  const handleExportTemplate = async () => {
    alert('Export functionality is temporarily unavailable');
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