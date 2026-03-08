import React from "react";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

export default function ExportReceiptTemplateDialog({ orderedItems, stops, stickerTemplates }) {
  const handleExportTemplate = async () => {
    alert('Export functionality is temporarily unavailable');
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExportTemplate}>
      <FileDown className="w-4 h-4 mr-2" />
      Export Receipt Template
    </Button>
  );
}