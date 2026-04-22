import { saveOCRData } from './ocrSave';
import { saveOCRTeamsTimeData } from './ocrTeamsTimeSave';
import { saveCorrectedOCRCacheData } from '@/lib/ocrCacheService';

/**
 * OCR Confirm handlers for sequential form processing
 * Handles: confirm, skip with proper state cleanup and form advance
 */

export function createOcrConfirmHandler({
  addMsg,
  selBatch,
  currentProductionCacheId,
  advanceToNextForm,
  queryClient
}) {
  return async (confirmedData) => {
    addMsg("bot", 
      `✅ OCR επιβεβαιώθηκε! Αποθηκεύω ${confirmedData.production_lines?.length || 0} γραμμές...`
    );

    if (currentProductionCacheId) {
      saveCorrectedOCRCacheData(currentProductionCacheId, confirmedData).catch(() => {});
    }

    if (selBatch?.id) {
      await new Promise(resolve => {
        saveOCRData(confirmedData, selBatch.id, () => {
          queryClient.invalidateQueries(["Batch_Lines", selBatch.id]);
          queryClient.invalidateQueries(["QC_Initial_Stock", selBatch.id]);
          queryClient.invalidateQueries(["Operations", selBatch.id]);
          addMsg("bot", `📦 Production δεδομένα αποθηκεύτηκαν.`);
          resolve();
        });
      });
    }

    await advanceToNextForm('production');
  };
}

export function createOcrSkipHandler({
  addMsg,
  advanceToNextForm,
  isDeptPrePaint = false
}) {
  return async () => {
    if (isDeptPrePaint) {
      // Pre-paint: skip production and go to teams time
      addMsg("bot", "✅ Production φόρμα παραλείφθηκε (δεν αποθηκεύτηκαν δεδομένα).");
      await advanceToNextForm('production');
    } else {
      // Other depts: should not show production form at all
      // This is defensive — shouldn't reach here
      addMsg("bot", "✅ Εκκίνηση Teams Time φόρμας...");
      await advanceToNextForm('teams_time_skip');
    }
  };
}

export function createTeamsTimeConfirmHandler({
  addMsg,
  selBatch,
  currentTeamsTimeCacheId,
  advanceToNextForm,
  queryClient
}) {
  return async (confirmedData) => {
    addMsg("bot", `✅ Teams Time OCR επιβεβαιώθηκε! Αποθηκεύω...`);

    if (currentTeamsTimeCacheId) {
      saveCorrectedOCRCacheData(currentTeamsTimeCacheId, confirmedData).catch(() => {});
    }

    if (selBatch?.id) {
      await new Promise(resolve => {
        saveOCRTeamsTimeData(confirmedData, selBatch.id, () => {
          queryClient.invalidateQueries(["TeamTimePerson", selBatch.id]);
          queryClient.invalidateQueries(["Team_Time_Extra", selBatch.id]);
          addMsg("bot", `📦 Teams Time δεδομένα αποθηκεύτηκαν.`);
          resolve();
        }, selBatch.department);
      });
    }

    await advanceToNextForm('teams_time');
  };
}

export function createTeamsTimeSkipHandler({
  addMsg,
  advanceToNextForm,
  isDeptPrePaint = false
}) {
  return async () => {
    // Same handler for all depts - mark teams_time as complete
    addMsg("bot", "✅ Teams Time φόρμα παραλείφθηκε (δεν αποθηκεύτηκαν δεδομένα).");
    await advanceToNextForm('teams_time');
  };
}