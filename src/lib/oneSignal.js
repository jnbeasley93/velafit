import OneSignal from 'react-onesignal';

const LINK_FN_URL =
  'https://nrlqgxsusnxarajofasd.supabase.co/functions/v1/link-onesignal-user';

let initPromise = null;

export function initOneSignal() {
  // Exactly-once guard. OneSignal v16 throws "SDK already initialized" on a
  // second init() call and ends up half-initialized — the service worker never
  // registers and requestPermission() hangs forever. So init() must run at most
  // once for the app's lifetime.
  //
  // Two rules make that airtight:
  //  1. Assign `initPromise` SYNCHRONOUSLY, before calling OneSignal.init(), so
  //     no racing caller can see it null and start a second init.
  //  2. NEVER reset `initPromise` to null — not even in the catch. Once init is
  //     attempted we keep the (settled) promise so it is never re-attempted,
  //     even if it failed. (The previous `initPromise = null` in catch was the
  //     bug: a failed/racing init cleared the guard and the next caller
  //     re-invoked init(), producing "SDK already initialized".)
  if (initPromise) return initPromise;

  let settle;
  initPromise = new Promise((resolve) => {
    settle = resolve;
  });

  OneSignal.init({
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
  })
    .catch((err) => {
      // Record the failure but do NOT reject or clear the guard — awaiters just
      // proceed and read whatever state is available; init is never retried.
      console.warn('[OneSignal] init failed:', err);
    })
    .finally(() => settle());

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

// Save to Supabase ONLY when the device is genuinely push-enabled
// (optedIn === true AND a token is present). Saving an `id` without those is
// exactly how stale/invalid_player_ids get written, so we skip otherwise.
async function evaluateAndSave(userId) {
  const sub = (OneSignal.User && OneSignal.User.PushSubscription) || {};
  const pushEnabled = sub.optedIn === true && !!sub.token && !!sub.id;
  if (!pushEnabled) return false;
  await saveSubscriptionToSupabase(userId, sub.id);
  return true;
}

export async function registerPushSubscription(userId) {
  try {
    await initOneSignal();

    // Evaluate the current state immediately.
    const saved = await evaluateAndSave(userId);
    if (saved) return true;

    // Not push-enabled yet — the id/token/optedIn often arrive a beat later on
    // iOS. Re-evaluate (and gate the save the same way) on each change.
    OneSignal.User.PushSubscription.addEventListener('change', async () => {
      await evaluateAndSave(userId);
    });
    return true;
  } catch (err) {
    console.error('[OneSignal] registerPushSubscription failed:', err);
    return false;
  }
}

async function saveSubscriptionToSupabase(userId, subscriptionId) {
  try {
    const res = await fetch(LINK_FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription_id: subscriptionId, user_id: userId }),
    });
    const json = await res.json();
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
    initOneSignal().catch(() => {});
    return Promise.resolve();
  }

  let call;
  try {
    // Fired directly inside the gesture — this is the line iOS must see synchronously.
    call = OneSignal.Notifications.requestPermission();
  } catch (err) {
    console.warn('[OneSignal] permission request failed:', err);
    return Promise.resolve();
  }

  return Promise.resolve(call).catch((err) => {
    console.warn('[OneSignal] permission request rejected:', err);
  });
}
