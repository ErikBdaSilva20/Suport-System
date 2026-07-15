import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';

// Classifies a ticket priority using AI based on subject + description and admin-defined rules.
// On success (confidence ≥ min), updates tickets.priority AND recomputes SLA due dates.

interface ClassifyResult {
  priority: 'low' | 'medium' | 'high' | 'urgent';
  confidence: number;
  matched_rule_id: string | null;
  reasoning: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { ticketId } = await req.json();
    if (!ticketId) {
      return new Response(JSON.stringify({ error: 'ticketId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if classification is enabled
    const { data: settings } = await supabase.from('settings').select('*').limit(1).single();
    if (!settings?.ai_classify_priority) {
      return new Response(JSON.stringify({ skipped: true, reason: 'disabled' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const minConfidence = Number(settings.ai_priority_min_confidence ?? 0.6);

    const { data: ticket, error: tErr } = await supabase
      .from('tickets')
      .select('id, subject, description, priority, created_at')
      .eq('id', ticketId)
      .single();
    if (tErr || !ticket) {
      return new Response(JSON.stringify({ error: 'Ticket not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: rules } = await supabase
      .from('priority_rules')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    const rulesText = (rules ?? [])
      .map(
        (r: any, i: number) =>
          `Regra ${i + 1} (id: ${r.id}) → prioridade "${r.priority}"\n  Intenção: ${r.intent_description || '(não informada)'}\n  Palavras-chave: ${(r.keywords ?? []).join(', ') || '(nenhuma)'}`,
      )
      .join('\n\n');

    const systemPrompt = `Você é um classificador de prioridade de chamados de suporte. Use as regras abaixo para decidir a prioridade do ticket. Se nenhuma regra se aplicar bem, decida pelo bom senso. Retorne via tool call.

Prioridades possíveis: low, medium, high, urgent.

REGRAS CONFIGURADAS:
${rulesText || '(Nenhuma regra configurada — use seu julgamento)'}`;

    const userPrompt = `ASSUNTO: ${ticket.subject}\n\nDESCRIÇÃO:\n${ticket.description ?? ''}`;

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'classify_priority',
            description: 'Classifica a prioridade do ticket.',
            parameters: {
              type: 'object',
              properties: {
                priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
                confidence: { type: 'number', minimum: 0, maximum: 1 },
                matched_rule_id: { type: ['string', 'null'] },
                reasoning: { type: 'string' },
              },
              required: ['priority', 'confidence', 'reasoning'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'classify_priority' } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error('[classify] AI error', aiResp.status, t);
      return new Response(JSON.stringify({ error: 'AI gateway error', status: aiResp.status }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: 'No tool call' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result: ClassifyResult = JSON.parse(toolCall.function.arguments);
    console.log('[classify] result for', ticketId, result);

    if (result.confidence < minConfidence) {
      await supabase.from('audit_log').insert({
        ticket_id: ticketId,
        user_name: 'Assistente IA',
        action: 'priority_classification_skipped',
        details: `Confiança ${(result.confidence * 100).toFixed(0)}% abaixo do mínimo. Sugerido: ${result.priority}. Motivo: ${result.reasoning}`,
      });
      return new Response(JSON.stringify({ skipped: true, ...result }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (result.priority === ticket.priority) {
      await supabase.from('audit_log').insert({
        ticket_id: ticketId,
        user_name: 'Assistente IA',
        action: 'priority_confirmed',
        details: `IA confirmou prioridade ${result.priority} (${(result.confidence * 100).toFixed(0)}%).`,
      });
      return new Response(JSON.stringify({ unchanged: true, ...result }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Apply new priority + recompute SLA
    const { data: sla } = await supabase
      .from('sla_policies')
      .select('first_response_minutes, resolution_minutes')
      .eq('priority', result.priority)
      .single();

    const updates: Record<string, unknown> = { priority: result.priority };
    if (sla) {
      const created = new Date(ticket.created_at).getTime();
      updates.sla_first_response_due = new Date(created + sla.first_response_minutes * 60_000).toISOString();
      updates.sla_resolution_due = new Date(created + sla.resolution_minutes * 60_000).toISOString();
    }

    await supabase.from('tickets').update(updates).eq('id', ticketId);

    await supabase.from('audit_log').insert({
      ticket_id: ticketId,
      user_name: 'Assistente IA',
      action: 'priority_changed',
      details: `IA ajustou prioridade de "${ticket.priority}" para "${result.priority}" (${(result.confidence * 100).toFixed(0)}%). Motivo: ${result.reasoning}`,
    });

    return new Response(JSON.stringify({ updated: true, ...result }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[classify] error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
