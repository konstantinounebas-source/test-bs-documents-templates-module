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

    const prompt = `You are extracting data from a "Sub-Assembly Smart Bus Stop / Shelter V.4" form.

The form has the following structure:
- Date field at the top (format DD/MM/YY)
- Department field
- A table with sub-assemblies organized in sections: LIGHTBOXES, GLASS (ΤΟΜΙΑ), PAINTING (Παιντάκι), LIGHTGUIDES, STATION (Κοσμήτια στάσης), WORK (Εργασίες στη στάση)
- Each section has multiple items (rows)
- For each item, there are 3 main columns: A, B, C
- Under each column, there are 3 sub-columns: "Ημερ." (Remainder), "Σχεδ." (Planned), "Πρ." (Actual)
- Each cell contains a number or is empty

Extract all the data from this form:
1. Extract the date
2. Extract the department/team name
3. For each item in each section, extract:
   - The item name
   - The section it belongs to
   - All 9 values (A_Remainder, A_Planned, A_Actual, B_Remainder, B_Planned, B_Actual, C_Remainder, C_Planned, C_Actual)

Important notes:
- Convert all Greek headers to English column names as specified above
- If a cell is empty or unreadable, use null
- Parse any numeric values as numbers (not strings)
- Be careful with hand-written entries - extract the value even if it's hard to read
- Do not include section headers or empty rows
- Handle symbols like "/" or "V" as symbols, not as values

Return the extracted data in the specified JSON format.`;

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