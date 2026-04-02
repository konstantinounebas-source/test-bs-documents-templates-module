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

  // ── Single-pass OCR + validation via gemini_3_flash (faster) ────────────────
  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    model: "gemini_3_flash",
    prompt: `Εξάγαγε δεδομένα από τη φόρμα ΗΜΕΡΗΣΙΑ ΠΑΡΑΓΩΓΗ.

ΚΑΤΑΝΟΜΗ ΣΤΗΛΩΝ:
1. date | 2. item_code | 3. batch_number | 4. scheduled_quantity (num)
5-10. initial_qc_* (bools) | 11-14. required_treatments_* (bools) | 15-16. additional_treatments_* (num) 
17-18. paint_preparation_* (bools) | 19. rework_from_dept_head (num) | 20. total_delivery_quantity (num) | 21. destroyed_beyond_repair (bool)

ΚΑΝΟΝΕΣ:
- Checkboxes: true=✓/x/✗/●, false=άδειο
- Αριθμοί: null αν κενό (ΌΧΙ 0)
- Αν αριθμός μέσα σε checkbox → checkbox=true, δεν είναι αριθμός παράδοσης
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
  const validationResult = { issues: result.issues || [], confidence_score: result.confidence_score };

  return Response.json({
    extracted_data: extracted,
    validation: validationResult,
    corrected_data: extracted
  });
});