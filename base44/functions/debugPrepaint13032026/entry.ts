import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Target date: 13-03-2026 (shown as 2026-03-13 in the UI)
    const targetDate = "2026-03-13";
    const targetDept = "Pre-paint";
    
    // List ALL batches first to see structure
    const allBatches = await base44.entities.BatchHeader.list();
    console.log(`Total batches in system: ${allBatches.length}`);
    
    // Try different field names for date
    const batchDates = [...new Set(allBatches.map(b => b.date || b.batch_date || b.production_date))].sort();
    console.log(`All batch dates found: ${batchDates.join(", ")}`);
    
    // Sample first batch to see its structure
    if (allBatches.length > 0) {
      const sample = allBatches[0];
      console.log(`Sample batch structure:`, JSON.stringify(sample, null, 2));
    }
    
    // Try filtering by date (try different field names)
    let batches = await base44.entities.BatchHeader.filter({
      date: targetDate,
      department: targetDept
    });
    
    // If not found, try batch_date
    if (batches.length === 0) {
      batches = await base44.entities.BatchHeader.filter({
        batch_date: targetDate,
        department: targetDept
      });
    }
    
    console.log(`Found ${batches.length} batches for date ${targetDate} + dept ${targetDept}`);
    
    if (batches.length === 0) {
      return Response.json({ 
        error: 'No batch found for date 13-03-2026 + Pre-paint',
        targetDate,
        targetDept,
        allBatchDatesInSystem: batchDates,
        totalBatchesInSystem: allBatches.length,
        sampleBatchStructure: allBatches.length > 0 ? allBatches[0] : null
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

    // Get item codes from StdSetLines (try both possible entity names)
    let stdLines = await base44.entities.StdSetLines.filter({
      bundle_id: bundleId
    });
    
    console.log(`StdSetLines query (bundle_id=${bundleId}): found ${stdLines.length}`);
    
    // If empty, try the underscore version
    if (stdLines.length === 0) {
      stdLines = await base44.entities.Std_Set_Lines.filter({
        bundle_id: bundleId
      });
      console.log(`Std_Set_Lines query: found ${stdLines.length}`);
    }
    
    // If still empty, list a sample to see the structure
    if (stdLines.length === 0) {
      const allLines = await base44.entities.StdSetLines.list();
      console.log(`All StdSetLines in system: ${allLines.length}`);
      if (allLines.length > 0) {
        console.log('Sample StdSetLine:', JSON.stringify(allLines[0], null, 2));
      }
    }

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