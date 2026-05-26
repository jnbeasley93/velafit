import OneSignal from 'react-onesignal';

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

export async function setOneSignalUserId(userId) {
  try {
    await initOneSignal();
    await OneSignal.login(userId);
    console.log('[OneSignal] external ID set:', userId);
  } catch (err) {
    console.warn('[OneSignal] login failed:', err);
  }
}

export async function sendTag(key, value) {
  try {
    await initOneSignal();
    await OneSignal.User.addTag(key, value);
  } catch (err) {
    console.warn('[OneSignal] sendTag failed:', err);
  }
}

export async function forceRelinkExternalId(userId) {
  try {
    await initOneSignal();
    // First logout to clear any conflicting identity
    await OneSignal.logout();
    console.log('[OneSignal] logged out, re-linking...');
    // Wait a moment for logout to propagate
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // Now login fresh
    await OneSignal.login(userId);
    console.log('[OneSignal] re-linked external ID:', userId);
    return true;
  } catch (err) {
    console.error('[OneSignal] relink failed:', err);
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
