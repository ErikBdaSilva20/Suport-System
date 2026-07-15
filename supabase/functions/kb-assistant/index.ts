import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STOPWORDS = new Set([
  "a","o","os","as","de","da","do","das","dos","e","ou","um","uma","para","por","com","sem","em","no","na","nos","nas",
  "que","se","como","qual","quais","quando","onde","porque","por que","ser","estar","tem","ter","faz","fazer","muito",
  "mais","menos","sobre","pelo","pela","ao","aos","à","às","meu","minha","seu","sua","esse","essa","isso","este","esta","isto",
  "the","an","of","to","is","are","what","how","why","and","or","in","on","for","with","i","you"
]);

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
    .slice(0, 8);
}

function makeTitle(q: string): string {
  const clean = q.trim().replace(/\s+/g, " ");
  return clean.length <= 60 ? clean : clean.slice(0, 57) + "...";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verify agent role
    const { data: profile } = await admin
      .from("profiles")
      .select("role,is_active")
      .eq("id", userId)
      .single();
    if (!profile || !profile.is_active || !["admin", "agent"].includes(profile.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const question: string = (body.question ?? "").toString().trim();
    let conversationId: string | null = body.conversationId ?? null;
    const ticketId: string | null = body.ticketId ?? null;
    if (!question) {
      return new Response(JSON.stringify({ error: "question is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve / create conversation
    let conversationTitle: string | null = null;
    let isNewConversation = false;

    if (conversationId) {
      const { data: conv } = await admin
        .from("kb_conversations")
        .select("id,title,user_id")
        .eq("id", conversationId)
        .maybeSingle();
      if (!conv || conv.user_id !== userId) {
        return new Response(JSON.stringify({ error: "Conversation not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      conversationTitle = conv.title;
    } else {
      conversationTitle = makeTitle(question);
      const { data: created, error: convErr } = await admin
        .from("kb_conversations")
        .insert({ user_id: userId, title: conversationTitle })
        .select("id")
        .single();
      if (convErr || !created) throw convErr ?? new Error("Failed to create conversation");
      conversationId = created.id;
      isNewConversation = true;
    }

    // Load history (last 6 turns) from DB for context
    const { data: historyRows } = await admin
      .from("kb_conversation_messages")
      .select("role,content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    const history = (historyRows ?? []).slice(-6);

    // Save user message
    await admin.from("kb_conversation_messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: question,
    });

    // Retrieve candidate articles
    const tokens = tokenize(question);
    let articles: Array<{ id: string; title: string; slug: string; content: string }> = [];

    if (tokens.length > 0) {
      const orParts = tokens
        .map((t) => `title.ilike.%${t}%,content.ilike.%${t}%`)
        .join(",");
      const { data } = await admin
        .from("kb_articles")
        .select("id,title,slug,content")
        .eq("status", "published")
        .or(orParts)
        .limit(8);
      articles = data ?? [];
    }

    if (articles.length === 0) {
      const { data } = await admin
        .from("kb_articles")
        .select("id,title,slug,content")
        .eq("status", "published")
        .order("updated_at", { ascending: false })
        .limit(5);
      articles = data ?? [];
    }

    const context = articles
      .map((a, i) => `### Artigo ${i + 1}: ${a.title}\n(slug: ${a.slug})\n\n${(a.content ?? "").slice(0, 6000)}`)
      .join("\n\n---\n\n");

    let ticketContextBlock = "";
    if (ticketId) {
      const { data: ticket } = await admin
        .from("tickets")
        .select("id,number,subject,status,priority,customer_id,created_at")
        .eq("id", ticketId)
        .maybeSingle();
      if (ticket) {
        const { data: customer } = await admin
          .from("customers")
          .select("id,full_name,email,company")
          .eq("id", ticket.customer_id)
          .maybeSingle();
        const { data: ticketMsgs } = await admin
          .from("ticket_messages")
          .select("sender_type,sender_name,message_type,body,created_at")
          .eq("ticket_id", ticketId)
          .order("created_at", { ascending: false })
          .limit(6);
        const { data: history } = await admin
          .from("tickets")
          .select("number,subject,status,priority,resolved_at,created_at")
          .eq("customer_id", ticket.customer_id)
          .neq("id", ticketId)
          .order("created_at", { ascending: false })
          .limit(5);

        const conv = (ticketMsgs ?? []).reverse().map((m) => {
          const role = m.sender_type === "customer" ? "[cliente]" : m.sender_type === "agent" ? "[agente]" : "[sistema]";
          const tag = m.message_type === "internal_note" ? " (nota interna)" : "";
          return `${role}${tag} ${m.sender_name}: ${(m.body ?? "").replace(/<[^>]+>/g, " ").slice(0, 500)}`;
        }).join("\n");

        const histLines = (history ?? []).map((h) =>
          `- #${h.number} "${h.subject}" — ${h.status}, prioridade ${h.priority}${h.resolved_at ? " (resolvido)" : ""}`
        ).join("\n");

        ticketContextBlock = `

CONTEXTO DO CHAMADO ATUAL:
- #${ticket.number} "${ticket.subject}" | status: ${ticket.status} | prioridade: ${ticket.priority}
- Cliente: ${customer?.full_name ?? "?"} (${customer?.email ?? "?"}${customer?.company ? `, ${customer.company}` : ""})

HISTÓRICO RECENTE DO CLIENTE:
${histLines || "(nenhum outro ticket)"}

CONVERSA ATUAL (últimas mensagens):
${conv || "(sem mensagens)"}`;
      }
    }

    const systemPrompt = `Você é um assistente interno que ajuda atendentes de suporte respondendo perguntas sobre processos da empresa${ticketId ? " e oferecendo orientação contextual sobre o chamado em questão" : ""}.
REGRAS ESTRITAS:
1. Para conhecimento de processos, baseie-se nos artigos da base de conhecimento abaixo. Se a resposta de processo não estiver nos artigos, diga: "Não encontrei essa informação na base de conhecimento."
2. Sempre cite o título do artigo usado entre parênteses, ex: (Fonte: Política de Reembolso).
3. ${ticketId ? "Quando o agente perguntar sobre o chamado atual, use o CONTEXTO DO CHAMADO e o HISTÓRICO DO CLIENTE para dar recomendações práticas (próximos passos, escalonamento, padrões recorrentes)." : "Foque em explicar processos."}
4. Seja direto, objetivo e use português brasileiro.
5. Use markdown para formatar listas e passos.
6. IMAGENS: quando um artigo contiver imagens em markdown (\`![alt](url)\`) que ilustrem o passo que você está explicando, INCLUA a imagem no ponto correspondente da resposta copiando o markdown exatamente como está no artigo (mesma URL). Não invente URLs, não use imagens do Zendesk (\`zendesk.com/attachments\`) — apenas as URLs presentes nos artigos. Se o artigo não tem imagem, não coloque nenhuma.

ARTIGOS DISPONÍVEIS:
${context || "(Nenhum artigo disponível)"}${ticketContextBlock}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          ...history,
          { role: "user", content: question },
        ],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos no workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return new Response(JSON.stringify({ error: "Erro ao chamar IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sources = articles.map((a) => ({ id: a.id, title: a.title, slug: a.slug }));
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // Conversation metadata first
        controller.enqueue(encoder.encode(
          `event: conversation\ndata: ${JSON.stringify({ conversationId, title: conversationTitle, isNew: isNewConversation })}\n\n`
        ));
        // Sources
        controller.enqueue(encoder.encode(`event: sources\ndata: ${JSON.stringify(sources)}\n\n`));

        const reader = aiResp.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assistantText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          // Forward raw chunk to client
          controller.enqueue(value);
          // Also parse to accumulate assistant text for persistence
          buffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, nl);
            buffer = buffer.slice(nl + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") continue;
            try {
              const parsed = JSON.parse(payload);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) assistantText += delta;
            } catch { /* ignore */ }
          }
        }

        // Persist assistant message
        try {
          await admin.from("kb_conversation_messages").insert({
            conversation_id: conversationId,
            role: "assistant",
            content: assistantText,
            sources,
          });
        } catch (e) {
          console.error("Failed to save assistant message:", e);
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("kb-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
