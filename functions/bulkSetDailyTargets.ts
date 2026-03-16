import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { enabledDepts, dayStrings, bulkTargetSelections, bulkTargetTypeSelections, targetLines, assignmentMap } = await req.json();

    let totalCreated = 0;

    for (const deptName of enabledDepts) {
      const bundleId = bulkTargetSelections[deptName];
      const targetType = bulkTargetTypeSelections[deptName];
      const lines = targetLines.filter(l => l.bundle_id === bundleId && l.target_type === targetType);

      for (const dateStr of dayStrings) {
        // Delete existing TargetDaily for this date+dept
        const existing = await base44.asServiceRole.entities.TargetDaily.filter({ date: dateStr, department: deptName });
        for (const t of existing) {
          await base44.asServiceRole.entities.TargetDaily.delete(t.id);
        }

        // Build new target records
        const toCreate = lines.map(l => ({
          bundle_id: bundleId,
          date: dateStr,
          department: deptName,
          item_code: l.item_code,
          target_profile: l.target_type,
          operation_profile: l.operation_profile_id,
          target_qty: l.target_qty,
          profile_time_min_pc: l.per_piece_total_min,
          target_time_min: l.item_total_min
        }));

        if (toCreate.length > 0) {
          await base44.asServiceRole.entities.TargetDaily.bulkCreate(toCreate);
          totalCreated += toCreate.length;
        }

        // Update TGT_TIME metric
        const total = lines.reduce((s, l) => s + (l.target_time_min || l.item_total_min || 0), 0);
        const existingMetric = await base44.asServiceRole.entities.DailyMetricValue.filter({ metric_code: 'TGT_TIME', date: dateStr, department: deptName });
        if (existingMetric.length > 0) {
          await base44.asServiceRole.entities.DailyMetricValue.update(existingMetric[0].id, { value: total });
        } else {
          await base44.asServiceRole.entities.DailyMetricValue.create({
            metric_code: 'TGT_TIME', date: dateStr, department: deptName,
            bundle_id: bundleId, value: total, calculated_at: new Date().toISOString()
          });
        }

        // Update DailyStandardsAssignment
        const existingAssignment = assignmentMap[`${dateStr}|${deptName}`];
        if (existingAssignment) {
          await base44.asServiceRole.entities.DailyStandardsAssignment.update(existingAssignment.id, {
            standards_bundle_id: bundleId, target_type: targetType
          });
        } else {
          await base44.asServiceRole.entities.DailyStandardsAssignment.create({
            assignment_date: dateStr, department_id: deptName,
            standards_bundle_id: bundleId, target_type: targetType
          });
        }
      }
    }

    return Response.json({ success: true, totalCreated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});