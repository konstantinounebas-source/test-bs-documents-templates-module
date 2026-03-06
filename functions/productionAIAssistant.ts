import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { message, context } = await req.json();

    const {
      department,
      date,
      batch_id,
      active_tab,
      batch_lines_count = 0,
      qc_lines_count = 0,
      operations_count = 0,
      team_persons_count = 0,
      attachments_count = 0
    } = context || {};

    const contextSummary = `
Current context:
- Department: ${department || 'not selected'}
- Date: ${date || 'not selected'}
- Batch ID: ${batch_id || 'none (no batch for this date)'}
- Active tab: ${active_tab || 'batch_lines'}
- Batch Lines count: ${batch_lines_count}
- QC Initial Stock count: ${qc_lines_count}
- Operations count: ${operations_count}
- Team Persons count: ${team_persons_count}
- Attachments count: ${attachments_count}
`;

    const prompt = `You are a helpful Manufacturing Production Assistant. You help users navigate daily production entry in a manufacturing system.

The system has these tabs for each batch:
- Batch Lines: item quantities (scheduled, processed, out good, scrap, remake, reforward)
- QC Initial Stock: quality control initial stock entries
- Operations: individual operation time entries per item
- Team Time Persons: person work time entries (from/to time)
- Team Time Extra: extra work time by person
- Help In: help received from other departments
- Consumables: actual consumable usage
- Attachments: files attached to the batch

${contextSummary}

User message: "${message}"

Respond helpfully and concisely. If they ask about a specific tab, give guidance on what data to enter. If they ask about the current state, summarize what you know. Be friendly and practical. Keep responses short (2-4 sentences max). If the batch doesn't exist, remind them to create it first.`;

    const reply = await base44.integrations.Core.InvokeLLM({ prompt });

    return Response.json({ reply });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});