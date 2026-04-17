import OneSignal from 'react-onesignal';

let initialized = false;

export async function initOneSignal() {
  if (initialized) return;
  try {
    await OneSignal.init({
      appId: 'c1c9bf15-50ef-41c0-a427-c7849e520527',
      safari_web_id: 'web.onesignal.auto.4d38dcde-f055-4772-b947-a310d959e18a',
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
    });
    initialized = true;
  } catch (err) {
    console.warn('OneSignal init failed:', err);
  }
}

export async function promptNotificationPermission() {
  try {
    await OneSignal.Slidedown.promptPush();
  } catch (err) {
    console.warn('OneSignal prompt failed:', err);
  }
}

export async function setOneSignalUserId(userId) {
  try {
    await OneSignal.login(userId);
  } catch (err) {
    console.warn('OneSignal login failed:', err);
  }
}

export async function sendTag(key, value) {
  try {
    console.log('[OneSignal] sendTag:', key, value);
    await OneSignal.User.addTag(key, value);
  } catch (err) {
    console.warn('OneSignal tag failed:', err);
  }
}
