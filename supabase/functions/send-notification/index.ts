import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

type Template = 'ticket_created' | 'ticket_assigned' | 'agent_reply' | 'ticket_resolved' | 'sla_warning' | 'sla_breached' | 'csat_survey' | 'agent_invite'

interface NotificationRequest {
  to: string
  subject: string
  template: Template
  data?: Record<string, any>
}

async function getSettings(supabase: any) {
  const { data } = await supabase.from('settings').select('*').limit(1).single()
  return data
}

function buildHtml(settings: any, template: Template, data: Record<string, any>): string {
  const logo = settings?.company_logo_url
    ? `<img src="${settings.company_logo_url}" alt="${settings.company_name}" style="max-height:40px;" />`
    : `<span style="font-size:20px;font-weight:bold;color:#fff;">${settings?.company_name ?? 'Help Desk'}</span>`
  const primaryColor = settings?.primary_color ?? '#1A5276'
  const companyName = settings?.company_name ?? 'Help Desk'

  let body = ''
  switch (template) {
    case 'ticket_created':
      body = `<p>Um novo chamado foi criado.</p>
        <p><strong>Chamado #${data.number ?? ''}</strong>: ${data.subject ?? ''}</p>
        <p><a href="${data.link ?? '#'}" style="display:inline-block;padding:10px 20px;background:${primaryColor};color:#fff;text-decoration:none;border-radius:4px;">Ver Chamado</a></p>`
      break
    case 'ticket_assigned':
      body = `<p>Um chamado foi atribuído a você.</p>
        <p><strong>Chamado #${data.number ?? ''}</strong>: ${data.subject ?? ''}</p>
        <p><a href="${data.link ?? '#'}" style="display:inline-block;padding:10px 20px;background:${primaryColor};color:#fff;text-decoration:none;border-radius:4px;">Ver Chamado</a></p>`
      break
    case 'agent_reply':
      body = `<p>Você recebeu uma nova resposta no chamado <strong>#${data.number ?? ''}</strong>.</p>
        <p><a href="${data.link ?? '#'}" style="display:inline-block;padding:10px 20px;background:${primaryColor};color:#fff;text-decoration:none;border-radius:4px;">Ver Resposta</a></p>`
      break
    case 'ticket_resolved':
      body = `<p>Seu chamado <strong>#${data.number ?? ''}</strong> foi resolvido.</p>
        <p>${data.subject ?? ''}</p>
        <p><a href="${data.link ?? '#'}" style="display:inline-block;padding:10px 20px;background:${primaryColor};color:#fff;text-decoration:none;border-radius:4px;">Ver Chamado</a></p>`
      break
    case 'sla_warning':
      body = `<p>⚠️ O chamado <strong>#${data.number ?? ''}</strong> está próximo do prazo de SLA.</p>
        <p>${data.subject ?? ''}</p>
        <p><a href="${data.link ?? '#'}" style="display:inline-block;padding:10px 20px;background:#e67e22;color:#fff;text-decoration:none;border-radius:4px;">Ver Chamado</a></p>`
      break
    case 'sla_breached':
      body = `<p>🚨 O SLA do chamado <strong>#${data.number ?? ''}</strong> foi violado!</p>
        <p>${data.subject ?? ''}</p>
        <p><a href="${data.link ?? '#'}" style="display:inline-block;padding:10px 20px;background:#e74c3c;color:#fff;text-decoration:none;border-radius:4px;">Ver Chamado</a></p>`
      break
    case 'csat_survey': {
      const appBase = (data.appBase ?? '').replace(/\/$/, '')
      const token = data.token ?? ''
      const starLink = (n: number) => `${appBase}/csat/${token}?rating=${n}`
      const star = (n: number) => `
        <td align="center" style="padding:0 4px;">
          <a href="${starLink(n)}" style="display:inline-block;text-decoration:none;font-size:36px;line-height:1;color:${primaryColor};font-family:Arial,sans-serif;">★</a>
          <div style="font-size:11px;color:#999;margin-top:4px;">${n}</div>
        </td>`
      body = `<p style="margin:0 0 12px 0;">Como você avalia o atendimento do chamado <strong>#${data.number ?? ''}</strong>?</p>
        <p style="margin:0 0 20px 0;color:#666;">${data.subject ?? ''}</p>
        <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
          <tr>${star(1)}${star(2)}${star(3)}${star(4)}${star(5)}</tr>
        </table>
        <p style="margin:24px 0 0 0;font-size:12px;color:#999;text-align:center;">Clique em uma das estrelas para abrir a página de avaliação.</p>`
      break
    }
    case 'agent_invite':
      body = `<p>Você foi convidado para fazer parte da equipe de suporte do <strong>${companyName}</strong>.</p>
        <p><a href="${data.link ?? '#'}" style="display:inline-block;padding:10px 20px;background:${primaryColor};color:#fff;text-decoration:none;border-radius:4px;">Aceitar Convite</a></p>`
      break
  }

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;">
<tr><td align="center" style="padding:20px 0;">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;">
    <tr><td style="background:${primaryColor};padding:20px 30px;text-align:center;">${logo}</td></tr>
    <tr><td style="padding:30px;font-size:14px;color:#333;line-height:1.6;">${body}</td></tr>
    <tr><td style="padding:20px 30px;text-align:center;font-size:12px;color:#999;border-top:1px solid #eee;">${companyName}</td></tr>
  </table>
</td></tr></table>
</body></html>`
}

async function sendViaResend(settings: any, to: string, subject: string, html: string): Promise<any> {
  const apiKey = (settings?.resend_api_key ?? '').trim()
  if (!apiKey) {
    throw new Error('Resend não configurado. Configure em Configurações → Integrações.')
  }

  const supportEmail = (settings?.support_email ?? '').trim().toLowerCase()
  const configuredFrom = (settings?.resend_from_email ?? '').trim().toLowerCase()
  const fromEmail = configuredFrom || supportEmail || 'onboarding@resend.dev'
  const fromName = settings?.company_name ?? 'Help Desk'

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject,
      html,
    }),
  })
  const text = await res.text()
  if (!res.ok) {
    console.error('Resend error:', res.status, text)
    let msg = `Resend error (${res.status})`
    try {
      const parsed = JSON.parse(text)
      msg = parsed?.message ?? parsed?.error ?? msg
    } catch { /* ignore */ }
    throw new Error(msg)
  }
  try { return JSON.parse(text) } catch { return { id: null } }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { to, subject, template, data = {} } = await req.json() as NotificationRequest

    if (!to || !subject || !template) {
      return new Response(JSON.stringify({ error: 'Missing required fields: to, subject, template' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const settings = await getSettings(supabase)
    const html = buildHtml(settings, template, data)

    try {
      const result = await sendViaResend(settings, to, subject, html)
      return new Response(JSON.stringify({ ok: true, success: true, id: result.id }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } catch (sendErr) {
      // Email delivery failed (Mailgun config, sandbox limits, etc.) — degrade gracefully.
      // Notification is a side-effect; do not break the caller with a 500.
      console.error('send-notification delivery failed:', sendErr)
      return new Response(JSON.stringify({
        ok: false,
        success: false,
        fallback: true,
        error: (sendErr as Error).message,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch (err) {
    // Unexpected internal error (e.g., settings fetch failed). Still return 200 so the
    // client side-effect doesn't surface as a runtime crash.
    console.error('send-notification error:', err)
    return new Response(JSON.stringify({
      ok: false,
      success: false,
      fallback: true,
      error: (err as Error).message,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
