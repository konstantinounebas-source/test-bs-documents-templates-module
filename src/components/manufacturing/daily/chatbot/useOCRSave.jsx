import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// OCR field → QC_Initial_Stock qc_type mapping
const QC_TYPE_MAP = [
  { ocrField: "initial_qc_rusty",            qcType: "Σκουριασμένα" },
  { ocrField: "initial_qc_scratches_dents",  qcType: "Γδαρσίματα / Κτυπήματα" },
  { ocrField: "initial_qc_oils_primers_dirt",qcType: "Λάδια / Αστάρια / Ακαθαρσίες" },
  { ocrField: "initial_qc_other_issues",     qcType: "Άλλα" },
];

// OCR field → Operations operation name mapping
const OPERATION_MAP = [
  { ocrField: "required_treatments_zink",             operation: "Zink" },
  { ocrField: "required_treatments_sanding",          operation: "Τρίψιμο" },
  { ocrField: "required_treatments_color_masking",    operation: "Διχρωμίες - Masking" },
  { ocrField: "required_treatments_fillers_silicone", operation: "Ισοπό, Σιλικόνη, ΚΤΛ" },
  { ocrField: "paint_preparation_hanging",            operation: "Κρέμασμα" },
  { ocrField: "paint_preparation_oven_cleaning",      operation: "Καθαρισμός Κομματιών μέσα στον Φούρνο" },
];

const ADDITIONAL_TREATMENTS_OPERATION = "Επιπρόσθετες Κατεργασίες";
const QC_LEVEL_DEFAULT = "Medium";

function isPositive(val) {
  return val !== null && val !== undefined && Number(val) > 0;
}

/**
 * Saves OCR confirmed data into the database.
 * @param {object} confirmed - { date: string (mm/dd/yyyy), production_lines: [] }
 * @param {string} batchHeaderId - existing BatchHeader id
 * @param {function} onSuccess - callback after successful save
 */
export async function saveOCRData(confirmed, batchHeaderId, onSuccess) {
  const { production_lines = [] } = confirmed;

  if (!batchHeaderId) {
    toast.error("Δεν βρέθηκε batch. Αδύνατη αποθήκευση OCR.");
    return;
  }

  let totalCreated = 0;

  for (const line of production_lines) {
    const itemCode = line.item_code;
    if (!itemCode) continue;

    // ── 1. Batch_Lines ────────────────────────────────────────────────────────
    const batchLineData = {
      batch_header_id: batchHeaderId,
      item_code: itemCode,
    };
    if (isPositive(line.scheduled_quantity))       batchLineData.scheduled_qty   = Number(line.scheduled_quantity);
    if (isPositive(line.initial_qc_stock_pull))    batchLineData.qty_from_stock  = Number(line.initial_qc_stock_pull);
    if (isPositive(line.initial_qc_remake))        batchLineData.qty_remake      = Number(line.initial_qc_remake);
    if (isPositive(line.total_delivery_quantity))  batchLineData.qty_processed   = Number(line.total_delivery_quantity);
    if (isPositive(line.rework_from_dept_head))    batchLineData.qty_reforward   = Number(line.rework_from_dept_head);
    if (isPositive(line.destroyed_beyond_repair))  batchLineData.qty_scrap       = Number(line.destroyed_beyond_repair);

    await base44.entities.Batch_Lines.create(batchLineData);
    totalCreated++;

    // ── 2. QC_Initial_Stock ───────────────────────────────────────────────────
    const qcRecords = QC_TYPE_MAP
      .filter(({ ocrField }) => isPositive(line[ocrField]))
      .map(({ ocrField, qcType }) => ({
        batch_header_id: batchHeaderId,
        item_code: itemCode,
        qc_type: qcType,
        qc_level: QC_LEVEL_DEFAULT,
        qty_affected: Number(line[ocrField]),
      }));

    if (qcRecords.length > 0) {
      await base44.entities.QC_Initial_Stock.bulkCreate(qcRecords);
    }

    // ── 3. Operations ─────────────────────────────────────────────────────────
    const opRecords = OPERATION_MAP
      .filter(({ ocrField }) => isPositive(line[ocrField]))
      .map(({ ocrField, operation }) => ({
        batch_header_id: batchHeaderId,
        item_code: itemCode,
        operation,
        qty_operation: Number(line[ocrField]),
        source_type: "MANUAL",
      }));

    // Additional treatments (qty + time as one record)
    if (isPositive(line.additional_treatments_total_pieces)) {
      opRecords.push({
        batch_header_id: batchHeaderId,
        item_code: itemCode,
        operation: ADDITIONAL_TREATMENTS_OPERATION,
        qty_operation: Number(line.additional_treatments_total_pieces),
        operation_time_min: isPositive(line.additional_treatments_time_mins)
          ? Number(line.additional_treatments_time_mins)
          : 0,
        source_type: "MANUAL",
      });
    }

    if (opRecords.length > 0) {
      await base44.entities.Operations.bulkCreate(opRecords);
    }
  }

  toast.success(`✅ OCR αποθηκεύτηκε: ${totalCreated} γραμμές`);
  onSuccess && onSuccess();
}