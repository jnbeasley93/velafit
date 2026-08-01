// Per-day workout settings, derived from the user's equipment inventory.
// Setting keys are stored on the plan as plan.daySettings[day]; a missing
// map or key means "full inventory", so pre-feature plans keep today's
// behavior unchanged.

// Legacy profiles (pre-multi-select) store equipment as a single string.
export function toEquipmentList(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

export const SETTING_LABELS = {
  gym: 'Gym',
  home: 'Home — equipment',
  bodyweight: 'Bodyweight only',
};

/**
 * Settings this inventory supports, ordered fullest first — index 0 is the
 * default, so skipping the per-day control never changes what a day uses.
 * Bodyweight-only inventories collapse to a single option (no UI rendered).
 */
export function availableSettings(equipment) {
  const list = toEquipmentList(equipment);
  const settings = [];
  if (list.includes('Commercial gym access')) settings.push('gym');
  if (list.some((e) => e && e !== 'None — bodyweight only' && e !== 'Commercial gym access')) {
    settings.push('home');
  }
  settings.push('bodyweight');
  return settings;
}

/**
 * The equipment labels a session should draw from for a given day setting.
 * Tolerates settings the current inventory no longer supports (e.g. a "gym"
 * day saved before the user removed gym access) by falling back sensibly.
 */
export function equipmentForSetting(equipment, setting) {
  const list = toEquipmentList(equipment);
  if (!setting || setting === 'gym') return list;
  if (setting === 'bodyweight') return ['None — bodyweight only'];
  const home = list.filter((e) => e !== 'Commercial gym access');
  return home.length ? home : ['None — bodyweight only'];
}
