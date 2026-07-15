import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

function maskKey(value: string): string {
  if (value.length <= 8) return '****'
  return value.substring(0, 4) + '***' + value.substring(value.length - 4)
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
    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const payload = await req.json()
    const update: Record<string, unknown> = {}

    if (typeof payload?.webhookSecret === 'string' && payload.webhookSecret.trim()) {
      const secret = payload.webhookSecret.trim()
      if (secret.length < 8) {
        return new Response(JSON.stringify({ error: 'Webhook secret inválido.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      update.zendesk_webhook_secret = secret
      update.zendesk_webhook_secret_masked = maskKey(secret)
    }

    if (typeof payload?.webhookEnabled === 'boolean') {
      update.zendesk_webhook_enabled = payload.webhookEnabled
    }

    if (typeof payload?.subdomain === 'string') {
      update.zendesk_subdomain = payload.subdomain.trim() || null
    }
    if (typeof payload?.agentEmail === 'string') {
      update.zendesk_agent_email = payload.agentEmail.trim() || null
    }
    if (typeof payload?.apiToken === 'string' && payload.apiToken.trim()) {
      const token = payload.apiToken.trim()
      update.zendesk_api_token = token
      update.zendesk_api_token_masked = maskKey(token)
    }

    if (Object.keys(update).length === 0) {
      return new Response(JSON.stringify({ error: 'Nada para atualizar.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: settings } = await supabaseAdmin
      .from('settings').select('id').limit(1).single()
    if (!settings) throw new Error('Settings row not found')

    const { error: updateError } = await supabaseAdmin
      .from('settings').update(update).eq('id', settings.id)
    if (updateError) throw new Error('Failed to update settings: ' + updateError.message)

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('save-zendesk-secret error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
