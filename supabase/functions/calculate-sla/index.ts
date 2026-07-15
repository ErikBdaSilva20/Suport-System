import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

function addBusinessMinutes(
  start: Date,
  minutes: number,
  businessStart: string,
  businessEnd: string,
  businessDays: number[],
): Date {
  const [startH, startM] = businessStart.split(':').map(Number)
  const [endH, endM] = businessEnd.split(':').map(Number)
  const businessStartMin = startH * 60 + startM
  const businessEndMin = endH * 60 + endM
  const dailyMinutes = businessEndMin - businessStartMin

  if (dailyMinutes <= 0) return new Date(start.getTime() + minutes * 60_000)

  let remaining = minutes
  const cursor = new Date(start)

  // Adjust cursor to next business time if outside
  const adjustToBusinessTime = () => {
    // JS getDay: 0=Sun,1=Mon..6=Sat; our businessDays: 1=Mon..7=Sun
    const jsDay = cursor.getDay()
    const bizDay = jsDay === 0 ? 7 : jsDay

    if (!businessDays.includes(bizDay)) {
      // Move to next business day
      for (let i = 0; i < 7; i++) {
        cursor.setDate(cursor.getDate() + 1)
        const d = cursor.getDay()
        const bd = d === 0 ? 7 : d
        if (businessDays.includes(bd)) break
      }
      cursor.setHours(startH, startM, 0, 0)
      return
    }

    const curMin = cursor.getHours() * 60 + cursor.getMinutes()
    if (curMin < businessStartMin) {
      cursor.setHours(startH, startM, 0, 0)
    } else if (curMin >= businessEndMin) {
      // Move to next business day
      for (let i = 0; i < 7; i++) {
        cursor.setDate(cursor.getDate() + 1)
        const d = cursor.getDay()
        const bd = d === 0 ? 7 : d
        if (businessDays.includes(bd)) break
      }
      cursor.setHours(startH, startM, 0, 0)
    }
  }

  adjustToBusinessTime()

  while (remaining > 0) {
    const curMin = cursor.getHours() * 60 + cursor.getMinutes()
    const availableToday = businessEndMin - curMin

    if (remaining <= availableToday) {
      cursor.setMinutes(cursor.getMinutes() + remaining)
      remaining = 0
    } else {
      remaining -= availableToday
      // Move to next business day
      for (let i = 0; i < 7; i++) {
        cursor.setDate(cursor.getDate() + 1)
        const d = cursor.getDay()
        const bd = d === 0 ? 7 : d
        if (businessDays.includes(bd)) break
      }
      cursor.setHours(startH, startM, 0, 0)
    }
  }

  return cursor
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { ticketId } = await req.json()
    if (!ticketId) {
      return new Response(JSON.stringify({ error: 'ticketId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: ticket, error: tErr } = await supabase.from('tickets').select('id,priority,created_at').eq('id', ticketId).single()
    if (tErr || !ticket) {
      return new Response(JSON.stringify({ error: 'Ticket not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: sla } = await supabase.from('sla_policies').select('*').eq('priority', ticket.priority).single()
    if (!sla) {
      return new Response(JSON.stringify({ error: 'No SLA policy for priority ' + ticket.priority }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: settings } = await supabase.from('settings').select('*').limit(1).single()
    const businessStart = settings?.business_hours_start ?? '09:00'
    const businessEnd = settings?.business_hours_end ?? '18:00'
    const businessDays: number[] = settings?.business_days ?? [1, 2, 3, 4, 5]

    const createdAt = new Date(ticket.created_at)
    const firstResponseDue = addBusinessMinutes(createdAt, sla.first_response_minutes, businessStart, businessEnd, businessDays)
    const resolutionDue = addBusinessMinutes(createdAt, sla.resolution_minutes, businessStart, businessEnd, businessDays)

    const { error: uErr } = await supabase.from('tickets').update({
      sla_first_response_due: firstResponseDue.toISOString(),
      sla_resolution_due: resolutionDue.toISOString(),
    }).eq('id', ticketId)

    if (uErr) throw uErr

    return new Response(JSON.stringify({
      success: true,
      sla_first_response_due: firstResponseDue.toISOString(),
      sla_resolution_due: resolutionDue.toISOString(),
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('calculate-sla error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
