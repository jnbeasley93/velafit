import OneSignal from 'react-onesignal';

let initialized = false;

export async function initOneSignal() {
  if (initialized) return;
  try {
    await OneSignal.init({
      appId: 'ONESIGNAL_APP_ID_PLACEHOLDER',
      safari_web_id: 'SAFARI_WEB_ID_PLACEHOLDER',
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
    await OneSignal.User.addTag(key, value);
  } catch (err) {
    console.warn('OneSignal tag failed:', err);
  }
}
