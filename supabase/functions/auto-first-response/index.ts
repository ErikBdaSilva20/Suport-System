import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';

// Gera uma SUGESTÃO de resposta baseada na KB e a registra como NOTA INTERNA
// no ticket, para o agente revisar e enviar manualmente. NÃO envia e-mail ao cliente.

const STOPWORDS = new Set([
  'a','o','os','as','de','da','do','das','dos','e','ou','um','uma','para','por','com','sem','em','no','na','nos','nas',
  'que','se','como','qual','quais','quando','onde','porque','ser','estar','tem','ter','muito','mais','menos','sobre',
  'pelo','pela','ao','aos','meu','minha','seu','sua','esse','essa','isso','este','esta','isto'
]);

function tokenize(q: string): string[] {
  return q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w)).slice(0, 8);
}

function renderSourcesHtml(sources: Array<{ id: string; title: string }>): string {
  if (!sources?.length) return '';
  const items = sources.map((s) => `<li>${s.title}</li>`).join('');
  return `<p><strong>Fontes:</strong></p><ul>${items}</ul>`;
}

/**
 * Normaliza HTML devolvido pelo modelo: converte escapes literais ("\n", "\t", "\\\"")
 * em HTML real e envolve em <p> se vier texto puro.
 */
function normalizeAiHtml(raw: string): string {
  if (!raw) return '';
  let s = raw.trim();

  // Remove cercas markdown eventuais (```html ... ```)
  s = s.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/i, '');

  // Escapes literais que o modelo às vezes emite como texto
  s = s.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\t/g, ' ').replace(/\\"/g, '"').replace(/\\\\/g, '\\');

  const hasHtmlTag = /<(p|ol|ul|li|strong|em|br|h[1-6]|img|a|div|span|table)\b/i.test(s);
  if (!hasHtmlTag) {
    const paragraphs = s.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
      .map((p) => `<p>${p.replace(/\n/g, '<br />')}</p>`);
    s = paragraphs.join('');
  } else {
    // Converte quebras remanescentes fora de tags em <br />
    s = s.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br />');
  }

  // Limpezas
  s = s.replace(/(<br\s*\/?>\s*){3,}/gi, '<br /><br />');
  s = s.replace(/<p>\s*<\/p>/gi, '');
  return s.trim();
}

function renderArticleReferencesHtml(articles: Array<{ id: string; title: string; content: string }>): string {
  if (!articles?.length) return '';
  return articles.map((a) => `
    <details style="margin-top:8px;border:1px solid #e5e7eb;border-radius:6px;padding:6px 10px;">
      <summary style="cursor:pointer;font-weight:600;">📎 Artigo: ${a.title}</summary>
      <div style="margin-top:8px;">${a.content ?? ''}</div>
    </details>
  `).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const { ticketId } = await req.json();
    if (!ticketId) {
      return new Response(JSON.stringify({ error: 'ticketId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: settings } = await supabase.from('settings').select('*').limit(1).single();
    const { data: ticket } = await supabase.from('tickets').select('*').eq('id', ticketId).single();
    if (!ticket) {
      return new Response(JSON.stringify({ error: 'Ticket not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Se já existe qualquer nota da IA neste ticket, não gera de novo (idempotência).
    const { data: existingNote } = await supabase
      .from('ticket_messages')
      .select('id')
      .eq('ticket_id', ticketId)
      .eq('message_type', 'internal_note')
      .eq('sender_name', 'Assistente IA')
      .limit(1)
      .maybeSingle();
    if (existingNote) {
      return new Response(JSON.stringify({ skipped: true, reason: 'already_generated' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: customer } = await supabase
      .from('customers').select('id, full_name, email').eq('id', ticket.customer_id).single();

    const autoResponseEnabled = settings?.ai_auto_first_response !== false;

    if (!autoResponseEnabled) {
      return new Response(JSON.stringify({ skipped: true, reason: 'disabled_in_settings' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no_ai_key' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Busca artigos via full-text search em português, com fallback para ILIKE por token.
    const query = `${ticket.subject ?? ''} ${ticket.description ?? ''}`.trim();
    let articles: Array<{ id: string; title: string; slug: string; content: string }> = [];

    const { data: ftsData } = await supabase.rpc('search_kb_articles', { query, max_results: 5 });
    if (ftsData && ftsData.length > 0) {
      articles = ftsData.map((a: any) => ({ id: a.id, title: a.title, slug: a.slug, content: a.content }));
    } else {
      const tokens = tokenize(query);
      if (tokens.length > 0) {
        const orParts = tokens.map((t) => `title.ilike.%${t}%,content.ilike.%${t}%`).join(',');
        const { data } = await supabase
          .from('kb_articles')
          .select('id, title, slug, content')
          .eq('status', 'published')
          .eq('is_public', true)
          .or(orParts)
          .limit(5);
        articles = data ?? [];
      }
    }

    let aiResult: { found: boolean; response_html: string; sources: Array<{ id: string; title: string }> } | null = null;

    if (articles.length > 0) {
      const ctx = articles
        .map((a, i) => `### Artigo ${i + 1} (id=${a.id}): ${a.title}\n${(a.content ?? '').slice(0, 8000)}`)
        .join('\n\n---\n\n');

      const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [
            {
              role: 'system',
              content: `Você é um assistente de suporte ajudando um AGENTE HUMANO a responder um chamado. Com base APENAS nos artigos abaixo, gere uma SUGESTÃO de resposta para o agente revisar antes de enviar ao cliente. Comece cumprimentando pelo primeiro nome do cliente. Se nenhum artigo se aplicar de fato, retorne found=false. Português brasileiro.

REGRAS DE FORMATAÇÃO (obrigatórias):
- Responda EXCLUSIVAMENTE com HTML válido. Use apenas <p>, <ol>, <ul>, <li>, <strong>, <em>, <br>, <a>, <img>.
- NUNCA use sequências de escape como \\n, \\t, \\" ou \\\\ no texto — use tags HTML de verdade (<br />, <p></p>).
- Não escape aspas nem barras invertidas.
- Reaproveite as tags <img src="..."> e <a href="..."> presentes nos artigos quando forem relevantes ao passo explicado (copie o src/href exatamente como aparece no artigo).
- Não invente URLs de imagens.

ARTIGOS:
${ctx}`,
            },
            {
              role: 'user',
              content: `Cliente: ${customer?.full_name ?? 'Cliente'}\n\nAssunto: ${ticket.subject}\n\nProblema:\n${ticket.description ?? ''}`,
            },
          ],
          tools: [{
            type: 'function',
            function: {
              name: 'reply',
              description: 'Sugestão gerada pela IA',
              parameters: {
                type: 'object',
                properties: {
                  found: { type: 'boolean' },
                  response_html: { type: 'string' },
                  sources: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: { id: { type: 'string' }, title: { type: 'string' } },
                      required: ['id', 'title'],
                      additionalProperties: false,
                    },
                  },
                },
                required: ['found', 'response_html', 'sources'],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: 'function', function: { name: 'reply' } },
        }),
      });

      if (aiResp.ok) {
        const j = await aiResp.json();
        const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        if (args) {
          try { aiResult = JSON.parse(args); } catch { /* ignore */ }
        }
      } else {
        console.error('[auto-first-response] AI error', aiResp.status, await aiResp.text());
      }
    }

    // Monta o corpo da nota interna
    let noteBody: string;
    let auditDetails: string;

    if (aiResult?.found && aiResult.response_html?.trim()) {
      const cleanHtml = normalizeAiHtml(aiResult.response_html);
      // Artigos referenciados (usa sources da IA; fallback = todos os artigos do FTS)
      const sourceIds = new Set((aiResult.sources ?? []).map((s) => s.id));
      const referenced = articles.filter((a) => sourceIds.has(a.id));
      const referencesHtml = renderArticleReferencesHtml(referenced.length > 0 ? referenced : articles);

      noteBody = `
        <p><em>💡 Sugestão gerada automaticamente pela IA com base na base de conhecimento. Revise antes de enviar ao cliente.</em></p>
        <hr />
        ${cleanHtml}
        ${renderSourcesHtml(aiResult.sources ?? [])}
        ${referencesHtml}
      `;
      auditDetails = `Sugestão de resposta gerada pela IA com base em ${aiResult.sources?.length ?? 0} artigo(s).`;
    } else {
      noteBody = `
        <p><em>💡 A IA analisou este ticket mas não encontrou artigo relevante na base de conhecimento para sugerir uma resposta. Considere responder manualmente ou criar um novo artigo.</em></p>
      `;
      auditDetails = 'IA não encontrou artigo relevante na base de conhecimento.';
    }

    const { data: msg } = await supabase.from('ticket_messages').insert({
      ticket_id: ticketId,
      sender_type: 'agent',
      sender_id: null,
      sender_name: 'Assistente IA',
      message_type: 'internal_note',
      body: noteBody,
    }).select().single();

    await supabase.from('audit_log').insert({
      ticket_id: ticketId,
      user_name: 'Assistente IA',
      action: 'ai_suggestion_created',
      details: auditDetails,
    });

    return new Response(JSON.stringify({
      kind: 'internal_note',
      message_id: msg?.id,
      has_suggestion: !!(aiResult?.found),
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[auto-first-response] error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
