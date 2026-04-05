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
      const response = await fetch(file_url);
      if (!response.ok) throw new Error(`Failed to fetch file: ${response.status}`);

      const bytes = new Uint8Array(await response.arrayBuffer());
      const text = new TextDecoder("latin1").decode(bytes);

      // count "/Type /Page" but not "/Type /Pages"
      const matches = text.match(/\/Type\s*\/Page\b/g) || [];
      pageCount = Math.max(1, matches.length);
    } catch (err) {
      console.error("Error counting PDF pages:", err);
      pageCount = 1; // Default fallback for PDF
    }
  }

  return Response.json({
    file_type: fileType,
    page_count: pageCount,
    success: true
  });
});