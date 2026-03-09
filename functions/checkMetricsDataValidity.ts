import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { date, department } = await req.json();

    if (!date || !department) {
      return Response.json({ error: 'Missing date or department' }, { status: 400 });
    }

    // Find the latest calculated_at for this date+department
    const metricValues = await base44.asServiceRole.entities.DailyMetricValue.filter({
      date,
      department
    });

    if (!metricValues || metricValues.length === 0) {
      return Response.json({ isValid: true, message: 'No metrics calculated yet' });
    }

    // Get the most recent calculated_at among all metrics for this date+department
    const calculatedAt = metricValues.reduce((max, mv) => {
      const t = new Date(mv.calculated_at);
      return t > max ? t : max;
    }, new Date(0));

    // Tables to check for changes
    // BatchHeader has date+department directly
    // Operations, TeamTimePerson etc. are linked via batch_header_id
    const batchHeaders = await base44.asServiceRole.entities.BatchHeader.filter({
      date,
      department
    });

    const changedTables = [];

    // Check BatchHeader itself
    if (batchHeaders.length > 0) {
      const maxBH = batchHeaders.reduce((max, r) => {
        const u = new Date(r.updated_date);
        return u > max ? u : max;
      }, new Date(0));
      if (maxBH > calculatedAt) {
        changedTables.push('BatchHeader');
      }
    }

    // For tables linked via batch_header_id
    if (batchHeaders.length > 0) {
      const batchHeaderId = batchHeaders[0].id;

      const linkedTables = [
        'Operations',
        'TeamTimePerson',
        'Batch_Lines',
        'QC_Initial_Stock',
        'Help_In',
        'Team_Time_Extra',
        'Consumables_Actual'
      ];

      const linkedChecks = await Promise.all(
        linkedTables.map(async (tableName) => {
          try {
            const records = await base44.asServiceRole.entities[tableName].filter({
              batch_header_id: batchHeaderId
            });
            if (records.length === 0) return null;
            const maxUpdated = records.reduce((max, r) => {
              const u = new Date(r.updated_date);
              return u > max ? u : max;
            }, new Date(0));
            return maxUpdated > calculatedAt ? tableName : null;
          } catch {
            return null;
          }
        })
      );

      linkedChecks.forEach(t => { if (t) changedTables.push(t); });
    }

    // Also check ScheduledData and TargetDaily which have date+department
    const planningTables = ['ScheduledData', 'TargetDaily', 'DailyTargetLines'];
    const planningChecks = await Promise.all(
      planningTables.map(async (tableName) => {
        try {
          const records = await base44.asServiceRole.entities[tableName].filter({
            date,
            department
          });
          if (records.length === 0) return null;
          const maxUpdated = records.reduce((max, r) => {
            const u = new Date(r.updated_date);
            return u > max ? u : max;
          }, new Date(0));
          return maxUpdated > calculatedAt ? tableName : null;
        } catch {
          return null;
        }
      })
    );
    planningChecks.forEach(t => { if (t) changedTables.push(t); });

    return Response.json({
      isValid: changedTables.length === 0,
      calculatedAt: calculatedAt.toISOString(),
      changedTables,
      message: changedTables.length === 0
        ? 'Metrics are up-to-date'
        : `Data changed in: ${changedTables.join(', ')}`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});