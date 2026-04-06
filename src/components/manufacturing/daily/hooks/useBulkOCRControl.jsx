import { useState, useRef, useCallback } from "react";
/**
 * Custom hook for managing bulk OCR with detailed tracking, selection, and stop capability.
 */
export function useBulkOCRControl(performOCRInBackground, addMsg, isMountedRef, queryClient) {
  const [isBulkOcrRunning, setIsBulkOcrRunning] = useState(false);
  // IMPROVEMENT #7: Enhanced progress breakdown (completed/failed/no_valid_forms/skipped)
  const [bulkOcrProgress, setBulkOcrProgress] = useState({ 
    processed: 0, 
    total: 0, 
    completed: 0, 
    failed: 0,
    no_valid_forms: 0,
    skipped: 0
  });
  const [bulkOcrDetailedResults, setBulkOcrDetailedResults] = useState([]);
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState(new Set());
  const [missingOcrAttachmentDetails, setMissingOcrAttachmentDetails] = useState([]);
  
  const bulkOcrStopRequestedRef = useRef(false);
  // IMPROVEMENT #6: Guard against concurrent duplicate OCR runs
  const processingAttachmentIdsRef = useRef(new Set());

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
    // IMPROVEMENT #7: Initialize all progress counters
    setBulkOcrProgress({ 
      processed: 0, 
      total: fullAttachments.length, 
      completed: 0, 
      failed: 0,
      no_valid_forms: 0,
      skipped: 0
    });
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
            // Mark as skipped if stop was requested — must include batchHeaderId for consistency
            results.push({
              attachmentId: att.id,
              fileName: att.file_name,
              batchHeaderId: att.batch_header_id,
              status: "skipped"
            });
            if (isMountedRef.current) {
              setBulkOcrProgress(p => ({ ...p, processed: p.processed + 1, skipped: p.skipped + 1 }));
            }
            return;
          }

          try {
            // IMPROVEMENT #6: Guard against concurrent duplicate OCR runs
            if (processingAttachmentIdsRef.current.has(att.id)) {
              // Skip if already being processed — must include batchHeaderId for consistency
              results.push({
                attachmentId: att.id,
                fileName: att.file_name,
                batchHeaderId: att.batch_header_id,
                status: "skipped",
                message: "Already being processed"
              });
              if (isMountedRef.current) {
                setBulkOcrProgress(p => ({ ...p, processed: p.processed + 1, skipped: p.skipped + 1 }));
              }
              return;
            }

            processingAttachmentIdsRef.current.add(att.id);

            // Pass FULL attachment object with silentBulk flag
            const result = await performOCRInBackground(att, { silentBulk: true });

            // IMPROVEMENT #2: Validate that success means actual result was produced
            const actualStatus = result?.status || "unknown";
            // Map undefined status to failed if no cache IDs exist
            const finalStatus = !result?.status && !result?.productionCacheId && !result?.teamsTimeCacheId 
              ? "failed" 
              : actualStatus;

            // FIX #2: Include batchHeaderId in every result entry
            const resultEntry = {
              attachmentId: att.id,
              fileName: att.file_name,
              batchHeaderId: att.batch_header_id,
              status: finalStatus,
              message: result?.message,
              // IMPROVEMENT #7: Track duration for observability
              duration: result?.duration
            };

            results.push(resultEntry);

            // IMPROVEMENT #7: Update progress with detailed breakdown
            if (finalStatus === "no_valid_forms") {
              addMsg("bot", `⚠️ ${att.file_name} — ${result.message || "Δεν ανιχνεύθηκαν έγκυρες φόρμες"}`);
              if (isMountedRef.current) {
                setBulkOcrProgress(p => ({ ...p, processed: p.processed + 1, no_valid_forms: p.no_valid_forms + 1 }));
              }
            } else if (finalStatus === "completed") {
              addMsg("bot", `✅ ${att.file_name} — OCR completed${result?.duration ? ` (${result.duration}ms)` : ""}`);
              if (isMountedRef.current) {
                setBulkOcrProgress(p => ({ ...p, processed: p.processed + 1, completed: p.completed + 1 }));
              }
            } else if (finalStatus === "skipped") {
              // Silent skip (already processing)
              if (isMountedRef.current) {
                setBulkOcrProgress(p => ({ ...p, processed: p.processed + 1, skipped: p.skipped + 1 }));
              }
            } else {
              // Failed
              addMsg("bot", `❌ ${att.file_name} — ${result?.message || "OCR failed"}`);
              if (isMountedRef.current) {
                setBulkOcrProgress(p => ({ ...p, processed: p.processed + 1, failed: p.failed + 1 }));
              }
            }
          } catch (err) {
            // IMPROVEMENT #3 #7: Log failures with structured info
            const errorMsg = err?.message || "Unknown error";
            console.error(`[BulkOCR] Failed ${att.id} | error=${errorMsg}`);

            // Handle thrown errors
            results.push({
              attachmentId: att.id,
              fileName: att.file_name,
              batchHeaderId: att.batch_header_id,
              status: "failed",
              error: errorMsg
            });
            addMsg("bot", `❌ ${att.file_name} — ${errorMsg}`);
            if (isMountedRef.current) {
              setBulkOcrProgress(p => ({ ...p, processed: p.processed + 1, failed: p.failed + 1 }));
            }
          } finally {
            processingAttachmentIdsRef.current.delete(att.id);
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

        // IMPROVEMENT #7: Detailed summary with all status categories
        let summary = `✅ Bulk OCR complete: ${completed} completed`;
        if (failed > 0) summary += ` | ${failed} ❌ failed`;
        if (noValidForms > 0) summary += ` | ${noValidForms} ⚠️ no forms`;
        if (skipped > 0) summary += ` | ${skipped} skipped`;

        if (bulkOcrStopRequestedRef.current) {
          addMsg("bot", `⏹ ${summary}`);
        } else {
          addMsg("bot", summary);
        }

        // IMPROVEMENT #5: Invalidate multiple caches for consistent state
        if (queryClient) {
          queryClient.invalidateQueries({ queryKey: ["OCRCache-All"], exact: true });
          queryClient.invalidateQueries({ queryKey: ["BatchAttachments-All"], exact: true });
          // FIX #2: Correctly extract unique batch IDs from results
          const activeBatchIds = [...new Set(
            results.map(r => r.batchHeaderId).filter(Boolean)
          )];
          if (activeBatchIds.length > 0) {
            activeBatchIds.forEach(bid => {
              queryClient.invalidateQueries({ queryKey: ["BatchAttachments", bid], exact: true });
            });
          }
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