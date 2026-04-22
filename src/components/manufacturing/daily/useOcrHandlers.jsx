import { useMemo } from "react";
import {
  createOcrConfirmHandler,
  createOcrSkipHandler,
  createTeamsTimeConfirmHandler,
  createTeamsTimeSkipHandler,
  createSubAssemblyConfirmHandler,
  createSubAssemblySkipHandler
} from "./chatbot/ocrFlowHandlers";

/**
 * Custom hook to create all OCR form handlers
 * Memoized to avoid recreation on every render
 */
export function useOcrHandlers({
  addMsg,
  selBatch,
  selDept,
  currentProductionCacheId,
  currentTeamsTimeCacheId,
  currentSubAssemblyCacheId,
  advanceToNextForm,
  queryClient
}) {
  return useMemo(() => ({
    handleOcrConfirm: createOcrConfirmHandler({
      addMsg,
      selBatch,
      currentProductionCacheId,
      advanceToNextForm,
      queryClient
    }),
    handleOcrSkip: createOcrSkipHandler({
      addMsg,
      advanceToNextForm,
      isDeptPrePaint: selDept === "Pre-paint"
    }),
    handleTeamsTimeOcrConfirm: createTeamsTimeConfirmHandler({
      addMsg,
      selBatch,
      currentTeamsTimeCacheId,
      advanceToNextForm,
      queryClient
    }),
    handleTeamsTimeOcrSkip: createTeamsTimeSkipHandler({
      addMsg,
      advanceToNextForm,
      isDeptPrePaint: selDept === "Pre-paint"
    }),
    handleSubAssemblyOcrConfirm: createSubAssemblyConfirmHandler({
      addMsg,
      selBatch,
      currentSubAssemblyCacheId,
      advanceToNextForm,
      queryClient
    }),
    handleSubAssemblyOcrSkip: createSubAssemblySkipHandler({
      addMsg,
      advanceToNextForm
    })
  }), [addMsg, selBatch, selDept, currentProductionCacheId, currentTeamsTimeCacheId, currentSubAssemblyCacheId, advanceToNextForm, queryClient]);
}