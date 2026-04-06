import { useState, useRef, useCallback } from "react";
import { makeBulkOCRRunner } from "../chatbot/BulkOCRExecutor";

/**
 * Custom hook for managing bulk OCR with detailed tracking, selection, and stop capability.
 */
export function useBulkOCRControl(performOCRInBackground, addMsg, isMountedRef, queryClient) {
  const [isBulkOcrRunning, setIsBulkOcrRunning] = useState(false);
  const [bulkOcrProgress, setBulkOcrProgress] = useState({ processed: 0, total: 0, completed: 0, failed: 0 });
  const [bulkOcrDetailedResults, setBulkOcrDetailedResults] = useState([]);
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState(new Set());
  const [missingOcrAttachmentDetails, setMissingOcrAttachmentDetails] = useState([]);
  
  const bulkOcrStopRequestedRef = useRef(false);

  /**
   * Detect attachments missing OCR.
   * FIXED: Only flag as missing if NO OCR cache records exist for that attachment.
   * Returns attachment-level details + grouped summary.
   */
  const detectMissingOCR = useCallback(
    (allBatchHeaders, allBatchAttachments, allOCRCacheRecords, filterDept, filterMonth) => {
      const batchesToCheck = (allBatchHeaders || [])
        .filter(b => !filterDept || b.department === filterDept)
        .filter(b => !filterMonth || (b.date && b.date.startsWith(filterMonth)));

      if (batchesToCheck.length === 0) return { grouped: [], details: [] };

      // Build cache lookup: has ANY completed cache record
      const cacheByAttId = new Set();
      for (const cache of allOCRCacheRecords) {
        if (cache.status === "completed") {
          cacheByAttId.add(cache.attachment_id);
        }
      }

      // Build attachment-level list
      const attachmentDetails = [];
      const grouped = {};

      for (const batch of batchesToCheck) {
        const batchAtts = allBatchAttachments.filter(a => a.batch_header_id === batch.id);

        for (const att of batchAtts) {
          // Only flag as missing if it has NO completed OCR cache records
          const hasOCR = cacheByAttId.has(att.id);

          if (!hasOCR) {
            attachmentDetails.push({
              attachmentId: att.id,
              fileName: att.file_name,
              date: batch.date,
              department: batch.department,
              batchHeaderId: batch.id
            });

            const key = `${batch.date}__${batch.department}`;
            if (!grouped[key]) {
              grouped[key] = { date: batch.date, department: batch.department, attachmentsWithoutOCRCount: 0 };
            }
            grouped[key].attachmentsWithoutOCRCount++;
          }
        }
      }

      return { grouped: Object.values(grouped), details: attachmentDetails };
    },
    []
  );

  /**
   * Execute bulk OCR for selected attachments with concurrency limit (3 at a time).
   * INPUT: fullAttachments - FULL attachment objects from database (with id, file_url, file_name, batch_header_id, department)
   * 
   * FIXED ISSUES:
   * - Now accepts result object from performOCRInBackground with status field
   * - Updates progress.completed and progress.failed LIVE during execution (not just at end)
   * - Classifies results: completed, failed, no_valid_forms
   * - Calls with silentBulk: true to avoid duplicate chat messages
   */
  const executeSelectedBulkOCR = useCallback(async (fullAttachments) => {
    if (!fullAttachments || fullAttachments.length === 0) {
      addMsg("bot", "⚠️ No attachments selected for OCR.");
      return;
    }

    setIsBulkOcrRunning(true);
    bulkOcrStopRequestedRef.current = false;
    setBulkOcrProgress({ processed: 0, total: fullAttachments.length, completed: 0, failed: 0 });
    setBulkOcrDetailedResults([]);
    addMsg("bot", `⏳ Started bulk OCR for ${fullAttachments.length} attachments (3 concurrent)...`);

    const results = [];

    try {
      // Process with concurrency limit (3 at a time)
      const concurrency = 3;
      for (let i = 0; i < fullAttachments.length; i += concurrency) {
        // Check stop signal before processing next batch
        if (bulkOcrStopRequestedRef.current) {
          break;
        }

        const batch = fullAttachments.slice(i, i + concurrency);
        const promises = batch.map(async (att) => {
          if (bulkOcrStopRequestedRef.current) {
            // Mark as skipped if stop was requested
            results.push({
              attachmentId: att.id,
              fileName: att.file_name,
              status: "skipped"
            });
            if (isMountedRef.current) {
              setBulkOcrProgress(p => ({ ...p, processed: p.processed + 1 }));
            }
            return;
          }

          try {
            // Pass FULL attachment object with silentBulk flag
            const result = await performOCRInBackground(att, { silentBulk: true });

            // Classify result status
            const resultEntry = {
              attachmentId: att.id,
              fileName: att.file_name,
              status: result?.status || "completed",
              message: result?.message
            };

            results.push(resultEntry);

            // Update progress and log based on status
            if (result?.status === "no_valid_forms") {
              addMsg("bot", `⚠️ ${att.file_name} — ${result.message || "Δεν ανιχνεύθηκαν έγκυρες φόρμες"}`);
              if (isMountedRef.current) {
                setBulkOcrProgress(p => ({ ...p, processed: p.processed + 1 }));
              }
            } else if (result?.status === "completed" || !result?.status) {
              addMsg("bot", `✅ ${att.file_name} — OCR completed`);
              if (isMountedRef.current) {
                setBulkOcrProgress(p => ({ ...p, processed: p.processed + 1, completed: p.completed + 1 }));
              }
            } else {
              // Failed
              addMsg("bot", `❌ ${att.file_name} — ${result?.message || "OCR failed"}`);
              if (isMountedRef.current) {
                setBulkOcrProgress(p => ({ ...p, processed: p.processed + 1, failed: p.failed + 1 }));
              }
            }
          } catch (err) {
            // Handle thrown errors
            results.push({
              attachmentId: att.id,
              fileName: att.file_name,
              status: "failed",
              error: err?.message || "Unknown error"
            });
            addMsg("bot", `❌ ${att.file_name} — ${err?.message || "OCR failed"}`);
            if (isMountedRef.current) {
              setBulkOcrProgress(p => ({ ...p, processed: p.processed + 1, failed: p.failed + 1 }));
            }
          }
        });

        await Promise.allSettled(promises);
      }

      if (isMountedRef.current) {
        setBulkOcrDetailedResults(results);
        const completed = results.filter(r => r.status === "completed").length;
        const failed = results.filter(r => r.status === "failed").length;
        const skipped = results.filter(r => r.status === "skipped").length;
        const noValidForms = results.filter(r => r.status === "no_valid_forms").length;

        let summary = `✅ Bulk OCR complete. ${completed} completed`;
        if (failed > 0) summary += `, ${failed} ❌ failed`;
        if (noValidForms > 0) summary += `, ${noValidForms} ⚠️ no valid forms`;
        if (skipped > 0) summary += `, ${skipped} skipped`;

        if (bulkOcrStopRequestedRef.current) {
          addMsg("bot", `⏹ ${summary}`);
        } else {
          addMsg("bot", summary);
        }
        // After bulk OCR completes, refresh OCR cache for next missing detection
        if (queryClient) {
          queryClient.invalidateQueries(["OCRCache-All"]);
        }
        setIsBulkOcrRunning(false);
      }
    } catch (error) {
      if (isMountedRef.current) {
        addMsg("bot", `❌ Bulk OCR error: ${error?.message || "Unknown error"}`);
        setIsBulkOcrRunning(false);
      }
    }
  }, [performOCRInBackground, addMsg, isMountedRef, queryClient]);

  /**
   * Stop bulk OCR (marks remaining as skipped, doesn't kill running promises).
   */
  const stopBulkOCR = useCallback(() => {
    bulkOcrStopRequestedRef.current = true;
    addMsg("bot", "⏹ Stopping bulk OCR... (current operations will finish)");
  }, [addMsg]);

  return {
    isBulkOcrRunning,
    bulkOcrProgress,
    bulkOcrDetailedResults,
    selectedAttachmentIds,
    setSelectedAttachmentIds,
    missingOcrAttachmentDetails,
    setMissingOcrAttachmentDetails,
    detectMissingOCR,
    executeSelectedBulkOCR,
    stopBulkOCR
  };
}