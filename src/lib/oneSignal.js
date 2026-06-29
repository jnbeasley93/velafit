import OneSignal from 'react-onesignal';

const LINK_FN_URL =
  'https://nrlqgxsusnxarajofasd.supabase.co/functions/v1/link-onesignal-user';

let initPromise = null;

export function initOneSignal() {
  if (initPromise) return initPromise;
  initPromise = OneSignal.init({
    appId: 'c1c9bf15-50ef-41c0-a427-c7849e520527',
    safari_web_id: 'web.onesignal.auto.4d38dcde-f055-4772-b947-a310d959e18a',
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
  return { ...readPushState(), lastAttempt: lastDiag };
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

export async function promptNotificationPermission() {
  try {
    await initOneSignal();
    await OneSignal.Notifications.requestPermission();
  } catch (err) {
    console.warn('[OneSignal] permission request failed:', err);
  }
}
