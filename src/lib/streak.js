import { localDateStr } from './dates.js';

/**
 * Consecutive-day streak with one-day grace: counts logged days back from
 * today if today is logged, otherwise from yesterday — so the streak only
 * resets to 0 when the most recent logged day is 2+ days ago. `dates` holds
 * 'YYYY-MM-DD' local-date strings as written by localDateStr().
 */
export function computeStreak(dates, now = new Date()) {
  const set = dates instanceof Set ? dates : new Set(dates);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const start = set.has(localDateStr(today)) ? 0 : 1;
  let streak = 0;
  for (let i = start; i < start + 365; i++) {
    const target = new Date(today);
    target.setDate(today.getDate() - i);
    if (set.has(localDateStr(target))) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
