import { base44 } from '@/api/base44Client';

/**
 * Get current active OCR cache record for an attachment + form_type combination
 */
export async function getCurrentOCRCacheByAttachmentAndFormType(attachmentId, formType) {
  try {
    const records = await base44.entities.OCRCache.filter({
      attachment_id: attachmentId,
      form_type: formType,
      is_current: true
    });
    
    if (records.length === 0) return null;
    
    // Warn if multiple is_current=true records exist (data integrity issue)
    if (records.length > 1) {
      console.warn(`[OCRCache] Multiple is_current=true records found for attachment ${attachmentId} + ${formType}. Expected exactly 1.`);
    }
    
    // Return newest by started_at (fallback to created_date)
    const sorted = records.sort((a, b) => {
      const aTime = new Date(a.started_at || a.created_date || 0).getTime();
      const bTime = new Date(b.started_at || b.created_date || 0).getTime();
      return bTime - aTime;
    });
    
    return sorted[0];
  } catch (error) {
    console.error('Error getting current OCR cache:', error);
    return null;
  }
}

/**
 * Create new OCR cache processing record
 */
export async function createOCRCacheProcessingRecord(data) {
  try {
    const record = await base44.entities.OCRCache.create({
      attachment_id: data.attachment_id,
      batch_header_id: data.batch_header_id,
      department: data.department,
      form_type: data.form_type,
      file_name: data.file_name,
      file_url: data.file_url,
      status: 'processing',
      is_current: true,
      started_at: new Date().toISOString(),
      ocr_version: '1.0'
    });
    return record;
  } catch (error) {
    console.error('Error creating OCR cache record:', error);
    throw error;
  }
}

/**
 * Update OCR cache record with completed data
 */
export async function completeOCRCacheRecord(cacheId, data) {
  try {
    await base44.entities.OCRCache.update(cacheId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      raw_ocr_json: data.raw_ocr_json || null,
      extracted_data_json: data.extracted_data_json || null,
      validation_json: data.validation_json || null,
      page_count: data.page_count || null
    });
  } catch (error) {
    console.error('Error completing OCR cache record:', error);
    throw error;
  }
}

/**
 * Mark OCR cache record as failed
 */
export async function failOCRCacheRecord(cacheId, errorMessage) {
  try {
    await base44.entities.OCRCache.update(cacheId, {
      status: 'failed',
      error_message: errorMessage,
      completed_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error failing OCR cache record:', error);
    throw error;
  }
}

/**
 * Supersede current OCR cache record for a specific attachment + form_type
 */
export async function supersedeCurrentOCRCache(attachmentId, formType) {
  try {
    // Fetch ALL is_current=true records (not just the newest)
    const allCurrent = await base44.entities.OCRCache.filter({
      attachment_id: attachmentId,
      form_type: formType,
      is_current: true
    });
    
    // Mark all of them as superseded
    if (allCurrent.length > 0) {
      await Promise.all(
        allCurrent.map(record =>
          base44.entities.OCRCache.update(record.id, {
            is_current: false,
            status: 'superseded',
            last_rerun_at: new Date().toISOString()
          })
        )
      );
    }
  } catch (error) {
    console.error('Error superseding OCR cache record:', error);
    throw error;
  }
}

/**
 * Save user-corrected data to OCR cache record (frontend-accessible wrapper)
 */
export async function saveCorrectedOCRCacheData(cacheId, correctedData) {
  try {
    return await base44.functions.invoke("saveCorrectedOCRData", {
      cache_id: cacheId,
      corrected_data: correctedData
    });
  } catch (error) {
    console.error('Error saving corrected OCR data:', error);
    throw error;
  }
}

/**
 * Check if attachment + form_type has a usable cached OCR result.
 * Returns: { hasCached, canUseCache, isProcessing, isFailed, record }
 */
export async function checkOCRCacheStatus(attachmentId, formType) {
  try {
    const current = await getCurrentOCRCacheByAttachmentAndFormType(attachmentId, formType);

    if (!current) {
      return { hasCached: false, record: null };
    }

    if (current.status === 'completed') {
      return { hasCached: true, record: current, canUseCache: true };
    }

    if (current.status === 'processing') {
      return { hasCached: false, record: current, isProcessing: true };
    }

    if (current.status === 'failed') {
      return { hasCached: false, record: current, isFailed: true };
    }

    return { hasCached: false, record: current };
  } catch (error) {
    console.error('Error checking OCR cache status:', error);
    return { hasCached: false, record: null, error: error.message };
  }
}

/**
 * Get all OCR cache records for an attachment (optionally filtered by form_type)
 */
export async function getOCRCacheHistory(attachmentId, formType = null) {
  try {
    const filterObj = { attachment_id: attachmentId };
    if (formType) filterObj.form_type = formType;
    const records = await base44.entities.OCRCache.filter(filterObj);
    return records.sort((a, b) => new Date(b.started_at || 0) - new Date(a.started_at || 0));
  } catch (error) {
    console.error('Error getting OCR cache history:', error);
    return [];
  }
}