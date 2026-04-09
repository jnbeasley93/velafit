import { getExercisesForProfile } from '../data/workouts';

/**
 * Time breakdown: given total session minutes and mind-game preference,
 * returns how many minutes go to workout, journal, and mind game.
 */
function getTimeBreakdown(totalMins, noMindGames) {
  if (totalMins <= 15) {
    if (noMindGames) return { workout: 15, journal: 0, mindGame: 0 };
    return { workout: 10, journal: 0, mindGame: 5 };
  }
  if (totalMins <= 30) {
    if (noMindGames) return { workout: 25, journal: 5, mindGame: 0 };
    return { workout: 20, journal: 7, mindGame: 3 };
  }
  if (totalMins <= 45) {
    if (noMindGames) return { workout: 35, journal: 10, mindGame: 0 };
    return { workout: 30, journal: 10, mindGame: 5 };
  }
  // 60+
  if (noMindGames) return { workout: 45, journal: 15, mindGame: 0 };
  return { workout: 40, journal: 12, mindGame: 8 };
}

/**
 * Estimate how many minutes an exercise takes based on its sets string.
 * Rough heuristic: parse the set/rep count and add rest time.
 * e.g. "3x10" → 3 sets × ~1.2min per set (work + rest) ≈ 3.6 min
 */
function estimateExerciseMinutes(exercise, intensityLevel) {
  const setsStr = exercise.sets?.[intensityLevel] || exercise.sets?.[2] || '3x10';
  const match = setsStr.match(/(\d+)x/);
  const numSets = match ? parseInt(match[1], 10) : 3;
  const restMins = (exercise.restSeconds || 60) / 60;
  // ~40s work per set + rest
  return numSets * (0.67 + restMins);
}

/**
 * Build a workout session from the user's fitness profile.
 *
 * @param {Object} fitnessProfile - User's fitness_profile from Supabase
 * @param {number} sessionMins    - Total session length in minutes
 * @param {boolean} noMindGames   - Whether user opted out of mind games
 * @param {number} [intensityLevel=2] - User's current intensity level (1-5)
 * @returns {{ warmup: Array, main: Array, cooldown: Array, breakdown: Object }}
 */
export function buildSession(fitnessProfile, sessionMins, noMindGames, intensityLevel = 2) {
  const breakdown = getTimeBreakdown(sessionMins, noMindGames);
  const workoutMins = breakdown.workout;

  // ── Warmup (5 min max, 2-3 exercises) ──
  // Always: 1 light cardio + 1-2 mobility/core
  const warmupCardio = getExercisesForProfile(fitnessProfile, 'cardio', 1, intensityLevel);
  const warmupMobility = getExercisesForProfile(fitnessProfile, 'core', 1, intensityLevel);
  // For 30+ min sessions, add one more warm-up
  const extraWarmup = workoutMins >= 25
    ? getExercisesForProfile(fitnessProfile, 'legs', 1, Math.min(intensityLevel, 2))
    : [];
  const warmup = [...warmupCardio, ...warmupMobility, ...extraWarmup];

  // Deduct warmup time (~5 min)
  const warmupTime = 5;

  // ── Cooldown (always 2 stretches — use core/legs at low difficulty) ──
  const cooldownPool = getExercisesForProfile(fitnessProfile, 'core', 2, 2);
  const cooldown = cooldownPool.slice(0, 2);
  const cooldownTime = 3;

  // ── Main block: fill remaining workout minutes ──
  const mainMins = Math.max(workoutMins - warmupTime - cooldownTime, 5);

  // Distribute across categories for balance (push, pull, legs, shoulders/arms)
  const categories = ['push', 'pull', 'legs', 'push', 'pull', 'legs', 'shoulders', 'arms', 'core'];
  const mainExercises = [];
  let usedIds = new Set([
    ...warmup.map((e) => e.id),
    ...cooldown.map((e) => e.id),
  ]);
  let remainingMins = mainMins;
  let catIndex = 0;

  while (remainingMins > 0 && catIndex < 20) {
    const category = categories[catIndex % categories.length];
    const candidates = getExercisesForProfile(fitnessProfile, category, 5, intensityLevel)
      .filter((e) => !usedIds.has(e.id));

    if (candidates.length > 0) {
      const ex = candidates[0];
      const exTime = estimateExerciseMinutes(ex, intensityLevel);
      if (remainingMins - exTime < -2) {
        // Would go too far over — skip this category
        catIndex++;
        continue;
      }
      mainExercises.push(ex);
      usedIds.add(ex.id);
      remainingMins -= exTime;
    }
    catIndex++;
  }

  return {
    warmup,
    main: mainExercises,
    cooldown,
    breakdown,
  };
}
