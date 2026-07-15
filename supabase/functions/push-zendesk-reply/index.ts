import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ success: false, error: 'Missing authorization' }, 401)
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
      return json({ success: false, error: 'Unauthorized' }, 401)
    }

    const payload = await req.json().catch(() => ({}))
    const ticketId = String(payload?.ticketId ?? '')
    const messageId = String(payload?.messageId ?? '')
    const attachmentsInput: Array<{ fileName: string; filePath?: string; fileUrl?: string; contentType?: string }> = Array.isArray(payload?.attachments) ? payload.attachments : []
    if (!ticketId || !messageId) {
      return json({ success: false, error: 'ticketId e messageId são obrigatórios' }, 400)
    }

    const { data: ticket } = await supabaseAdmin
      .from('tickets')
      .select('id, zendesk_ticket_id, number')
      .eq('id', ticketId)
      .maybeSingle()
    if (!ticket || !(ticket as any).zendesk_ticket_id) {
      return json({ success: false, error: 'Ticket não está vinculado ao Zendesk' }, 400)
    }
    const zendeskTicketId = String((ticket as any).zendesk_ticket_id)

    const { data: message } = await supabaseAdmin
      .from('ticket_messages')
      .select('id, body, message_type, sender_name')
      .eq('id', messageId)
      .maybeSingle()
    if (!message) {
      return json({ success: false, error: 'Mensagem não encontrada' }, 404)
    }

    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('zendesk_subdomain, zendesk_agent_email, zendesk_api_token')
      .limit(1).single()
    const subdomain = (settings as any)?.zendesk_subdomain as string | null
    const agentEmail = (settings as any)?.zendesk_agent_email as string | null
    const apiToken = (settings as any)?.zendesk_api_token as string | null
    if (!subdomain || !agentEmail || !apiToken) {
      return json({ success: false, error: 'Credenciais do Zendesk não configuradas' }, 400)
    }

    const isPublic = (message as any).message_type !== 'internal_note'
    const htmlBody = String((message as any).body ?? '').trim() || '(sem conteúdo)'

    const basic = btoa(`${agentEmail}/token:${apiToken}`)

    // Faz upload de cada anexo ao Zendesk e coleta os tokens
    const PUBLIC_URL_MARKER = '/object/public/ticket-attachments/'
    const uploadTokens: string[] = []
    for (const att of attachmentsInput) {
      try {
        // Resolve o path no bucket privado (aceita path direto ou URL pública legada)
        let path = att.filePath ?? null
        if (!path && att.fileUrl) {
          if (att.fileUrl.includes(PUBLIC_URL_MARKER)) {
            path = decodeURIComponent(att.fileUrl.split(PUBLIC_URL_MARKER)[1] ?? '')
          } else if (!/^https?:\/\//i.test(att.fileUrl)) {
            path = att.fileUrl
          }
        }

        let bytes: Uint8Array
        if (path) {
          const { data: blob, error: dlErr } = await supabaseAdmin.storage
            .from('ticket-attachments')
            .download(path)
          if (dlErr || !blob) {
            console.warn('attachment storage download failed', path, dlErr?.message)
            continue
          }
          bytes = new Uint8Array(await blob.arrayBuffer())
        } else {
          const fileResp = await fetch(att.fileUrl!)
          if (!fileResp.ok) {
            console.warn('attachment download failed', att.fileUrl, fileResp.status)
            continue
          }
          bytes = new Uint8Array(await fileResp.arrayBuffer())
        }
        const uploadUrl = `https://${subdomain}.zendesk.com/api/v2/uploads.json?filename=${encodeURIComponent(att.fileName)}`
        const upResp = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${basic}`,
            'Content-Type': att.contentType || 'application/binary',
          },
          body: bytes,
        })
        if (!upResp.ok) {
          const t = await upResp.text()
          console.warn('zendesk upload failed', upResp.status, t.slice(0, 200))
          continue
        }
        const upData = await upResp.json()
        const token = upData?.upload?.token
        if (token) uploadTokens.push(token)
      } catch (e) {
        console.warn('attachment upload error', e)
      }
    }

    const url = `https://${subdomain}.zendesk.com/api/v2/tickets/${zendeskTicketId}.json`
    const resp = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ticket: {
          comment: {
            html_body: htmlBody,
            public: isPublic,
            ...(uploadTokens.length > 0 ? { uploads: uploadTokens } : {}),
          },
        },
      }),
    })

    if (!resp.ok) {
      const text = await resp.text()

      // Ticket não existe mais no Zendesk (foi excluído lá). Desvincula localmente
      // para que futuras respostas não tentem mais sincronizar, e retorna sucesso
      // suave para não quebrar o fluxo do agente.
      if (resp.status === 404) {
        await supabaseAdmin
          .from('tickets')
          .update({ zendesk_ticket_id: null })
          .eq('id', ticketId)
        await supabaseAdmin.from('audit_log').insert({
          ticket_id: ticketId,
          user_name: (message as any).sender_name ?? 'Sistema',
          action: 'Zendesk desvinculado',
          details: 'Ticket não encontrado no Zendesk (404). Vínculo removido; mensagem salva apenas localmente.',
        })
        return json({ success: false, skipped: true, reason: 'zendesk_ticket_not_found' }, 200)
      }

      await supabaseAdmin.from('audit_log').insert({
        ticket_id: ticketId,
        user_name: (message as any).sender_name ?? 'Sistema',
        action: 'Zendesk sync falhou',
        details: `HTTP ${resp.status}: ${text.slice(0, 300)}`,
      })
      return json({ success: false, error: `Zendesk API ${resp.status}: ${text.slice(0, 300)}` }, 502)
    }

    const data = await resp.json()
    // Zendesk retorna audit.events com o comment_id do novo comentário
    let commentId: number | null = null
    const events: any[] = data?.audit?.events ?? []
    for (const ev of events) {
      if (ev?.type === 'Comment' && typeof ev.id === 'number') {
        commentId = ev.id
        break
      }
    }
    if (commentId != null) {
      await supabaseAdmin
        .from('ticket_messages')
        .update({ zendesk_comment_id: commentId })
        .eq('id', messageId)
    }

    await supabaseAdmin.from('audit_log').insert({
      ticket_id: ticketId,
      user_name: (message as any).sender_name ?? 'Sistema',
      action: 'Resposta sincronizada com Zendesk',
      details: isPublic ? 'Comentário público postado no Zendesk' : 'Nota privada postada no Zendesk',
    })

    return json({ success: true, zendeskCommentId: commentId })
  } catch (err) {
    console.error('push-zendesk-reply error:', err)
    return json({ success: false, error: (err as Error).message }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
