import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Remove HTML tags from message bodies to keep the context tight.
function stripHtml(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: profile } = await admin
      .from("profiles")
      .select("role,is_active")
      .eq("id", userData.user.id)
      .single();
    if (!profile || !profile.is_active || !["admin", "agent"].includes(profile.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const question: string = (body.question ?? "").toString().trim();
    const customerId: string | null = body.customerId ?? null;
    const currentTicketId: string | null = body.ticketId ?? null;
    const history: Array<{ role: "user" | "assistant"; content: string }> = Array.isArray(body.history) ? body.history : [];

    if (!question || !customerId) {
      return new Response(JSON.stringify({ error: "question and customerId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load customer + past tickets (exclude current)
    const { data: customer } = await admin
      .from("customers")
      .select("id, full_name, email, company")
      .eq("id", customerId)
      .maybeSingle();

    let ticketsQuery = admin
      .from("tickets")
      .select("id, number, subject, description, status, priority, created_at, resolved_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (currentTicketId) ticketsQuery = ticketsQuery.neq("id", currentTicketId);
    const { data: pastTickets } = await ticketsQuery;

    // Fetch public messages for those tickets in a single query
    let ticketMessagesByTicket: Record<string, Array<{ sender_type: string; sender_name: string; body: string; created_at: string }>> = {};
    if (pastTickets && pastTickets.length > 0) {
      const ids = pastTickets.map((t) => t.id);
      const { data: msgs } = await admin
        .from("ticket_messages")
        .select("ticket_id, sender_type, sender_name, body, message_type, created_at")
        .in("ticket_id", ids)
        .eq("message_type", "public_reply")
        .order("created_at", { ascending: true });
      for (const m of msgs ?? []) {
        (ticketMessagesByTicket[m.ticket_id] ??= []).push({
          sender_type: m.sender_type,
          sender_name: m.sender_name,
          body: stripHtml(m.body).slice(0, 800),
          created_at: m.created_at,
        });
      }
    }

    const customerLine = customer
      ? `${customer.full_name}${customer.company ? ` (${customer.company})` : ""} — ${customer.email}`
      : "Cliente desconhecido";

    const ticketsBlock = (pastTickets ?? []).map((t) => {
      const msgs = (ticketMessagesByTicket[t.id] ?? []).slice(-6);
      const conv = msgs.map((m) => `  - [${m.sender_type === "customer" ? "Cliente" : "Agente"}] ${m.sender_name}: ${m.body}`).join("\n");
      return `### Ticket #${t.number} — ${t.subject}
Status: ${t.status} | Prioridade: ${t.priority} | Aberto em: ${new Date(t.created_at).toLocaleDateString("pt-BR")}${t.resolved_at ? ` | Resolvido em: ${new Date(t.resolved_at).toLocaleDateString("pt-BR")}` : ""}
Descrição: ${stripHtml(t.description ?? "").slice(0, 1500)}
Mensagens públicas:
${conv || "  (nenhuma)"}`;
    }).join("\n\n---\n\n");

    const systemPrompt = `Você é um assistente que responde perguntas sobre o HISTÓRICO DE TICKETS de um cliente específico. Responda com base APENAS nos tickets fornecidos abaixo — nunca invente. Se a informação não estiver nos tickets, diga isso claramente.

REGRAS:
- Português brasileiro, tom profissional e conciso.
- Sempre cite tickets referenciados como \`#123\` (com cerquilha e número) para o agente clicar.
- Se listar múltiplos tickets, use bullets.
- Se o cliente não tiver histórico, informe.

CLIENTE: ${customerLine}
TOTAL DE TICKETS ANTERIORES: ${pastTickets?.length ?? 0}

TICKETS ANTERIORES:
${ticketsBlock || "(este cliente não tem tickets anteriores)"}`;

    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
      ...history.slice(-8).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: question },
    ];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        stream: true,
      }),
    });

    if (!aiResp.ok || !aiResp.body) {
      const errText = await aiResp.text().catch(() => "");
      const status = aiResp.status;
      const msg = status === 429
        ? "Limite de requisições atingido. Tente novamente em instantes."
        : status === 402
        ? "Créditos de IA esgotados. Adicione créditos no espaço de trabalho."
        : `Falha na IA (${status}). ${errText.slice(0, 200)}`;
      return new Response(JSON.stringify({ error: msg }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Passthrough SSE stream from gateway to client
    return new Response(aiResp.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("[customer-history-chat] error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
