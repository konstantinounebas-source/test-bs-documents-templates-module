import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Save user-corrected OCR data to OCRCache
 * 
 * Payload:
 * {
 *   cache_id: string,
 *   corrected_data: object
 * }
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const payload = await req.json();
  const { cache_id, corrected_data } = payload;

  if (!cache_id || !corrected_data) {
    return Response.json({
      error: 'Missing required fields: cache_id, corrected_data'
    }, { status: 400 });
  }

  try {
    await base44.asServiceRole.entities.OCRCache.update(cache_id, {
      corrected_data_json: corrected_data
    });

    return Response.json({
      success: true,
      cache_id
    });
  } catch (error) {
    console.error('Error saving corrected OCR data:', error);
    return Response.json({
      error: error.message || 'Failed to save corrected data'
    }, { status: 500 });
  }
});