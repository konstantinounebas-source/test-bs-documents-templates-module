import { useState, useCallback } from 'react';

/**
 * Custom hook managing OCR form queue and flow without stale state issues.
 */
export function useOcrFlow(loadOCRDataFromCache, addMsg) {
  const [ocrTargetAtt, setOcrTargetAtt] = useState(null);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [currentProductionCacheId, setCurrentProductionCacheId] = useState(null);
  const [viewProductionOcrResult, setViewProductionOcrResult] = useState(null);
  const [showTeamsTimeOcrModal, setShowTeamsTimeOcrModal] = useState(false);
  const [currentTeamsTimeCacheId, setCurrentTeamsTimeCacheId] = useState(null);
  const [viewTeamsTimeOcrResult, setViewTeamsTimeOcrResult] = useState(null);
  const [ocrFormQueue, setOcrFormQueue] = useState({});
  const [showManualFormDialog, setShowManualFormDialog] = useState(false);

  // Helper: get next form without reading stale state
  const getNextForm = useCallback((queue, completedForm) => {
    if (!queue) return null;
    const remaining = queue.detected.filter(
      f => f !== completedForm && !queue.completed.includes(f)
    );
    return remaining.length ? remaining[0] : null;
  }, []);

  // Advance to next form in queue or close if all done
  const advanceOcrFlow = useCallback(async (completedForm) => {
    if (!ocrTargetAtt) return;
    
    // Mark form as completed FIRST (use current state)
    setOcrFormQueue(prev => {
      const updatedQueue = {
        ...prev[ocrTargetAtt.id],
        completed: [...(prev[ocrTargetAtt.id]?.completed || []), completedForm]
      };
      
      const nextForm = getNextForm(updatedQueue, completedForm);
      
      if (!nextForm) {
        // All forms processed
        setShowOcrModal(false);
        setShowTeamsTimeOcrModal(false);
        setOcrTargetAtt(null);
        addMsg("bot", "🎉 Όλες οι διαθέσιμες φόρμες έχουν ολοκληρωθεί.");
        return prev;
      }
      
      // Load next form data
      (async () => {
        if (nextForm === 'production') {
          setShowTeamsTimeOcrModal(false);
          const prodData = await loadOCRDataFromCache(ocrTargetAtt.id, 'production');
          if (prodData) {
            setCurrentProductionCacheId(prodData.cache_id);
            setViewProductionOcrResult(prodData);
            setShowOcrModal(true);
          } else {
            setShowManualFormDialog(true);
          }
        } else if (nextForm === 'teams_time') {
          setShowOcrModal(false);
          const teamsData = await loadOCRDataFromCache(ocrTargetAtt.id, 'teams_time');
          if (teamsData) {
            setCurrentTeamsTimeCacheId(teamsData.cache_id);
            setViewTeamsTimeOcrResult(teamsData);
            setShowTeamsTimeOcrModal(true);
          } else {
            setShowManualFormDialog(true);
          }
        }
      })();
      
      return { ...prev, [ocrTargetAtt.id]: updatedQueue };
    });
  }, [ocrTargetAtt, getNextForm, addMsg, loadOCRDataFromCache]);

  return {
    ocrTargetAtt,
    setOcrTargetAtt,
    showOcrModal,
    setShowOcrModal,
    currentProductionCacheId,
    setCurrentProductionCacheId,
    viewProductionOcrResult,
    setViewProductionOcrResult,
    showTeamsTimeOcrModal,
    setShowTeamsTimeOcrModal,
    currentTeamsTimeCacheId,
    setCurrentTeamsTimeCacheId,
    viewTeamsTimeOcrResult,
    setViewTeamsTimeOcrResult,
    ocrFormQueue,
    setOcrFormQueue,
    showManualFormDialog,
    setShowManualFormDialog,
    advanceOcrFlow,
    getNextForm
  };
}