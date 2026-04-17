import { sendTag } from './oneSignal';
import { localDateStr } from './dates';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Updates OneSignal tags based on the user's current plan state.
 * Call this on Dashboard load for logged-in users. Tags drive the
 * daily reminder / streak alert / weekly check-in notifications.
 *
 * @param {Object} userPlan - User's plan with `.days` map
 * @param {Array}  workoutLogs - Recent workout_logs rows
 */
export async function updateDailyNotificationTags(userPlan, workoutLogs = []) {
  if (!userPlan?.days) return;

  try {
    const today = new Date();
    const todayName = DAY_NAMES[today.getDay()];
    const isTrainingDay = todayName in userPlan.days;
    const todayStr = localDateStr();
    const completedToday = workoutLogs.some((l) => l.date === todayStr);

    console.log('[Notifications] updateDailyNotificationTags called', { userPlan, isTrainingDay, completedToday });

    await sendTag('is_training_day', isTrainingDay ? 'true' : 'false');
    await sendTag('session_completed_today', completedToday ? 'true' : 'false');

    if (isTrainingDay) {
      await sendTag('todays_session_mins', String(userPlan.days[todayName]));
    }
  } catch (err) {
    console.warn('[notifications] updateDailyNotificationTags failed:', err);
  }
}
