import OneSignal from 'react-onesignal';

const LINK_FN_URL =
  'https://nrlqgxsusnxarajofasd.supabase.co/functions/v1/link-onesignal-user';

let initPromise = null;

export function initOneSignal() {
  if (initPromise) return initPromise;
  initPromise = OneSignal.init({
    appId: 'c1c9bf15-50ef-41c0-a427-c7849e520527',
    safari_web_id: 'web.onesignal.auto.4d38dcde-f055-4772-b947-a310d959e18a',
    // OneSignal's worker lives in its OWN scope so it can't collide with the
    // vite-plugin-pwa worker (sw.js) at scope '/'. Two SW registrations sharing
    // scope '/' overwrite each other, which shadowed OneSignal's worker and made
    // requestPermission() hang without ever showing the iOS prompt.
    serviceWorkerParam: { scope: '/onesignal/' },
    serviceWorkerPath: 'onesignal/OneSignalSDKWorker.js',
    notifyButton: { enable: false },
    allowLocalhostAsSecureOrigin: true,
    promptOptions: {
      slidedown: {
        prompts: [
          {
            type: 'push',
            autoPrompt: false,
            text: {
              actionMessage: 'VelaFit would like to send you session reminders and streak alerts.',
              acceptButton: 'Allow',
              cancelButton: 'Not now',
            },
          },
        ],
      },
    },
  }).then(() => {
    console.log('[OneSignal] initialized');
  }).catch((err) => {
    console.warn('[OneSignal] init failed:', err);
    initPromise = null;
  });
  return initPromise;
}

export async function sendTag(key, value) {
  try {
    await initOneSignal();
    await OneSignal.User.addTag(key, value);
  } catch (err) {
    console.warn('[OneSignal] sendTag failed:', err);
  }
}

// Snapshot of the most recent registration attempt, surfaced in the Settings
// "Notification debug" readout so it can be inspected on-device (iOS PWA has no
// reachable console).
let lastDiag = null;

// Step-by-step trace of the most recent permission request, so we can see
// on-device exactly where the flow stops (tapped → calling → returned/threw).
let permDiag = null;

function setPermStep(step, extra) {
  permDiag = { step, ...(extra || {}), at: new Date().toISOString() };
  console.log(`[Perm] ${step}`, extra || '');
}

// Timestamp the tap itself. MUST be called synchronously at the very top of the
// gesture handler, before any await, so we can tell "tapped but request never
// fired" apart from "request fired but native prompt hung".
export function notePermTap(source) {
  setPermStep('button tapped', { source });
}

// Read the full push-subscription state at this instant.
function readPushState() {
  let permission = 'unknown';
  try {
    if (typeof Notification !== 'undefined') permission = Notification.permission;
  } catch {
    /* Notification may be unavailable in some contexts */
  }
  const sub = (OneSignal.User && OneSignal.User.PushSubscription) || {};
  return {
    id: sub.id ?? null,
    token: sub.token ?? null,
    optedIn: sub.optedIn ?? null,
    permission,
  };
}

// Capture + log the subscription state, then save to Supabase ONLY when the
// device is genuinely push-enabled (optedIn === true AND a token is present).
// Saving an `id` without those is exactly how stale/invalid_player_ids get
// written, so we skip and record why instead.
async function evaluateAndSave(userId, stage) {
  const state = readPushState();
  console.log(`[OneSignal DIAG] (${stage}) PushSubscription.id:`, state.id);
  console.log(`[OneSignal DIAG] (${stage}) PushSubscription.token:`, state.token);
  console.log(`[OneSignal DIAG] (${stage}) PushSubscription.optedIn:`, state.optedIn);
  console.log(`[OneSignal DIAG] (${stage}) Notification.permission:`, state.permission);

  const pushEnabled = state.optedIn === true && !!state.token && !!state.id;
  let decision = 'skipped';
  let reason;

  if (pushEnabled) {
    decision = 'saved';
    reason = 'optedIn === true and token present';
    console.log('[OneSignal DIAG] push-enabled — saving subscription id:', state.id);
    await saveSubscriptionToSupabase(userId, state.id);
  } else if (!state.id) {
    reason = 'no subscription id yet';
  } else if (state.optedIn !== true) {
    reason = `id present but optedIn === ${state.optedIn} (not opted in)`;
  } else if (!state.token) {
    reason = 'id present but token is null (no valid push token)';
  } else {
    reason = 'not push-enabled';
  }

  if (!pushEnabled) {
    console.warn(`[OneSignal DIAG] NOT saving subscription — ${reason}`, state);
  }

  lastDiag = { ...state, pushEnabled, decision, reason, stage, at: new Date().toISOString() };
  return pushEnabled;
}

export async function registerPushSubscription(userId) {
  try {
    await initOneSignal();

    // Evaluate the current state immediately.
    const saved = await evaluateAndSave(userId, 'immediate');
    if (saved) return true;

    // Not push-enabled yet — the id/token/optedIn often arrive a beat later on
    // iOS. Re-evaluate (and gate the save the same way) on each change.
    console.log('[OneSignal DIAG] not push-enabled yet, adding change listener...');
    OneSignal.User.PushSubscription.addEventListener('change', async () => {
      await evaluateAndSave(userId, 'change-event');
    });
    return true;
  } catch (err) {
    console.error('[OneSignal] registerPushSubscription failed:', err);
    return false;
  }
}

// Live push-subscription state plus the last registration attempt, for the
// on-device debug readout in Settings.
export async function getPushDiagnostics() {
  try {
    await initOneSignal();
  } catch {
    /* fall through and report whatever state we can read */
  }
  return { ...readPushState(), lastAttempt: lastDiag, permFlow: permDiag };
}

async function saveSubscriptionToSupabase(userId, subscriptionId) {
  try {
    const res = await fetch(LINK_FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription_id: subscriptionId, user_id: userId }),
    });
    const json = await res.json();
    console.log('[OneSignal] subscription saved:', JSON.stringify(json));
    return json.ok === true;
  } catch (err) {
    console.error('[OneSignal] saveSubscriptionToSupabase failed:', err);
    return false;
  }
}

export function promptNotificationPermission() {
  // CRITICAL (iOS / WebKit): the permission request must be issued synchronously
  // within the user-gesture turn. ANY await before requestPermission() — even
  // `await initOneSignal()` on an already-resolved promise — yields to the
  // microtask queue and drops the transient user activation, so iOS silently
  // discards the request: no native prompt appears and the promise can hang.
  //
  // OneSignal is initialized at app load (see main.jsx), so it is ready by the
  // time any button can be tapped. We therefore do NOT await init here; we call
  // requestPermission() directly and only chain the .then() afterwards.
  if (
    !OneSignal.Notifications ||
    typeof OneSignal.Notifications.requestPermission !== 'function'
  ) {
    // init hasn't finished yet — kick it off (fire-and-forget) and ask the user
    // to tap again. We must not await it here or we'd reintroduce the break.
    setPermStep('SDK not ready — init incomplete; retrying init, tap again');
    initOneSignal().catch(() => {});
    return Promise.resolve();
  }

  setPermStep('requestPermission: calling');
  let call;
  try {
    // Fired directly inside the gesture — this is the line iOS must see synchronously.
    call = OneSignal.Notifications.requestPermission();
  } catch (err) {
    setPermStep('requestPermission: threw', { error: String(err) });
    console.warn('[OneSignal] permission request failed:', err);
    return Promise.resolve();
  }

  return Promise.resolve(call)
    .then((result) => {
      setPermStep('requestPermission: returned', { result: String(result) });
      console.log('[Perm] requestPermission returned:', result);
      return result;
    })
    .catch((err) => {
      setPermStep('requestPermission: rejected', { error: String(err) });
      console.warn('[OneSignal] permission request rejected:', err);
    });
}
