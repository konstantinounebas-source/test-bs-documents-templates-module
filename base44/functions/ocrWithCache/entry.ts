import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Main OCR function that integrates with OCRCache.
 * Cache is keyed by attachment_id + form_type (one current record per combination).
 *
 * Payload:
 * {
 *   attachment_id: string,
 *   batch_header_id: string,
 *   department: string,
 *   form_type: "production" | "teams_time",
 *   file_name: string,
 *   file_url: string,
 *   page_number?: number,
 *   forceRerun?: boolean
 * }
 *
 * Returns:
 * {
 *   cache_id: string,
 *   cached: boolean,
 *   extracted_data: object,
 *   validation: object,
 *   raw_ocr_json: object,
 *   page_count: number
 * }
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = await req.json();
  const {
    attachment_id,
    batch_header_id,
    department,
    form_type,
    file_name,
    file_url,
    page_number,
    forceRerun = false
  } = payload;

  if (!attachment_id || !batch_header_id || !file_url || !form_type) {
    return Response.json({
      error: 'Missing required fields: attachment_id, batch_header_id, file_url, form_type'
    }, { status: 400 });
  }

  try {
    // 1. Check cache for this attachment + form_type combination
    const allCurrent = await base44.asServiceRole.entities.OCRCache.filter({
      attachment_id,
      form_type,
      is_current: true
    });
    const currentCache = allCurrent.length > 0 ? allCurrent[0] : null;

    // 2. Return cached result if available and not forcing rerun
    if (currentCache && !forceRerun && currentCache.status === 'completed') {
      return Response.json({
        cache_id: currentCache.id,
        cached: true,
        extracted_data: currentCache.extracted_data_json,
        validation: currentCache.validation_json,
        raw_ocr_json: currentCache.raw_ocr_json,
        page_count: currentCache.page_count
      });
    }

    // 3. Supersede current record for this form_type only (preserve other form_type records)
    if (currentCache) {
      await base44.asServiceRole.entities.OCRCache.update(currentCache.id, {
        is_current: false,
        status: 'superseded',
        last_rerun_at: new Date().toISOString()
      });
    }

    // 4. Create new processing record for this attachment + form_type
    const newCacheRecord = await base44.asServiceRole.entities.OCRCache.create({
      attachment_id,
      batch_header_id,
      department,
      form_type,
      file_name,
      file_url,
      status: 'processing',
      is_current: true,
      started_at: new Date().toISOString(),
      ocr_version: '1.0'
    });

    // 5. Call the appropriate OCR backend function
    let rawInvokeResult;
    try {
      const ocrFunctionName = form_type === 'production' ? 'ocrProductionForm' : 'ocrTeamsTimeForm';
      rawInvokeResult = await base44.asServiceRole.functions.invoke(ocrFunctionName, {
        file_url,
        file_name,
        page_number
      });
    } catch (error) {
      await base44.asServiceRole.entities.OCRCache.update(newCacheRecord.id, {
        status: 'failed',
        error_message: error.message || 'OCR processing failed',
        completed_at: new Date().toISOString()
      });
      throw error;
    }

    // 6. Normalize result shape
    const ocrResult = rawInvokeResult?.data || rawInvokeResult?.result || rawInvokeResult?.output || rawInvokeResult;

    // 7. Update cache record with completed data
    await base44.asServiceRole.entities.OCRCache.update(newCacheRecord.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      raw_ocr_json: ocrResult,
      extracted_data_json: ocrResult?.extracted_data || null,
      validation_json: ocrResult?.validation || null,
      page_count: ocrResult?.file_page_count || ocrResult?.page_count || null
    });

    // 8. Return result
    return Response.json({
      cache_id: newCacheRecord.id,
      cached: false,
      extracted_data: ocrResult?.extracted_data,
      validation: ocrResult?.validation,
      raw_ocr_json: ocrResult,
      page_count: ocrResult?.file_page_count || ocrResult?.page_count
    });

  } catch (error) {
    console.error('OCR with cache error:', error);
    return Response.json({ error: error.message || 'OCR processing failed' }, { status: 500 });
  }
});