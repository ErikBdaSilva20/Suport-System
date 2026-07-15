import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Zendesk status -> internal status
const STATUS_MAP: Record<string, string> = {
  new: 'open',
  open: 'open',
  pending: 'pending',
  hold: 'pending',
  solved: 'resolved',
  closed: 'resolved',
}

// Zendesk priority -> internal priority
const PRIORITY_MAP: Record<string, string> = {
  low: 'low',
  normal: 'medium',
  high: 'high',
  urgent: 'urgent',
}

async function verifyZendeskSignature(
  signatureB64: string,
  timestamp: string,
  body: string,
  secret: string,
): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    const sig = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(timestamp + body),
    )
    const expected = btoa(String.fromCharCode(...new Uint8Array(sig)))
    // constant-time compare
    if (expected.length !== signatureB64.length) return false
    let diff = 0
    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ signatureB64.charCodeAt(i)
    }
    return diff === 0
  } catch (err) {
    console.error('signature verify error', err)
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-zendesk-webhook-signature') ?? ''
    const timestamp = req.headers.get('x-zendesk-webhook-signature-timestamp') ?? ''

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('id, zendesk_webhook_secret, zendesk_webhook_enabled')
      .limit(1)
      .single()

    if (!(settings as any)?.zendesk_webhook_enabled) {
      return new Response(JSON.stringify({ error: 'Zendesk webhook disabled' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const secret = (settings as any)?.zendesk_webhook_secret as string | null
    if (!secret) {
      return new Response(JSON.stringify({ error: 'Zendesk webhook secret not configured' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!signature || !timestamp) {
      return new Response(JSON.stringify({ error: 'Missing signature headers' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const valid = await verifyZendeskSignature(signature, timestamp, rawBody, secret)
    if (!valid) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let payload: any
    try { payload = JSON.parse(rawBody) } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Accept flat payload OR nested under "ticket"
    const t = payload.ticket ?? payload
    const zendeskTicketId = String(t.ticket_id ?? t.id ?? '').trim()
    const subject = String(t.subject ?? '').trim()
    const description = String(t.description ?? t.body ?? '').trim()
    const requesterEmail = String(t.requester_email ?? t.requester?.email ?? '').trim().toLowerCase()
    const requesterName = String(t.requester_name ?? t.requester?.name ?? requesterEmail.split('@')[0] ?? 'Cliente Zendesk').trim()
    const zStatus = String(t.status ?? 'new').toLowerCase()
    const zPriority = String(t.priority ?? 'normal').toLowerCase()

    if (!zendeskTicketId || !subject || !requesterEmail) {
      return new Response(JSON.stringify({ error: 'Missing required fields: ticket_id, subject, requester_email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const status = STATUS_MAP[zStatus] ?? 'open'
    const priority = PRIORITY_MAP[zPriority] ?? 'medium'

    // Upsert customer by email
    let customerId: string
    const { data: existingCustomer } = await supabaseAdmin
      .from('customers').select('id').eq('email', requesterEmail).maybeSingle()
    if (existingCustomer) {
      customerId = existingCustomer.id
    } else {
      const { data: created, error: cErr } = await supabaseAdmin
        .from('customers').insert({ email: requesterEmail, full_name: requesterName }).select('id').single()
      if (cErr || !created) throw new Error('Failed to create customer: ' + cErr?.message)
      customerId = created.id
    }

    // Upsert ticket by zendesk_ticket_id
    const { data: existingTicket } = await supabaseAdmin
      .from('tickets').select('id').eq('zendesk_ticket_id', zendeskTicketId).maybeSingle()

    if (existingTicket) {
      const { error: uErr } = await supabaseAdmin.from('tickets').update({
        subject, description: description || subject, status, priority, customer_id: customerId,
      }).eq('id', existingTicket.id)
      if (uErr) throw new Error('Failed to update ticket: ' + uErr.message)
      return new Response(JSON.stringify({ success: true, action: 'updated', ticket_id: existingTicket.id }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: inserted, error: iErr } = await supabaseAdmin.from('tickets').insert({
      subject,
      description: description || subject,
      status,
      priority,
      channel: 'api',
      customer_id: customerId,
      zendesk_ticket_id: zendeskTicketId,
    }).select('id').single()
    if (iErr || !inserted) throw new Error('Failed to insert ticket: ' + iErr?.message)

    return new Response(JSON.stringify({ success: true, action: 'created', ticket_id: inserted.id }), {
      status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('zendesk-inbound-webhook error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
