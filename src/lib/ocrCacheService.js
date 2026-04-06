import { base44 } from '@/api/base44Client';

/**
 * Get current active OCR cache record for an attachment
 */
export async function getCurrentOCRCacheByAttachment(attachmentId) {
  try {
    const records = await base44.entities.OCRCache.filter({
      attachment_id: attachmentId,
      is_current: true
    });
    return records.length > 0 ? records[0] : null;
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
    const updateData = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      raw_ocr_json: data.raw_ocr_json || null,
      extracted_data_json: data.extracted_data_json || null,
      validation_json: data.validation_json || null,
      page_count: data.page_count || null
    };

    await base44.entities.OCRCache.update(cacheId, updateData);
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
 * Supersede current OCR cache record (mark as superseded when rerunning)
 */
export async function supersedeCurrentOCRCache(attachmentId) {
  try {
    const current = await getCurrentOCRCacheByAttachment(attachmentId);
    if (current) {
      await base44.entities.OCRCache.update(current.id, {
        is_current: false,
        status: 'superseded',
        last_rerun_at: new Date().toISOString()
      });
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
    const response = await fetch(`${window.location.origin}/api/functions/saveCorrectedOCRData`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cache_id: cacheId, corrected_data: correctedData })
    });

    if (!response.ok) {
      throw new Error('Failed to save corrected OCR data');
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving corrected OCR data:', error);
    throw error;
  }
}

/**
 * Check if attachment has cached OCR result ready to use
 * Returns: { hasCached: boolean, record: OCRCacheRecord | null }
 */
export async function checkOCRCacheStatus(attachmentId) {
  try {
    const current = await getCurrentOCRCacheByAttachment(attachmentId);

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
 * Get all OCR cache records for an attachment (including historical)
 */
export async function getOCRCacheHistory(attachmentId) {
  try {
    const records = await base44.entities.OCRCache.filter({
      attachment_id: attachmentId
    });
    return records.sort((a, b) => new Date(b.started_at || 0) - new Date(a.started_at || 0));
  } catch (error) {
    console.error('Error getting OCR cache history:', error);
    return [];
  }
}