import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { file_url } = await req.json();
  if (!file_url) return Response.json({ error: 'file_url is required' }, { status: 400 });

  const isPDF = file_url.toLowerCase().includes('.pdf');
  const model = isPDF ? "gemini_3_flash" : "gpt_5_mini";
  
  // Extract filename for early detection
  const filename = file_url.split('/').pop() || '';
  const filenameLower = filename.toLowerCase();
  
  // Detect form type from filename FIRST (reliable indicator)
  const detectedFromFilename = 
    (filenameLower.includes('subassembly') || filenameLower.includes('sub_assembly') || filenameLower.includes('sub-assembly')) 
      ? 'sub_assembly'
      : (filenameLower.includes('teams') || filenameLower.includes('team_time'))
      ? 'teams_time'
      : null;

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

  // ALWAYS analyze EACH page individually (no shortcuts)
  // This handles mixed-type documents (e.g., sub_assembly + production in same file)
  for (const pageNum of pages) {
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: model,
      prompt: `Ανάλυσε ΜΟΝΟ τη σελίδα ${pageNum} του αρχείου.

ΚΑΝΟΝΕΣ ΑΝΙΧΝΕΥΣΗΣ:
1. Αν ΕΙΝΑΙ: "TEAMS TIME" / "TEAM PERSONS" / "EXTRA WORK" → **teams_time**
2. Αν ΕΙΝΑΙ: "SUB-ASSEMBLY" / "ASSEMBLY LINES" / "REMAINDER ITEMS" → **sub_assembly**
3. Αν ΕΙΝΑΙ: "PRODUCTION" / "ITEM CODES" / "PRODUCTION LINES" → **production**

Κοίτα:
- Τίτλοι στηλών (πίνακα)
- Ετικέτες φόρμας
- Δομή δεδομένων (ώρες vs ποσότητες vs assembly items)

Επίστρεψε ΑΠΛΑ JSON: { form_type: "...", form_title: "..." }`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          form_type: { type: "string" },
          form_title: { type: "string" }
        }
      }
    });

    let formType = result?.form_type || "unknown";
    
    // Validate form_type
    if (!["production", "teams_time", "sub_assembly"].includes(formType)) {
      formType = detectFormTypeFromTitle(result?.form_title || "");
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