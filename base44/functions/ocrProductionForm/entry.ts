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
    prompt: `Αναλύσε αυτή την εικόνα που είναι μια φόρμα "ΗΜΕΡΗΣΙΑ ΠΑΡΑΓΩΓΗ" (Daily Production Form) στα ελληνικά.

ΕΞΑΓΩΓΗ ΔΕΔΟΜΕΝΩΝ:
Εξάγαγε ΟΛΕΣ τις γραμμές παραγωγής. Κάθε γραμμή = ένας κωδικός κομματιού.

Στήλες φόρμας (αριστερά → δεξιά):
1. Ημερομηνία (μόνο πρώτη γραμμή)
2. item_code - Κωδικός Κομματιών
3. batch_number - Αρ. Παρτίδας
4. scheduled_quantity - Ποσότητα Προγραμματισμού (αριθμός)
5. initial_qc_stock_pull - Αντληση από Stock (checkbox)
6. initial_qc_remake - Remake (checkbox)
7. initial_qc_rusty - Σκουριασμένα (checkbox)
8. initial_qc_scratches_dents - Γδαρσίματα/Κτυπήματα (checkbox)
9. initial_qc_oils_primers_dirt - Λάδια/Αστάρια/Ακαθαρσίες (checkbox)
10. initial_qc_other_issues - Άλλα (checkbox)
11. required_treatments_zink - Zink (checkbox)
12. required_treatments_sanding - Τρίψιμο (checkbox)
13. required_treatments_color_masking - Διχρωμίες-Masking (checkbox)
14. required_treatments_fillers_silicone - Ισοπό,Σιλικόνη,ΚΤΛ (checkbox)
15. additional_treatments_total_pieces - Συνολο επιπρόσθετων κομματιών (αριθμός)
16. additional_treatments_time_mins - Εκτίμηση Χρόνου Λεπτά (αριθμός)
17. paint_preparation_hanging - Κρέμασμα (checkbox)
18. paint_preparation_oven_cleaning - Καθαρισμός Φούρνου (checkbox)
19. rework_from_dept_head - Επαναπροωθήσεις από Τμηματάρχη (αριθμός)
20. total_delivery_quantity - Συνολική Ποσότητα Παράδοσης (αριθμός)
21. destroyed_beyond_repair - Καταστροφή-Πέραν Επιδιόρθωσης (checkbox)

Κανόνες:
- Checkboxes: true αν τσεκαρισμένο (✓, x, ✗, ●), false αν άδειο
- Αριθμοί: null (ΌΧΙ 0) αν δεν φαίνεται ή κελί είναι άδειο (προσοχή 0 vs O, 1 vs l)
- Ημερομηνία: YYYY-MM-DD
- Αν κελί αριθμητικό είναι κενό/άδειο → null, ΌΧΙ 0

ΕΠΙΚΥΡΩΣΗ (στο issues):
- Έλεγξε αν paint_preparation_hanging = true και total_delivery_quantity = null/0/έλλειπει → ΑΛΕΡΤ: "Κρέμασμα = ✓ αλλά Συνολική Ποσότητα Παράδοσης λείπει/0"
- Έλεγξε αν total_delivery_quantity > scheduled_quantity + rework_from_dept_head → ΑΛΕΡΤ: "Παράδοση > Προγρ/σμού + Επαναπροωθήσεις"
- Έλεγξε αν κάποιο boolean=true αλλά total_delivery_quantity=0 (δηλ. δεν υπάρχει αριθμός στη σειρά) → ΑΛΕΡΤ
- Δεν εξάγεις issue αν το boolean=false (άδειο κελί)
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