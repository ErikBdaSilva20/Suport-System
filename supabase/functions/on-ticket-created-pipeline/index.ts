import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';

// Orchestrates the post-creation flow: classify priority -> auto first response.
// Designed to be called fire-and-forget from CreateTicketUseCase or process-inbound-email.

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const { ticketId } = await req.json();
    if (!ticketId) {
      return new Response(JSON.stringify({ error: 'ticketId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result: Record<string, unknown> = { ticketId };

    // Step 1: classify priority (sequential so SLA is correct before sending email)
    try {
      const { data, error } = await supabase.functions.invoke('classify-ticket-priority', {
        body: { ticketId },
      });
      result.classify = error ? { error: error.message } : data;
    } catch (e) {
      result.classify = { error: (e as Error).message };
      console.error('[pipeline] classify failed', e);
    }

    // Step 2: auto first response
    try {
      const { data, error } = await supabase.functions.invoke('auto-first-response', {
        body: { ticketId },
      });
      result.autoResponse = error ? { error: error.message } : data;
    } catch (e) {
      result.autoResponse = { error: (e as Error).message };
      console.error('[pipeline] auto-first-response failed', e);
    }

    return new Response(JSON.stringify(result), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[pipeline] error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
