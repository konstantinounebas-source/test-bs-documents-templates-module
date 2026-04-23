import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    // Define the expected JSON schema for extraction
    const extractionSchema = {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date in format DD/MM/YY"
        },
        department: {
          type: "string",
          description: "Department or team name"
        },
        entries: {
          type: "array",
          description: "List of sub-assembly items with their values",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Name of the sub-assembly item"
              },
              section: {
                type: "string",
                description: "Section name (e.g., LIGHTBOXES, GLASS, PAINTING, LIGHTGUIDES, STATION, WORK)"
              },
              A_Remainder: { type: ["number", "null"] },
              A_Planned: { type: ["number", "null"] },
              A_Actual: { type: ["number", "null"] },
              B_Remainder: { type: ["number", "null"] },
              B_Planned: { type: ["number", "null"] },
              B_Actual: { type: ["number", "null"] },
              C_Remainder: { type: ["number", "null"] },
              C_Planned: { type: ["number", "null"] },
              C_Actual: { type: ["number", "null"] }
            },
            required: ["name", "section"]
          }
        }
      },
      required: ["date", "department", "entries"]
    };

    const prompt = `You are extracting data from a "Sub-Assembly Smart Bus Stop / Shelter V.4 / V.5 / V.6" form.

FORM STRUCTURE:
The form has sections like: LIGHTBOXES (Φώτα), GLASS (ΤΟΜΙΑ), PAINTING (Παιντάκι), LIGHTGUIDES (Φωτοδηγοί), STATION (Κοσμήτια στάσης), WORK (Εργασίες στη στάση)

Each section contains rows of items. For each item, the values are organized in 3 main columns (A, B, C).
Each column has 3 sub-values:
- First sub-column: "Ημερ." (Remainder/Balance)
- Second sub-column: "Σχεδ." (Planned/Design) 
- Third sub-column: "Πρ." (Actual/Production)

EXTRACTION RULES:
1. Extract the date (top of form, format DD/MM/YY)
2. Extract the department/employee name
3. For EVERY item in EVERY section:
   - Item name (first column, leftmost)
   - Section name (e.g., "LIGHTBOXES", "GLASS", etc.)
   - A_Remainder: value in column A, sub-column 1
   - A_Planned: value in column A, sub-column 2
   - A_Actual: value in column A, sub-column 3
   - B_Remainder: value in column B, sub-column 1
   - B_Planned: value in column B, sub-column 2
   - B_Actual: value in column B, sub-column 3
   - C_Remainder: value in column C, sub-column 1
   - C_Planned: value in column C, sub-column 2
   - C_Actual: value in column C, sub-column 3

IMPORTANT NOTES:
- Include items even if most cells are empty (null is valid)
- Extract hand-written values carefully, even if hard to read
- Skip completely empty rows
- Convert all values to numbers where possible, use null for empty/unreadable cells
- Do NOT include section header rows (e.g., row with just "LIGHTBOXES" label)
- Preserve the original item names in Greek

Return the data in the specified JSON format.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: prompt,
      file_urls: [file_url],
      response_json_schema: extractionSchema,
      model: 'gemini_3_1_pro'
    });

    return Response.json({
      status: 'success',
      extracted_data: result,
      confidence_score: 0.85
    });
  } catch (error) {
    console.error('OCR Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});