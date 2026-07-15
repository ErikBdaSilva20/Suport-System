// Resend Inbound Email webhook → creates / appends tickets.
//
// Receives the `email.received` event from Resend (Svix-signed), optionally
// fetches the full email from the Resend API by id, then threads or creates
// a ticket. Designed to fully replace the previous Mailgun pipeline.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// ── Svix signature verification (Resend webhooks use Svix) ───────────────
function base64Decode(b64: string): Uint8Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function base64Encode(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let s = ''
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i])
  return btoa(s)
}

async function verifySvixSignature(
  secret: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  body: string,
): Promise<boolean> {
  if (!secret || !svixId || !svixTimestamp || !svixSignature) return false

  const ts = parseInt(svixTimestamp, 10)
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 60 * 5) {
    console.warn('[resend-inbound] timestamp skew too large')
    return false
  }

  const rawSecret = secret.startsWith('whsec_') ? secret.slice(6) : secret
  let keyBytes: Uint8Array
  try {
    keyBytes = base64Decode(rawSecret)
  } catch {
    return false
  }

  const enc = new TextEncoder()
  const signedPayload = `${svixId}.${svixTimestamp}.${body}`
  const key = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(signedPayload))
  const expected = base64Encode(mac)

  // svix-signature can contain multiple sigs: "v1,xxx v1,yyy"
  const sigs = svixSignature.split(' ')
    .map(s => s.trim())
    .filter(s => s.startsWith('v1,'))
    .map(s => s.slice(3))

  for (const sig of sigs) {
    if (sig.length === expected.length) {
      let diff = 0
      for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i)
      if (diff === 0) return true
    }
  }
  return false
}

function extractTicketNumber(subject: string | null): number | null {
  if (!subject) return null
  const m = subject.match(/\[?#(\d+)\]?/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  return Number.isFinite(n) ? n : null
}

function allReferences(refs: string | string[] | null | undefined): string[] {
  if (!refs) return []
  const str = Array.isArray(refs) ? refs.join(' ') : refs
  return str.match(/<[^>]+>/g) ?? []
}

function parseAddress(value: any): { email: string; name: string } {
  if (!value) return { email: '', name: '' }
  if (Array.isArray(value)) value = value[0]
  if (typeof value === 'object') {
    return {
      email: String(value.email ?? '').trim().toLowerCase(),
      name: String(value.name ?? '').trim(),
    }
  }
  const str = String(value)
  const m = str.match(/<([^>]+)>/)
  const email = (m ? m[1] : str).trim().toLowerCase()
  const name = str.replace(/<[^>]+>/, '').replace(/"/g, '').trim()
  return { email, name: name || email }
}

// Pull useful fields out of an inbound email payload, supporting both the
// embedded `data` object and the `GET /emails/:id` shape.
function normalizeEmail(raw: any) {
  const fromInfo = parseAddress(raw.from ?? raw.From ?? raw.sender)
  const toRaw = raw.to ?? raw.To ?? raw.recipient
  const recipient = Array.isArray(toRaw)
    ? (typeof toRaw[0] === 'object' ? toRaw[0]?.email : toRaw[0])
    : (typeof toRaw === 'object' ? toRaw?.email : toRaw)

  const headers = raw.headers ?? {}
  const headerVal = (k: string) =>
    headers[k] ?? headers[k.toLowerCase()] ?? headers[k.toUpperCase()] ?? null

  return {
    id: raw.id ?? raw.email_id ?? null,
    subject: (raw.subject ?? raw.Subject ?? '').toString(),
    text: (raw.text ?? raw.body_plain ?? '').toString(),
    html: (raw.html ?? raw.body_html ?? '').toString(),
    senderEmail: fromInfo.email,
    senderName: fromInfo.name || fromInfo.email,
    recipient: String(recipient ?? '').toLowerCase(),
    messageId: raw.message_id ?? raw['Message-Id'] ?? headerVal('Message-Id') ?? null,
    inReplyTo: raw.in_reply_to ?? raw['In-Reply-To'] ?? headerVal('In-Reply-To') ?? null,
    references: raw.references ?? raw.References ?? headerVal('References') ?? null,
  }
}

async function fetchEmailFromResend(emailId: string, apiKey: string) {
  const res = await fetch(`https://api.resend.com/emails/${emailId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  const text = await res.text()
  if (!res.ok) {
    console.warn('[resend-inbound] GET /emails/:id failed', res.status, text)
    return null
  }
  try { return JSON.parse(text) } catch { return null }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  let eventId: string | null = null

  try {
    const bodyText = await req.text()

    // Load secret + API key from settings
    const { data: settings } = await supabase
      .from('settings')
      .select('resend_api_key, resend_webhook_secret, app_base_url')
      .limit(1)
      .maybeSingle()

    const webhookSecret = (settings?.resend_webhook_secret ?? '').trim()
    const apiKey = (settings?.resend_api_key ?? '').trim()

    if (!webhookSecret) {
      console.error('[resend-inbound] webhook secret not configured')
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const svixId = req.headers.get('svix-id') ?? req.headers.get('webhook-id') ?? ''
    const svixTimestamp = req.headers.get('svix-timestamp') ?? req.headers.get('webhook-timestamp') ?? ''
    const svixSignature = req.headers.get('svix-signature') ?? req.headers.get('webhook-signature') ?? ''

    const valid = await verifySvixSignature(webhookSecret, svixId, svixTimestamp, svixSignature, bodyText)
    if (!valid) {
      console.warn('[resend-inbound] ❌ invalid signature')
      await supabase.from('email_inbound_events').insert({
        status: 'rejected_signature',
        error_message: 'Invalid or missing Resend/Svix signature',
        content_type: req.headers.get('content-type')?.substring(0, 200) ?? null,
      })
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let payload: any
    try { payload = JSON.parse(bodyText) } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const eventType = payload?.type ?? payload?.event ?? ''
    if (eventType && eventType !== 'email.received' && eventType !== 'email.inbound') {
      // Acknowledge other event types without doing anything
      console.log('[resend-inbound] ignoring event:', eventType)
      return new Response(JSON.stringify({ success: true, ignored: eventType }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let data = payload?.data ?? payload
    let email = normalizeEmail(data)

    // If the webhook payload is minimal (only id), fetch full email via Resend API
    if (email.id && apiKey && (!email.senderEmail || !email.subject || (!email.text && !email.html))) {
      const full = await fetchEmailFromResend(email.id, apiKey)
      if (full) email = normalizeEmail(full)
    }

    if (!email.senderEmail || !email.senderEmail.includes('@')) {
      console.error('[resend-inbound] invalid sender', email)
      return new Response(JSON.stringify({ error: 'Invalid sender email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const subject = email.subject || '(Sem assunto)'
    const textBody = email.text || (email.html ? email.html.replace(/<[^>]+>/g, ' ').trim() : '') || '(Sem conteúdo)'

    // Dedup by Message-Id
    if (email.messageId) {
      const { data: existing } = await supabase
        .from('ticket_email_messages')
        .select('ticket_id')
        .eq('message_id', email.messageId)
        .eq('direction', 'inbound')
        .maybeSingle()
      if (existing) {
        console.log('[resend-inbound] ⏭️ duplicate', email.messageId)
        return new Response(
          JSON.stringify({ success: true, deduped: true, ticketId: existing.ticket_id }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
    }

    const { data: eventRow } = await supabase.from('email_inbound_events').insert({
      sender_email: email.senderEmail,
      sender_name: email.senderName,
      subject,
      message_id: email.messageId,
      in_reply_to: email.inReplyTo,
      content_type: 'application/json',
      status: 'received',
      raw_headers: { from: email.senderEmail, to: email.recipient, subject },
    }).select('id').single()
    eventId = eventRow?.id ?? null

    // Threading
    let ticketId: string | null = null
    let isNewTicket = false

    const candidateIds = [
      ...(email.inReplyTo ? [email.inReplyTo] : []),
      ...allReferences(email.references).reverse(),
    ].filter((v, i, a) => v && a.indexOf(v) === i)

    if (candidateIds.length > 0) {
      const { data: tem } = await supabase
        .from('ticket_email_messages')
        .select('ticket_id, message_id')
        .in('message_id', candidateIds)
        .limit(1)
      if (tem && tem.length > 0) ticketId = tem[0].ticket_id
    }

    if (!ticketId && candidateIds.length > 0) {
      const { data: legacy } = await supabase
        .from('tickets').select('id').in('email_message_id', candidateIds).limit(1)
      if (legacy && legacy.length > 0) ticketId = legacy[0].id
    }

    const subjectNumber = extractTicketNumber(subject)
    if (!ticketId && subjectNumber !== null) {
      const { data: byNumber } = await supabase
        .from('tickets').select('id').eq('number', subjectNumber).maybeSingle()
      if (byNumber) ticketId = byNumber.id
    }

    if (ticketId) {
      const { data: existingTicket } = await supabase
        .from('tickets').select('id, status').eq('id', ticketId).maybeSingle()
      if (existingTicket) {
        await supabase.from('ticket_messages').insert({
          ticket_id: ticketId,
          sender_type: 'customer',
          message_type: 'public_reply',
          sender_name: email.senderName,
          body: textBody,
        })
        if (existingTicket.status === 'pending') {
          await supabase.from('tickets').update({ status: 'open' }).eq('id', ticketId)
        }
      } else {
        ticketId = null
      }
    }

    if (!ticketId) {
      isNewTicket = true
      let customerId: string | null = null
      const { data: existingCustomer } = await supabase
        .from('customers').select('id').eq('email', email.senderEmail).maybeSingle()
      if (existingCustomer) customerId = existingCustomer.id
      else {
        const { data: newCustomer, error: custErr } = await supabase
          .from('customers')
          .insert({ email: email.senderEmail, full_name: email.senderName })
          .select('id').single()
        if (custErr || !newCustomer) {
          await supabase.from('email_inbound_events')
            .update({ status: 'failed', error_message: custErr?.message ?? 'customer create failed' })
            .eq('id', eventId!)
          return new Response(JSON.stringify({ error: 'Failed to create customer' }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        customerId = newCustomer.id
      }

      const { data: newTicket, error: ticketErr } = await supabase
        .from('tickets')
        .insert({
          subject,
          description: textBody.substring(0, 500),
          channel: 'email',
          customer_id: customerId,
          status: 'open',
          priority: 'medium',
        })
        .select('id, number').single()

      if (ticketErr || !newTicket) {
        await supabase.from('email_inbound_events')
          .update({ status: 'failed', error_message: ticketErr?.message ?? 'ticket create failed' })
          .eq('id', eventId!)
        return new Response(JSON.stringify({ error: 'Failed to create ticket' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      ticketId = newTicket.id
      console.log('[resend-inbound] ✨ created ticket #', newTicket.number, ticketId)

      await supabase.from('ticket_messages').insert({
        ticket_id: ticketId,
        sender_type: 'customer',
        message_type: 'public_reply',
        sender_name: email.senderName,
        body: textBody,
      })
    }

    if (email.messageId && ticketId) {
      await Promise.all([
        supabase.from('tickets').update({ email_message_id: email.messageId }).eq('id', ticketId),
        supabase.from('ticket_email_messages')
          .insert({ ticket_id: ticketId, message_id: email.messageId, direction: 'inbound' })
          .then((r: any) => {
            if (r.error && !String(r.error.message).toLowerCase().includes('duplicate')) {
              console.error('[resend-inbound] tem insert err:', r.error.message)
            }
          }),
      ])
    }

    // Trigger AI pipeline on new tickets (fire and forget)
    if (isNewTicket && ticketId) {
      supabase.functions.invoke('on-ticket-created-pipeline', { body: { ticketId } })
        .catch(e => console.error('[resend-inbound] pipeline invoke failed', e))
    }

    if (eventId) {
      await supabase.from('email_inbound_events')
        .update({ status: 'processed', ticket_id: ticketId })
        .eq('id', eventId)
    }

    return new Response(JSON.stringify({ success: true, ticketId, isNewTicket }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = (err as Error).message
    console.error('[resend-inbound] unhandled', msg)
    if (eventId) {
      await supabase.from('email_inbound_events')
        .update({ status: 'failed', error_message: msg }).eq('id', eventId)
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
