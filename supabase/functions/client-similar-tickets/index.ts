import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function stripHtml(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
}

const STOP = new Set(["a","o","os","as","de","da","do","das","dos","e","ou","um","uma","para","por","com","sem","em","no","na","nos","nas","que","se","como","é","não","the","and","or","of","to","meu","minha","seu","sua"]);
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ");
const tokenize = (s: string) => norm(s).split(/\s+/).filter((w) => w.length >= 3 && !STOP.has(w));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const body = await req.json();
    const token: string = (body.token ?? "").toString();
    const email: string = (body.email ?? "").toString();
    if (!token || !email) {
      return new Response(JSON.stringify({ error: "token and email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: currentTicket } = await admin
      .from("tickets")
      .select("id, customer_id, subject, description")
      .eq("chat_token", token)
      .maybeSingle();
    if (!currentTicket?.customer_id) {
      return new Response(JSON.stringify({ error: "Ticket não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: customer } = await admin
      .from("customers")
      .select("email")
      .eq("id", currentTicket.customer_id)
      .maybeSingle();
    if (!customer?.email || customer.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch previous tickets from this customer (exclude current)
    const { data: candidates } = await admin
      .from("tickets")
      .select("id, number, subject, description, status, created_at, resolved_at, ai_summary")
      .eq("customer_id", currentTicket.customer_id)
      .neq("id", currentTicket.id)
      .order("created_at", { ascending: false })
      .limit(20);

    const tickets = (candidates ?? []) as any[];

    // Similarity: token overlap between current and each past ticket
    const refTokens = new Set(tokenize(`${currentTicket.subject ?? ""} ${stripHtml(currentTicket.description ?? "")}`.slice(0, 500)));
    const withScore = tickets.map((t) => {
      const tks = tokenize(`${t.subject ?? ""} ${stripHtml(t.description ?? "")}`);
      const seen = new Set<string>();
      let score = 0;
      for (const tk of tks) { if (refTokens.has(tk) && !seen.has(tk)) { seen.add(tk); score++; } }
      return { t, score };
    });
    const similarIds = withScore.filter((x) => x.score >= 2).map((x) => x.t.id);

    // Generate AI summaries for tickets that don't have one yet (top 10)
    const topForSummary = tickets.slice(0, 10).filter((t) => !t.ai_summary || !t.ai_summary.trim());
    if (topForSummary.length > 0 && LOVABLE_API_KEY) {
      const block = topForSummary.map((t, i) => `### T${i + 1} (id=${t.id})
Assunto: ${t.subject}
Descrição: ${stripHtml(t.description ?? "").slice(0, 600)}`).join("\n\n");
      try {
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              { role: "system", content: "Resuma cada ticket em UMA frase curta (máx 20 palavras), em português BR, foco no problema. Sem prefixos." },
              { role: "user", content: `Retorne SOMENTE JSON: {"summaries":[{"id":"<id>","summary":"..."}]}.\n\n${block}` },
            ],
            response_format: { type: "json_object" },
          }),
        });
        if (aiResp.ok) {
          const j = await aiResp.json();
          const raw = j.choices?.[0]?.message?.content ?? "{}";
          try {
            const parsed = JSON.parse(raw);
            const list: Array<{ id: string; summary: string }> = parsed.summaries ?? [];
            for (const s of list) {
              const t = tickets.find((x) => x.id === s.id);
              if (t && s.summary) {
                t.ai_summary = s.summary.trim();
                await admin.from("tickets").update({ ai_summary: t.ai_summary }).eq("id", t.id);
              }
            }
          } catch { /* ignore */ }
        }
      } catch (e) {
        console.error("[client-similar-tickets] summary error", e);
      }
    }

    const out = tickets.map((t) => ({
      id: t.id,
      number: t.number,
      subject: t.subject,
      status: t.status,
      created_at: t.created_at,
      resolved_at: t.resolved_at,
      ai_summary: t.ai_summary ?? null,
      is_similar: similarIds.includes(t.id),
    }));

    return new Response(JSON.stringify({
      tickets: out,
      total: tickets.length,
      hasSimilar: similarIds.length > 0,
      similarCount: similarIds.length,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[client-similar-tickets] error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
