import OneSignal from 'react-onesignal';

const LINK_FN_URL =
  'https://nrlqgxsusnxarajofasd.supabase.co/functions/v1/link-onesignal-user';

let initPromise = null;

// Init lifecycle, surfaced in the Settings debug box so we can see on-device
// whether OneSignal.init() actually completed or failed silently (the iOS PWA
// has no reachable console).
let initState = { status: 'not-started', error: null, at: null };

function setInitState(status, error) {
  initState = {
    status,
    error: error ? String(error && error.message ? error.message : error) : null,
    at: new Date().toISOString(),
  };
  if (error) console.error(`[OneSignal] init → ${status}:`, error);
  else console.log(`[OneSignal] init → ${status}`);
}

export function initOneSignal() {
  if (initPromise) return initPromise;
  setInitState('in-progress');
  initPromise = OneSignal.init({
    appId: 'c1c9bf15-50ef-41c0-a427-c7849e520527',
    safari_web_id: 'web.onesignal.auto.4d38dcde-f055-4772-b947-a310d959e18a',
    // vite-plugin-pwa (which registered sw.js at scope '/') has been removed, so
    // scope '/' is now free. OneSignal's worker needs the ROOT scope to control
    // the app pages at '/'; a narrow '/onesignal/' scope can't, which is why the
    // worker effectively never registered/controlled anything.
    serviceWorkerParam: { scope: '/' },
    serviceWorkerPath: 'OneSignalSDKWorker.js',
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
    setInitState('done');
    console.log('[OneSignal] initialized');
  }).catch((err) => {
    // Surface, don't swallow — a silent init failure is exactly what would leave
    // requestPermission() hanging with no worker registered.
    setInitState('failed', err);
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
// Enumerate every service worker registration the browser holds for this
// origin, plus which one currently controls the page. This is the proof of the
// scope collision: two registrations both scoped '/' (sw.js + OneSignal) means
// they were fighting; after the fix only OneSignal's '/onesignal/' worker
// should remain.
async function readServiceWorkerRegistrations() {
  try {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return { supported: false, controller: null, registrations: [] };
    }
    const regs = await navigator.serviceWorker.getRegistrations();
    const controllerUrl = navigator.serviceWorker.controller
      ? navigator.serviceWorker.controller.scriptURL
      : null;
    const registrations = regs.map((r) => {
      const sw = r.active || r.waiting || r.installing;
      const scriptURL = sw ? sw.scriptURL : null;
      const state = r.active
        ? r.active.state
        : r.waiting
          ? 'waiting'
          : r.installing
            ? 'installing'
            : 'unknown';
      return {
        scope: r.scope,
        scriptURL,
        state,
        controlling: !!controllerUrl && scriptURL === controllerUrl,
      };
    });
    return { supported: true, controller: controllerUrl, registrations };
  } catch (err) {
    return { supported: true, error: String(err), controller: null, registrations: [] };
  }
}

// Confirm the OneSignal worker file is actually served at the root URL the SDK
// registers. If this 404s or returns HTML (e.g. SPA fallback), the browser
// cannot register the worker and OneSignal hangs — this makes that visible.
async function checkWorkerReachable() {
  try {
    const res = await fetch('/OneSignalSDKWorker.js', { cache: 'no-store' });
    const text = await res.text();
    return {
      status: res.status,
      ok: res.ok,
      contentType: res.headers.get('content-type'),
      looksValid: text.includes('OneSignalSDK.sw.js'),
    };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function getPushDiagnostics() {
  try {
    await initOneSignal();
  } catch {
    /* fall through and report whatever state we can read */
  }
  return {
    ...readPushState(),
    init: initState,
    lastAttempt: lastDiag,
    permFlow: permDiag,
    serviceWorkers: await readServiceWorkerRegistrations(),
    worker: await checkWorkerReachable(),
  };
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
