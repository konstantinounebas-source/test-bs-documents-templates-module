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

  // ── Step 1: OCR via vision LLM ────────────────────────────────────────────
  const extracted = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `Αναλύσε αυτή την εικόνα που είναι μια φόρμα "ΗΜΕΡΗΣΙΑ ΠΑΡΑΓΩΓΗ" (Daily Production Form) στα ελληνικά.
    
Εξάγαγε ΟΛΕΣ τις γραμμές παραγωγής που βλέπεις στον πίνακα. Κάθε γραμμή αντιστοιχεί σε έναν κωδικό κομματιού.

Η φόρμα έχει τις εξής στήλες (αριστερά προς τα δεξιά):
1. Ημερομηνία (μόνο στην πρώτη γραμμή)
2. Κωδικός Κομματιών (item_code) 
3. Αρ. Παρτίδας (batch_number)
4. Ποσότητα Προγραμματισμού (scheduled_quantity) - αριθμός
5. Αντληση από Stock (initial_qc_stock_pull) - checkbox: true αν τσεκαρισμένο
6. Remake (initial_qc_remake) - checkbox
7. Σκουριασμένα (initial_qc_rusty) - checkbox
8. Γδαρσίματα/Κτυπήματα (initial_qc_scratches_dents) - checkbox
9. Λάδια/Αστάρια/Ακαθαρσίες (initial_qc_oils_primers_dirt) - checkbox
10. Άλλα (initial_qc_other_issues) - checkbox
11. Zink (required_treatments_zink) - checkbox
12. Τρίψιμο (required_treatments_sanding) - checkbox
13. Διχρωμίες-Masking (required_treatments_color_masking) - checkbox
14. Ισοπό,Σιλικόνη,ΚΤΛ (required_treatments_fillers_silicone) - checkbox
15. Συνολο κομματιών επιπρόσθετων (additional_treatments_total_pieces) - αριθμός
16. Εκτίμηση Χρόνου Λεπτά (additional_treatments_time_mins) - αριθμός
17. Κρέμασμα (paint_preparation_hanging) - checkbox
18. Καθαρισμός Φούρνου (paint_preparation_oven_cleaning) - checkbox
19. Επαναπροωθήσεις από Τμηματάρχη (rework_from_dept_head) - αριθμός
20. Συνολική Ποσότητα Παράδοσης (total_delivery_quantity) - αριθμός
21. Καταστροφή-Πέραν Επιδιόρθωσης (destroyed_beyond_repair) - checkbox

Οδηγίες:
- Για checkboxes: true αν είναι τσεκαρισμένο (✓, x, ✗, ●, γεμάτο), false αν είναι άδειο
- Αν κάποιο πεδίο δεν φαίνεται, βάλε null
- Ημερομηνία σε format YYYY-MM-DD αν είναι δυνατό
- Διάβασε προσεκτικά τους αριθμούς (προσοχή σε 0 vs O, 1 vs l)`,
    file_urls: [file_url],
    response_json_schema: PRODUCTION_FORM_SCHEMA
  });

  if (!extracted || typeof extracted !== 'object') {
    return Response.json({ error: 'OCR extraction failed' }, { status: 422 });
  }

  // ── Step 2: AI validation ─────────────────────────────────────────────────
  const validationResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `Είσαι ειδικός QC σε manufacturing παραγωγή. Έχεις εξαγάγει δεδομένα μέσω OCR από τη φόρμα "ΗΜΕΡΗΣΙΑ ΠΑΡΑΓΩΓΗ". 
Αναλύσε τα δεδομένα για λάθη και αναντιστοιχίες.

Δεδομένα OCR:
${JSON.stringify(extracted, null, 2)}

Κανόνες επικύρωσης:
1. ΥΠΟΧΡΕΩΤΙΚΑ ΠΕΔΙΑ: item_code πρέπει να υπάρχει σε κάθε γραμμή
2. ΑΡΙΘΜΗΤΙΚΑ: scheduled_quantity, total_delivery_quantity, rework_from_dept_head πρέπει να είναι >= 0
3. ΛΟΓΙΚΟΣ ΕΛΕΓΧΟΣ: total_delivery_quantity δεν πρέπει να υπερβαίνει scheduled_quantity + rework_from_dept_head
4. OCR ΛΑΘΗ: Ψάξε για πιθανά OCR λάθη (0 vs O, 1 vs I, κλπ)
5. ΕΛΛΕΙΨΕΙΣ: Αν μια γραμμή έχει κατεργασίες αλλά δεν έχει ποσότητες, σημείωσε το
6. ΗΜΕΡΟΜΗΝΙΑ: Πρέπει να είναι σε μορφή YYYY-MM-DD

Επέστρεψε JSON.`,
    response_json_schema: {
      type: "object",
      properties: {
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
        corrected_data: { type: "object" },
        confidence_score: { type: "number" }
      }
    }
  });

  return Response.json({
    extracted_data: extracted,
    validation: validationResult,
    corrected_data: validationResult?.corrected_data || extracted
  });
});