import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { file_url } = await req.json();
  if (!file_url) return Response.json({ error: 'file_url is required' }, { status: 400 });

  const isPDF = file_url.toLowerCase().includes('.pdf');
  const model = isPDF ? "gemini_3_flash" : "gpt_5_mini";

  // Get actual page count from the file
  const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
    model: model,
    prompt: `Δες αυτό το PDF document. Πόσες σελίδες έχει; Απάντησε ΜΟΝΟ με έναν αριθμό (π.χ. "1" ή "2").`,
    file_urls: [file_url],
    response_json_schema: {
      type: "object",
      properties: { page_count: { type: "number" } }
    }
  });

  const pageCount = Number(analysis?.page_count ?? 1) || 1;

  // Normalize and detect form type with keyword matching
  const normalizeTitle = (title) => {
    if (!title) return "";
    return title.toUpperCase().trim();
  };

  const detectFormTypeFromTitle = (title) => {
    const normalized = normalizeTitle(title);
    
    // Keywords for Teams Time Form - CHECK FIRST (more specific)
    if (normalized.includes("PRODUCTION TEAMS TIME FORM") ||
        normalized.includes("TEAMS TIME") ||
        normalized.includes("TEAM TIME") ||
        normalized.includes("ΣΥΝΟΛΙΚΕΣ ΩΡΕΣ ΕΡΓΑΣΙΑΣ")) {
      return "teams_time";
    }
    
    // Keywords for Production Form - CHECK SECOND
    if (normalized.includes("ΗΜΕΡΗΣΙΑ ΠΑΡΑΓΩΓΗ") ||
        (normalized.includes("ΠΑΡΑΓΩΓΗ") && !normalized.includes("TEAMS"))) {
      return "production";
    }
    
    return "unknown";
  };

  // Detect form types only for pages that actually exist in the file
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);
  const detectedForms = {};

  for (const pageNum of pages) {
    let result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: model,
      prompt: `Δες αυτό το PDF document. Ποιος είναι ο ΤΙΤΛΟΣ της φόρμας; 
Απάντησε με τον τίτλο ΑΚΡΙΒΩΣ όπως φαίνεται στο έγγραφο (π.χ. "PRODUCTION TEAMS TIME FORM V.4" ή "ΗΜΕΡΗΣΙΑ ΠΑΡΑΓΩΓΗ").`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          form_title: { type: "string" }
        }
      }
    });

    // Map title to form type using keyword detection
    let formType = detectFormTypeFromTitle(result.form_title);

    // For ambiguous cases, check specific table markers for each form type
    if (formType === "production" && result.form_title === "ΗΜΕΡΗΣΙΑ ΠΑΡΑΓΩΓΗ") {
      const detailCheck = await base44.asServiceRole.integrations.Core.InvokeLLM({
        model: model,
        prompt: `Δες αυτό το PDF και βρες ΤΙ είναι το κύριο περιεχόμενο.
Πράγματι έχει τα παρακάτω;
- Πίνακα με "Ονοματεπώνυμο", "Από", "Έως", "ΣΧΟΛΙΑ" (Teams Time)?
- Ή πίνακα με item codes/κωδικούς, ποσότητες (Production)?
Απάντησε ΜΟΝΟ με: "TEAMS_TIME" ή "PRODUCTION".`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: { answer: { type: "string", enum: ["TEAMS_TIME", "PRODUCTION"] } }
        }
      });

      formType = detailCheck.answer === "TEAMS_TIME" ? "teams_time" : "production";
    }

    detectedForms[pageNum] = {
      form_type: formType,
      form_title: result.form_title || "UNKNOWN",
      confidence: formType !== "unknown" ? "high" : "low"
    };
  }

  return Response.json({
    pages: detectedForms,
    summary: {
      page_1_type: detectedForms[1]?.form_type || "unknown",
      page_2_type: detectedForms[2]?.form_type || "unknown"
    }
  });
});