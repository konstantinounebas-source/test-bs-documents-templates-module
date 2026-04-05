import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { file_url } = await req.json();
  if (!file_url) return Response.json({ error: 'file_url is required' }, { status: 400 });

  const isPDF = file_url.toLowerCase().includes('.pdf');
  const model = isPDF ? "gemini_3_flash" : "gpt_5_mini";

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

  // Detect form types for both pages (1 and 2)
  const pages = [1, 2];
  const detectedForms = {};

  for (const pageNum of pages) {
    // Add page anchor to file_url to target specific page
    const pageUrl = file_url.includes('#') 
      ? file_url.replace(/#.*/, `#page=${pageNum}`)
      : `${file_url}#page=${pageNum}`;

    let result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: model,
      prompt: `Δες αυτό το έγγραφο (σελίδα ${pageNum}).

Ποιο είναι το κύριο ΠΕΡΙΕΧΟΜΕΝΟ της σελίδας; Απάντησε ΜΟΝΟ με ένα από:
- "PRODUCTION" (αν έχει πίνακα με item codes, ποσότητες παραγωγής)
- "TEAMS_TIME" (αν έχει πίνακα με ονοματεπώνυμα, ώρες εργασίας, "Από", "Έως")
- "UNKNOWN" (αν δεν αναγνωρίζεται)`,
      file_urls: [pageUrl],
      response_json_schema: {
        type: "object",
        properties: {
          form_type: { type: "string", enum: ["PRODUCTION", "TEAMS_TIME", "UNKNOWN"] }
        }
      }
    });

    const formType = result.form_type === "PRODUCTION" ? "production" : 
                     result.form_type === "TEAMS_TIME" ? "teams_time" : "unknown";

    detectedForms[pageNum] = {
      form_type: formType,
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