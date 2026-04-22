import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * Save corrected Sub-Assembly OCR data to the database
 */
export async function saveSubAssemblyOCRData(
  confirmedData,
  batchHeaderId,
  onComplete,
  department
) {
  try {
    // confirmedData contains:
    // - sub_assembly_entries: array of items with section and A/B/C values
    // - date: form date
    // - department: department name
    // - validation: confidence score, issues

    // For now, save to Batch_Lines with OCR metadata
    // Future: create a dedicated Sub-Assembly table if needed

    if (!batchHeaderId || !confirmedData?.sub_assembly_entries) {
      console.warn("Missing batchHeaderId or sub_assembly_entries");
      onComplete?.();
      return;
    }

    // Check if sub-assembly data already exists
    const existingSubAssembly = await base44.entities.Batch_Lines.filter({
      batch_header_id: batchHeaderId,
      form_type: "sub_assembly"
    });

    if (existingSubAssembly.length > 0) {
      const shouldReplace = window.confirm(
        `⚠️ Υπάρχουν ήδη ${existingSubAssembly.length} δεδομένα Sub-Assembly για αυτό το batch.\n\nΘέλετε να:\n- ΟΚ: Αντικαταστήστε τα παλιά δεδομένα\n- Άκυρο: Ακυρώστε την αποθήκευση`
      );

      if (!shouldReplace) {
        toast.info("Η αποθήκευση ακυρώθηκε.");
        onComplete?.();
        return;
      }

      // Delete existing sub-assembly records
      for (const record of existingSubAssembly) {
        await base44.entities.Batch_Lines.delete(record.id);
      }
    }

    // Create batch lines from sub-assembly entries
    const linesToCreate = confirmedData.sub_assembly_entries.map((entry) => ({
      batch_header_id: batchHeaderId,
      item_code: entry.id || entry.name,
      item_name: entry.name,
      section: entry.section,
      a_remainder: entry.A_Remainder,
      a_planned: entry.A_Planned,
      a_actual: entry.A_Actual,
      b_remainder: entry.B_Remainder,
      b_planned: entry.B_Planned,
      b_actual: entry.B_Actual,
      c_remainder: entry.C_Remainder,
      c_planned: entry.C_Planned,
      c_actual: entry.C_Actual,
      ocr_confidence: confirmedData.validation?.confidence_score || 0.85,
      ocr_date: confirmedData.date,
      form_type: "sub_assembly"
    }));

    // Bulk create or update
    if (linesToCreate.length > 0) {
      await base44.entities.Batch_Lines.bulkCreate(linesToCreate);
    }

    onComplete?.();
  } catch (error) {
    console.error("Error saving Sub-Assembly OCR data:", error);
    onComplete?.();
  }
}