import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

Deno.serve(async (req) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('[link-onesignal-user] missing env: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
      return new Response(
        JSON.stringify({ ok: false, error: 'server misconfigured: missing env vars' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      )
    }

    let body: { subscription_id?: string; user_id?: string }
    try {
      body = await req.json()
    } catch (parseErr) {
      console.error('[link-onesignal-user] body parse failed:', parseErr)
      return new Response(
        JSON.stringify({ ok: false, error: 'invalid JSON body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const { subscription_id, user_id } = body
    if (!subscription_id || !user_id) {
      return new Response(
        JSON.stringify({ ok: false, error: 'subscription_id and user_id required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      )
    }

    console.log(`[link-onesignal-user] registering subscription=${subscription_id} user=${user_id}`)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const nowIso = new Date().toISOString()

    // Manual upsert: select → update or insert. Avoids relying on a UNIQUE
    // constraint on subscription_id (the API-created table doesn't have one).
    const { data: existing, error: selectErr } = await supabase
      .from('user_push_subscriptions')
      .select('user_id')
      .eq('subscription_id', subscription_id)
      .maybeSingle()

    if (selectErr) {
      console.error('[link-onesignal-user] select failed:', selectErr)
      return new Response(
        JSON.stringify({
          ok: false,
          stage: 'select',
          error: selectErr.message,
          code: selectErr.code,
          details: selectErr.details,
          hint: selectErr.hint,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (existing) {
      if (existing.user_id !== user_id) {
        console.log(`[link-onesignal-user] reassigning subscription from ${existing.user_id} to ${user_id}`)
      } else {
        console.log('[link-onesignal-user] subscription already linked, refreshing updated_at')
      }
      const { error: updateErr } = await supabase
        .from('user_push_subscriptions')
        .update({ user_id, updated_at: nowIso })
        .eq('subscription_id', subscription_id)
      if (updateErr) {
        console.error('[link-onesignal-user] update failed:', updateErr)
        return new Response(
          JSON.stringify({
            ok: false,
            stage: 'update',
            error: updateErr.message,
            code: updateErr.code,
            details: updateErr.details,
            hint: updateErr.hint,
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } },
        )
      }
    } else {
      const { error: insertErr } = await supabase
        .from('user_push_subscriptions')
        .insert({ subscription_id, user_id, updated_at: nowIso })
      if (insertErr) {
        console.error('[link-onesignal-user] insert failed:', insertErr)
        return new Response(
          JSON.stringify({
            ok: false,
            stage: 'insert',
            error: insertErr.message,
            code: insertErr.code,
            details: insertErr.details,
            hint: insertErr.hint,
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } },
        )
      }
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[link-onesignal-user] unexpected error:', err)
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})
