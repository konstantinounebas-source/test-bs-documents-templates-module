import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const PRODUCTION_FORM_SCHEMA = {
  type: "object",
  properties: {
    date: { type: "string", description: "Ημερομηνία παραγωγής (format: YYYY-MM-DD)" },
    production_lines: {
      type: "array",
      items: {
        type: "object",
        properties: {
          item_code: { type: "string", description: "Κωδικός Κομματιού (π.χ. C50, C33)" },
          batch_number: { type: "string", description: "Αριθμός Παρτίδας" },
          scheduled_quantity: { type: "number", description: "Ποσότητα Προγραμματισμού" },
          initial_qc_stock_pull: { type: "boolean", description: "Αντληση από Stock" },
          initial_qc_remake: { type: "boolean", description: "Remake" },
          initial_qc_rusty: { type: "boolean", description: "Σκουριασμένα" },
          initial_qc_scratches_dents: { type: "boolean", description: "Γδαρσίματα / Κτυπήματα" },
          initial_qc_oils_primers_dirt: { type: "boolean", description: "Λάδια / Αστάρια / Ακαθαρσίες" },
          initial_qc_other_issues: { type: "boolean", description: "Άλλα" },
          required_treatments_zink: { type: "boolean", description: "Zink" },
          required_treatments_sanding: { type: "boolean", description: "Τρίψιμο" },
          required_treatments_color_masking: { type: "boolean", description: "Διχρωμίες - Masking" },
          required_treatments_fillers_silicone: { type: "boolean", description: "Ισοπό, Σιλικόνη, ΚΤΛ" },
          additional_treatments_total_pieces: { type: "number", description: "Συνολο κομματιών (Τρύπιμα, Ισιωμα ΚΤΛ)" },
          additional_treatments_time_mins: { type: "number", description: "Εκτίμηση Συνολικού Χρόνου (Λεπτά)" },
          paint_preparation_hanging: { type: "boolean", description: "Κρέμασμα" },
          paint_preparation_oven_cleaning: { type: "boolean", description: "Καθαρισμός Κομματιών μέσα στον Φούρνο" },
          rework_from_dept_head: { type: "number", description: "Επαναπροωθήσεις από Τμηματάρχη" },
          total_delivery_quantity: { type: "number", description: "Συνολική Ποσότητα Παράδοσης" },
          destroyed_beyond_repair: { type: "boolean", description: "Καταστροφή - Πέραν Επιδιόρθωσης" }
        }
      }
    }
  }
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { file_url } = await req.json();
  if (!file_url) return Response.json({ error: 'file_url is required' }, { status: 400 });

  // Detect file type (PDF or image)
  const isPDF = file_url.toLowerCase().endsWith('.pdf');
  const model = isPDF ? "gemini_3_flash" : "gpt_5_mini";

  // ── Single-pass OCR + validation ────────────────
  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    model: model,
    prompt: `Εξάγαγε δεδομένα από τη φόρμα ΗΜΕΡΗΣΙΑ ΠΑΡΑΓΩΓΗ.

BOOLEAN ΠΕΔΙΑ (checkbox: true αν ✓/x/✗/● ή marked, false αν κενό):
- initial_qc_stock_pull, initial_qc_remake, initial_qc_rusty, initial_qc_scratches_dents, initial_qc_oils_primers_dirt, initial_qc_other_issues
- required_treatments_zink, required_treatments_sanding, required_treatments_color_masking, required_treatments_fillers_silicone
- paint_preparation_hanging, paint_preparation_oven_cleaning
- destroyed_beyond_repair

NUMERIC ΠΕΔΙΑ (αριθμός ή null αν κενό):
- batch_number, scheduled_quantity, additional_treatments_total_pieces, additional_treatments_time_mins, rework_from_dept_head, total_delivery_quantity

⚠️ ΚΑΝΟΝΕΣ:
- ΔΕΝ βάζεις αριθμούς σε BOOLEAN πεδία - ΜΟΝΟ true ή false
- ΔΕΝ βάζεις αριθμούς στην στήλη item_code - ΜΟΝΟ κωδικός
- Κενό → null για numeric, false για boolean
- confidence_score: 0-100`,
    file_urls: [file_url],
    response_json_schema: {
      type: "object",
      properties: {
        date: { type: "string" },
        production_lines: PRODUCTION_FORM_SCHEMA.properties.production_lines,
        issues: {
          type: "array",
          items: {
            type: "object",
            properties: {
              field: { type: "string" },
              line_index: { type: "number" },
              severity: { type: "string" },
              message: { type: "string" },
              suggested_fix: { type: "string" }
            }
          }
        },
        confidence_score: { type: "number" }
      }
    }
  });

  if (!result || typeof result !== 'object') {
    return Response.json({ error: 'OCR extraction failed' }, { status: 422 });
  }

  const extracted = { date: result.date, production_lines: result.production_lines };
  
  // Generate issues for numeric fields that got checkbox values
  const numericFields = [
    "batch_number", "scheduled_quantity",
    "initial_qc_stock_pull", "initial_qc_remake",
    "initial_qc_rusty", "initial_qc_scratches_dents", "initial_qc_oils_primers_dirt", "initial_qc_other_issues",
    "required_treatments_zink", "required_treatments_sanding", "required_treatments_color_masking", "required_treatments_fillers_silicone",
    "additional_treatments_total_pieces", "additional_treatments_time_mins",
    "paint_preparation_hanging", "paint_preparation_oven_cleaning",
    "rework_from_dept_head", "total_delivery_quantity", "destroyed_beyond_repair"
  ].filter(f => !["item_code", "destroyed_beyond_repair", "initial_qc_stock_pull", "initial_qc_remake", 
                    "initial_qc_rusty", "initial_qc_scratches_dents", "initial_qc_oils_primers_dirt", "initial_qc_other_issues",
                    "required_treatments_zink", "required_treatments_sanding", "required_treatments_color_masking", "required_treatments_fillers_silicone",
                    "paint_preparation_hanging", "paint_preparation_oven_cleaning"].includes(f));
  
  const issues = result.issues || [];
  (extracted.production_lines || []).forEach((line, lineIdx) => {
    numericFields.forEach(field => {
      if (line[field] === true) {
        issues.push({
          line_index: lineIdx,
          field: field,
          severity: "warning",
          message: `Βρέθηκε τικ αντί αριθμού - αντικαταστάθηκε με Ποσότητα Παράδοσης`,
          suggested_fix: `Έχει τιμή: ${line.total_delivery_quantity || 0}`
        });
      }
    });
  });
  
  const validationResult = { issues: issues, confidence_score: result.confidence_score };

  return Response.json({
    extracted_data: extracted,
    validation: validationResult,
    corrected_data: extracted
  });
});