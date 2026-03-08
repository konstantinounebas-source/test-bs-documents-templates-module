import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { metric_id, date, department } = await req.json();

    // Get the metric record
    const metric = await base44.entities.DailyMetricValue.filter({
      id: metric_id
    });

    if (!metric || metric.length === 0) {
      return Response.json({ error: 'Metric not found' }, { status: 404 });
    }

    const metricRecord = metric[0];
    const calculatedAt = new Date(metricRecord.calculated_at);
    const targetDate = metricRecord.date;

    // Check latest updated_date from all production/planning tables for this date and department
    const tables = [
      'ScheduledData',
      'TargetDaily',
      'DailyTargetLines',
      'BatchHeader',
      'ConsumablesActual',
      'Operations',
      'QC_Initial_Stock',
      'TeamTimePerson',
      'BreakTime'
    ];

    const checks = tables.map(async (tableName) => {
      try {
        const records = await base44.asServiceRole.entities[tableName].filter({
          department: department
        });

        // Filter records that match the date (handle different date field names)
        const dateFieldNames = ['date', 'work_date', 'scheduled_date', 'production_date'];
        const relevantRecords = records.filter(r => {
          for (const dateField of dateFieldNames) {
            if (r[dateField] && new Date(r[dateField]).toDateString() === new Date(targetDate).toDateString()) {
              return true;
            }
          }
          return false;
        });

        if (relevantRecords.length === 0) return null;

        // Get max updated_date
        const maxUpdated = relevantRecords.reduce((max, r) => {
          const updated = new Date(r.updated_date);
          return updated > max ? updated : max;
        }, new Date(0));

        return {
          table: tableName,
          lastUpdated: maxUpdated,
          isNewer: maxUpdated > calculatedAt
        };
      } catch (error) {
        return null;
      }
    });

    const results = await Promise.all(checks);
    const changedTables = results.filter(r => r && r.isNewer);

    return Response.json({
      isValid: changedTables.length === 0,
      calculatedAt: calculatedAt.toISOString(),
      changedTables: changedTables,
      message: changedTables.length === 0 
        ? 'Metrics are up-to-date' 
        : `Data changed in: ${changedTables.map(t => t.table).join(', ')}`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});