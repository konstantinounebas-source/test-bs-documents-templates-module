import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ExistingLineRow from "./chatbot/ExistingLineRow";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function BatchLinesSection({ 
  existingBatchLines, 
  bundleItemCodes, 
  selBatch, 
  queryClient 
}) {
  const [showMissingWarnings, setShowMissingWarnings] = useState(true);

  if (existingBatchLines.length === 0) return null;

  return (
    <div className="space-y-1 flex-1 overflow-y-auto min-h-0">
      <div className="flex items-center justify-between sticky top-0 bg-white py-1 border-b border-slate-200">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Καταχωρημένες Γραμμές</p>
        {bundleItemCodes.length > 0 && (
          <button 
            onClick={() => setShowMissingWarnings(!showMissingWarnings)} 
            className="text-xs text-slate-500 px-1 hover:text-slate-700"
          >
            {showMissingWarnings ? "✓ Warn" : "○ Warn"}
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 px-1 sticky top-6 bg-white py-1">
        <span className="w-12 flex-shrink-0">Item</span>
        <div className="flex-1 flex gap-1">
          <span className="w-8 text-center flex-shrink-0">Sched.</span>
          <span className="w-12 text-center flex-shrink-0">Proc.</span>
          <span className="w-12 text-center flex-shrink-0">Good</span>
          <span className="w-12 text-center flex-shrink-0">Scrap</span>
          <span className="w-4 flex-shrink-0"></span>
        </div>
      </div>

      <div className="space-y-1">
        {existingBatchLines.map(bl => {
          const blCode = bl.item_code?.trim() || "";
          const isMissing = bundleItemCodes.length > 0 && !bundleItemCodes.includes(blCode);
          
          return (
            <div key={bl.id} className="flex items-center gap-1">
              <div className="flex items-center gap-1 w-12 flex-shrink-0">
                <span className="text-xs font-medium text-slate-700 truncate">{blCode}</span>
                {showMissingWarnings && isMissing && (
                   <TooltipProvider>
                     <Tooltip>
                       <TooltipTrigger asChild>
                         <AlertTriangle className="w-3 h-3 flex-shrink-0 text-red-600 cursor-help" />
                       </TooltipTrigger>
                       <TooltipContent>
                         <p>Item δεν υπάρχει στο bundle</p>
                       </TooltipContent>
                     </Tooltip>
                   </TooltipProvider>
                 )}
              </div>
              <ExistingLineRow 
                bl={bl}
                hideItemCode={true}
                onSave={async (id, data) => { 
                  await base44.entities.Batch_Lines.update(id, data); 
                  queryClient.invalidateQueries(["Batch_Lines", selBatch?.id]); 
                }}
                onDelete={async (id) => { 
                  await base44.entities.Batch_Lines.delete(id); 
                  queryClient.invalidateQueries(["Batch_Lines", selBatch?.id]); 
                  toast.success("Γραμμή διαγράφηκε"); 
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}