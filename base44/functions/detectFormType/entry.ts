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

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    model: model,
    prompt: `Δες το έγγραφο και αναφέρισε: Ποιος είναι ο τίτλος της φόρμας;${pageInstruction}
    
Απάντησε ΜΟΝΟ με έναν από αυτούς τους τίτλους:
- "PRODUCTION TEAMS TIME FORM V.4"
- "ΗΜΕΡΗΣΙΑ ΠΑΡΑΓΩΓΗ"
- "UNKNOWN"`,
    file_urls: [file_url],
    response_json_schema: {
      type: "object",
      properties: {
        form_title: { type: "string" },
        form_type: { 
          type: "string",
          enum: ["teams_time", "production", "unknown"]
        },
        detected_page_number: { type: "number" }
      }
    }
  });

  // Map title to form type
  let formType = "unknown";
  if (result.form_title === "PRODUCTION TEAMS TIME FORM V.4") {
    formType = "teams_time";
  } else if (result.form_title === "ΗΜΕΡΗΣΙΑ ΠΑΡΑΓΩΓΗ") {
    formType = "production";
  }

  return Response.json({
    form_type: formType,
    form_title: result.form_title,
    detected_page_number: result.detected_page_number || page_number || 1
  });
});