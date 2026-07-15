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
const PRIORITY_MAP: Record<string, string> = {
  low: 'low',
  normal: 'medium',
  high: 'high',
  urgent: 'urgent',
}

const ALLOWED_ZENDESK_STATUSES = new Set(['new', 'open', 'pending', 'hold', 'solved'])
const OPEN_STATUS_LABEL = 'últimos 7 dias (abertos, pendentes e resolvidos)'

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
    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('id, zendesk_subdomain, zendesk_agent_email, zendesk_api_token')
      .limit(1).single()

    const subdomain = (settings as any)?.zendesk_subdomain as string | null
    const agentEmail = (settings as any)?.zendesk_agent_email as string | null
    const apiToken = (settings as any)?.zendesk_api_token as string | null

    if (!subdomain || !agentEmail || !apiToken) {
      return new Response(JSON.stringify({
        error: 'Configure Subdomínio, E-mail do Agente e Token da API do Zendesk antes de sincronizar.',
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Limita a tickets dos últimos 7 dias para evitar volumes excessivos.
    // O Search API do Zendesk pode demorar para indexar tickets recém-criados;
    // por isso usamos a listagem de tickets e filtramos localmente por data/status.
    const createdSince = new Date()
    createdSince.setUTCDate(createdSince.getUTCDate() - 7)
    createdSince.setUTCHours(0, 0, 0, 0)
    const date7DaysAgo = createdSince.toISOString().slice(0, 10)

    const url = `https://${subdomain}.zendesk.com/api/v2/tickets.json?per_page=100&sort_by=created_at&sort_order=desc&include=users`

    const basic = btoa(`${agentEmail}/token:${apiToken}`)
    const headers = {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/json',
    }

    // fetch with retry on 429 respecting Retry-After (max 3 attempts, cap at 30s)
    async function zendeskFetch(u: string): Promise<Response> {
      for (let attempt = 0; attempt < 3; attempt++) {
        const r = await fetch(u, { headers })
        if (r.status !== 429) return r
        const ra = Number(r.headers.get('Retry-After') ?? '5')
        const waitMs = Math.min(Math.max(ra, 1), 30) * 1000
        console.warn(`Zendesk 429, aguardando ${waitMs}ms (tentativa ${attempt + 1}/3)`)
        await new Promise((res) => setTimeout(res, waitMs))
      }
      return await fetch(u, { headers })
    }

    let created = 0
    let updated = 0
    let scanned = 0
    let skippedRateLimited = 0
    let nextUrl: string | null = url
    let partial = false

    outer: while (nextUrl) {
      const resp: Response = await zendeskFetch(nextUrl)
      if (resp.status === 429) {
        partial = true
        break
      }
      if (!resp.ok) {
        const text = await resp.text()
        return new Response(JSON.stringify({
          error: `Zendesk API ${resp.status}: ${text.slice(0, 300)}`,
        }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const data = await resp.json()
      const results: any[] = data.tickets ?? []
      const inlineUsers: any[] = data.users ?? []
      const usersById = new Map<string, any>()
      for (const u of inlineUsers) usersById.set(String(u.id), u)

      for (const t of results) {
        const createdAt = new Date(t.created_at ?? 0)
        if (Number.isNaN(createdAt.getTime())) continue
        if (createdAt < createdSince) {
          nextUrl = null
          break
        }

        const zendeskTicketId = String(t.id)
        const rawSubject = String(t.subject ?? t.raw_subject ?? '').trim()
        const rawDescription = String(t.description ?? '').trim()
        // Zendesk frequentemente coloca o corpo do primeiro comentário no subject.
        // Geramos um assunto curto a partir da descrição (ou do próprio subject)
        // e preservamos o conteúdo completo na descrição.
        const snippetSource = rawDescription || rawSubject
        const firstLine = snippetSource.split(/\r?\n/).map((s) => s.trim()).find((s) => s.length > 0) ?? ''
        const collapsed = firstLine.replace(/\s+/g, ' ')
        const MAX_SUBJECT = 80
        const subject = collapsed.length > MAX_SUBJECT
          ? collapsed.slice(0, MAX_SUBJECT).trimEnd() + '…'
          : (collapsed || '(sem assunto)')
        const description = rawDescription || rawSubject || subject
        const zStatus = String(t.status ?? 'new').toLowerCase()
        if (!ALLOWED_ZENDESK_STATUSES.has(zStatus)) {
          continue
        }
        scanned++
        const zPriority = String(t.priority ?? 'normal').toLowerCase()
        const status = STATUS_MAP[zStatus] ?? 'open'
        const priority = PRIORITY_MAP[zPriority] ?? 'medium'

        // Resolve requester from inline users first; fallback to users endpoint only if needed
        let requesterEmail: string | null = null
        let requesterName: string | null = null
        if (t.requester_id) {
          const cached = usersById.get(String(t.requester_id))
          if (cached) {
            requesterEmail = (cached.email ?? '').toLowerCase() || null
            requesterName = cached.name ?? null
          } else {
            const uResp = await zendeskFetch(
              `https://${subdomain}.zendesk.com/api/v2/users/${t.requester_id}.json`,
            )
            if (uResp.status === 429) {
              skippedRateLimited++
              partial = true
              break outer
            }
            if (uResp.ok) {
              const uJson = await uResp.json()
              requesterEmail = (uJson.user?.email ?? '').toLowerCase() || null
              requesterName = uJson.user?.name ?? null
            }
          }
        }
        if (!requesterEmail) continue

        // Upsert customer
        let customerId: string
        const { data: existingCustomer } = await supabaseAdmin
          .from('customers').select('id').eq('email', requesterEmail).maybeSingle()
        if (existingCustomer) {
          customerId = existingCustomer.id
        } else {
          const { data: createdCust, error: cErr } = await supabaseAdmin
            .from('customers').insert({
              email: requesterEmail,
              full_name: requesterName || requesterEmail.split('@')[0],
            }).select('id').single()
          if (cErr || !createdCust) {
            console.error('customer insert error', cErr)
            continue
          }
          customerId = createdCust.id
        }

        // Upsert ticket by zendesk_ticket_id (description fica vazia — o corpo vem via ticket_messages)
        let ticketRowId: string | null = null
        const { data: existingTicket } = await supabaseAdmin
          .from('tickets').select('id').eq('zendesk_ticket_id', zendeskTicketId).maybeSingle()
        if (existingTicket) {
          await supabaseAdmin.from('tickets').update({
            subject, description: '',
            status, priority, customer_id: customerId,
          }).eq('id', existingTicket.id)
          ticketRowId = existingTicket.id
          updated++
        } else {
          const { data: insertedTicket, error: iErr } = await supabaseAdmin.from('tickets').insert({
            subject, description: '',
            status, priority, channel: 'api',
            customer_id: customerId,
            zendesk_ticket_id: zendeskTicketId,
            created_at: t.created_at,
          }).select('id').single()
          if (iErr || !insertedTicket) {
            console.error('ticket insert error', iErr)
            continue
          }
          ticketRowId = insertedTicket.id
          created++
        }

        // Sync ALL comments from Zendesk as ticket_messages (only once per ticket)
        if (ticketRowId) {
          const { count: existingMsgs } = await supabaseAdmin
            .from('ticket_messages')
            .select('id', { count: 'exact', head: true })
            .eq('ticket_id', ticketRowId)
          if (!existingMsgs || existingMsgs === 0) {
            const cResp = await zendeskFetch(
              `https://${subdomain}.zendesk.com/api/v2/tickets/${zendeskTicketId}/comments.json?include=users,inline_images`,
            )
            if (cResp.ok) {
              const cJson = await cResp.json()
              const comments: any[] = cJson.comments ?? []
              const commentUsers = new Map<string, any>()
              for (const u of (cJson.users ?? [])) commentUsers.set(String(u.id), u)
              for (const cm of comments) {
                const author = commentUsers.get(String(cm.author_id))
                const isAgentAuthor = author?.role === 'agent' || author?.role === 'admin'
                const senderType = isAgentAuthor ? 'agent' : 'customer'
                const senderName = author?.name || requesterName || requesterEmail

                // Baixa cada anexo do Zendesk (Basic Auth) e re-hospeda no bucket privado
                // ticket-attachments; gera signed URL de longa duração (~1 ano).
                type RehostedAttachment = {
                  fileName: string; fileUrl: string; fileSize: number;
                  contentType: string; inline: boolean; originalUrls: string[];
                }
                const rehosted: RehostedAttachment[] = []
                for (const a of (cm.attachments ?? [])) {
                  const contentUrl = a.content_url ?? a.mapped_content_url ?? ''
                  const fileName = a.file_name ?? 'arquivo'
                  const contentType = a.content_type ?? 'application/octet-stream'
                  const originalUrls = [a.content_url, a.mapped_content_url]
                    .filter((u): u is string => typeof u === 'string' && u.length > 0)
                  let finalUrl = contentUrl
                  let finalSize = Number(a.size ?? 0)
                  try {
                    if (contentUrl) {
                      const dl = await fetch(contentUrl, { headers: { Authorization: `Basic ${basic}` } })
                      if (dl.ok) {
                        const buf = new Uint8Array(await dl.arrayBuffer())
                        finalSize = buf.byteLength
                        const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
                        const path = `zendesk/${zendeskTicketId}/${cm.id}/${a.id}_${safeName}`
                        const { error: upErr } = await supabaseAdmin.storage
                          .from('ticket-attachments')
                          .upload(path, buf, { contentType, upsert: true })
                        if (!upErr) {
                          const { data: signed } = await supabaseAdmin.storage
                            .from('ticket-attachments')
                            .createSignedUrl(path, 60 * 60 * 24 * 365)
                          if (signed?.signedUrl) finalUrl = signed.signedUrl
                        } else {
                          console.error('storage upload error', upErr)
                        }
                      } else {
                        console.warn('zendesk attachment download failed', dl.status)
                      }
                    }
                  } catch (e) {
                    console.error('rehost attachment error', e)
                  }
                  rehosted.push({
                    fileName, fileUrl: finalUrl, fileSize: finalSize,
                    contentType, inline: a.inline === true, originalUrls,
                  })
                }

                // Corpo: preferir html_body (preserva imagens inline e formatação);
                // reescrever URLs de anexos inline apontando para o Storage.
                let htmlBody = String(cm.html_body || '').trim()
                if (htmlBody) {
                  for (const r of rehosted) {
                    if (!r.inline) continue
                    for (const orig of r.originalUrls) {
                      const escaped = orig.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                      htmlBody = htmlBody.replace(new RegExp(escaped, 'g'), r.fileUrl)
                    }
                  }
                }
                const body = htmlBody || String(cm.plain_body || cm.body || '').trim()
                if (!body && rehosted.length === 0) continue

                const { data: msg, error: mErr } = await supabaseAdmin
                  .from('ticket_messages').insert({
                    ticket_id: ticketRowId,
                    sender_type: senderType,
                    sender_name: senderName,
                    message_type: cm.public === false ? 'internal_note' : 'public_reply',
                    body: body.slice(0, 20000) || '(anexo do Zendesk)',
                    created_at: cm.created_at,
                    zendesk_comment_id: cm.id ?? null,
                  }).select('id').single()
                if (mErr || !msg) {
                  console.error('message insert error', mErr)
                  continue
                }

                // Anexos NÃO-inline aparecem como cards abaixo da mensagem.
                // Inline continua acessível dentro do próprio corpo HTML.
                for (const r of rehosted) {
                  if (r.inline) continue
                  await supabaseAdmin.from('ticket_attachments').insert({
                    ticket_message_id: msg.id,
                    file_name: r.fileName,
                    file_url: r.fileUrl,
                    file_size: r.fileSize,
                    content_type: r.contentType,
                  })
                }
              }
            } else if (cResp.status === 429) {
              partial = true
              skippedRateLimited++
            }
          }
        }

      }

      nextUrl = data.next_page ?? null
    }

    return new Response(JSON.stringify({
      success: true,
      partial,
      filter: OPEN_STATUS_LABEL,
      scanned,
      created,
      updated,
      skipped_rate_limited: skippedRateLimited,
      message: partial
        ? 'Sincronização parcial: limite de requisições do Zendesk atingido. Tente novamente em ~1 minuto.'
        : undefined,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('sync-zendesk-tickets error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
