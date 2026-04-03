import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Target date: 13-03-2026
    const targetDate = "2026-03-13";
    
    // First, list ALL batches to see what dates exist
    const allBatches = await base44.entities.BatchHeader.list();
    const batchDates = [...new Set(allBatches.map(b => b.batch_date))].sort();
    
    console.log(`All batch dates in system: ${batchDates.join(", ")}`);
    
    // Find batch for this date
    const batches = await base44.entities.BatchHeader.filter({
      batch_date: targetDate
    });
    
    console.log(`Found ${batches.length} batches for date ${targetDate}`);
    
    if (batches.length === 0) {
      return Response.json({ 
        error: 'No batch found for date 13-03-2026',
        targetDate,
        allBatchDatesInSystem: batchDates
      });
    }

    const batch = batches[0];
    console.log('Batch found:', batch.id, batch.batch_date, batch.dept_id);

    // Get bundle id from batch or from daily assignment
    let bundleId = batch.bundle_id;
    
    if (!bundleId) {
      // Try to get from DailyStandardsAssignment
      const assignments = await base44.entities.DailyStandardsAssignment.filter({
        assignment_date: targetDate,
        dept_id: batch.dept_id
      });
      if (assignments.length > 0) {
        bundleId = assignments[0].bundle_id;
      }
    }

    console.log('Bundle ID:', bundleId);

    if (!bundleId) {
      return Response.json({ 
        error: 'No bundle found for this batch/department/date',
        batchDate: targetDate,
        deptId: batch.dept_id
      });
    }

    // Get item codes from StdSetLines
    const stdLines = await base44.entities.StdSetLines.filter({
      std_set_id: bundleId
    });

    const itemCodes = stdLines.map(line => line.item_code).filter(Boolean);
    const uniqueItemCodes = [...new Set(itemCodes)].sort();

    console.log('Item codes found:', uniqueItemCodes);

    return Response.json({
      success: true,
      targetDate,
      batchId: batch.id,
      bundleId,
      itemCodesCount: uniqueItemCodes.length,
      itemCodes: uniqueItemCodes,
      totalStdLines: stdLines.length
    });

  } catch (error) {
    console.error('Debug error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});