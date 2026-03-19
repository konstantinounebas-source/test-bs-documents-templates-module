import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { date, department, bundle_id, notes } = await req.json();

    if (!date || !department || !bundle_id) {
      return Response.json({ error: 'date, department and bundle_id are required' }, { status: 400 });
    }

    const db = base44.asServiceRole;

    // Check if scheduled data exists
    const scheduledData = await db.entities.ScheduledData.filter({
      date,
      department_id: department
    });

    // Create batch header
    const newBatch = await db.entities.BatchHeader.create({
      date,
      department,
      bundle_id,
      notes: notes || '',
      has_scheduled_data: scheduledData.length > 0
    });

    // Auto-populate Batch Lines & Operations from scheduled data
    if (scheduledData.length > 0) {
      const batchLines = scheduledData.map(sd => ({
        batch_header_id: newBatch.id,
        item_code: sd.item_code,
        scheduled_qty: sd.ops_qty || 0,
        qty_processed: 0,
        qty_out_good: 0,
        qty_scrap: 0
      }));
      await db.entities.Batch_Lines.bulkCreate(batchLines);

      // Group operations by item_code + operation
      const opsMap = new Map();
      scheduledData
        .filter(sd => sd.operation && sd.ops_qty)
        .forEach(sd => {
          const key = `${sd.item_code}|${sd.operation}`;
          if (opsMap.has(key)) {
            const existing = opsMap.get(key);
            existing.qty_operation += sd.ops_qty || 0;
            existing.operation_time_min += (sd.ops_qty || 0) * (sd.std_min_pc || 0);
          } else {
            opsMap.set(key, {
              batch_header_id: newBatch.id,
              item_code: sd.item_code,
              operation: sd.operation,
              qty_operation: sd.ops_qty || 0,
              remake_qty: 0,
              source_type: 'SCHEDULE',
              std_min_pc_lookup: sd.std_min_pc || 0,
              operation_time_min: (sd.ops_qty || 0) * (sd.std_min_pc || 0)
            });
          }
        });
      const operations = Array.from(opsMap.values());
      if (operations.length > 0) {
        await db.entities.Operations.bulkCreate(operations);
      }
    }

    // Create metrics
    const [metrics, existingMetrics] = await Promise.all([
      db.entities.MetricDefinition.list(),
      db.entities.DailyMetricValue.filter({ date, department })
    ]);

    const existingCodes = new Set(existingMetrics.map(m => m.metric_code));
    const schTime = scheduledData.reduce((sum, sd) => sum + (sd.grand_total_min || 0), 0);

    const metricsToCreate = metrics
      .filter(m => !existingCodes.has(m.metric_code))
      .map(m => ({
        metric_code: m.metric_code,
        date,
        department,
        bundle_id,
        value: m.metric_code === 'SCH_TIME' ? schTime : 0,
        calculated_at: new Date().toISOString()
      }));

    if (metricsToCreate.length > 0) {
      await db.entities.DailyMetricValue.bulkCreate(metricsToCreate);
    }

    return Response.json({ success: true, batch: newBatch });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});