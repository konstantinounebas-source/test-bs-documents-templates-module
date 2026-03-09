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

    // Compute derived values used in metric formulas

    // Gross Team Time: sum of (to_time - from_time) for each person in minutes
    const calcPersonMinutes = (person) => {
      try {
        const [fh, fm] = person.from_time.split(':').map(Number);
        const [th, tm] = person.to_time.split(':').map(Number);
        const total = (th * 60 + tm) - (fh * 60 + fm);
        return total > 0 ? total : 0;
      } catch { return 0; }
    };

    const grossTeamTimeMin = teamTimePersons.reduce((acc, p) => acc + calcPersonMinutes(p), 0);
    const totalBreakMin = teamTimePersons.reduce((acc, p) => acc + (parseFloat(p.break_time_minutes) || 0), 0);
    const netTeamTimeMin = grossTeamTimeMin - totalBreakMin;
    const personCount = teamTimePersons.length;

    const totalOperationTimeMin = operations.reduce((acc, o) => acc + (parseFloat(o.operation_time_min) || 0), 0);
    const totalQtyOperation = operations.reduce((acc, o) => acc + (parseFloat(o.qty_operation) || 0), 0);
    const totalRemakeQty = operations.reduce((acc, o) => acc + (parseFloat(o.remake_qty) || 0), 0);

    const totalHelpInMin = helpIn.reduce((acc, h) => {
      // help_in records have from_time/to_time like TeamTimePerson
      try {
        const [fh, fm] = h.from_time.split(':').map(Number);
        const [th, tm] = h.to_time.split(':').map(Number);
        const diff = (th * 60 + tm) - (fh * 60 + fm);
        return acc + (diff > 0 ? diff : 0);
      } catch { return acc + (parseFloat(h.minutes) || 0); }
    }, 0);

    const totalExtraTimeMin = teamTimeExtra.reduce((acc, e) => acc + (parseFloat(e.minutes) || 0), 0);
    const totalConsumablesQty = consumablesActual.reduce((acc, c) => acc + (parseFloat(c.quantity) || 0), 0);

    // Build the data context for formula evaluation
    const dataContext = {
      // Aggregate numeric values accessible by metric code name in formulas
      GT_TIME: grossTeamTimeMin,
      NT_TIME: netTeamTimeMin,
      BREAK_TIME: totalBreakMin,
      OP_TIME: totalOperationTimeMin,
      QTY_OP: totalQtyOperation,
      REMAKE_QTY: totalRemakeQty,
      HELP_IN_TIME: totalHelpInMin,
      EXTRA_TIME: totalExtraTimeMin,
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

    const calculatedValues = [];
    const calculatedAt = new Date().toISOString();

    for (const metric of metrics) {
      try {
        let value = 0;

        // If this metric's code is directly available in context (pre-computed), use it
        if (metric.metric_code in dataContext && typeof dataContext[metric.metric_code] === 'number') {
          value = dataContext[metric.metric_code];
        } else if (metric.formula_full && metric.formula_full.trim() !== '') {
          // Otherwise evaluate the formula
          value = evaluateFormula(metric.formula_full, dataContext);
        } else {
          // No formula: skip saving (value stays 0)
          value = 0;
        }

        // Delete existing values for this metric/date/department before saving new one
        const existing = await base44.entities.DailyMetricValue.filter({
          metric_code: metric.metric_code,
          date,
          department
        });
        for (const e of existing) {
          await base44.entities.DailyMetricValue.delete(e.id);
        }

        const result = await base44.entities.DailyMetricValue.create({
          metric_code: metric.metric_code,
          date,
          department,
          bundle_id: bundle_id || 'DEFAULT',
          value: isNaN(value) ? 0 : value,
          calculated_at: calculatedAt
        });

        calculatedValues.push({
          metric_code: metric.metric_code,
          value: isNaN(value) ? 0 : value,
          id: result.id
        });

      } catch (error) {
        console.error(`Error calculating ${metric.metric_code}:`, error.message);
        calculatedValues.push({
          metric_code: metric.metric_code,
          value: 0,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      message: `Calculated ${calculatedValues.length} metrics`,
      date,
      department,
      batch_header_id,
      calculatedAt,
      dataContext: {
        GT_TIME: grossTeamTimeMin,
        NT_TIME: netTeamTimeMin,
        OP_TIME: totalOperationTimeMin,
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