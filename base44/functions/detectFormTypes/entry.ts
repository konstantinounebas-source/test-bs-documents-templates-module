import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { file_url, total_pages } = await req.json();
  if (!file_url) return Response.json({ error: 'file_url is required' }, { status: 400 });

  const isPDF = file_url.toLowerCase().includes('.pdf');
  const model = isPDF ? "gemini_3_flash" : "gpt_5_mini";
  const pageCount = total_pages || 2;

  const pageRanges = Array.from({ length: pageCount }, (_, i) => i + 1);
  const prompts = pageRanges.map(page => `
Δες τη σελίδα ${page} του εγγράφου. Ποιος είναι ο τίτλος της φόρμας;

Απάντησε ΜΟΝΟ με έναν από αυτούς τους τίτλους:
- "PRODUCTION TEAMS TIME FORM V.4"
- "ΗΜΕΡΗΣΙΑ ΠΑΡΑΓΩΓΗ"
- "UNKNOWN"
  `.trim());

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    model: model,
    prompt: `Δες το έγγραφο και για κάθε σελίδα αναφέρισε τον τίτλο της φόρμας.

${pageRanges.map((p, i) => `**Σελίδα ${p}:** ${prompts[i]}`).join('\n\n')}

Απάντησε με JSON array με ένα αντικείμενο ανά σελίδα.`,
    file_urls: [file_url],
    response_json_schema: {
      type: "object",
      properties: {
        pages: {
          type: "array",
          items: {
            type: "object",
            properties: {
              page: { type: "number" },
              form_title: { type: "string" },
              form_type: {
                type: "string",
                enum: ["teams_time", "production", "unknown"]
              }
            }
          }
        }
      }
    }
  });

  // Map titles to form types
  const pages = (result.pages || []).map(p => {
    let formType = "unknown";
    if (p.form_title === "PRODUCTION TEAMS TIME FORM V.4") {
      formType = "teams_time";
    } else if (p.form_title === "ΗΜΕΡΗΣΙΑ ΠΑΡΑΓΩΓΗ") {
      formType = "production";
    }
    return {
      page: p.page,
      form_type: formType,
      form_title: p.form_title || "UNKNOWN"
    };
  });

  // Detect pages with unknown forms and retry with specific prompts
  const unknownPages = pages.filter(p => p.form_type === "unknown");
  
  if (unknownPages.length > 0) {
    for (const unknownPage of unknownPages) {
      const teamsCheckResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        model: model,
        prompt: `Δες τη σελίδα ${unknownPage.page}. Υπάρχει πίνακας με στήλες "Ονοματεπώνυμο", "Από", "Έως" (ώρες εργασίας)?

Απάντησε "YES" ή "NO".`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: { answer: { type: "string", enum: ["YES", "NO"] } }
        }
      });

      if (teamsCheckResult.answer === "YES") {
        const pageIdx = pages.findIndex(p => p.page === unknownPage.page);
        pages[pageIdx] = {
          ...pages[pageIdx],
          form_type: "teams_time",
          form_title: "PRODUCTION TEAMS TIME FORM V.4"
        };
      } else {
        const prodCheckResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          model: model,
          prompt: `Δες τη σελίδα ${unknownPage.page}. Υπάρχει πίνακας με στήλες "Κωδικός Κομματιών", "Παρτίδα", "Ποσότητα" (παραγωγή)?

Απάντησε "YES" ή "NO".`,
          file_urls: [file_url],
          response_json_schema: {
            type: "object",
            properties: { answer: { type: "string", enum: ["YES", "NO"] } }
          }
        });

        if (prodCheckResult.answer === "YES") {
          const pageIdx = pages.findIndex(p => p.page === unknownPage.page);
          pages[pageIdx] = {
            ...pages[pageIdx],
            form_type: "production",
            form_title: "ΗΜΕΡΗΣΙΑ ΠΑΡΑΓΩΓΗ"
          };
        }
      }
    }
  }

  return Response.json({
    pages: pages,
    pages_to_show: pages.filter(p => p.form_type !== "unknown").map(p => p.page)
  });
});