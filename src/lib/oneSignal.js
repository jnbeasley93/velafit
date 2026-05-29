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

    let subscriptionId = OneSignal.User.PushSubscription.id;
    if (!subscriptionId) {
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        subscriptionId = OneSignal.User.PushSubscription.id;
        if (subscriptionId) break;
      }
    }

    if (!subscriptionId) {
      console.warn('[OneSignal] no subscription ID after waiting');
      return false;
    }

    console.log('[OneSignal] registering subscription:', subscriptionId);

    const res = await fetch(LINK_FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription_id: subscriptionId, user_id: userId }),
    });
    const json = await res.json();
    if (!json.ok) {
      console.error('[OneSignal] register failed:', json);
      return false;
    }
    console.log('[OneSignal] subscription registered');
    return true;
  } catch (err) {
    console.error('[OneSignal] registerPushSubscription failed:', err);
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
