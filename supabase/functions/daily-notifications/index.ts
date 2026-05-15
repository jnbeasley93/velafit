import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ONESIGNAL_APP_ID = 'c1c9bf15-50ef-41c0-a427-c7849e520527'
const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!)

  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const todayName = days[new Date().getDay()]

  console.log('Running for day:', todayName)

  const { data: plans, error: plansError } = await supabase
    .from('user_plans')
    .select('user_id, plan')

  if (plansError) {
    console.error('Error fetching plans:', plansError)
    return new Response('Error fetching plans', { status: 500 })
  }

  console.log('Total plans found:', plans?.length ?? 0)

  const trainingUsers = plans?.filter(p => {
    const days = p.plan?.days
    return days && todayName in days
  }) ?? []

  console.log('Training users today:', trainingUsers.map(u => u.user_id))

  if (!trainingUsers.length) {
    return new Response(
      JSON.stringify({ message: 'No training users today', day: todayName }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }

  const results = await Promise.allSettled(
    trainingUsers.map(async ({ user_id, plan }) => {
      const sessionMins = plan?.days?.[todayName] ?? 30
      const res = await fetch('https://api.onesignal.com/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `key ${ONESIGNAL_API_KEY}`,
        },
        body: JSON.stringify({
          app_id: ONESIGNAL_APP_ID,
          include_aliases: { external_id: [user_id] },
          target_channel: 'push',
          headings: { en: "Your session is ready. 🐸" },
          contents: { en: `VelaFit · You have a ${sessionMins}-minute session today. Tap to start.` },
          url: 'https://vela-fitness.vercel.app/dashboard',
        }),
      })
      const json = await res.json()
      console.log('Result for', user_id, ':', JSON.stringify(json))
      return { user_id, ...json }
    })
  )

  const succeeded = results.filter(r => r.status === 'fulfilled' && r.value?.id).length
  const failed = results.filter(r => r.status === 'rejected' || !r.value?.id).length

  return new Response(
    JSON.stringify({
      day: todayName,
      total: trainingUsers.length,
      succeeded,
      failed,
      results
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
