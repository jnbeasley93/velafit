import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ONESIGNAL_APP_ID = 'c1c9bf15-50ef-41c0-a427-c7849e520527'
const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// Convert HH:MM Central time to UTC hour
// Central is UTC-6 (CST) or UTC-5 (CDT)
// Using UTC-5 (CDT) as default for summer months
const CENTRAL_OFFSET = 5

function centralToUTCHour(timeStr: string): number {
  const [hours] = timeStr.split(':').map(Number)
  return (hours + CENTRAL_OFFSET) % 24
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!)

  const now = new Date()
  const currentUTCHour = now.getUTCHours()
  const currentUTCMinute = now.getUTCMinutes()

  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  // Convert current UTC time back to Central to get today's day name
  const centralHour = (currentUTCHour - CENTRAL_OFFSET + 24) % 24
  const centralDate = new Date(now)
  centralDate.setUTCHours(now.getUTCHours() - CENTRAL_OFFSET)
  const todayName = days[centralDate.getUTCDay()]

  console.log(`Running at UTC ${currentUTCHour}:${currentUTCMinute}, Central ~${centralHour}:00, day: ${todayName}`)

  // Get all profiles with notification times
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, notification_time')

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError)
    return new Response('Error fetching profiles', { status: 500 })
  }

  // Filter profiles whose notification time matches current UTC hour
  const usersToNotify = profiles?.filter(p => {
    const prefTime = p.notification_time || '07:00'
    const prefUTCHour = centralToUTCHour(prefTime)
    return prefUTCHour === currentUTCHour
  }) ?? []

  console.log(`Users with notifications due this hour: ${usersToNotify.length}`)

  if (!usersToNotify.length) {
    return new Response(
      JSON.stringify({ message: 'No notifications due this hour', utcHour: currentUTCHour }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Get plans for these users and filter by training day
  const userIds = usersToNotify.map(p => p.id)
  const { data: plans, error: plansError } = await supabase
    .from('user_plans')
    .select('user_id, plan')
    .in('user_id', userIds)

  if (plansError) {
    console.error('Error fetching plans:', plansError)
    return new Response('Error fetching plans', { status: 500 })
  }

  const trainingUsers = plans?.filter(p => {
    return p.plan?.days && todayName in p.plan.days
  }) ?? []

  console.log(`Training users to notify: ${trainingUsers.map(u => u.user_id)}`)

  if (!trainingUsers.length) {
    return new Response(
      JSON.stringify({ message: 'No training users this hour', day: todayName }),
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
          headings: { en: 'Your session is ready. 🐸' },
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
    JSON.stringify({ day: todayName, utcHour: currentUTCHour, total: trainingUsers.length, succeeded, failed, results }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
