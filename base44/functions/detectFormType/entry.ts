import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { file_url, page_number } = await req.json();
  if (!file_url) return Response.json({ error: 'file_url is required' }, { status: 400 });

  const isPDF = file_url.toLowerCase().includes('.pdf');
  const model = isPDF ? "gemini_3_flash" : "gpt_5_mini";

  const pageInstruction = page_number
    ? `\nΑνάλυσε ΜΟΝΟ τη σελίδα ${page_number}.`
    : "";

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

  let result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    model: model,
    prompt: `Δες το έγγραφο και αναφέρισε: Ποιος είναι ο τίτλος της φόρμας;${pageInstruction}`,
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

  // Retry with structural detection if keyword match failed
  if (formType === "unknown") {
    const teamsCheckResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: model,
      prompt: `Δες το έγγραφο. Υπάρχει πίνακας με "Ονοματεπώνυμο", "Από", "Έως" ή "Συνολικές Ώρες Εργασίας";${pageInstruction}
      
Απάντησε "YES" ή "NO".`,
      file_urls: [file_url],
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
        prompt: `Δες το έγγραφο. Υπάρχει πίνακας με "Κωδικός", "Ποσότητα", "Παρτίδα" ή παραγωγή δεδομένα;${pageInstruction}
        
Απάντησε "YES" ή "NO".`,
        file_urls: [file_url],
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

  return Response.json({
    form_type: formType,
    form_title: result.form_title || "UNKNOWN",
    detected_page_number: page_number || 1,
    confidence: formType !== "unknown" ? "high" : "low"
  });
});