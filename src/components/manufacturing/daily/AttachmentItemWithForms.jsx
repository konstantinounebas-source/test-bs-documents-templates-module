import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Eye, Download, Trash2, Loader2, CheckCircle2, AlertTriangle, Scan, RotateCw, FileText, ImageIcon
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function getFileType(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext) ? 'image' : 'pdf';
}

export default function AttachmentItemWithForms({ 
  att, onDelete, onPreview, onOCR, onOpenProduction, onOpenTeams, 
  isDeleting, isOcrLoading, isAnyOcrLoading, ocrStatus = {}, selDept = ""
}) {
  const [showFormsMenu, setShowFormsMenu] = useState(false);
  const isPrePaint = selDept === "Pre-paint";
  const fileType = getFileType(att.file_name);
  
  // Determine overall OCR status
  const prodStatus = ocrStatus.production?.status || "none";
  const teamsStatus = ocrStatus.teams_time?.status || "none";
  const hasCompleted = prodStatus === "completed" || teamsStatus === "completed";
  const hasFailed = prodStatus === "failed" || teamsStatus === "failed";
  const isProcessing = prodStatus === "processing" || teamsStatus === "processing";
  
  // Build status tooltip
  let statusTooltip = "No OCR data";
  if (isProcessing) {
    statusTooltip = "OCR Processing...";
  } else if (hasCompleted) {
    if (prodStatus === "completed" && teamsStatus === "completed") {
      statusTooltip = "✓ OCR completed for both Production and Teams Time forms";
    } else if (prodStatus === "completed") {
      statusTooltip = "✓ Production form OCR ready (Teams Time missing)";
    } else if (teamsStatus === "completed") {
      statusTooltip = "✓ Teams Time form OCR ready (Production missing)";
    }
  } else if (hasFailed) {
    statusTooltip = "✗ OCR extraction failed - retry recommended";
  }

  // Status badge styling
  let statusBgColor = "bg-slate-100 text-slate-600";
  let statusIcon = null;
  if (isProcessing) {
    statusBgColor = "bg-amber-100 text-amber-700";
    statusIcon = <Loader2 className="w-2.5 h-2.5 animate-spin" />;
  } else if (hasCompleted) {
    statusBgColor = "bg-green-100 text-green-700";
    statusIcon = <CheckCircle2 className="w-2.5 h-2.5" />;
  } else if (hasFailed) {
    statusBgColor = "bg-red-100 text-red-700";
    statusIcon = <AlertTriangle className="w-2.5 h-2.5" />;
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg group hover:bg-slate-100 transition-colors">
      {fileType === "image"
        ? <ImageIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
        : <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />}
      
      <a href={att.file_url} target="_blank" rel="noopener noreferrer"
         className="text-xs text-blue-600 hover:underline truncate flex-1">{att.file_name}</a>
      
      {/* Status Badge with Tooltip */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium cursor-help ${statusBgColor}`}>
              {statusIcon}
              <span>{prodStatus === "completed" && teamsStatus === "completed" ? "✓" : prodStatus === "failed" || teamsStatus === "failed" ? "✗" : "◦"}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {statusTooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Action Buttons */}
      <div className="flex gap-1">
        {/* Forms — Always visible */}
        {isPrePaint ? (
          // Pre-paint: Direct button, no dropdown
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 px-2 text-xs text-blue-600 hover:bg-blue-50" 
            title="Open Production Form"
            onClick={onOpenProduction}
          >
            📄 Forms
          </Button>
        ) : (
          // Other depts: Only Teams Time Form
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 px-2 text-xs text-blue-600 hover:bg-blue-50" 
            title="Open Teams Time Form"
            onClick={onOpenTeams}
          >
            📄 Forms
          </Button>
        )}

        {/* Run/Re-run/Retry OCR — conditional */}
        {prodStatus === "none" && teamsStatus === "none" && (
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-purple-600 hover:bg-purple-50" 
            onClick={() => onOCR(att)} disabled={isAnyOcrLoading} title="Start OCR extraction">
            <Scan className="w-3 h-3 mr-1" /> Run OCR
          </Button>
        )}
        
        {isProcessing && (
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-amber-600 hover:bg-amber-50 cursor-wait" disabled>
            <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing...
          </Button>
        )}
        
        {hasCompleted && !isProcessing && (
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-purple-600 hover:bg-purple-50" 
            onClick={() => onOCR(att)} title="Run OCR again">
            <RotateCw className="w-3 h-3 mr-1" /> Re-run
          </Button>
        )}
        
        {hasFailed && !isProcessing && (
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-red-600 hover:bg-red-50" 
            onClick={() => onOCR(att)} title="Retry OCR extraction">
            <AlertTriangle className="w-3 h-3 mr-1" /> Retry OCR
          </Button>
        )}

        {/* Preview, Download, Delete — on hover */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onPreview(att)} title="Preview">
            <Eye className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" title="Download"
            onClick={async () => {
              const res = await fetch(att.file_url);
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = att.file_name; a.click();
              URL.revokeObjectURL(url);
            }}>
            <Download className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={() => onDelete(att.id)} disabled={isDeleting} title="Delete">
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}