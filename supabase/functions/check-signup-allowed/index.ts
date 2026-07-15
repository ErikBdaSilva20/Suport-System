import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
    if (error) throw error
    const allowed = (count ?? 0) === 0
    return new Response(JSON.stringify({ allowed, isFirstUser: allowed }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('check-signup-allowed error:', err)
    // On error, default to NOT allowed (safer)
    return new Response(JSON.stringify({ allowed: false, error: (err as Error).message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
