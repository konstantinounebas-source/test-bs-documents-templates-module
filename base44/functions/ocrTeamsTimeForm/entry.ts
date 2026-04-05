import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const TEAMS_TIME_SCHEMA = {
  type: "object",
  properties: {
    date: { type: "string", description: "Ημερομηνία σε μορφή dd/mm/yyyy" },
    completed_by: { type: "string", description: "Συμπληρώθηκε από" },
    team: { type: "string", description: "Team name αν υπάρχει" },
    team_persons: {
      type: "array",
      items: {
        type: "object",
        properties: {
          person_name: { type: "string" },
          time_from: { type: "string", description: "HH:MM" },
          time_to: { type: "string", description: "HH:MM" },
          break_min: { type: "number", description: "Πάντα 45" },
          notes: { type: "string" }
        }
      }
    },
    team_extra: {
      type: "array",
      items: {
        type: "object",
        properties: {
          person_name: { type: "string" },
          duration_hours: { type: "number" },
          duration_mins: { type: "number" },
          work_type: { type: "string" },
          description: { type: "string" },
          charge_dept: { type: "string" }
        }
      }
    },
    warnings: {
      type: "array",
      items: { type: "string" }
    },
    confidence_score: { type: "number" }
  }
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { file_url, file_name, page_number } = await req.json();
  if (!file_url) return Response.json({ error: 'file_url is required' }, { status: 400 });

  const isPDF = file_url.toLowerCase().includes('.pdf') || (file_name || '').toLowerCase().includes('.pdf');
  const model = isPDF ? "gemini_3_flash" : "gpt_5_mini";
  
  const pageInstruction = page_number
    ? `\nΚΡΙΣΙΜΟ – ΕΠΙΛΟΓΗ ΣΕΛΙΔΑΣ: Επεξεργάσου ΜΟΝΟ τη σελίδα ${page_number} του αρχείου. Η σελίδα αυτή περιέχει τη φόρμα "PRODUCTION TEAMS TIME FORM V.4". Άγνοησε όλες τις άλλες σελίδες.`
    : "";

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    model: model,
    prompt: `Εξάγαγε δεδομένα από τη φόρμα "PRODUCTION TEAMS TIME FORM V.4".${pageInstruction}

ΚΡΙΣΙΜΟ – ΕΠΙΛΟΓΗ ΣΕΛΙΔΑΣ:
Αν το αρχείο έχει 2 σελίδες:
- Σελίδα 1: τίτλος "ΗΜΕΡΗΣΙΑ ΠΑΡΑΓΩΓΗ" ή "Διεργασία" – ΑΓΝΟΗΣΕ ΤΕΛΕΙΩΣ.
- Σελίδα 2: τίτλος "PRODUCTION TEAMS TIME FORM V.4" – ΑΥΤΗ επεξεργάσου.
Εξάγαγε δεδομένα ΜΟΝΟ από τη σελίδα που περιέχει "PRODUCTION TEAMS TIME FORM V.4".
Μη χρησιμοποιείς ΚΑΝΕΝΑ δεδομένο από σελίδα με τίτλο "ΗΜΕΡΗΣΙΑ ΠΑΡΑΓΩΓΗ" ή "Διεργασία".

HEADER:
- date: ημερομηνία σε μορφή dd/mm/yyyy (από το πεδίο "Ημερομηνία:")
- completed_by: όνομα από το πεδίο "Συμπληρώθηκε από:"
- team: από το πεδίο "Team:" (null αν κενό)

ΕΝΟΤΗΤΑ 1 – Συνολικές ώρες Εργασίας (team_persons):
Για κάθε γραμμή με δεδομένα εξάγε:
- person_name (ΚΕΙΜΕΝΟ): Ονοματεπώνυμο
- time_from (ΚΕΙΜΕΝΟ HH:MM): Στήλη "Από"
- time_to (ΚΕΙΜΕΝΟ HH:MM): Στήλη "Έως"
- break_min (ΑΡΙΘΜΟΣ): ΠΑΝΤΑ 45 (σταθερή τιμή, ανεξάρτητα από τη φόρμα)
- notes (ΚΕΙΜΕΝΟ): Στήλη "Σχόλια", null αν κενό

ΕΝΟΤΗΤΑ 2 – Εργασίες εκτός φόρμας (team_extra):
Για κάθε γραμμή με δεδομένα εξάγε:
- person_name (ΚΕΙΜΕΝΟ): Ονοματεπώνυμο
- duration_hours (ΑΡΙΘΜΟΣ): Στήλη "Διάρκεια HR"
- duration_mins (ΑΡΙΘΜΟΣ): Στήλη "Διάρκεια Min"
- work_type (ΚΕΙΜΕΝΟ): Στήλη "Είδος"
- description (ΚΕΙΜΕΝΟ): Στήλη "Περιγραφή", null αν κενό
- charge_dept (ΚΕΙΜΕΝΟ): Στήλη "Τμήμα", null αν κενό

ΚΑΝΟΝΕΣ:
1. Ditto marks (", ΄΄, " ", ίδιο): Αντέγραψε την τιμή της αμέσως προηγούμενης γραμμής για το ίδιο πεδίο.
2. break_min: ΠΑΝΤΑ 45, ποτέ άλλη τιμή.
3. Κενά κελιά: null.
4. Ώρες σε μορφή HH:MM (π.χ. 06:00, 14:30).
5. Διάρκεια: "1:00" → hours=1, mins=0. "7:30" → hours=7, mins=30. "1h 30m" → hours=1, mins=30.
6. work_type normalization:
   - "Υποστ." / "Υποστηρικτικές" / "Υπoστ" → "Υποστηρικτικές (Υποστ.)"
   - "Άλλες" / "Αλλες" → "Άλλες Εργασίες (Άλλες)"
   - "Μη Εκ." / "Μη Εκτέλεση" / "ΜΗ ΕΚ" → "Μη Εκτέλεσης (Μη Εκ.)"

WARNINGS (επέστρεψε λίστα strings):
- Αν χρησιμοποιήθηκαν ditto marks: "Χρησιμοποιήθηκαν ditto marks – τιμές αντιγράφηκαν αυτόματα"
- Πάντα: "Break 45 min εφαρμόστηκε αυτόματα σε όλες τις γραμμές"
- Αν όνομα δυσανάγνωστο: "Μη αναγνώσιμο όνομα στη γραμμή [Χ] – επιβεβαίωσε"
- Αν duration_hours > 4 στην ενότητα 2: "Ασυνήθιστη διάρκεια > 4 ώρες για [όνομα] – επιβεβαίωσε"

confidence_score: 0-100`,
    file_urls: [file_url],
    response_json_schema: TEAMS_TIME_SCHEMA
  });

  if (!result || typeof result !== 'object') {
    return Response.json({ error: 'OCR extraction failed' }, { status: 422 });
  }

  // Normalize work_type from Greek to English
  const workTypeMap = {
    "Υποστηρικτικές": "Supportive Works",
    "Υποστηρικτικές (Υποστ.)": "Supportive Works",
    "Υποστ.": "Supportive Works",
    "Υποστ": "Supportive Works",
    "Υποστρακτικές": "Supportive Works", // OCR typo variant
    "Άλλες Εργασίες": "Other Departments Works",
    "Άλλες Εργασίες (Άλλες)": "Other Departments Works",
    "Άλλες": "Other Departments Works",
    "Αλλες": "Other Departments Works",
    "Μη Εκτέλεσης": "Non Execution Time",
    "Μη Εκτέλεσης (Μη Εκ.)": "Non Execution Time",
    "Μη Εκ.": "Non Execution Time",
    "Μη Εκ": "Non Execution Time",
    "ΜΗ ΕΚ": "Non Execution Time"
  };

  const normalizedTeamExtra = (result.team_extra || []).map(e => ({
    ...e,
    work_type: workTypeMap[e.work_type] || e.work_type
  }));

  return Response.json({
    extracted_data: {
      date: result.date,
      completed_by: result.completed_by,
      team: result.team,
      team_persons: result.team_persons || [],
      team_extra: normalizedTeamExtra
    },
    warnings: result.warnings || [],
    confidence_score: result.confidence_score
  });
});