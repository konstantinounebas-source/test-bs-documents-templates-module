import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * Saves OCR Teams Time Form data into Team_Time_Persons and Team_Time_Extra.
 * @param {object} confirmed - { team_persons: [], team_extra: [] }
 * @param {string} batchHeaderId
 * @param {function} onSuccess
 */
export async function saveOCRTeamsTimeData(confirmed, batchHeaderId, onSuccess, currentDept) {
  const { team_persons = [], team_extra = [] } = confirmed;

  if (!batchHeaderId) {
    toast.error("Δεν βρέθηκε batch. Αδύνατη αποθήκευση.");
    return;
  }

  let personsCreated = 0;
  let extraCreated = 0;

  // ── 1. Team Time Persons ────────────────────────────────────────────────
  for (const p of team_persons) {
    // Accept time_from or from_time (modal uses time_from)
    const fromTime = p.time_from || p.from_time;
    const toTime = p.time_to || p.to_time;
    if (!p.person_name || !fromTime || !toTime) continue;
    await base44.entities.Team_Time_Persons.create({
      batch_header_id: batchHeaderId,
      person_name: p.person_name,
      from_time: fromTime,
      to_time: toTime,
      break_min: p.break_min ?? 45,
      notes: p.notes || ""
    });
    personsCreated++;
  }

  // ── 2. Team Time Extra ──────────────────────────────────────────────────
  for (const e of team_extra) {
    if (!e.person_name) continue;
    const totalMins = ((e.duration_hours || 0) * 60) + (e.duration_mins || 0);
    await base44.entities.Team_Time_Extra.create({
      batch_header_id: batchHeaderId,
      person_name: e.person_name,
      charge_dept: e.charge_dept || currentDept || "",
      work_type: e.work_type || "",
      duration_min: totalMins,
      description: e.description || ""
    });
    extraCreated++;
  }

  toast.success(`✅ OCR αποθηκεύτηκε: ${personsCreated} άτομα · ${extraCreated} εργασίες Extra`);
  if (onSuccess) onSuccess();
}