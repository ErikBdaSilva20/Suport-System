import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

async function validateAccess(admin: any, token: string, email: string): Promise<{ customerId: string; ticketId: string } | null> {
  if (!token || !email) return null;
  const { data: ticket } = await admin
    .from("tickets")
    .select("id, customer_id")
    .eq("chat_token", token)
    .maybeSingle();
  if (!ticket?.customer_id) return null;
  const { data: customer } = await admin
    .from("customers")
    .select("email")
    .eq("id", ticket.customer_id)
    .maybeSingle();
  if (!customer?.email) return null;
  if (customer.email.trim().toLowerCase() !== email.trim().toLowerCase()) return null;
  return { customerId: ticket.customer_id, ticketId: ticket.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json();
    const token: string = (body.token ?? "").toString();
    const email: string = (body.email ?? "").toString();
    const question: string = (body.question ?? "").toString().trim();
    const history: Array<{ role: "user" | "assistant"; content: string }> = Array.isArray(body.history) ? body.history : [];

    if (!question || !token || !email) {
      return new Response(JSON.stringify({ error: "token, email and question required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const access = await validateAccess(admin, token, email);
    if (!access) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { customerId, ticketId } = access;

    const { data: customer } = await admin
      .from("customers")
      .select("full_name")
      .eq("id", customerId)
      .maybeSingle();

    const { data: pastTickets } = await admin
      .from("tickets")
      .select("id, number, subject, description, status, created_at, resolved_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(20);

    let msgsByTicket: Record<string, Array<{ sender_type: string; sender_name: string; body: string; created_at: string }>> = {};
    if (pastTickets && pastTickets.length > 0) {
      const ids = pastTickets.map((t: any) => t.id);
      const { data: msgs } = await admin
        .from("ticket_messages")
        .select("ticket_id, sender_type, sender_name, body, message_type, created_at")
        .in("ticket_id", ids)
        .eq("message_type", "public_reply")
        .order("created_at", { ascending: true });
      for (const m of (msgs ?? []) as any[]) {
        (msgsByTicket[m.ticket_id] ??= []).push({
          sender_type: m.sender_type,
          sender_name: m.sender_name,
          body: stripHtml(m.body).slice(0, 600),
          created_at: m.created_at,
        });
      }
    }

    const statusLabel = (s: string) => s === "open" ? "Aberto" : s === "pending" ? "Pendente" : s === "resolved" ? "Resolvido" : s;

    const ticketsBlock = ((pastTickets ?? []) as any[]).map((t) => {
      const msgs = (msgsByTicket[t.id] ?? []).slice(-6);
      const isCurrent = t.id === ticketId;
      const conv = msgs.map((m) => `  - [${m.sender_type === "customer" ? "Você" : "Atendente"}] ${m.body}`).join("\n");
      return `### Ticket #${t.number}${isCurrent ? " (ATENDIMENTO ATUAL)" : ""} — ${t.subject}
Status: ${statusLabel(t.status)} | Aberto em: ${new Date(t.created_at).toLocaleDateString("pt-BR")}${t.resolved_at ? ` | Resolvido em: ${new Date(t.resolved_at).toLocaleDateString("pt-BR")}` : ""}
Descrição: ${stripHtml(t.description ?? "").slice(0, 1200)}
Mensagens:
${conv || "  (sem mensagens públicas)"}`;
    }).join("\n\n---\n\n");

    const customerName = customer?.full_name || "cliente";

    const systemPrompt = `Você é um assistente virtual amigável que ajuda o CLIENTE ${customerName} a consultar os atendimentos que ELE MESMO já abriu na empresa. Fala DIRETAMENTE COM O CLIENTE (use "você"), em português brasileiro simples e claro.

REGRAS ESTRITAS:
- Responda APENAS com base nos tickets listados abaixo. Nunca invente.
- Se a resposta não está nos tickets, diga com sinceridade: "Não encontrei isso nos seus atendimentos."
- NUNCA mencione outros clientes, agentes por nome, prioridade interna, SLA ou dados internos da empresa.
- Cite tickets como \`#123\` (com cerquilha).
- Se listar vários tickets, use bullets curtos.
- Tom amigável, direto, sem jargão técnico.
- Se o cliente perguntar sobre semelhança com o atendimento atual, compare com o "ATENDIMENTO ATUAL" marcado.

SEUS ATENDIMENTOS (${pastTickets?.length ?? 0} no total):
${ticketsBlock || "(você ainda não tem outros atendimentos)"}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-8),
      { role: "user", content: question },
    ];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages, stream: true }),
    });

    if (!aiResp.ok || !aiResp.body) {
      const errText = await aiResp.text().catch(() => "");
      const status = aiResp.status;
      const msg = status === 429
        ? "Muitas perguntas em pouco tempo. Tente novamente em instantes."
        : status === 402
        ? "Assistente indisponível no momento."
        : `Falha no assistente (${status}).`;
      console.error("[client-tickets-chat] gateway error", status, errText.slice(0, 300));
      return new Response(JSON.stringify({ error: msg }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
    console.error("[client-tickets-chat] error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
