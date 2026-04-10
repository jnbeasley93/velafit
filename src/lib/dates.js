/**
 * Returns YYYY-MM-DD using the user's LOCAL timezone.
 * Avoid toISOString().slice(0, 10) — that returns UTC dates, which
 * drift by a day for users in western timezones during evenings.
 */
export function localDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
