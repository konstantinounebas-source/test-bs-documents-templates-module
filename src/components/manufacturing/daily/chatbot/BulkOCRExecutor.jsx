// Inline bulk OCR runner factory
export const makeBulkOCRRunner = (performOCRInBackground, addMsg, setBulkOcrProgress, setIsBulkOcrRunning, isMountedRef, allBatchAttachments, allOCRCacheRecords) => {
  return async () => {
    setIsBulkOcrRunning(true);
    addMsg("bot", "🔍 Starting bulk OCR...");
    const cacheByAttId = {};
    for (const cache of allOCRCacheRecords) {
      if (!cacheByAttId[cache.attachment_id]) cacheByAttId[cache.attachment_id] = { production: false, teams_time: false };
      if (cache.form_type === "production" && cache.status === "completed") cacheByAttId[cache.attachment_id].production = true;
      if (cache.form_type === "teams_time" && cache.status === "completed") cacheByAttId[cache.attachment_id].teams_time = true;
    }
    const missing = allBatchAttachments.filter(a => { const c = cacheByAttId[a.id]; return (!c || !c.production) && (!c || !c.teams_time); });
    if (missing.length === 0) { addMsg("bot", "✅ No missing OCR."); setIsBulkOcrRunning(false); return; }
    setBulkOcrProgress({ processed: 0, total: missing.length });
    addMsg("bot", `⏳ Processing ${missing.length} attachments (3 concurrent)...`);
    for (let i = 0; i < missing.length; i += 3) {
      const batch = missing.slice(i, i + 3);
      await Promise.allSettled(batch.map(a => performOCRInBackground(a).then(() => setBulkOcrProgress(p => ({ ...p, processed: p.processed + 1 })))));
    }
    if (isMountedRef.current) { setBulkOcrProgress({ processed: 0, total: 0 }); addMsg("bot", `✅ Bulk OCR done (${missing.length} processed).`); setIsBulkOcrRunning(false); }
  };
};