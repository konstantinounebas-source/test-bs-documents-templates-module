import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const targetDate = '2026-03-13';
    
    // 1. Find batch for this date
    const batches = await base44.entities.BatchHeader.filter({ date: targetDate });
    console.log('Batches for 2026-03-13:', batches);

    if (batches.length === 0) {
      return Response.json({ error: 'No batch found for this date', batches: [] });
    }

    const batch = batches[0];
    console.log('Selected batch:', batch);

    // 2. Get bundle from batch
    let bundleId = batch.bundle_id;
    console.log('Batch bundle_id:', bundleId);

    // 3. If no bundle_id on batch, try daily assignment
    if (!bundleId && batch.department) {
      const dailyAssignments = await base44.entities.DailyStandardsAssignment.filter({
        assignment_date: targetDate,
        department_id: batch.department
      });
      console.log('Daily assignments:', dailyAssignments);
      if (dailyAssignments.length > 0) {
        bundleId = dailyAssignments[0].standards_bundle_id;
      }
    }

    if (!bundleId) {
      return Response.json({ 
        error: 'No bundle found for batch',
        batch: batch,
        message: 'Batch exists but has no bundle assigned'
      });
    }

    // 4. Get std set lines for bundle
    const stdLines = await base44.entities.StdSetLines.filter({ bundle_id: bundleId });
    console.log('StdSetLines count:', stdLines.length);
    console.log('StdSetLines:', stdLines.slice(0, 5));

    const itemCodes = [...new Set(stdLines.map(l => l.item_code))].filter(Boolean).sort();

    return Response.json({
      success: true,
      targetDate,
      batch: {
        id: batch.id,
        date: batch.date,
        department: batch.department,
        bundle_id: batch.bundle_id
      },
      bundleId,
      itemCodesCount: itemCodes.length,
      itemCodes,
      stdLinesCount: stdLines.length
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});