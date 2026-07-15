import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

function generateTempPassword(length = 16): string {
  // Alfabeto sem caracteres ambíguos (0/O, 1/l/I) e sem símbolos difíceis de ditar.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%*'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length]
  return out
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { email, invitedBy, role, mode } = await req.json()
    if (!email) {
      return new Response(JSON.stringify({ error: 'email required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const finalRole: 'admin' | 'agent' = role === 'admin' ? 'admin' : 'agent'
    const finalMode: 'email' | 'manual' = mode === 'manual' ? 'manual' : 'email'

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    let userId: string | undefined
    let tempPassword: string | undefined

    // Detecta usuário órfão em auth.users (sem profile correspondente) e remove antes de recriar.
    async function cleanupOrphanAuthUser(targetEmail: string): Promise<boolean> {
      try {
        // lista até 1000 usuários; suficiente pro cenário single-tenant deste projeto.
        const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
        const existing = list?.users?.find((u) => (u.email ?? '').toLowerCase() === targetEmail.toLowerCase())
        if (!existing) return false
        const { data: profile } = await supabase.from('profiles').select('id').eq('id', existing.id).maybeSingle()
        if (profile) return false // já tem profile de verdade — não mexer
        const { error: delErr } = await supabase.auth.admin.deleteUser(existing.id)
        if (delErr) {
          console.error('Failed to delete orphan auth user:', delErr)
          return false
        }
        console.log('Deleted orphan auth user for', targetEmail)
        return true
      } catch (e) {
        console.error('cleanupOrphanAuthUser error:', e)
        return false
      }
    }

    if (finalMode === 'manual') {
      tempPassword = generateTempPassword(16)
      const fullName = email.split('@')[0]
      const doCreate = () => supabase.auth.admin.createUser({
        email,
        password: tempPassword!,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      })
      let { data: createData, error: createErr } = await doCreate()
      if (createErr && /already/i.test(createErr.message)) {
        const removed = await cleanupOrphanAuthUser(email)
        if (removed) {
          ;({ data: createData, error: createErr } = await doCreate())
        }
      }
      if (createErr) {
        const status = /already/i.test(createErr.message) ? 409 : 500
        return new Response(JSON.stringify({ error: createErr.message }), {
          status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      userId = createData?.user?.id
    } else {
      let { data: inviteData, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email)
      if (inviteErr && /already|registered/i.test(inviteErr.message)) {
        const removed = await cleanupOrphanAuthUser(email)
        if (removed) {
          ;({ data: inviteData, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email))
        }
      }
      if (inviteErr) {
        console.error('Invite error:', inviteErr)
        const status = /already|registered/i.test(inviteErr.message) ? 409 : 500
        return new Response(JSON.stringify({ error: inviteErr.message }), {
          status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      userId = inviteData?.user?.id
    }

    if (userId && finalRole === 'admin') {
      const { error: updErr } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', userId)
      if (updErr) console.error('Failed to set admin role:', updErr)
    }

    if (finalMode === 'email') {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const { data: settingsRow } = await supabase
        .from('settings')
        .select('app_base_url')
        .limit(1)
        .single()
      const appBase = (settingsRow?.app_base_url ?? '').replace(/\/$/, '') || supabaseUrl
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            to: email,
            subject: 'Você foi convidado para a equipe de suporte',
            template: 'agent_invite',
            data: {
              link: `${appBase}/login`,
              invitedBy: invitedBy ?? 'Administrador',
            },
          },
        })
      } catch (e) {
        console.error('Failed to send invite notification', e)
      }
    }

    return new Response(
      JSON.stringify({ success: true, userId, role: finalRole, mode: finalMode, tempPassword }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('invite-agent error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
