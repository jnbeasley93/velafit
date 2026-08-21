// Sends a support email via Resend when a row lands in public.feedback.
// Invoked by a pg_net database trigger (async queue), so nothing here can
// block or fail the feedback insert — the row is already committed. This
// function therefore always returns 200 and just logs failures.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const FEEDBACK_TO = 'support@velafit.app'
// Resend's default sender — fine until the velafit.app domain is verified.
const FEEDBACK_FROM = 'VelaFit Feedback <onboarding@resend.dev>'

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    const record = payload?.record
    if (payload?.type !== 'INSERT' || payload?.table !== 'feedback' || !record) {
      console.error('[notify-feedback] unexpected payload:', JSON.stringify(payload)?.slice(0, 500))
      return json({ ok: false, error: 'unexpected payload' })
    }

    let sender = 'Anonymous visitor (no reply email left)'
    if (record.user_id) {
      sender = `Logged-in user ${record.user_id}`
      try {
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!)
        const { data, error } = await supabase
          .from('profiles')
          .select('email, display_name')
          .eq('id', record.user_id)
          .maybeSingle()
        if (error) throw error
        if (data?.email) {
          sender = `Logged-in user: ${data.email}${data.display_name ? ` (${data.display_name})` : ''}`
        }
      } catch (err) {
        console.error('[notify-feedback] profile lookup failed:', err)
      }
    } else if (record.email) {
      sender = `Anonymous visitor — reply to: ${record.email}`
    }

    const text = [
      'New feedback:',
      '',
      record.message,
      '',
      '—',
      `From: ${sender}`,
      `Page: ${record.page || 'unknown'}`,
      `Time: ${record.created_at}`,
    ].join('\n')

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FEEDBACK_FROM,
        to: [FEEDBACK_TO],
        subject: 'New VelaFit feedback',
        text,
      }),
    })
    const resBody = await res.text()
    if (!res.ok) {
      console.error('[notify-feedback] Resend send failed:', res.status, resBody)
      return json({ ok: false, stage: 'resend', status: res.status, body: resBody })
    }

    console.log('[notify-feedback] sent:', resBody)
    return json({ ok: true })
  } catch (err) {
    console.error('[notify-feedback] error:', err)
    return json({ ok: false, error: String(err) })
  }
})
