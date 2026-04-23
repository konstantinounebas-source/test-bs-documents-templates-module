import { useCallback } from 'react';

/**
 * Hook that manages opening OCR verification forms for production, sub_assembly, and teams_time
 * Ensures department is always set on the attachment for sequential flow detection
 */
export function useOcrFormOpeners(
  loadOCRDataFromCache,
  setOcrTargetAtt,
  setOcrFormQueue,
  setCurrentProductionCacheId,
  setViewProductionOcrResult,
  setShowOcrModal,
  setCurrentSubAssemblyCacheId,
  setViewSubAssemblyOcrResult,
  setShowSubAssemblyModal,
  setCurrentTeamsTimeCacheId,
  setViewTeamsTimeOcrResult,
  setShowTeamsTimeOcrModal,
  selDept
) {
  const openProductionForm = useCallback(async (att) => {
    if (!att?.id) return;
    const effectiveDept = att?.department || selDept || "Pre-paint";
    const attWithDept = { ...att, department: effectiveDept };
    setOcrTargetAtt(attWithDept);
    
    // For Pre-paint, initialize sequential flow queue
    if (effectiveDept === "Pre-paint") {
      setOcrFormQueue(prev => ({
        ...prev,
        [attWithDept.id]: { completed: [] }
      }));
    }
    
    // CRITICAL: Always load data first before showing modal
    const prodData = await loadOCRDataFromCache(attWithDept.id, "production");
    if (prodData) {
      setCurrentProductionCacheId(prodData.cache_id);
      setViewProductionOcrResult(prodData);
    } else {
      setCurrentProductionCacheId(null);
      // Default empty template
      setViewProductionOcrResult({
        extracted_data: { 
          production_lines: [],
          pages: [{ production_lines: [] }]
        },
        validation: { issues: [], confidence_score: null },
        file_page_count: 1,
        page_count: 1
      });
    }
    // Show modal after data is ready
    setShowOcrModal(true);
  }, [loadOCRDataFromCache, selDept, setOcrTargetAtt, setOcrFormQueue, setCurrentProductionCacheId, setViewProductionOcrResult, setShowOcrModal]);

  const openSubAssemblyForm = useCallback(async (att) => {
    if (!att?.id) return;
    const effectiveDept = att?.department || selDept || "Sub-assembly";
    const attWithDept = { ...att, department: effectiveDept };
    setOcrTargetAtt(attWithDept);
    
    // Initialize sequential flow queue for Sub-assembly
    setOcrFormQueue(prev => ({
      ...prev,
      [attWithDept.id]: { completed: [] }
    }));
    
    // CRITICAL: Load data before showing modal
    const subData = await loadOCRDataFromCache(attWithDept.id, "sub_assembly");
    if (subData) {
      setCurrentSubAssemblyCacheId(subData.cache_id);
      setViewSubAssemblyOcrResult(subData);
    } else {
      setCurrentSubAssemblyCacheId(null);
      setViewSubAssemblyOcrResult({
        extracted_data: { 
          sub_assembly_entries: [],
          pages: [{ sub_assembly_entries: [] }]
        },
        validation: { issues: [], confidence_score: null },
        file_page_count: 1,
        page_count: 1
      });
    }
    // Show modal after data is ready
    setShowSubAssemblyModal(true);
  }, [loadOCRDataFromCache, selDept, setOcrTargetAtt, setOcrFormQueue, setCurrentSubAssemblyCacheId, setViewSubAssemblyOcrResult, setShowSubAssemblyModal]);

  const openTeamsTimeForm = useCallback(async (att) => {
    if (!att?.id) return;
    const effectiveDept = att?.department || selDept || "teams_time";
    const attWithDept = { ...att, department: effectiveDept };
    setOcrTargetAtt(attWithDept);
    
    // CRITICAL: Load data before showing modal
    const teamsData = await loadOCRDataFromCache(attWithDept.id, "teams_time");
    if (teamsData) {
      setCurrentTeamsTimeCacheId(teamsData.cache_id);
      setViewTeamsTimeOcrResult(teamsData);
    } else {
      setCurrentTeamsTimeCacheId(null);
      setViewTeamsTimeOcrResult({
        extracted_data: {
          team_persons: [],
          team_extra_lines: [],
          date: "",
          team: effectiveDept,
          pages: [{ team_persons: [], team_extra_lines: [] }]
        },
        validation: { issues: [], confidence_score: null },
        file_page_count: 1,
        page_count: 1
      });
    }
    // Show modal after data is ready
    setShowTeamsTimeOcrModal(true);
  }, [loadOCRDataFromCache, selDept, setOcrTargetAtt, setCurrentTeamsTimeCacheId, setViewTeamsTimeOcrResult, setShowTeamsTimeOcrModal]);

  return {
    openProductionForm,
    openSubAssemblyForm,
    openTeamsTimeForm
  };
}