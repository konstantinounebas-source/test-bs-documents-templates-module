import { useCallback } from 'react';

/**
 * Sequential OCR flow manager for multi-form processing
 * Handles: production -> sub_assembly -> teams_time (Pre-paint)
 *          teams_time only (Other depts)
 * Returns helpers to advance flow, mark forms complete, and check next form
 */
export function useOcrSequentialFlow(
  loadOCRDataFromCache,
  setShowOcrModal,
  setShowTeamsTimeOcrModal,
  setViewProductionOcrResult,
  setViewTeamsTimeOcrResult,
  setShowSubAssemblyModal,
  setViewSubAssemblyOcrResult,
  setCurrentProductionCacheId,
  setCurrentTeamsTimeCacheId,
  setCurrentSubAssemblyCacheId,
  setOcrFormQueue,
  ocrFormQueue,
  ocrTargetAtt,
  setOcrTargetAtt,
  addMsg
) {
  // CRITICAL: Form order depends on the attachment's department
  // Pre-paint: production -> teams_time
  // Sub-assembly: sub_assembly -> teams_time
  // Other depts: only teams_time
  const getDeptAndFormOrder = () => {
    const dept = ocrTargetAtt?.department || "Other";
    let order = ['teams_time'];
    
    if (dept === "Pre-paint") {
      order = ['production', 'teams_time'];
    } else if (dept === "Sub-assembly") {
      order = ['sub_assembly', 'teams_time'];
    }
    
    return { dept, order };
  };

  const { dept, order: FORM_ORDER } = getDeptAndFormOrder();

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
  }, [FORM_ORDER, ocrTargetAtt?.id, ocrTargetAtt?.department]);

  const advanceToNextForm = useCallback(async (currentFormType) => {
    // Close current modal
    if (currentFormType === 'production') {
      setShowOcrModal(false);
      setViewProductionOcrResult(null);
    } else if (currentFormType === 'sub_assembly') {
      setShowSubAssemblyModal(false);
      setViewSubAssemblyOcrResult(null);
    } else if (currentFormType === 'teams_time') {
      setShowTeamsTimeOcrModal(false);
      setViewTeamsTimeOcrResult(null);
    }

    // Mark form as complete
    markFormComplete(currentFormType);

    // Calculate next form by adding currentForm to completed list
    const attachmentId = ocrTargetAtt?.id;
    const currentCompleted = ocrFormQueue[attachmentId]?.completed || [];
    const updatedCompleted = Array.from(new Set([...currentCompleted, currentFormType]));
    const queue = { completed: updatedCompleted };
    
    const nextForm = getNextForm(queue);

    if (nextForm === 'teams_time') {
      // Clear other forms
      setCurrentProductionCacheId(null);
      setCurrentSubAssemblyCacheId(null);
      setViewProductionOcrResult(null);
      setViewSubAssemblyOcrResult(null);
      
      const teamsData = await loadOCRDataFromCache(ocrTargetAtt.id, 'teams_time');
      if (teamsData) {
        setCurrentTeamsTimeCacheId(teamsData.cache_id);
        setViewTeamsTimeOcrResult(teamsData);
      } else {
        setCurrentTeamsTimeCacheId(null);
        setViewTeamsTimeOcrResult({ team_persons: [], team_extra_lines: [] });
      }
      setShowTeamsTimeOcrModal(true);
    } else if (nextForm === 'sub_assembly') {
      // Clear other forms
      setCurrentProductionCacheId(null);
      setCurrentTeamsTimeCacheId(null);
      setViewProductionOcrResult(null);
      setViewTeamsTimeOcrResult(null);
      
      const subData = await loadOCRDataFromCache(ocrTargetAtt.id, 'sub_assembly');
      if (subData) {
        setCurrentSubAssemblyCacheId(subData.cache_id);
        setViewSubAssemblyOcrResult(subData);
      } else {
        setCurrentSubAssemblyCacheId(null);
        setViewSubAssemblyOcrResult({ sub_assembly_entries: [] });
      }
      setShowSubAssemblyModal(true);
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
      // No more forms - cleanup
      setCurrentProductionCacheId(null);
      setCurrentSubAssemblyCacheId(null);
      setCurrentTeamsTimeCacheId(null);
      setOcrTargetAtt(null);
      addMsg("bot", "✅ OCR flow ολοκληρώθηκε! Όλες οι φόρμες έχουν ολοκληρωθεί.");
    }
  }, [
    ocrTargetAtt,
    ocrFormQueue,
    markFormComplete,
    getNextForm,
    loadOCRDataFromCache,
    setShowOcrModal,
    setShowSubAssemblyModal,
    setShowTeamsTimeOcrModal,
    setViewProductionOcrResult,
    setViewSubAssemblyOcrResult,
    setViewTeamsTimeOcrResult,
    setCurrentProductionCacheId,
    setCurrentSubAssemblyCacheId,
    setCurrentTeamsTimeCacheId,
    setOcrTargetAtt,
    addMsg,
    FORM_ORDER
  ]);

  return {
    markFormComplete,
    getNextForm,
    advanceToNextForm
  };
}