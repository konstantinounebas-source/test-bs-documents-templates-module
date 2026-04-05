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
    
    // Keywords for Teams Time Form
    if (normalized.includes("PRODUCTION TEAMS") || 
        normalized.includes("TEAM TIME") ||
        normalized.includes("TEAMS TIME FORM")) {
      return "teams_time";
    }
    
    // Keywords for Production Form
    if (normalized.includes("ΗΜΕΡΗΣΙΑ ΠΑΡΑΓΩΓΗ") ||
        normalized.includes("ΠΑΡΑΓΩΓΗ") ||
        normalized.includes("ΔΙΕΡΓΑΣΙΑ") ||
        normalized.includes("ΠΡΟΕΤΟΙΜΑΣΙΑ")) {
      return "production";
    }
    
    return "unknown";
  };

  // Detect form types for both pages (1 and 2)
  const pages = [1, 2];
  const detectedForms = {};

  for (const pageNum of pages) {
    // Create a page-specific URL if PDF (PDF.js can handle #page=X)
    const pageUrl = isPDF ? `${file_url}#page=${pageNum}` : file_url;

    let result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: model,
      prompt: `Δες το έγγραφο (ΜΟΝΟ σελίδα ${pageNum} αν είναι PDF) και αναφέρισε: Ποιος είναι ο τίτλος της φόρμας;`,
      file_urls: [pageUrl],
      response_json_schema: {
        type: "object",
        properties: {
          form_title: { type: "string" }
        }
      }
    });

    // Map title to form type using keyword detection
    let formType = detectFormTypeFromTitle(result.form_title);

    // Retry with structural detection if keyword match failed
    if (formType === "unknown") {
      const teamsCheckResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        model: model,
        prompt: `Δες το έγγραφο (ΜΟΝΟ σελίδα ${pageNum} αν είναι PDF). Υπάρχει πίνακας με "Ονοματεπώνυμο", "Από", "Έως" ή "Συνολικές Ώρες Εργασίας";
        
Απάντησε "YES" ή "NO".`,
        file_urls: [pageUrl],
        response_json_schema: {
          type: "object",
          properties: { answer: { type: "string", enum: ["YES", "NO"] } }
        }
      });

      if (teamsCheckResult.answer === "YES") {
        formType = "teams_time";
      } else {
        const prodCheckResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          model: model,
          prompt: `Δες το έγγραφο (ΜΟΝΟ σελίδα ${pageNum} αν είναι PDF). Υπάρχει πίνακας με "Κωδικός", "Ποσότητα", "Παρτίδα" ή παραγωγή δεδομένα;
          
Απάντησε "YES" ή "NO".`,
          file_urls: [pageUrl],
          response_json_schema: {
            type: "object",
            properties: { answer: { type: "string", enum: ["YES", "NO"] } }
          }
        });

        if (prodCheckResult.answer === "YES") {
          formType = "production";
        }
      }
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