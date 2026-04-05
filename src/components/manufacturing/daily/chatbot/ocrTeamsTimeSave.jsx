import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * Saves OCR Teams Time Form data into Team_Time_Persons and Team_Time_Extra.
 * @param {object} confirmed - { team_persons: [], team_extra: [] }
 * @param {string} batchHeaderId
 * @param {function} onSuccess
 */
export async function saveOCRTeamsTimeData(confirmed, batchHeaderId, onSuccess) {
  const { team_persons = [], team_extra = [] } = confirmed;

  if (!batchHeaderId) {
    toast.error("Δεν βρέθηκε batch. Αδύνατη αποθήκευση.");
    return;
  }

  let personsCreated = 0;
  let extraCreated = 0;

  // ── 1. Team Time Persons ────────────────────────────────────────────────
  for (const p of team_persons) {
    if (!p.person_name || !p.time_from || !p.time_to) continue;
    await base44.entities.Team_Time_Persons.create({
      batch_header_id: batchHeaderId,
      person_name: p.person_name,
      from_time: p.time_from,
      to_time: p.time_to,
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
      charge_dept: e.charge_dept || "",
      work_type: e.work_type || "",
      duration_min: totalMins,
      description: e.description || ""
    });
    extraCreated++;
  }

  toast.success(`✅ OCR αποθηκεύτηκε: ${personsCreated} άτομα · ${extraCreated} εργασίες Extra`);
  if (onSuccess) onSuccess();
}