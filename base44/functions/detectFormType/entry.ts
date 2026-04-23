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

  // If we detected form type from filename, use it for ALL pages (fast path)
  if (detectedFromFilename) {
    for (const pageNum of pages) {
      detectedForms[pageNum] = {
        form_type: detectedFromFilename,
        form_title: "DETECTED_FROM_FILENAME",
        confidence: "high"
      };
    }
  } else {
    // Only do LLM detection if filename didn't tell us the type
    // Use optimized single-call detection for first page only, then extrapolate
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: model,
      prompt: `Ανάλυσε τη ΠΡΩΤΗ σελίδα του αρχείου και πες:
1. Τον ΤΙΤΛΟ της φόρμας (ακριβώς όπως φαίνεται)
2. Τον ΤΥΠΟ: "production", "teams_time", ή "sub_assembly"

Ψάξε για:
- "TEAMS TIME" / "PRODUCTION TEAMS TIME" → teams_time
- "SUB-ASSEMBLY" / "SMART BUS STOP" → sub_assembly
- Item codes, ποσότητες παραγωγής → production
- Δομή και visual elements (πίνακες, labels)

Επίστρεψε JSON: { form_type: "...", form_title: "..." }`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          form_type: { type: "string" },
          form_title: { type: "string" }
        }
      }
    });

    let detectedType = result?.form_type || "unknown";
    
    // Validate and fallback to title parsing if needed
    if (!["production", "teams_time", "sub_assembly"].includes(detectedType)) {
      detectedType = detectFormTypeFromTitle(result?.form_title || "");
    }

    // Apply detected type to ALL pages (assuming multi-page document is same type)
    for (const pageNum of pages) {
      detectedForms[pageNum] = {
        form_type: detectedType,
        form_title: result?.form_title || "UNKNOWN",
        confidence: detectedType !== "unknown" ? "high" : "low"
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