import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRIORITY_RANK: Record<string, number> = { low: 1, medium: 2, high: 3, urgent: 4 };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { ticketId } = await req.json();
    if (!ticketId) {
      return new Response(JSON.stringify({ error: "ticketId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Load ticket
    const { data: ticket } = await admin
      .from("tickets")
      .select("id,number,subject,status,priority")
      .eq("id", ticketId)
      .maybeSingle();
    if (!ticket) {
      return new Response(JSON.stringify({ error: "Ticket not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load last 4 messages (chronological)
    const { data: msgs } = await admin
      .from("ticket_messages")
      .select("sender_type,sender_name,message_type,body,created_at")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: false })
      .limit(4);

    const recent = (msgs ?? []).reverse();
    if (recent.length < 2) {
      return new Response(JSON.stringify({ skipped: "not enough context" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const last = recent[recent.length - 1];
    if (last.sender_type !== "customer") {
      return new Response(JSON.stringify({ skipped: "last msg not customer" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const conversation = recent
      .map((m) => {
        const role = m.sender_type === "customer" ? "[cliente]" : m.sender_type === "agent" ? "[agente]" : "[sistema]";
        return `${role} ${m.sender_name}: ${(m.body ?? "").replace(/<[^>]+>/g, " ").slice(0, 500)}`;
      })
      .join("\n");

    const systemPrompt = `Você analisa respostas de clientes em tickets de suporte para detectar insatisfação, escalonamento ou risco de churn.
Avalie SOMENTE a última mensagem do cliente no contexto da conversa.
Sinais positivos para needs_attention=true: cliente diz que solução anterior não funcionou, demonstra frustração/raiva, ameaça cancelar, pede gerente, repete o problema.
Sinais negativos: cliente agradece, confirma resolução, pede informação adicional neutra.
Prioridade atual: ${ticket.priority}. Status atual: ${ticket.status}.
Sugira aumentar prioridade apenas se a atual for menor que a sugerida.
Sugira mudar status para 'open' se estiver 'pending' e a resposta exigir ação imediata.
Confidence deve ser >= 0.6 só se houver sinais claros.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `CONVERSA:\n${conversation}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "report_analysis",
            description: "Report analysis of customer reply",
            parameters: {
              type: "object",
              properties: {
                needs_attention: { type: "boolean" },
                suggested_priority: { type: ["string", "null"], enum: ["low", "medium", "high", "urgent", null] },
                suggested_status: { type: ["string", "null"], enum: ["open", "pending", "resolved", null] },
                reasoning: { type: "string", description: "1-2 sentences in Portuguese explaining the suggestion" },
                confidence: { type: "number", minimum: 0, maximum: 1 },
              },
              required: ["needs_attention", "reasoning", "confidence"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "report_analysis" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error:", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI error", status: aiResp.status }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ skipped: "no tool call" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const args = JSON.parse(toolCall.function.arguments);
    console.log("[analyze-customer-reply] result:", args);

    if (!args.needs_attention || (args.confidence ?? 0) < 0.6) {
      return new Response(JSON.stringify({ skipped: "below threshold", args }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only keep priority suggestion if it actually escalates
    let suggestedPriority: string | null = args.suggested_priority ?? null;
    if (suggestedPriority && PRIORITY_RANK[suggestedPriority] <= PRIORITY_RANK[ticket.priority]) {
      suggestedPriority = null;
    }
    let suggestedStatus: string | null = args.suggested_status ?? null;
    if (suggestedStatus && suggestedStatus === ticket.status) {
      suggestedStatus = null;
    }

    if (!suggestedPriority && !suggestedStatus) {
      return new Response(JSON.stringify({ skipped: "no actionable change" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Dismiss any existing pending suggestion for this ticket (replace by latest)
    await admin
      .from("ticket_ai_suggestions")
      .update({ status: "dismissed", resolved_at: new Date().toISOString() })
      .eq("ticket_id", ticketId)
      .eq("status", "pending");

    const { data: inserted, error: insErr } = await admin
      .from("ticket_ai_suggestions")
      .insert({
        ticket_id: ticketId,
        kind: "reclassify",
        suggested_priority: suggestedPriority,
        suggested_status: suggestedStatus,
        reasoning: args.reasoning,
        confidence: args.confidence,
      })
      .select("id")
      .single();

    if (insErr) {
      console.error("Insert error:", insErr);
      throw insErr;
    }

    await admin.from("audit_log").insert({
      ticket_id: ticketId,
      user_name: "Assistente IA",
      action: "ai_suggestion_created",
      details: `Sugestão de reclassificação: ${args.reasoning}`,
    });

    return new Response(JSON.stringify({ ok: true, suggestionId: inserted.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-customer-reply error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
