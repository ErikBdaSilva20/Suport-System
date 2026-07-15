import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    // Find resolved tickets older than 1h without CSAT
    // Resolve app base URL from settings
    const { data: settingsRow } = await supabase
      .from('settings')
      .select('app_base_url')
      .limit(1)
      .single()
    const appBase = (settingsRow?.app_base_url ?? '').replace(/\/$/, '') || supabaseUrl

    const { data: tickets } = await supabase
      .from('tickets')
      .select('id, number, subject, customer_id')
      .eq('status', 'resolved')
      .lt('resolved_at', oneHourAgo)

    if (!tickets?.length) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let sent = 0
    for (const ticket of tickets) {
      // Check if CSAT already exists
      const { data: existing } = await supabase
        .from('csat_responses')
        .select('id')
        .eq('ticket_id', ticket.id)
        .limit(1)

      if (existing?.length) continue

      // Get customer email
      const { data: customer } = await supabase
        .from('customers')
        .select('email')
        .eq('id', ticket.customer_id)
        .single()

      if (!customer) continue

      // Create CSAT response entry
      const { data: csat } = await supabase
        .from('csat_responses')
        .insert({
          ticket_id: ticket.id,
          customer_id: ticket.customer_id,
        })
        .select('token')
        .single()

      if (!csat) continue

      // Send notification
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            to: customer.email,
            subject: `Avalie nosso atendimento — Chamado #${ticket.number}`,
            template: 'csat_survey',
            data: {
              number: ticket.number,
              subject: ticket.subject,
              link: `${appBase}/csat/${csat.token}`,
              token: csat.token,
              appBase,
            },
          },
        })
        sent++
      } catch (e) {
        console.error('Failed to send CSAT survey for ticket', ticket.id, e)
      }
    }

    return new Response(JSON.stringify({ success: true, sent }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('send-csat-survey error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
