import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const now = new Date().toISOString()

    const { data: settingsRow } = await supabase
      .from('settings')
      .select('app_base_url')
      .limit(1)
      .single()
    const appBase = (settingsRow?.app_base_url ?? '').replace(/\/$/, '') || supabaseUrl

    // Find tickets with breached first response SLA
    const { data: breachedFirst } = await supabase
      .from('tickets')
      .select('id, number, subject, assigned_agent_id')
      .lt('sla_first_response_due', now)
      .is('first_response_at', null)
      .not('status', 'in', '("resolved")')
      .neq('sla_status', 'breached')

    // Find tickets with breached resolution SLA
    const { data: breachedRes } = await supabase
      .from('tickets')
      .select('id, number, subject, assigned_agent_id')
      .lt('sla_resolution_due', now)
      .is('resolved_at', null)
      .not('status', 'in', '("resolved")')
      .neq('sla_status', 'breached')

    const allBreached = new Map<string, any>()
    for (const t of [...(breachedFirst ?? []), ...(breachedRes ?? [])]) {
      allBreached.set(t.id, t)
    }

    const ticketIds = Array.from(allBreached.keys())

    if (ticketIds.length > 0) {
      // Update sla_status to breached
      await supabase.from('tickets').update({ sla_status: 'breached' }).in('id', ticketIds)

      // Get admins
      const { data: admins } = await supabase.from('profiles').select('email').eq('role', 'admin').eq('is_active', true)

      // Notify for each ticket
      for (const ticket of allBreached.values()) {
        const recipients: string[] = []

        if (ticket.assigned_agent_id) {
          const { data: agent } = await supabase.from('profiles').select('email').eq('id', ticket.assigned_agent_id).single()
          if (agent) recipients.push(agent.email)
        }

        for (const admin of admins ?? []) {
          if (!recipients.includes(admin.email)) recipients.push(admin.email)
        }

        for (const email of recipients) {
          try {
            await supabase.functions.invoke('send-notification', {
              body: {
                to: email,
                subject: `🚨 SLA Violado — Chamado #${ticket.number}`,
                template: 'sla_breached',
                data: {
                  number: ticket.number,
                  subject: ticket.subject,
                  link: `${appBase}/tickets/${ticket.id}`,
                },
              },
            })
          } catch (e) {
            console.error('Failed to notify', email, e)
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, breached: ticketIds.length }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('check-sla-breach error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
