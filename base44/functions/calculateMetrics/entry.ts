import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { date, department, batch_header_id, bundle_id } = await req.json();
    
    if (!date || !department || !batch_header_id) {
      return Response.json({ 
        error: 'Missing required fields: date, department, batch_header_id' 
      }, { status: 400 });
    }

    // Fetch metric definitions
    const metrics = await base44.entities.MetricDefinition.list();
    
    if (!metrics || metrics.length === 0) {
      return Response.json({ 
        message: 'No metric definitions found',
        calculatedCount: 0
      });
    }

    // Fetch all data linked to this batch_header_id
    // (Operations, TeamTimePerson, etc. are linked by batch_header_id, not date+department)
    const [operations, teamTimePersons, batchLines, qcInitialStock, helpIn, teamTimeExtra, consumablesActual] = await Promise.all([
      base44.entities.Operations.filter({ batch_header_id }),
      base44.entities.TeamTimePerson.filter({ batch_header_id }),
      base44.entities.Batch_Lines.filter({ batch_header_id }),
      base44.entities.QC_Initial_Stock.filter({ batch_header_id }),
      base44.entities.Help_In.filter({ batch_header_id }),
      base44.entities.Team_Time_Extra.filter({ batch_header_id }),
      base44.entities.Consumables_Actual.filter({ batch_header_id }),
    ]);

    // --- CROSS-DEPARTMENT HELP: find Other Dept entries from OTHER batches on same date
    // that have charge_dept = this department → add to Help In Time
    let crossDeptHelpMin = 0;
    try {
      // First get all batch IDs for this date (to scope entries to correct date)
      const batchesOnDate = await base44.entities.BatchHeader.filter({ date });
      const batchIdsOnDate = new Set(batchesOnDate.map(b => b.id));

      const crossDeptEntries = await base44.entities.Team_Time_Extra.filter({ 
        work_type: 'Other Departments Works',
        charge_dept: department
      });

      // Only count entries that belong to a batch on the same date (and not this batch itself)
      crossDeptHelpMin = crossDeptEntries
        .filter(e => e.batch_header_id !== batch_header_id && batchIdsOnDate.has(e.batch_header_id))
        .reduce((acc, e) => acc + (parseFloat(e.duration_min) || 0), 0);
    } catch (err) {
      console.error('Cross-dept help fetch error:', err.message);
    }

    // Helper: convert "HH:MM" string to minutes since midnight
    const timeToMin = (t) => {
      try {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      } catch { return 0; }
    };

    // --- GROSS TEAM TIME: sum of (to_time - from_time - break) per person ---
    const grossTeamTimeMin = teamTimePersons.reduce((acc, p) => {
      const raw = timeToMin(p.to_time) - timeToMin(p.from_time) - (parseFloat(p.break_time_minutes) || 0);
      return acc + (raw > 0 ? raw : 0);
    }, 0);

    const personCount = teamTimePersons.length;
    const totalBreakMin = teamTimePersons.reduce((acc, p) => acc + (parseFloat(p.break_time_minutes) || 0), 0);

    // --- OTHER DEPARTMENT TIME: Team_Time_Extra where work_type = "Other Departments Works" ---
    const otherDeptTimeMin = teamTimeExtra
      .filter(e => e.work_type === 'Other Departments Works')
      .reduce((acc, e) => acc + (parseFloat(e.duration_min) || 0), 0);

    // --- SUPPORT TIME: Team_Time_Extra where work_type = "Supportive Works" ---
    const supportTimeMin = teamTimeExtra
      .filter(e => e.work_type === 'Supportive Works')
      .reduce((acc, e) => acc + (parseFloat(e.duration_min) || 0), 0);

    // --- NON-EXECUTION TIME: Team_Time_Extra where work_type = "Non-Execution Time" ---
    const nonExecutionTimeMin = teamTimeExtra
      .filter(e => e.work_type === 'Non-Execution Time')
      .reduce((acc, e) => acc + (parseFloat(e.duration_min) || 0), 0);

    // --- HELP TIME RECEIVED: sum from Help_In + cross-dept Other Dept entries ---
    const manualHelpInMin = helpIn.reduce((acc, h) => {
      // Support both duration_min and from_time/to_time formats
      if (h.duration_min != null) {
        return acc + (parseFloat(h.duration_min) || 0);
      }
      try {
        const diff = timeToMin(h.to_time) - timeToMin(h.from_time);
        return acc + (diff > 0 ? diff : 0);
      } catch { return acc; }
    }, 0);
    const totalHelpInMin = manualHelpInMin + crossDeptHelpMin;

    // --- NET AVAILABLE TEAM TIME = Gross - Other Dept + Help In ---
    const netAvailableTimeMin = grossTeamTimeMin - otherDeptTimeMin + totalHelpInMin;

    // --- OPERATIONS TIME = Net Available - Support - Non-Execution ---
    const operationsTimeMin = netAvailableTimeMin - supportTimeMin - nonExecutionTimeMin;

    // --- STANDARD-BASED PROCESSING TIME: sum of operation_time_min from Operations ---
    const totalOperationTimeMin = operations.reduce((acc, o) => acc + (parseFloat(o.operation_time_min) || 0), 0);

    const totalQtyOperation = operations.reduce((acc, o) => acc + (parseFloat(o.qty_operation) || 0), 0);
    const totalRemakeQty = operations.reduce((acc, o) => acc + (parseFloat(o.remake_qty) || 0), 0);
    const totalConsumablesQty = consumablesActual.reduce((acc, c) => acc + (parseFloat(c.quantity) || 0), 0);

    // Build the data context for formula evaluation
    // Keys MUST match the metric_code values in MetricDefinition entity
    const dataContext = {
      GT_TIME: grossTeamTimeMin,           // Gross Team Time
      OD_TIME: otherDeptTimeMin,           // Other Department Time
      HELP_TIME: totalHelpInMin,           // Help Time Received
      NAT_TIME: netAvailableTimeMin,       // Net Available Team Time
      SUP_TIME: supportTimeMin,            // Support Time
      NON_EXEC_TIME: nonExecutionTimeMin,  // Non-Execution Time
      OP_TIME: operationsTimeMin,          // Operations Time
      SBP_TIME: totalOperationTimeMin,     // Standard-Based Processing Time
      // Legacy/other metrics
      BREAK_TIME: totalBreakMin,
      QTY_OP: totalQtyOperation,
      REMAKE_QTY: totalRemakeQty,
      ACT_CONS: totalConsumablesQty,
      PERSON_COUNT: personCount,
      // Arrays for sum/count/avg formulas
      operations,
      teamTimePersons,
      batchLines,
      qcInitialStock,
      helpIn,
      teamTimeExtra,
      consumablesActual
    };

    const calculatedAt = new Date().toISOString();

    // Step 1: Compute all metric values in memory (no API calls)
    const newValues = metrics.map(metric => {
      let value = 0;
      if (metric.metric_code in dataContext && typeof dataContext[metric.metric_code] === 'number') {
        value = dataContext[metric.metric_code];
      } else if (metric.formula_full && metric.formula_full.trim() !== '') {
        value = evaluateFormula(metric.formula_full, dataContext);
      }
      return {
        metric_code: metric.metric_code,
        date,
        department,
        bundle_id: bundle_id || 'DEFAULT',
        value: isNaN(value) ? 0 : value,
        calculated_at: calculatedAt
      };
    });

    // Step 2: Delete all existing records for this date+department in one query
    const existing = await base44.entities.DailyMetricValue.filter({ date, department });
    for (const e of existing) {
      await base44.entities.DailyMetricValue.delete(e.id);
    }

    // Step 3: Bulk create all new values in one call
    const created = await base44.entities.DailyMetricValue.bulkCreate(newValues);

    const calculatedValues = newValues.map((v, i) => ({
      metric_code: v.metric_code,
      value: v.value,
      id: created[i]?.id
    }));

    return Response.json({
      success: true,
      message: `Calculated ${calculatedValues.length} metrics`,
      date,
      department,
      batch_header_id,
      calculatedAt,
      dataContext: {
        GT_TIME: grossTeamTimeMin,
        OD_TIME: otherDeptTimeMin,
        HELP_TIME: totalHelpInMin,
        NAT_TIME: netAvailableTimeMin,
        SUP_TIME: supportTimeMin,
        NON_EXEC_TIME: nonExecutionTimeMin,
        OP_TIME: operationsTimeMin,
        SBP_TIME: totalOperationTimeMin,
        personCount,
        operationsCount: operations.length,
        teamTimeCount: teamTimePersons.length
      },
      metrics: calculatedValues
    });

  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});

// Simple formula evaluator - handles basic aggregations and math expressions
function evaluateFormula(formula, dataContext) {
  try {
    let evaluated = formula;

    // Replace direct context keys (e.g. GT_TIME, NT_TIME)
    for (const [key, val] of Object.entries(dataContext)) {
      if (typeof val === 'number') {
        evaluated = evaluated.replace(new RegExp(`\\b${key}\\b`, 'g'), val);
      }
    }

    // SUM patterns: sum(operations.operation_time_min)
    const sumMatches = [...evaluated.matchAll(/sum\((\w+)\.(\w+)\)/gi)];
    for (const match of sumMatches) {
      const [full, table, field] = match;
      const arr = dataContext[table] || dataContext[table.toLowerCase()] || [];
      const sum = arr.reduce((acc, row) => acc + (parseFloat(row[field]) || 0), 0);
      evaluated = evaluated.replace(full, sum);
    }

    // COUNT patterns: count(operations.id)
    const countMatches = [...evaluated.matchAll(/count\((\w+)\.(\w+)\)/gi)];
    for (const match of countMatches) {
      const [full, table, field] = match;
      const arr = dataContext[table] || dataContext[table.toLowerCase()] || [];
      const count = arr.filter(row => row[field] != null).length;
      evaluated = evaluated.replace(full, count);
    }

    // AVG patterns: avg(operations.operation_time_min)
    const avgMatches = [...evaluated.matchAll(/avg\((\w+)\.(\w+)\)/gi)];
    for (const match of avgMatches) {
      const [full, table, field] = match;
      const arr = dataContext[table] || dataContext[table.toLowerCase()] || [];
      const avg = arr.length > 0
        ? arr.reduce((acc, row) => acc + (parseFloat(row[field]) || 0), 0) / arr.length
        : 0;
      evaluated = evaluated.replace(full, avg);
    }

    const result = parseFloat(eval(evaluated));
    return isNaN(result) ? 0 : result;

  } catch (error) {
    console.error('Formula evaluation error:', error.message, 'formula:', formula);
    return 0;
  }
}