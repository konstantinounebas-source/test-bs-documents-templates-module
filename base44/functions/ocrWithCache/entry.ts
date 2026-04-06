import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Main OCR function that integrates with OCRCache
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
 *   raw_ocr_json: object
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

  // Validate required fields
  if (!attachment_id || !batch_header_id || !file_url || !form_type) {
    return Response.json({
      error: 'Missing required fields: attachment_id, batch_header_id, file_url, form_type'
    }, { status: 400 });
  }

  try {
    // 1. Check if cached OCR exists
    const currentCache = await base44.entities.OCRCache.filter({
      attachment_id,
      is_current: true
    }).then(records => records.length > 0 ? records[0] : null);

    // 2. If cached and not forcing rerun, return cached data
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

    // 3. If forcing rerun, supersede the current record
    if (forceRerun && currentCache) {
      await base44.asServiceRole.entities.OCRCache.update(currentCache.id, {
        is_current: false,
        status: 'superseded',
        last_rerun_at: new Date().toISOString()
      });
    }

    // 4. Create new processing record
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

    // 5. Call the appropriate OCR function based on form_type
    let rawInvokeResult;
    try {
      const ocrFunctionName = form_type === 'production' ? 'ocrProductionForm' : 'ocrTeamsTimeForm';
      rawInvokeResult = await base44.asServiceRole.functions.invoke(ocrFunctionName, {
        file_url,
        page_number
      });
    } catch (error) {
      // Update cache record as failed
      await base44.asServiceRole.entities.OCRCache.update(newCacheRecord.id, {
        status: 'failed',
        error_message: error.message || 'OCR processing failed',
        completed_at: new Date().toISOString()
      });
      throw error;
    }

    // Normalize OCR function result shape
    const ocrResult = rawInvokeResult?.data || rawInvokeResult?.result || rawInvokeResult?.output || rawInvokeResult;

    // 6. Update cache record with OCR results
    await base44.asServiceRole.entities.OCRCache.update(newCacheRecord.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      raw_ocr_json: ocrResult,
      extracted_data_json: ocrResult.extracted_data || null,
      validation_json: ocrResult.validation || null,
      page_count: ocrResult.file_page_count || ocrResult.page_count || null
    });

    // 7. Return the result
    return Response.json({
      cache_id: newCacheRecord.id,
      cached: false,
      extracted_data: ocrResult.extracted_data,
      validation: ocrResult.validation,
      raw_ocr_json: ocrResult,
      page_count: ocrResult.file_page_count || ocrResult.page_count
    });

  } catch (error) {
    console.error('OCR with cache error:', error);
    return Response.json({
      error: error.message || 'OCR processing failed'
    }, { status: 500 });
  }
});