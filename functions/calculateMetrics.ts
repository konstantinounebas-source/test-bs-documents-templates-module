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

    // Fetch data for formula evaluation
    const [batchHeaders, operations, teamTime, qcInitial, scheduledData] = await Promise.all([
      base44.entities.BatchHeader.filter({ date, department }),
      base44.entities.Operations.filter({ date, department }),
      base44.entities.TeamTimePerson.filter({ date, department }),
      base44.entities.QC_Initial_Stock.filter({ date, department }),
      base44.entities.ScheduledData.filter({ date, department })
    ]);

    const calculatedValues = [];
    const calculatedAt = new Date().toISOString();

    for (const metric of metrics) {
      try {
        // Parse and evaluate formula
        let value = evaluateFormula(
          metric.formula_full,
          {
            batchHeaders,
            operations,
            teamTime,
            qcInitial,
            scheduledData
          }
        );

        // Save to DailyMetricValue
        const result = await base44.entities.DailyMetricValue.create({
          metric_code: metric.metric_code,
          date,
          department,
          bundle_id: bundle_id || 'DEFAULT',
          value: value || 0,
          calculated_at: calculatedAt
        });

        calculatedValues.push({
          metric_code: metric.metric_code,
          value: value || 0,
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
      calculatedAt,
      metrics: calculatedValues
    });

  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});

// Simple formula evaluator - handles basic aggregations
function evaluateFormula(formula, dataContext) {
  try {
    // Replace references with actual values
    let evaluated = formula;

    // SUM patterns: sum(TeamTimePerson.hours) or sum(Operations.quantity)
    const sumMatches = formula.match(/sum\((\w+)\.(\w+)\)/g) || [];
    for (const match of sumMatches) {
      const [table, field] = match.replace(/sum\(|\)/g, '').split('.');
      const tableKey = table.toLowerCase().replace(/\s+/g, '');
      let sum = 0;
      
      if (dataContext[tableKey]) {
        sum = dataContext[tableKey].reduce((acc, row) => {
          return acc + (parseFloat(row[field]) || 0);
        }, 0);
      }
      
      evaluated = evaluated.replace(match, sum);
    }

    // COUNT patterns: count(Operations.id)
    const countMatches = formula.match(/count\((\w+)\.(\w+)\)/g) || [];
    for (const match of countMatches) {
      const [table, field] = match.replace(/count\(|\)/g, '').split('.');
      const tableKey = table.toLowerCase().replace(/\s+/g, '');
      let count = 0;
      
      if (dataContext[tableKey]) {
        count = dataContext[tableKey].filter(row => row[field] != null).length;
      }
      
      evaluated = evaluated.replace(match, count);
    }

    // AVG patterns: avg(TeamTimePerson.hours)
    const avgMatches = formula.match(/avg\((\w+)\.(\w+)\)/g) || [];
    for (const match of avgMatches) {
      const [table, field] = match.replace(/avg\(|\)/g, '').split('.');
      const tableKey = table.toLowerCase().replace(/\s+/g, '');
      let avg = 0;
      
      if (dataContext[tableKey] && dataContext[tableKey].length > 0) {
        const sum = dataContext[tableKey].reduce((acc, row) => {
          return acc + (parseFloat(row[field]) || 0);
        }, 0);
        avg = sum / dataContext[tableKey].length;
      }
      
      evaluated = evaluated.replace(match, avg);
    }

    // Evaluate simple math expressions (after replacements)
    const result = parseFloat(eval(evaluated));
    return isNaN(result) ? 0 : result;

  } catch (error) {
    console.error('Formula evaluation error:', error);
    return 0;
  }
}