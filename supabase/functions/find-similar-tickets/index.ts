import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function stripHtml(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

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

    const { ticketId, customerId } = await req.json();
    if (!ticketId || !customerId) {
      return new Response(JSON.stringify({ error: "ticketId and customerId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load reference ticket
    const { data: refTicket } = await admin
      .from("tickets")
      .select("id, subject, description")
      .eq("id", ticketId)
      .maybeSingle();
    if (!refTicket) {
      return new Response(JSON.stringify({ tickets: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const query = `${refTicket.subject ?? ""} ${stripHtml(refTicket.description ?? "")}`.trim().slice(0, 500);

    // FTS ranked candidates for this customer, excluding the current ticket
    // Use a raw RPC-less approach: fetch a superset ordered by created_at desc and filter/rank in code.
    const { data: candidates } = await admin
      .from("tickets")
      .select("id, number, subject, description, status, priority, created_at, resolved_at, ai_summary")
      .eq("customer_id", customerId)
      .neq("id", ticketId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (!candidates || candidates.length === 0) {
      return new Response(JSON.stringify({ tickets: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Simple token-overlap score
    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ");
    const stop = new Set(["a","o","os","as","de","da","do","das","dos","e","ou","um","uma","para","por","com","sem","em","no","na","nos","nas","que","se","como","o","é","não","the","and","or","of"]);
    const tokenize = (s: string) => norm(s).split(/\s+/).filter((w) => w.length >= 3 && !stop.has(w));
    const refTokens = new Set(tokenize(query));

    const scored = candidates.map((t) => {
      const tks = tokenize(`${t.subject ?? ""} ${stripHtml(t.description ?? "")}`);
      let score = 0;
      const seen = new Set<string>();
      for (const tk of tks) {
        if (refTokens.has(tk) && !seen.has(tk)) { score++; seen.add(tk); }
      }
      return { ticket: t, score };
    });

    // Keep top 5 (min score 1); if none scored, keep 3 most recent
    scored.sort((a, b) => b.score - a.score || new Date(b.ticket.created_at).getTime() - new Date(a.ticket.created_at).getTime());
    let top = scored.filter((s) => s.score > 0).slice(0, 5).map((s) => s.ticket);
    if (top.length === 0) top = scored.slice(0, 3).map((s) => s.ticket);

    // Generate AI summary for any ticket missing ai_summary — single batched call
    const needSummary = top.filter((t) => !t.ai_summary || t.ai_summary.trim() === "");
    if (needSummary.length > 0 && LOVABLE_API_KEY) {
      const ticketBlocks = needSummary.map((t, i) => `### T${i + 1} (id=${t.id})
Assunto: ${t.subject}
Descrição: ${stripHtml(t.description ?? "").slice(0, 800)}`).join("\n\n");

      try {
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              { role: "system", content: "Você resume tickets de suporte em UMA frase curta (máx 20 palavras) em português brasileiro. Foque no problema. Sem prefixos como 'Resumo:'." },
              { role: "user", content: `Para cada ticket abaixo, retorne SOMENTE um JSON no formato {"summaries":[{"id":"<id>","summary":"<frase curta>"}]}.\n\n${ticketBlocks}` },
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
              const t = top.find((x) => x.id === s.id);
              if (t && s.summary) {
                t.ai_summary = s.summary.trim();
                await admin.from("tickets").update({ ai_summary: t.ai_summary }).eq("id", t.id);
              }
            }
          } catch { /* ignore parse error, fall back to subject */ }
        }
      } catch (e) {
        console.error("[find-similar-tickets] ai summary error", e);
      }
    }

    const out = top.map((t) => ({
      id: t.id,
      number: t.number,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      created_at: t.created_at,
      resolved_at: t.resolved_at,
      ai_summary: t.ai_summary ?? null,
    }));

    return new Response(JSON.stringify({ tickets: out }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[find-similar-tickets] error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
