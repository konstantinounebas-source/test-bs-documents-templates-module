import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(fn, retries = 3, delayMs = 500) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
        if (i < retries - 1) await sleep(delayMs * (i + 1));
        else throw error;
      } else {
        throw error;
      }
    }
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { date, department } = await req.json();

    if (!date || !department) {
      return Response.json({ error: 'Missing date or department' }, { status: 400 });
    }

    // Get the most recent calculated_at for this date+department
    const metricValues = await fetchWithRetry(() =>
      base44.asServiceRole.entities.DailyMetricValue.filter({ date, department })
    );

    if (!metricValues || metricValues.length === 0) {
      return Response.json({ isValid: true, message: 'No metrics calculated yet' });
    }

    const calculatedAt = metricValues.reduce((max, mv) => {
      const t = new Date(mv.calculated_at);
      return t > max ? t : max;
    }, new Date(0));

    const changedTables = [];

    // 1. Check BatchHeader (has date+department directly)
    await sleep(100);
    const batchHeaders = await fetchWithRetry(() =>
      base44.asServiceRole.entities.BatchHeader.filter({ date, department })
    );

    if (batchHeaders.length > 0) {
      const maxBH = batchHeaders.reduce((max, r) => {
        const u = new Date(r.updated_date);
        return u > max ? u : max;
      }, new Date(0));
      if (maxBH > calculatedAt) changedTables.push('BatchHeader');

      // 2. Check tables linked via batch_header_id (sequential to avoid rate limit)
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

      for (const tableName of linkedTables) {
        await sleep(80);
        try {
          const records = await fetchWithRetry(() =>
            base44.asServiceRole.entities[tableName].filter({ batch_header_id: batchHeaderId })
          );
          if (records.length > 0) {
            const maxUpdated = records.reduce((max, r) => {
              const u = new Date(r.updated_date);
              return u > max ? u : max;
            }, new Date(0));
            if (maxUpdated > calculatedAt) changedTables.push(tableName);
          }
        } catch {
          // skip table on error
        }
      }
    }

    // 3. Check planning tables (have date+department directly)
    const planningTables = ['ScheduledData', 'TargetDaily'];
    for (const tableName of planningTables) {
      await sleep(80);
      try {
        const records = await fetchWithRetry(() =>
          base44.asServiceRole.entities[tableName].filter({ date, department })
        );
        if (records.length > 0) {
          const maxUpdated = records.reduce((max, r) => {
            const u = new Date(r.updated_date);
            return u > max ? u : max;
          }, new Date(0));
          if (maxUpdated > calculatedAt) changedTables.push(tableName);
        }
      } catch {
        // skip table on error
      }
    }

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