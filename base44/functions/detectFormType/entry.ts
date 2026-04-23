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

  for (const pageNum of pages) {
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: model,
      prompt: `Δες ΜΟΝΟ τη σελίδα ${pageNum} αυτού του PDF document.
Ποιος είναι ο ΤΙΤΛΟΣ της φόρμας;
Απάντησε με τον τίτλο ΑΚΡΙΒΩΣ όπως φαίνεται στη συγκεκριμένη σελίδα.`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          form_title: { type: "string" }
        }
      }
    });

    let formType = detectFormTypeFromTitle(result?.form_title);

    // Fallback: if filename indicates sub-assembly and title detection failed, force it
    if (isSubAssemblyFile && formType === "unknown") {
      formType = "sub_assembly";
    }

    if (formType === "sub_assembly") {
      // Sub-assembly detected - keep it
    } else if (formType === "production" && result?.form_title === "ΗΜΕΡΗΣΙΑ ΠΑΡΑΓΩΓΗ") {
      const detailCheck = await base44.asServiceRole.integrations.Core.InvokeLLM({
        model: model,
        prompt: `Δες ΜΟΝΟ τη σελίδα ${pageNum} αυτού του PDF και βρες ΤΙ είναι το κύριο περιεχόμενο.
    Πράγματι έχει τα παρακάτω;
    - Πίνακα με "Ονοματεπώνυμο", "Από", "Έως", "ΣΧΟΛΙΑ" (Teams Time)?
    - Ή πίνακα με item codes/κωδικούς, ποσότητες (Production)?
    Απάντησε ΜΟΝΟ με: "TEAMS_TIME" ή "PRODUCTION".`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            answer: { type: "string", enum: ["TEAMS_TIME", "PRODUCTION"] }
          }
        }
      });

      formType = detailCheck?.answer === "TEAMS_TIME" ? "teams_time" : "production";
    }

    detectedForms[pageNum] = {
      form_type: formType,
      form_title: result?.form_title || "UNKNOWN",
      confidence: formType !== "unknown" ? "high" : "low"
    };
  }

  return Response.json({
    page_count: pageCount,
    pages: detectedForms,
    summary: Object.fromEntries(
      pages.map((p) => [`page_${p}_type`, detectedForms[p]?.form_type || "unknown"])
    )
  });
});