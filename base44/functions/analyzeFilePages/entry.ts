import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { file_url } = await req.json();
  if (!file_url) return Response.json({ error: 'file_url is required' }, { status: 400 });

  // Detect file type from URL or extension
  const isPDF = file_url.toLowerCase().includes('.pdf');
  const fileType = isPDF ? 'PDF' : 'image/single page';

  let pageCount = 1;

  if (isPDF) {
    try {
      // Use LLM to count PDF pages
      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        model: "gpt_5_mini",
        prompt: `Δες αυτό το PDF document και μέτρησε ΑΚΡΙΒΩΣ πόσες σελίδες έχει.
Απάντησε ΜΟΝΟ με έναν αριθμό (π.χ. "2" ή "15").`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            page_count: { type: "number" }
          }
        }
      });

      pageCount = Math.max(1, Math.floor(result.page_count || 1));
    } catch (err) {
      console.error("Error counting PDF pages:", err);
      pageCount = 2; // Default fallback for PDF
    }
  }

  return Response.json({
    file_type: fileType,
    page_count: pageCount,
    success: true
  });
});