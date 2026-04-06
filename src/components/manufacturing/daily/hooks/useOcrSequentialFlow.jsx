import { useCallback } from 'react';

/**
 * Sequential OCR flow manager for multi-form processing
 * Handles: production -> teams_time
 * Returns helpers to advance flow, mark forms complete, and check next form
 */
export function useOcrSequentialFlow(
  loadOCRDataFromCache,
  setShowOcrModal,
  setShowTeamsTimeOcrModal,
  setViewProductionOcrResult,
  setViewTeamsTimeOcrResult,
  setCurrentProductionCacheId,
  setCurrentTeamsTimeCacheId,
  setOcrFormQueue,
  ocrFormQueue,
  ocrTargetAtt,
  addMsg,
  isPrePaint = false
) {
  // For Pre-paint, always enforce production -> teams_time order
  // For other depts, same order (no variation needed)
  const FORM_ORDER = ['production', 'teams_time'];

  const markFormComplete = useCallback((formType) => {
    if (!ocrTargetAtt?.id) return;
    setOcrFormQueue(prev => ({
      ...prev,
      [ocrTargetAtt.id]: {
        ...prev[ocrTargetAtt.id],
        completed: Array.from(new Set([...(prev[ocrTargetAtt.id]?.completed || []), formType]))
      }
    }));
  }, [ocrTargetAtt?.id, setOcrFormQueue]);

  const getNextForm = useCallback((queue) => {
    const completed = queue?.completed || [];
    for (const form of FORM_ORDER) {
      if (!completed.includes(form)) {
        return form;
      }
    }
    return null;
  }, []);

  const advanceToNextForm = useCallback(async (currentFormType) => {
    markFormComplete(currentFormType);
    
    // Close current modal
    if (currentFormType === 'production') {
      setShowOcrModal(false);
      setViewProductionOcrResult(null);
    } else if (currentFormType === 'teams_time') {
      setShowTeamsTimeOcrModal(false);
      setViewTeamsTimeOcrResult(null);
    }

    // Check what's next
    const queue = ocrTargetAtt?.id ? 
      { completed: Array.from(new Set([...(ocrFormQueue[ocrTargetAtt.id]?.completed || []), currentFormType])) } 
      : { completed: [currentFormType] };
    
    const nextForm = getNextForm(queue);

    if (nextForm === 'teams_time') {
      const teamsData = await loadOCRDataFromCache(ocrTargetAtt.id, 'teams_time');
      if (teamsData) {
        setCurrentTeamsTimeCacheId(teamsData.cache_id);
        setViewTeamsTimeOcrResult(teamsData);
      } else {
        setCurrentTeamsTimeCacheId(null);
        setViewTeamsTimeOcrResult({ team_persons: [], team_extra_lines: [] });
      }
      setShowTeamsTimeOcrModal(true);
    } else if (nextForm === 'production') {
      const prodData = await loadOCRDataFromCache(ocrTargetAtt.id, 'production');
      if (prodData) {
        setCurrentProductionCacheId(prodData.cache_id);
        setViewProductionOcrResult(prodData);
      } else {
        setCurrentProductionCacheId(null);
        setViewProductionOcrResult({ production_lines: [] });
      }
      setShowOcrModal(true);
    } else {
      // No more forms
      addMsg("bot", "✅ OCR flow ολοκληρώθηκε!");
    }
  }, [
    ocrTargetAtt,
    ocrFormQueue,
    markFormComplete,
    getNextForm,
    loadOCRDataFromCache,
    setShowOcrModal,
    setShowTeamsTimeOcrModal,
    setViewProductionOcrResult,
    setViewTeamsTimeOcrResult,
    setCurrentProductionCacheId,
    setCurrentTeamsTimeCacheId,
    addMsg
  ]);

  return {
    markFormComplete,
    getNextForm,
    advanceToNextForm
  };
}