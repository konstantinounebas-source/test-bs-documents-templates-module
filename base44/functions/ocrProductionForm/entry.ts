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

  // ── Single-pass OCR + validation ────────────────
  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    model: "gpt_5_mini",
    prompt: `Εξάγαγε δεδομένα από τη φόρμα ΗΜΕΡΗΣΙΑ ΠΑΡΑΓΩΓΗ.

ΚΑΤΑΝΟΜΗ ΚΑΙ ΣΕΙΡΑ ΣΤΗΛΩΝ ΑΝΑ ΓΡΑΜΜΗ ΠΑΡΑΓΩΓΗΣ (σε αυτήν ακριβώς τη σειρά):

1. item_code (ΚΕΙΜΕΝΟ): Κωδικός Κομματιών (π.χ. C50, C33).
2. batch_number (ΑΡΙΘΜΟΣ): Αριθμός Παρτίδας.
3. scheduled_quantity (ΑΡΙΘΜΟΣ): Ποσότητα Προγραμματισμού.
4. initial_qc_stock_pull (ΑΡΙΘΜΟΣ): Αντλ. από Stock (Πόσα κομμάτια τραβήχτηκαν από το αρχικό stock για QC).
5. initial_qc_remake (ΑΡΙΘΜΟΣ): Remake (Πόσα κομμάτια προέρχονται από διαδικασία remake).
6. initial_qc_rusty (ΑΡΙΘΜΟΣ): Σκουριασμένα (Πόσα κομμάτια βρέθηκαν σκουριασμένα).
7. initial_qc_scratches_dents (ΑΡΙΘΜΟΣ): Γδαρσίματα / Κτυπήματα.
8. initial_qc_oils_primers_dirt (ΑΡΙΘΜΟΣ): Λάδια / Αστάρια / Ακαθαρσίες.
9. initial_qc_other_issues (ΑΡΙΘΜΟΣ): Άλλα θέματα QC.
10. required_treatments_zink (ΑΡΙΘΜΟΣ): Zink (Πόσα κομμάτια απαιτούν Zink).
11. required_treatments_sanding (ΑΡΙΘΜΟΣ): Τρίψιμο.
12. required_treatments_color_masking (ΑΡΙΘΜΟΣ): Διχρωμίες – Masking.
13. required_treatments_fillers_silicone (ΑΡΙΘΜΟΣ): Ισοπό, Σιλικόνη, ΚΤΛ.
14. additional_treatments_total_pieces (ΑΡΙΘΜΟΣ): Σύνολο κομματιών για πρόσθετες κατεργασίες.
15. additional_treatments_time_mins (ΑΡΙΘΜΟΣ): Εκτίμηση χρόνου σε λεπτά.
16. paint_preparation_hanging (ΑΡΙΘΜΟΣ): Κρέμασμα.
17. paint_preparation_oven_cleaning (ΑΡΙΘΜΟΣ): Καθαρισμός φούρνου.
18. rework_from_dept_head (ΑΡΙΘΜΟΣ): Επαναπροωθήσεις από Τμηματάρχη.
19. total_delivery_quantity (ΑΡΙΘΜΟΣ): Συνολική Ποσότητα Παράδοσης.
20. destroyed_beyond_repair (ΑΡΙΘΜΟΣ): Καταστροφή – Πέραν Επιδιόρθωσης.

ΓΕΝΙΚΕΣ ΟΔΗΓΙΕΣ:
- Εξάγε την **date** σε μορφή dd/mm/yyyy.

ΚΑΝΟΝΕΣ ΕΞΑΓΩΓΗΣ ΤΙΜΩΝ:
1. Σαφείς Αριθμοί: Εάν κελί περιέχει αριθμό, εξάγε τον αριθμό.
2. Κενά Κελιά: Εάν κελί είναι κενό → null (ΟΧΙ 0, εκτός αν το 0 είναι σαφώς γραμμένο).
3. Ειδική Χειρισμός 'Τικ' (✓): Εάν κελί έχει τικ/σύμβολο αντί αριθμού:
   - Τιμή: Εξάγε την τιμή του total_delivery_quantity για την ίδια γραμμή.
   - Warning: Πρόσθεσε warning "Εντοπίστηκε 'τικ' αντί για αριθμός, τιμή συμπληρώθηκε από total_delivery_quantity."
4. Μη Αριθμητικά Δεδομένα: Εάν κελί έχει μη-αριθμητικό κείμενο (ΝΑ, ΟΧΙ, κ.λπ.):
   - Τιμή: null
   - Warning: "Βρέθηκαν μη-αριθμητικά δεδομένα όπου αναμενόταν αριθμός."

confidence_score: Βαθμολογία 0-100 για εμπιστοσύνη OCR.`,
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