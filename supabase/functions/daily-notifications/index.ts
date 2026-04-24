import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ONESIGNAL_APP_ID = 'c1c9bf15-50ef-41c0-a427-c7849e520527'
const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!)

  // Get today's day name
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
  const todayName = days[new Date().getDay()]

  // Get all users who have a plan with today as a training day
  const { data: plans } = await supabase
    .from('user_plans')
    .select('user_id, plan')

  if (!plans?.length) {
    return new Response('No plans found', { status: 200 })
  }

  // Filter users who have today as a training day
  const trainingUserIds = plans
    .filter(p => p.plan?.days && todayName in p.plan.days)
    .map(p => p.user_id)

  if (!trainingUserIds.length) {
    return new Response('No training users today', { status: 200 })
  }

  // Get OneSignal subscription IDs for these users
  // We use external_id (which we set to user.id) to target users
  const notifications = await Promise.allSettled(
    trainingUserIds.map(async (userId) => {
      const res = await fetch('https://api.onesignal.com/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `key ${ONESIGNAL_API_KEY}`,
        },
        body: JSON.stringify({
          app_id: ONESIGNAL_APP_ID,
          include_aliases: { external_id: [userId] },
          target_channel: 'push',
          headings: { en: "Your session is ready. 🐸" },
          contents: { en: "VelaFit · Today is a training day. Tap to start your session." },
          url: 'https://vela-fitness.vercel.app/dashboard',
        }),
      })
      return res.json()
    })
  )

  console.log('Notification results:', JSON.stringify(notifications))

  return new Response(
    JSON.stringify({ sent: trainingUserIds.length, results: notifications }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
