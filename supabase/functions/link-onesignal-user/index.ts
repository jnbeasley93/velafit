import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ONESIGNAL_APP_ID = 'c1c9bf15-50ef-41c0-a427-c7849e520527'
const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY')

Deno.serve(async (req) => {
  try {
    const { subscription_id, user_id } = await req.json()

    if (!subscription_id || !user_id) {
      return new Response(
        JSON.stringify({ error: 'subscription_id and user_id required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Linking subscription ${subscription_id} to user ${user_id}`)

    const response = await fetch(
      `https://api.onesignal.com/apps/${ONESIGNAL_APP_ID}/subscriptions/${subscription_id}/user/identity`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${ONESIGNAL_API_KEY}`,
        },
        body: JSON.stringify({
          identity: { external_id: user_id }
        }),
      }
    )

    const json = await response.json()
    console.log('OneSignal response:', JSON.stringify(json))

    return new Response(
      JSON.stringify({ ok: response.ok, status: response.status, body: json }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Error:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
