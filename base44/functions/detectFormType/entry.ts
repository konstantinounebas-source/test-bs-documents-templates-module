import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
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

  // Extract page count from filename (e.g., "1From7.pdf" = 7 pages)
  const fromMatch = filename.match(/from(\d+)/i);
  let pageCount = fromMatch ? parseInt(fromMatch[1], 10) : 7; // Default to 7 if not found

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);
  const detectedForms = {};

  // Analyze first page only to determine document type (LLM can only see first page of PDF)
  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    model: model,
    prompt: `Δες το αρχείο (εστιάζοντας στη ΠΡΩΤΗ σελίδα):
- Ποιος είναι ο τύπος της;
- Κοίτα τίτλο, πίνακες, ετικέτες, δομή

ΚΑΝΟΝΕΣ:
1. "TEAMS TIME" / "TEAM PERSONS" / "PRODUCTION TEAMS TIME" → **teams_time**
2. "SUB-ASSEMBLY" / "ASSEMBLY" / "LIGHTBOXES" / "GLASS" / "PAINTING" → **sub_assembly**
3. "PRODUCTION" / "ΗΜΕΡΗΣΙΑ ΠΑΡΑΓΩΓΗ" / "ITEM CODES" → **production**

Επίστρεψε: { "form_type": "teams_time" ή "sub_assembly" ή "production", "confidence": "high" ή "low" }`,
    file_urls: [file_url],
    response_json_schema: {
      type: "object",
      properties: {
        form_type: { type: "string" },
        confidence: { type: "string" }
      }
    }
  });

  let detectedType = result?.form_type || "unknown";
  
  // Validate
  if (!["production", "teams_time", "sub_assembly"].includes(detectedType)) {
    detectedType = "unknown";
  }

  // Apply to all pages (assume uniform document based on first page)
  for (const pageNum of pages) {
    detectedForms[pageNum] = {
      form_type: detectedType,
      form_title: detectedType === "unknown" ? "UNKNOWN" : detectedType.replace(/_/g, " ").toUpperCase(),
      confidence: result?.confidence || (detectedType !== "unknown" ? "high" : "low")
    };
  }

    return Response.json({
      page_count: pageCount,
      pages: detectedForms,
      summary: Object.fromEntries(
        pages.map((p) => [`page_${p}_type`, detectedForms[p]?.form_type || "unknown"])
      )
    });
  } catch (error) {
    console.error("[detectFormType ERROR]", error.message);
    return Response.json({ error: error.message, type: error.constructor.name }, { status: 500 });
  }
});