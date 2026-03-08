import React from "react";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

export default function ExportHandoverTemplateDialog({ availableItems, stops, stickerTemplates }) {
  const handleExportTemplate = async () => {
    // Export functionality currently unavailable
    alert('Export functionality is temporarily unavailable');
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExportTemplate}>
      <FileDown className="w-4 h-4 mr-2" />
      Export Handover Template
    </Button>
  );
}