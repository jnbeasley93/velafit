import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ONESIGNAL_APP_ID = 'c1c9bf15-50ef-41c0-a427-c7849e520527'
const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// Compute actual Central → UTC offset right now (handles CST vs CDT automatically)
function getCentralUTCOffset(): number {
  const now = new Date()
  const centralTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }))
  const diff = (now.getTime() - centralTime.getTime()) / (1000 * 60 * 60)
  return Math.round(diff)
}

function centralToUTCHour(timeStr: string): number {
  const [hours] = timeStr.split(':').map(Number)
  const offset = getCentralUTCOffset()
  return (hours + offset + 24) % 24
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!)

  const now = new Date()
  const currentUTCHour = now.getUTCHours()
  const currentUTCMinute = now.getUTCMinutes()

  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  // Use Intl API to get the actual current weekday in US Central — avoids
  // date-rollback bugs when manually subtracting an hour offset from UTC.
  const centralFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'short',
    hour: 'numeric',
    hour12: false,
  })
  const centralParts = centralFormatter.formatToParts(now)
  const todayName = centralParts.find(p => p.type === 'weekday')?.value ?? days[now.getUTCDay()]
  const centralHourStr = centralParts.find(p => p.type === 'hour')?.value ?? '?'
  const isSunday = todayName === 'Sun'

  console.log(`Running at UTC ${currentUTCHour}:${currentUTCMinute}, Central ${centralHourStr}:00, day: ${todayName}, isSunday: ${isSunday}, offset: ${getCentralUTCOffset()}`)

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

  // Helper: load subscription IDs for a set of user IDs, return a Map of user_id → subscription_id[]
  async function loadSubscriptionsFor(userIds: string[]): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>()
    if (userIds.length === 0) return result
    const { data: subs, error } = await supabase
      .from('user_push_subscriptions')
      .select('user_id, subscription_id')
      .in('user_id', userIds)
    if (error) {
      console.error('Error fetching subscriptions:', error)
      return result
    }
    for (const row of subs ?? []) {
      const existing = result.get(row.user_id)
      if (existing) existing.push(row.subscription_id)
      else result.set(row.user_id, [row.subscription_id])
    }
    return result
  }

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

      const trainingUserIds = trainingUsers.map(u => u.user_id)
      const subsByUser = await loadSubscriptionsFor(trainingUserIds)

      const reachableTrainingUsers = trainingUsers.filter(u => subsByUser.has(u.user_id))
      console.log(`Training users to notify: ${reachableTrainingUsers.map(u => u.user_id)} (skipped ${trainingUsers.length - reachableTrainingUsers.length} with no subscription)`)
      trainingUsersCount = reachableTrainingUsers.length

      if (reachableTrainingUsers.length > 0) {
        trainingResults = await Promise.allSettled(
          reachableTrainingUsers.map(async ({ user_id, plan }) => {
            const sessionMins = plan?.days?.[todayName] ?? 30
            const subIds = subsByUser.get(user_id)!
            const res = await fetch('https://api.onesignal.com/notifications', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `key ${ONESIGNAL_API_KEY}`,
              },
              body: JSON.stringify({
                app_id: ONESIGNAL_APP_ID,
                include_subscription_ids: subIds,
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
          const dueCheckinProfiles = allProfiles?.filter(p => {
            const prefTime = p.notification_time || '07:00'
            const prefUTCHour = centralToUTCHour(prefTime)
            return prefUTCHour === currentUTCHour
          }) ?? []

          const checkinUserIds = dueCheckinProfiles.map(p => p.id)
          const checkinSubsByUser = await loadSubscriptionsFor(checkinUserIds)

          const reachableCheckinUsers = dueCheckinProfiles.filter(p => checkinSubsByUser.has(p.id))
          console.log(`Weekly check-in users this hour: ${reachableCheckinUsers.length} (skipped ${dueCheckinProfiles.length - reachableCheckinUsers.length} with no subscription)`)
          checkinUsersCount = reachableCheckinUsers.length

          if (reachableCheckinUsers.length > 0) {
            checkinResults = await Promise.allSettled(
              reachableCheckinUsers.map(async ({ id }) => {
                const subIds = checkinSubsByUser.get(id)!
                const res = await fetch('https://api.onesignal.com/notifications', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `key ${ONESIGNAL_API_KEY}`,
                  },
                  body: JSON.stringify({
                    app_id: ONESIGNAL_APP_ID,
                    include_subscription_ids: subIds,
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
