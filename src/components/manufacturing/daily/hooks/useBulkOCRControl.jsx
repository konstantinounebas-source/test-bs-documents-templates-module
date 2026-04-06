import { useState, useRef, useCallback } from "react";
import { makeBulkOCRRunner } from "../chatbot/BulkOCRExecutor";

/**
 * Custom hook for managing bulk OCR with detailed tracking, selection, and stop capability.
 */
export function useBulkOCRControl(performOCRInBackground, addMsg, isMountedRef) {
  const [isBulkOcrRunning, setIsBulkOcrRunning] = useState(false);
  const [bulkOcrProgress, setBulkOcrProgress] = useState({ processed: 0, total: 0, completed: 0, failed: 0 });
  const [bulkOcrDetailedResults, setBulkOcrDetailedResults] = useState([]);
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState(new Set());
  const [missingOcrAttachmentDetails, setMissingOcrAttachmentDetails] = useState([]);
  
  const bulkOcrStopRequestedRef = useRef(false);

  /**
   * Detect attachments missing OCR.
   * Returns attachment-level details + grouped summary.
   */
  const detectMissingOCR = useCallback(
    (allBatchHeaders, allBatchAttachments, allOCRCacheRecords, filterDept, filterMonth) => {
      const batchesToCheck = (allBatchHeaders || [])
        .filter(b => !filterDept || b.department === filterDept)
        .filter(b => !filterMonth || (b.date && b.date.startsWith(filterMonth)));

      if (batchesToCheck.length === 0) return { grouped: [], details: [] };

      // Build cache lookup
      const cacheByAttId = {};
      for (const cache of allOCRCacheRecords) {
        if (!cacheByAttId[cache.attachment_id]) {
          cacheByAttId[cache.attachment_id] = { production: false, teams_time: false };
        }
        if (cache.form_type === "production" && cache.status === "completed") {
          cacheByAttId[cache.attachment_id].production = true;
        }
        if (cache.form_type === "teams_time" && cache.status === "completed") {
          cacheByAttId[cache.attachment_id].teams_time = true;
        }
      }

      // Build attachment-level list
      const attachmentDetails = [];
      const grouped = {};

      for (const batch of batchesToCheck) {
        const batchAtts = allBatchAttachments.filter(a => a.batch_header_id === batch.id);

        for (const att of batchAtts) {
          const cacheInfo = cacheByAttId[att.id];
          const missingProduction = !cacheInfo || !cacheInfo.production;
          const missingTeamsTime = !cacheInfo || !cacheInfo.teams_time;

          if (missingProduction || missingTeamsTime) {
            attachmentDetails.push({
              attachmentId: att.id,
              fileName: att.file_name,
              date: batch.date,
              department: batch.department,
              batchHeaderId: batch.id,
              missingProduction,
              missingTeamsTime
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
   * These are looked up from allBatchAttachments by selected detail items' attachmentIds.
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
    const completed = { count: 0 };
    const failed = { count: 0 };

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
            return;
          }

          try {
            results.push({
              attachmentId: att.id,
              fileName: att.file_name,
              status: "processing"
            });

            // Pass FULL attachment object (id, file_url, file_name, batch_header_id, department)
            // performOCRInBackground will throw on error
            await performOCRInBackground(att);

            // Only reached if performOCRInBackground succeeds (does not throw)
            const idx = results.findIndex(r => r.attachmentId === att.id);
            if (idx >= 0) {
              results[idx].status = "completed";
              completed.count++;
            }
            addMsg("bot", `✅ ${att.file_name}`);
          } catch (err) {
            // Mark as failed when performOCRInBackground throws
            const idx = results.findIndex(r => r.attachmentId === att.id);
            if (idx >= 0) {
              results[idx].status = "failed";
              results[idx].error = err?.message || "Unknown error";
              failed.count++;
            }
            addMsg("bot", `❌ ${att.file_name} — ${err?.message || "OCR failed"}`);
          } finally {
            if (isMountedRef.current) {
              setBulkOcrProgress(p => ({ ...p, processed: p.processed + 1 }));
            }
          }
        });

        await Promise.allSettled(promises);
      }

      if (isMountedRef.current) {
        setBulkOcrDetailedResults(results);
        const skipped = results.filter(r => r.status === "skipped").length;
        if (bulkOcrStopRequestedRef.current) {
          addMsg("bot", `⏹ Stopped bulk OCR. ${completed.count} ✅ completed, ${failed.count} ❌ failed, ${skipped} skipped.`);
        } else {
          addMsg("bot", `✅ Bulk OCR complete. ${completed.count} ✅ completed, ${failed.count} ❌ failed.`);
        }
        setIsBulkOcrRunning(false);
      }
    } catch (error) {
      if (isMountedRef.current) {
        addMsg("bot", `❌ Bulk OCR error: ${error?.message || "Unknown error"}`);
        setIsBulkOcrRunning(false);
      }
    }
  }, [performOCRInBackground, addMsg, isMountedRef]);

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