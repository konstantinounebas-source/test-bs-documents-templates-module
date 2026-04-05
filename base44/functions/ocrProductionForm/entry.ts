import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const PRODUCTION_FORM_SCHEMA = {
  type: "object",
  properties: {
    date: { type: "string", description: "Ημερομηνία παραγωγής (format: dd/mm/yyyy)" },
    production_lines: {
      type: "array",
      items: {
        type: "object",
        properties: {
          item_code: { type: "string", description: "Κωδικός Κομματιού (π.χ. C50, C33)" },
          batch_number: { type: "string", description: "Αριθμός Παρτίδας" },
          scheduled_quantity: { type: "number", description: "Ποσότητα Προγραμματισμού" },
          initial_qc_stock_pull: { type: "number", description: "Αντληση από Stock" },
          initial_qc_remake: { type: "number", description: "Remake" },
          initial_qc_rusty: { type: "number", description: "Σκουριασμένα" },
          initial_qc_scratches_dents: { type: "number", description: "Γδαρσίματα / Κτυπήματα" },
          initial_qc_oils_primers_dirt: { type: "number", description: "Λάδια / Αστάρια / Ακαθαρσίες" },
          initial_qc_other_issues: { type: "number", description: "Άλλα" },
          required_treatments_zink: { type: "number", description: "Zink" },
          required_treatments_sanding: { type: "number", description: "Τρίψιμο" },
          required_treatments_color_masking: { type: "number", description: "Διχρωμίες - Masking" },
          required_treatments_fillers_silicone: { type: "number", description: "Ισοπό, Σιλικόνη, ΚΤΛ" },
          additional_treatments_total_pieces: { type: "number", description: "Συνολο κομματιών (Τρύπιμα, Ισιωμα ΚΤΛ)" },
          additional_treatments_time_mins: { type: "number", description: "Εκτίμηση Συνολικού Χρόνου (Λεπτά)" },
          paint_preparation_hanging: { type: "number", description: "Κρέμασμα" },
          paint_preparation_oven_cleaning: { type: "number", description: "Καθαρισμός Κομματιών μέσα στον Φούρνο" },
          rework_from_dept_head: { type: "number", description: "Επαναπροωθήσεις από Τμηματάρχη" },
          total_delivery_quantity: { type: "number", description: "Συνολική Ποσότητα Παράδοσης" },
          destroyed_beyond_repair: { type: "number", description: "Καταστροφή - Πέραν Επιδιόρθωσης" }
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

  // Detect file type - gemini supports PDFs, gpt_5_mini for images
  const isPDF = file_url.toLowerCase().includes('.pdf') || file_url.toLowerCase().includes('pdf');
  const model = isPDF ? "gemini_3_flash" : "gpt_5_mini";

  // ── Single-pass OCR ────────────────
  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    model: model,
    prompt: `Extract data from this ΗΜΕΡΗΣΙΑ ΠΑΡΑΓΩΓΗ production form. Return JSON.

date: production date as dd/mm/yyyy.

For each production row extract these fields in order:
item_code (text, e.g. C50), batch_number, scheduled_quantity,
initial_qc_stock_pull, initial_qc_remake, initial_qc_rusty, initial_qc_scratches_dents, initial_qc_oils_primers_dirt, initial_qc_other_issues,
required_treatments_zink, required_treatments_sanding, required_treatments_color_masking, required_treatments_fillers_silicone,
additional_treatments_total_pieces, additional_treatments_time_mins,
paint_preparation_hanging, paint_preparation_oven_cleaning,
rework_from_dept_head, total_delivery_quantity, destroyed_beyond_repair.

Rules: empty cell = null, number cell = number, tick/checkmark = use total_delivery_quantity value.
confidence_score: 0-100.`,
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
  
  const issues = result.issues || [];
  
  const validationResult = { issues: issues, confidence_score: result.confidence_score };

  return Response.json({
    extracted_data: extracted,
    validation: validationResult,
    corrected_data: extracted
  });
});