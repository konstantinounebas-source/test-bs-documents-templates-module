import { useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { checkOCRCacheStatus } from "@/lib/ocrCacheService";
import { ocrWithCache } from "@/functions/ocrWithCache";

export function usePerformOCRInBackground(
  selBatch,
  selDept,
  isMountedRef,
  addMsg,
  setAttachmentOcrStatus,
  setRunningOcrAttachmentIds,
  setCurrentProductionCacheId,
  setCurrentTeamsTimeCacheId,
  setCurrentSubAssemblyCacheId
) {
  return useCallback(async (att, options = {}) => {
    const { silentBulk = false } = options;
    const startTime = Date.now();
    let failedStep = "init";
    let detectedForms = [];
    let detectedFormsForLog = [];

    try {
      // Validate input
      if (!att || !att.id || !att.file_url) {
        throw new Error("Invalid attachment object: missing id or file_url");
      }

      // Step 1: Analyze file and detect form types FIRST
      failedStep = "analyzeFilePages";
      console.log("[OCR] analyzeFilePages start", { attachmentId: att.id, fileName: att.file_name, failedStep });
      if (!silentBulk && isMountedRef.current) addMsg("bot", `🔍 **Stage 1/5: Αναλύω αρχείο...**`);
      let pageCountResult = 1;
      try {
        const analyzeRes = await base44.functions.invoke("analyzeFilePages", {
          file_url: att.file_url,
        });
        pageCountResult = analyzeRes?.data?.page_count || analyzeRes?.page_count || 1;
        console.log("[OCR] analyzeFilePages ok", { attachmentId: att.id, pageCount: pageCountResult, elapsedMs: Date.now() - startTime });
        if (!silentBulk && isMountedRef.current) addMsg("bot", `✅ Stage 1: Αρχείο αναλύθηκε • **${pageCountResult} σελίδες**`);
      } catch (analyzeErr) {
        console.warn("[OCR] analyzeFilePages failed, continuing...", analyzeErr?.message);
        if (!silentBulk && isMountedRef.current) addMsg("bot", `⚠️ Stage 1: Δεν ήταν δυνατή η ανάλυση σελίδων, συνεχίζω...`);
      }

      await new Promise((r) => setTimeout(r, 300));

      failedStep = "detectFormType";
      console.log("[OCR] detectFormType start", { attachmentId: att.id, fileName: att.file_name, failedStep });
      if (!silentBulk && isMountedRef.current) addMsg("bot", `🔍 **Stage 2/5: Ανιχνεύω τύπο φόρμας...**`);
      let detectResult = {};
      try {
        const detectResultRaw = await base44.functions.invoke("detectFormType", {
          file_url: att.file_url,
        });
        detectResult = detectResultRaw?.data || detectResultRaw?.result || detectResultRaw?.output || detectResultRaw || {};
        console.log("[OCR] detectFormType ok", { attachmentId: att.id, detectResult, elapsedMs: Date.now() - startTime });
        const detectedTypesPerPage = Object.entries(detectResult.pages || {})
          .map(([page, data]) => `Σ${page}: ${data?.form_type || "unknown"}`)
          .join(", ");
        if (!silentBulk && isMountedRef.current) addMsg("bot", `✅ Stage 2: Ανιχνεύτηκαν φόρμες • **${detectedTypesPerPage}**`);
      } catch (detectErr) {
        console.warn("[OCR] detectFormType failed:", detectErr?.message);
        detectResult = {};
        if (!silentBulk && isMountedRef.current) addMsg("bot", `❌ Stage 2: Αποτυχία ανίχνευσης: ${detectErr?.message}`);
      }
      const detectedPages = detectResult?.pages || {};

      detectedForms = [...new Set(
        Object.values(detectedPages)
          .map((p) => p?.form_type)
          .filter((type) => type && (type === "production" || type === "teams_time" || type === "sub_assembly"))
      )];
      detectedFormsForLog = detectedForms;

      if (detectedForms.length === 0) {
        // NO VALID FORMS DETECTED — Return status, don't treat as success
        if (!silentBulk && isMountedRef.current) {
          addMsg("bot", `⚠️ ${att.file_name || att.id} — Δεν ανιχνεύθηκαν έγκυρες φόρμες.`);
        }
        return {
          success: false,
          status: "no_valid_forms",
          attachmentId: att.id,
          fileName: att.file_name,
          batchHeaderId: att.batch_header_id,
          message: "Δεν ανιχνεύθηκαν έγκυρες φόρμες",
          detectedForms: [],
        };
      }

      // Step 2: For each detected form_type, check cache independently
       let prodCacheId = null;
       let teamsCacheId = null;
       let subAssemblyCacheId = null;

      const ocrTasks = detectedForms.map(async (formType) => {
        // Mark as processing before starting
        if (isMountedRef.current) {
          setAttachmentOcrStatus((prev) => ({
            ...prev,
            [att.id]: {
              ...prev[att.id],
              [formType]: { status: "processing", cache_id: null },
            },
          }));
        }

        failedStep = `checkOCRCacheStatus:${formType}`;
          const cacheStatus = await checkOCRCacheStatus(att.id, formType);

          if (cacheStatus.isProcessing) {
            if (!silentBulk && isMountedRef.current) addMsg("bot", `⏳ Stage 3: OCR για "${formType}" ήδη σε εξέλιξη...`);
            return;
          }

          if (cacheStatus.canUseCache) {
            const cached = cacheStatus.record;
            if (!silentBulk && isMountedRef.current) addMsg("bot", `✅ Stage 3: Cache για "${formType}" βρέθηκε • **Cache ID: ${cached.id.substring(0, 8)}...**`);
            if (isMountedRef.current) {
              setAttachmentOcrStatus((prev) => ({
                ...prev,
                [att.id]: {
                  ...prev[att.id],
                  [formType]: { status: "completed", cache_id: cached.id },
                },
              }));
            }
            if (formType === "production") {
              prodCacheId = cached.id;
            } else if (formType === "teams_time") {
              teamsCacheId = cached.id;
            } else if (formType === "sub_assembly") {
              subAssemblyCacheId = cached.id;
            }
            return;
          }

          // No usable cache — run fresh OCR
          const dept = att.department || selDept;
          if (!dept) {
            if (isMountedRef.current) addMsg("bot", `❌ Stage 3: Δεν υπάρχει τμήμα για ${att.file_name}. Απαιτείται τμήμα.`);
            return;
          }

          failedStep = `ocrWithCache:${formType}`;
          console.log("[OCR] ocrWithCache start", { attachmentId: att.id, formType, failedStep });
          if (!silentBulk && isMountedRef.current) addMsg("bot", `🤖 **Stage 4/5: Εκτελώ OCR για ${formType}...**`);
          const res = await ocrWithCache({
            attachment_id: att.id,
            batch_header_id: att.batch_header_id || selBatch?.id,
            department: dept,
            form_type: formType,
            file_name: att.file_name,
            file_url: att.file_url,
          });
          console.log("[OCR] ocrWithCache ok", { attachmentId: att.id, formType, elapsedMs: Date.now() - startTime });
          const data = res?.data || res;

          if (!silentBulk && isMountedRef.current) {
            const extractedKeys = data?.extracted_data_json ? Object.keys(data.extracted_data_json).length : 0;
            addMsg("bot", `✅ Stage 4: OCR για "${formType}" ολοκληρώθηκε • **${extractedKeys} πεδία εξήχθησαν**`);
          }

          if (isMountedRef.current) {
            setAttachmentOcrStatus((prev) => ({
              ...prev,
              [att.id]: {
                ...prev[att.id],
                [formType]: { status: "completed", cache_id: data.cache_id },
              },
            }));
          }

          if (formType === "production") {
            prodCacheId = data.cache_id;
          } else if (formType === "teams_time") {
            teamsCacheId = data.cache_id;
          } else if (formType === "sub_assembly") {
            subAssemblyCacheId = data.cache_id;
          }
      });

      await Promise.allSettled(ocrTasks);

      if (prodCacheId) setCurrentProductionCacheId(prodCacheId);
      if (teamsCacheId) setCurrentTeamsTimeCacheId(teamsCacheId);
      if (subAssemblyCacheId) setCurrentSubAssemblyCacheId(subAssemblyCacheId);

      // FIX #1: Return completed ONLY if at least one real OCR result was produced
      const hasRealResult = prodCacheId || teamsCacheId || subAssemblyCacheId;

      if (!hasRealResult) {
        // No cache_id produced — return as failed even if forms were detected
        return {
          success: false,
          status: "failed",
          attachmentId: att.id,
          fileName: att.file_name,
          batchHeaderId: att.batch_header_id,
          productionCacheId: null,
          teamsTimeCacheId: null,
          detectedForms,
          completedForms: [],
          message: "No OCR result was completed",
        };
      }

      // Return success result (do NOT open modals during bulk OCR)
      const completedForms = (prodCacheId ? ["production"] : []).concat(teamsCacheId ? ["teams_time"] : []).concat(subAssemblyCacheId ? ["sub_assembly"] : []);
      if (!silentBulk && isMountedRef.current) {
        const duration = Date.now() - startTime;
        addMsg("bot", `✅ **Stage 5/5: OCR ΟΛΟΚΛΗΡΩΘΗΚΕ!**\n📋 Ανιχνεύθησαν: ${detectedForms.join(", ")}\n✔️ Αποτέλεσμα: ${completedForms.join(", ") || "χωρίς αποτέλεσμα"}\n⏱️ Διάρκεια: ${(duration/1000).toFixed(1)}s\n\n💡 Κάνε κλικ στο **"Forms"** κουμπί για να δεις και να επεξεργαστείς τα δεδομένα.`);
      }

      return {
        success: true,
        status: "completed",
        attachmentId: att.id,
        fileName: att.file_name,
        batchHeaderId: att.batch_header_id,
        productionCacheId: prodCacheId,
        teamsTimeCacheId: teamsCacheId,
        subAssemblyCacheId: subAssemblyCacheId,
        detectedForms,
        completedForms,
        duration: Date.now() - startTime,
      };
    } catch (err) {
      if (!isMountedRef.current) {
        // Still throw so bulk OCR can classify as failed
        throw err;
      }

      console.error("[OCR] failed", {
        attachmentId: att?.id,
        fileName: att?.file_name,
        batchHeaderId: att?.batch_header_id,
        failedStep,
        detectedForms: detectedFormsForLog,
        durationMs: Date.now() - startTime,
        message: err?.message,
        status: err?.response?.status,
        responseData: err?.response?.data,
      });

      if (!silentBulk) {
        addMsg("bot", `❌ OCR αποτυχία: ${err?.message || "Network error"}`);
      }

      setAttachmentOcrStatus((prev) => {
        const newStatus = { 
          ...prev, 
          [att.id]: {
            production: { status: "failed", cache_id: null },
            teams_time: { status: "failed", cache_id: null },
            sub_assembly: { status: "failed", cache_id: null }
          } 
        };
        return newStatus;
      });
      // RETHROW so bulk OCR can catch and mark as failed
      throw err;
    } finally {
      if (isMountedRef.current) {
        setRunningOcrAttachmentIds((prev) => {
          const next = new Set(prev);
          next.delete(att.id);
          return next;
        });
      }
    }
  }, [isMountedRef, addMsg, selBatch?.id, selDept, setAttachmentOcrStatus, setRunningOcrAttachmentIds, setCurrentProductionCacheId, setCurrentTeamsTimeCacheId, setCurrentSubAssemblyCacheId]);
}