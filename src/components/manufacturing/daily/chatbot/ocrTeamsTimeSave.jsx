import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * Saves OCR Teams Time Form data into TeamTimePerson and Team_Time_Extra.
 * @param {object} confirmed - { team_persons: [], team_extra: [] }
 * @param {string} batchHeaderId
 * @param {function} onSuccess
 */
async function saveGTTimeMetric(batchHeaderId) {
  try {
    const batchHeaders = await base44.entities.BatchHeader.filter({ id: batchHeaderId });
    const batchHeader = batchHeaders?.[0];
    if (!batchHeader) return;

    const allLines = await base44.entities.TeamTimePerson.filter({ batch_header_id: batchHeaderId });
    const totalAvailableTime = allLines.reduce((sum, line) => {
      const [fromH, fromM] = (line.from_time || '').split(':').map(Number);
      const [toH, toM] = (line.to_time || '').split(':').map(Number);
      const totalMin = (toH * 60 + toM) - (fromH * 60 + fromM);
      const availableMin = Math.max(0, totalMin - (line.break_time_minutes || 0));
      return sum + availableMin;
    }, 0);

    const existingMetrics = await base44.entities.DailyMetricValue.filter({
      metric_code: 'GT_TIME',
      date: batchHeader.date,
      department: batchHeader.department
    });

    if (existingMetrics.length > 0) {
      await base44.entities.DailyMetricValue.update(existingMetrics[0].id, {
        value: totalAvailableTime
      });
    }
  } catch (error) {
    console.error('Failed to save GT_TIME metric:', error);
  }
}

async function saveNATTimeMetric(batchHeaderId) {
  try {
    const batchHeaders = await base44.entities.BatchHeader.filter({ id: batchHeaderId });
    const batchHeader = batchHeaders?.[0];
    if (!batchHeader) return;

    const date = batchHeader.date;
    const dept = batchHeader.department;

    const allMetrics = await base44.entities.DailyMetricValue.filter({
      date: date,
      department: dept
    });

    const gtTime = allMetrics.find(m => m.metric_code === 'GT_TIME')?.value || 0;
    const helpTime = allMetrics.find(m => m.metric_code === 'HELP_TIME')?.value || 0;
    const neTime = allMetrics.find(m => m.metric_code === 'NE_TIME')?.value || 0;
    const odTime = allMetrics.find(m => m.metric_code === 'OD_TIME')?.value || 0;

    const natTime = gtTime + helpTime - neTime - odTime;

    const natMetric = allMetrics.find(m => m.metric_code === 'NAT_TIME');
    if (natMetric) {
      await base44.entities.DailyMetricValue.update(natMetric.id, {
        value: natTime
      });
    }
  } catch (error) {
    console.error('Failed to save NAT_TIME metric:', error);
  }
}

export async function saveOCRTeamsTimeData(confirmed, batchHeaderId, onSuccess, currentDept) {
  const { team_persons = [], team_extra = [], help_in = [] } = confirmed;

  if (!batchHeaderId) {
    toast.error("Δεν βρέθηκε batch. Αδύνατη αποθήκευση.");
    return;
  }

  // Check if data already exists
  const existingPersons = await base44.entities.TeamTimePerson.filter({ batch_header_id: batchHeaderId });
  const existingExtra = await base44.entities.Team_Time_Extra.filter({ batch_header_id: batchHeaderId });
  const existingHelpIn = await base44.entities.Help_In.filter({ batch_header_id: batchHeaderId });
  
  if (existingPersons.length > 0 || existingExtra.length > 0 || existingHelpIn.length > 0) {
    const shouldReplace = window.confirm(
      `⚠️ Υπάρχουν ήδη δεδομένα Teams Time για αυτό το batch.\n\nΘέλετε να:\n- ΟΚ: Αντικαταστήστε τα παλιά δεδομένα\n- Άκυρο: Ακυρώστε την αποθήκευση`
    );
    
    if (!shouldReplace) {
      toast.info("Η αποθήκευση ακυρώθηκε.");
      return;
    }
    
    // Delete existing data
    for (const p of existingPersons) {
      await base44.entities.TeamTimePerson.delete(p.id);
    }
    for (const e of existingExtra) {
      await base44.entities.Team_Time_Extra.delete(e.id);
    }
    for (const h of existingHelpIn) {
      await base44.entities.Help_In.delete(h.id);
    }
  }

  let personsCreated = 0;
  let extraCreated = 0;
  let helpInCreated = 0;

  // ── 1. Team Time Persons ────────────────────────────────────────────────
  for (const p of team_persons) {
    // Accept time_from or from_time (modal uses time_from)
    const fromTime = p.time_from || p.from_time || "";
    const toTime = p.time_to || p.to_time || "";
    if (!p.person_name || !p.person_name.trim()) continue;
    await base44.entities.TeamTimePerson.create({
      batch_header_id: batchHeaderId,
      person_name: p.person_name,
      from_time: fromTime,
      to_time: toTime,
      break_time_minutes: p.break_min ?? 45,
      notes: p.notes || ""
    });
    personsCreated++;
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // ── 2. Team Time Extra ──────────────────────────────────────────────────
  for (const e of team_extra) {
    if (!e.person_name) continue;
    const totalMins = ((e.duration_hours || 0) * 60) + (e.duration_mins || 0);
    await base44.entities.Team_Time_Extra.create({
      batch_header_id: batchHeaderId,
      person_name: e.person_name,
      charge_dept: (e.charge_dept && e.charge_dept.trim()) || currentDept || "",
      work_type: e.work_type || "",
      duration_min: totalMins,
      description: e.description || ""
    });
    extraCreated++;
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // ── 3. Help In ──────────────────────────────────────────────────────────────
  for (const h of help_in) {
    if (!h.person_name) continue;
    await base44.entities.Help_In.create({
      batch_header_id: batchHeaderId,
      person_name: h.person_name,
      department: h.receiving_dept || currentDept || "",
      from_department: h.providing_dept || "",
      help_min: h.help_time_min || 0
    });
    helpInCreated++;
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // ── 4. Update Metrics ───────────────────────────────────────────────────
  await saveGTTimeMetric(batchHeaderId);
  await saveNATTimeMetric(batchHeaderId);

  toast.success(`✅ OCR αποθηκεύτηκε: ${personsCreated} άτομα · ${extraCreated} εργασίες Extra · ${helpInCreated} Help In`);
  if (onSuccess) onSuccess();
}