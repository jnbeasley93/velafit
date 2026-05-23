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
  const isSunday = todayName === 'Sun'

  console.log(`Running at UTC ${currentUTCHour}:${currentUTCMinute}, Central ~${centralHour}:00, day: ${todayName}, isSunday: ${isSunday}`)

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

  let trainingResults: PromiseSettledResult<unknown>[] = []
  let trainingUsersCount = 0

  // ── Training-day notifications ────────────────────────
  if (usersToNotify.length > 0) {
    const userIds = usersToNotify.map(p => p.id)
    const { data: plans, error: plansError } = await supabase
      .from('user_plans')
      .select('user_id, plan')
      .in('user_id', userIds)

    if (plansError) {
      console.error('Error fetching plans:', plansError)
    } else {
      const trainingUsers = plans?.filter(p => {
        return p.plan?.days && todayName in p.plan.days
      }) ?? []

      console.log(`Training users to notify: ${trainingUsers.map(u => u.user_id)}`)
      trainingUsersCount = trainingUsers.length

      if (trainingUsers.length > 0) {
        trainingResults = await Promise.allSettled(
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
            console.log('Training result for', user_id, ':', JSON.stringify(json))
            return { user_id, ...json }
          })
        )
      }
    }
  }

  // ── Sunday weekly check-in ────────────────────────────
  let checkinResults: PromiseSettledResult<unknown>[] = []
  let checkinUsersCount = 0

  if (isSunday) {
    const { data: allPlans, error: allPlansError } = await supabase
      .from('user_plans')
      .select('user_id')

    if (allPlansError) {
      console.error('Error fetching all plans for check-in:', allPlansError)
    } else {
      const planUserIds = allPlans?.map(p => p.user_id) ?? []

      if (planUserIds.length > 0) {
        const { data: allProfiles, error: allProfilesError } = await supabase
          .from('profiles')
          .select('id, notification_time')
          .in('id', planUserIds)

        if (allProfilesError) {
          console.error('Error fetching profiles for check-in:', allProfilesError)
        } else {
          const checkinUsers = allProfiles?.filter(p => {
            const prefTime = p.notification_time || '07:00'
            const prefUTCHour = centralToUTCHour(prefTime)
            return prefUTCHour === currentUTCHour
          }) ?? []

          console.log(`Weekly check-in users this hour: ${checkinUsers.length}`)
          checkinUsersCount = checkinUsers.length

          if (checkinUsers.length > 0) {
            checkinResults = await Promise.allSettled(
              checkinUsers.map(async ({ id }) => {
                const res = await fetch('https://api.onesignal.com/notifications', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `key ${ONESIGNAL_API_KEY}`,
                  },
                  body: JSON.stringify({
                    app_id: ONESIGNAL_APP_ID,
                    include_aliases: { external_id: [id] },
                    target_channel: 'push',
                    headings: { en: 'New week ahead. 📅' },
                    contents: { en: 'VelaFit · Does your schedule still work for you? Tap to check in.' },
                    url: 'https://vela-fitness.vercel.app/dashboard',
                  }),
                })
                const json = await res.json()
                console.log('Weekly checkin result for', id, ':', JSON.stringify(json))
                return { user_id: id, ...json }
              })
            )
          }
        }
      }
    }
  }

  const trainingSucceeded = trainingResults.filter(r => r.status === 'fulfilled' && (r.value as { id?: string })?.id).length
  const trainingFailed = trainingResults.length - trainingSucceeded
  const checkinSucceeded = checkinResults.filter(r => r.status === 'fulfilled' && (r.value as { id?: string })?.id).length
  const checkinFailed = checkinResults.length - checkinSucceeded

  return new Response(
    JSON.stringify({
      day: todayName,
      utcHour: currentUTCHour,
      training: {
        total: trainingUsersCount,
        succeeded: trainingSucceeded,
        failed: trainingFailed,
        results: trainingResults,
      },
      weeklyCheckin: {
        ran: isSunday,
        total: checkinUsersCount,
        succeeded: checkinSucceeded,
        failed: checkinFailed,
        results: checkinResults,
      },
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
