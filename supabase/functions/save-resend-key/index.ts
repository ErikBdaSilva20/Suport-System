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
    const apiKey = typeof payload?.apiKey === 'string' ? payload.apiKey.trim() : ''
    const webhookSecret = typeof payload?.webhookSecret === 'string' ? payload.webhookSecret.trim() : ''
    const fromEmail = typeof payload?.fromEmail === 'string' ? payload.fromEmail.trim().toLowerCase() : ''

    if (!apiKey && !webhookSecret && !fromEmail) {
      return new Response(JSON.stringify({ error: 'Informe pelo menos um campo (apiKey, webhookSecret ou fromEmail).' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (apiKey && apiKey.length < 8) {
      return new Response(JSON.stringify({ error: 'Resend API Key inválida.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (webhookSecret && webhookSecret.length < 8) {
      return new Response(JSON.stringify({ error: 'Webhook secret inválido.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (fromEmail && !fromEmail.includes('@')) {
      return new Response(JSON.stringify({ error: 'E-mail remetente inválido.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: settings } = await supabaseAdmin
      .from('settings').select('id').limit(1).single()
    if (!settings) throw new Error('Settings row not found')

    const update: Record<string, string> = {}
    if (apiKey) {
      update.resend_api_key = apiKey
      update.resend_api_key_masked = maskKey(apiKey)
    }
    if (webhookSecret) {
      update.resend_webhook_secret = webhookSecret
      update.resend_webhook_secret_masked = maskKey(webhookSecret)
    }
    if (fromEmail) {
      update.resend_from_email = fromEmail
    }

    const { error: updateError } = await supabaseAdmin
      .from('settings').update(update).eq('id', settings.id)

    if (updateError) throw new Error('Failed to update settings: ' + updateError.message)

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('save-resend-key error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
