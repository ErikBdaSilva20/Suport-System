import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const INTERNAL_TO_ZENDESK: Record<string, string> = {
  open: 'open',
  pending: 'pending',
  resolved: 'solved',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin' && profile?.role !== 'agent') {
      return new Response(JSON.stringify({ error: 'Agent access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => ({}))
    const ticketId = String(body.ticketId ?? '')
    const newStatus = String(body.newStatus ?? '')
    if (!ticketId || !newStatus) {
      return new Response(JSON.stringify({ error: 'ticketId and newStatus are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const zendeskStatus = INTERNAL_TO_ZENDESK[newStatus]
    if (!zendeskStatus) {
      return new Response(JSON.stringify({ error: `Unsupported status: ${newStatus}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: ticket } = await supabaseAdmin
      .from('tickets')
      .select('zendesk_ticket_id')
      .eq('id', ticketId)
      .single()
    const zendeskTicketId = ticket?.zendesk_ticket_id
    if (!zendeskTicketId) {
      // ticket sem vínculo com Zendesk — nada a fazer, mas não é erro
      return new Response(JSON.stringify({ success: true, skipped: 'no_zendesk_link' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('zendesk_subdomain, zendesk_agent_email, zendesk_api_token')
      .limit(1).single()
    const subdomain = (settings as any)?.zendesk_subdomain as string | null
    const agentEmail = (settings as any)?.zendesk_agent_email as string | null
    const apiToken = (settings as any)?.zendesk_api_token as string | null
    if (!subdomain || !agentEmail || !apiToken) {
      return new Response(JSON.stringify({ error: 'Credenciais do Zendesk não configuradas.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const basic = btoa(`${agentEmail}/token:${apiToken}`)
    const url = `https://${subdomain}.zendesk.com/api/v2/tickets/${zendeskTicketId}.json`
    const zResp = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ticket: { status: zendeskStatus } }),
    })
    if (!zResp.ok) {
      const text = await zResp.text()
      return new Response(JSON.stringify({
        error: `Zendesk API ${zResp.status}: ${text.slice(0, 300)}`,
      }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, zendesk_status: zendeskStatus }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('push-zendesk-status error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
