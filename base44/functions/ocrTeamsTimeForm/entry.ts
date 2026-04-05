import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const SCHEMA = {
  type: "object",
  properties: {
    date: { type: "string", description: "Date (YYYY-MM-DD)" },
    team: { type: "string", description: "Team/Department name" },
    team_persons: {
      type: "array",
      items: {
        type: "object",
        properties: {
          person_name: { type: "string" },
          time_from: { type: "string", description: "HH:MM format" },
          time_to: { type: "string", description: "HH:MM format" },
          notes: { type: "string" }
        }
      }
    },
    team_extra: {
      type: "array",
      items: {
        type: "object",
        properties: {
          person_name: { type: "string" },
          duration_hours: { type: "number" },
          duration_mins: { type: "number" },
          work_type: { type: "string" },
          description: { type: "string" },
          charge_dept: { type: "string" }
        }
      }
    },
    warnings: {
      type: "array",
      items: { type: "string" }
    },
    confidence_score: { type: "number", description: "0-100" }
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, pages_to_show } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    const isPdf = file_url.toLowerCase().endsWith('.pdf');
    const model = isPdf ? 'gemini_3_flash' : 'gemini_3_flash';
    
    const pagesToAnalyze = pages_to_show && pages_to_show.length > 0 
      ? pages_to_show 
      : [1];

    const pageDescriptions = pagesToAnalyze
      .map(p => `Page ${p}: Extract team time data from "PRODUCTION TEAMS TIME FORM"`)
      .join('\n');

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model,
      prompt: `Extract team time form data from this document:

${pageDescriptions}

Extract:
1. Date (format as YYYY-MM-DD)
2. Team/Department name
3. Section 1 - Team Persons (working hours):
   - Person names
   - Time from (HH:MM)
   - Time to (HH:MM)
   - Notes
4. Section 2 - Extra Work (outside main team):
   - Person names
   - Duration (hours and minutes)
   - Work type
   - Description
   - Charge department
5. Any warnings or issues found
6. Overall confidence (0-100)

Return as JSON matching the schema.`,
      file_urls: [file_url],
      response_json_schema: SCHEMA
    });

    return Response.json({
      success: true,
      data: {
        ...result,
        team_persons: result.team_persons || [],
        team_extra: result.team_extra || [],
        warnings: result.warnings || [],
        confidence_score: result.confidence_score ?? 0,
        extracted_data: result
      }
    });
  } catch (error) {
    console.error('OCR Error:', error);
    return Response.json({ 
      error: error?.message || 'OCR processing failed' 
    }, { status: 500 });
  }
});