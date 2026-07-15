import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const BodySchema = z.object({
  token: z.string().min(1).max(200),
  email: z.string().trim().email().max(255),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ ok: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    const { token, email } = parsed.data;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: ticket } = await supabase
      .from('tickets')
      .select('customer_id')
      .eq('chat_token', token)
      .maybeSingle();

    if (!ticket?.customer_id) {
      return new Response(JSON.stringify({ ok: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const { data: customer } = await supabase
      .from('customers')
      .select('email, full_name')
      .eq('id', ticket.customer_id)
      .maybeSingle();

    const ok =
      !!customer?.email &&
      customer.email.trim().toLowerCase() === email.trim().toLowerCase();

    return new Response(JSON.stringify({ ok, name: ok ? (customer?.full_name ?? null) : null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch {
    return new Response(JSON.stringify({ ok: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
