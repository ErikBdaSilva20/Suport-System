import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { renderTicketEmail, formatTicketSubject } from '../_shared/email-template.ts'

function nonBlockingFailure(error: string, details: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ success: false, error, ...details }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

interface ResendSendResult {
  ok: boolean
  id?: string
  errorMessage?: string
  status?: number
}

async function sendResend(apiKey: string, body: Record<string, unknown>): Promise<ResendSendResult> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let parsed: any = null
  try { parsed = JSON.parse(text) } catch { /* ignore */ }

  if (!res.ok) {
    console.error('Resend send error:', res.status, text)
    return {
      ok: false,
      status: res.status,
      errorMessage: parsed?.message ?? parsed?.error ?? `Resend error (${res.status})`,
    }
  }
  return { ok: true, id: parsed?.id }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { ticketId, messageId: rawMessageId } = await req.json()
    if (!ticketId) {
      return new Response(JSON.stringify({ error: 'ticketId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let messageId = rawMessageId
    if (!messageId || messageId === 'latest') {
      const { data: latestMsg } = await supabase
        .from('ticket_messages')
        .select('id')
        .eq('ticket_id', ticketId)
        .eq('sender_type', 'agent')
        .eq('message_type', 'public_reply')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (!latestMsg) {
        return nonBlockingFailure('Nenhuma mensagem pública do agente foi encontrada para envio por email.')
      }
      messageId = latestMsg.id
    }

    const { data: ticket, error: ticketErr } = await supabase
      .from('tickets')
      .select('id, number, subject, email_message_id, customer_id, status, priority')
      .eq('id', ticketId)
      .single()

    if (ticketErr || !ticket) {
      return new Response(JSON.stringify({ error: 'Ticket not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: customer } = await supabase
      .from('customers')
      .select('email, full_name')
      .eq('id', ticket.customer_id)
      .single()

    if (!customer?.email) {
      return nonBlockingFailure('O cliente não possui email cadastrado para receber esta resposta.')
    }

    const { data: message } = await supabase
      .from('ticket_messages')
      .select('body, sender_name')
      .eq('id', messageId)
      .single()

    if (!message) {
      return nonBlockingFailure('A mensagem salva não pôde ser encontrada para envio por email.')
    }

    const { data: settings } = await supabase
      .from('settings').select('*').limit(1).single()

    const apiKey = (settings?.resend_api_key ?? '').trim()
    if (!apiKey) {
      return nonBlockingFailure('Resend não está configurado nas integrações.')
    }

    const supportEmail = (settings?.support_email ?? '').trim().toLowerCase()
    const configuredFrom = (settings?.resend_from_email ?? '').trim().toLowerCase()
    const fromEmail = configuredFrom || supportEmail || 'onboarding@resend.dev'
    const fromName = settings?.company_name ?? 'Help Desk'

    const emailSubject = formatTicketSubject({ number: ticket.number, subject: ticket.subject }, 'Re')
    const newMessageId = `<ticket-${ticket.id}-${Date.now()}@resend.helpdesk>`
    const bodyHtml = `<p>${message.body.replace(/\n/g, '<br/>')}</p>`

    const html = renderTicketEmail({
      kind: 'reply',
      ticket: {
        id: ticket.id,
        number: ticket.number,
        subject: ticket.subject,
        status: (ticket as any).status,
        priority: (ticket as any).priority,
      },
      customer: { full_name: customer.full_name, email: customer.email },
      settings,
      bodyHtml,
      senderName: message.sender_name,
    })

    // Threading headers
    const { data: threadIds } = await supabase
      .from('ticket_email_messages')
      .select('message_id')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    const knownIds = (threadIds ?? []).map((r: any) => r.message_id).filter(Boolean)
    const lastKnown = knownIds[knownIds.length - 1] ?? ticket.email_message_id ?? null

    const headers: Record<string, string> = { 'Message-ID': newMessageId }
    if (lastKnown) {
      headers['In-Reply-To'] = lastKnown
      headers['References'] = knownIds.length > 0 ? knownIds.join(' ') : lastKnown
    }

    const body: Record<string, unknown> = {
      from: `${fromName} <${fromEmail}>`,
      to: [customer.email.trim().toLowerCase()],
      subject: emailSubject,
      html,
      headers,
    }
    if (supportEmail && supportEmail !== fromEmail) {
      body.reply_to = `${fromName} <${supportEmail}>`
    }

    const result = await sendResend(apiKey, body)
    if (!result.ok) {
      return nonBlockingFailure(result.errorMessage ?? 'Falha ao enviar via Resend.', {
        deliveryStatus: 'failed',
        provider: 'resend',
      })
    }

    const realMessageId = result.id ? `<${result.id}@resend.helpdesk>` : newMessageId

    await Promise.all([
      supabase
        .from('ticket_email_messages')
        .insert({ ticket_id: ticketId, message_id: realMessageId, direction: 'outbound' }),
      supabase
        .from('tickets')
        .update({ email_message_id: realMessageId })
        .eq('id', ticketId),
    ])

    return new Response(JSON.stringify({ success: true, messageId: realMessageId, resendId: result.id }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('send-reply-email error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
