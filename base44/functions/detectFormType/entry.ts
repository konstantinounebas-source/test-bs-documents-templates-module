import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { file_url } = await req.json();
  if (!file_url) return Response.json({ error: 'file_url is required' }, { status: 400 });

  const isPDF = file_url.toLowerCase().includes('.pdf');
  const model = isPDF ? "gemini_3_flash" : "gpt_5_mini";
  
  // Extract filename for fallback detection
  const filename = file_url.split('/').pop() || '';
  const isSubAssemblyFile = filename.toLowerCase().includes('subassembly') || filename.toLowerCase().includes('sub_assembly') || filename.toLowerCase().includes('sub-assembly');

  const normalizeTitle = (title) => {
    if (!title) return "";
    return title.toUpperCase().trim();
  };

  const detectFormTypeFromTitle = (title) => {
    const normalized = normalizeTitle(title);

    if (
      normalized.includes("PRODUCTION TEAMS TIME FORM") ||
      normalized.includes("TEAMS TIME") ||
      normalized.includes("TEAM TIME") ||
      normalized.includes("ΣΥΝΟΛΙΚΕΣ ΩΡΕΣ ΕΡΓΑΣΙΑΣ")
    ) {
      return "teams_time";
    }

    if (
      normalized.includes("SUB-ASSEMBLY") ||
      normalized.includes("SUB ASSEMBLY") ||
      normalized.includes("SMART BUS STOP")
    ) {
      return "sub_assembly";
    }

    if (
      normalized.includes("ΗΜΕΡΗΣΙΑ ΠΑΡΑΓΩΓΗ") ||
      (normalized.includes("ΠΑΡΑΓΩΓΗ") && !normalized.includes("TEAMS"))
    ) {
      return "production";
    }

    return "unknown";
  };

  const analysis = await base44.functions.invoke("analyzeFilePages", { file_url });

  const pageCount =
    Number(
      analysis?.data?.page_count ??
      analysis?.page_count ??
      1
    ) || 1;

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);
  const detectedForms = {};

  // Batch detection - one LLM call to analyze all pages at once
  const batchResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
    model: model,
    prompt: `Αναλύσε το ακόλουθο PDF document με ${pageCount} σελίδες.
Για ΚΑΘΕ σελίδα, βρες:
1. Τον ΤΙΤΛΟ της φόρμας (ακριβώς όπως φαίνεται)
2. Τον ΤΥΠΟ: "production", "teams_time", ή "sub_assembly"

Αν ο τίτλος περιέχει:
- "ΣΥΝΟΛΙΚΕΣ ΩΡΕΣ" ή "TEAMS TIME" → teams_time
- "SUB-ASSEMBLY" ή "SMART BUS STOP" → sub_assembly
- "ΗΜΕΡΗΣΙΑ ΠΑΡΑΓΩΓΗ" ή item codes/ποσότητες → production

Επίστρεψε JSON με structure: { pages: { "1": { form_type: "...", form_title: "..." }, "2": { ... } } }`,
    file_urls: [file_url],
    response_json_schema: {
      type: "object",
      properties: {
        pages: {
          type: "object",
          additionalProperties: {
            type: "object",
            properties: {
              form_type: { type: "string" },
              form_title: { type: "string" }
            }
          }
        }
      }
    }
  });

  // Populate detectedForms from batch result
  if (batchResult?.pages) {
    for (const pageNum of pages) {
      const pageData = batchResult.pages[String(pageNum)];
      let formType = pageData?.form_type || "unknown";

      // Validate form_type is one of the allowed values
      if (!["production", "teams_time", "sub_assembly"].includes(formType)) {
        formType = detectFormTypeFromTitle(pageData?.form_title || "");
      }

      // Fallback: if filename indicates sub-assembly, force it
      if (isSubAssemblyFile && formType !== "teams_time") {
        formType = "sub_assembly";
      }

      detectedForms[pageNum] = {
        form_type: formType,
        form_title: pageData?.form_title || "UNKNOWN",
        confidence: formType !== "unknown" ? "high" : "low"
      };
    }
  } else {
    // Fallback if batch detection fails - single scan per page (slower but safer)
    for (const pageNum of pages) {
      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        model: model,
        prompt: `Δες τη σελίδα ${pageNum} και πες τον τίτλο της φόρμας.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            form_title: { type: "string" }
          }
        }
      });

      let formType = detectFormTypeFromTitle(result?.form_title);
      if (isSubAssemblyFile) formType = "sub_assembly";

      detectedForms[pageNum] = {
        form_type: formType,
        form_title: result?.form_title || "UNKNOWN",
        confidence: formType !== "unknown" ? "high" : "low"
      };
    }
  }

  return Response.json({
    page_count: pageCount,
    pages: detectedForms,
    summary: Object.fromEntries(
      pages.map((p) => [`page_${p}_type`, detectedForms[p]?.form_type || "unknown"])
    )
  });
});