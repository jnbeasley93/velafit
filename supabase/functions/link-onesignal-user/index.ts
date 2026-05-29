import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  try {
    const { subscription_id, user_id } = await req.json()

    if (!subscription_id || !user_id) {
      return new Response(
        JSON.stringify({ error: 'subscription_id and user_id required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    console.log(`Registering subscription ${subscription_id} for user ${user_id}`)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const { error } = await supabase
      .from('user_push_subscriptions')
      .upsert(
        {
          subscription_id,
          user_id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'subscription_id' },
      )

    if (error) {
      console.error('upsert failed:', error)
      return new Response(
        JSON.stringify({ ok: false, error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('Error:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})
