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

export async function registerPushSubscription(userId) {
  try {
    await initOneSignal();

    // Try immediately first
    const subscriptionId = OneSignal.User.PushSubscription.id;
    if (subscriptionId) {
      console.log('[OneSignal] subscription ID found immediately:', subscriptionId);
      await saveSubscriptionToSupabase(userId, subscriptionId);
      return true;
    }

    // If not available yet, listen for when it becomes available
    console.log('[OneSignal] no subscription yet, adding change listener...');
    OneSignal.User.PushSubscription.addEventListener('change', async (event) => {
      const newId = event.current?.id;
      if (newId) {
        console.log('[OneSignal] subscription ID now available:', newId);
        await saveSubscriptionToSupabase(userId, newId);
      }
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
