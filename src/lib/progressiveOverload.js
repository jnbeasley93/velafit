import { supabase } from './supabase';
import { localDateStr } from './dates';

// Fetch last N sessions of exercise logs for a user
export async function getExerciseHistory(userId, exerciseId, limit = 5) {
  const { data } = await supabase
    .from('exercise_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .order('date', { ascending: false })
    .limit(limit);
  return data || [];
}

// Get all exercise preferences for a user (removed/build_up exercises)
export async function getExercisePreferences(userId) {
  const { data } = await supabase
    .from('exercise_preferences')
    .select('*')
    .eq('user_id', userId);
  return data || [];
}

// Save or update an exercise preference
export async function setExercisePreference(userId, exerciseId, exerciseName, status) {
  const { error } = await supabase
    .from('exercise_preferences')
    .upsert({
      user_id: userId,
      exercise_id: exerciseId,
      exercise_name: exerciseName,
      status,
    }, { onConflict: 'user_id,exercise_id' });
  return error;
}

// Analyze recent sessions and return a progression suggestion
// Returns null if not enough data, otherwise returns suggestion object
export function analyzeProgression(history) {
  // Need at least 3 sessions with intensity_feel ratings
  const rated = history.filter(h => h.intensity_feel !== null && h.intensity_feel !== undefined);
  if (rated.length < 3) return null;

  const recent = rated.slice(0, 5); // last 5 rated sessions
  const avgFeel = recent.reduce((sum, h) => sum + h.intensity_feel, 0) / recent.length;
  const lastLog = history[0]; // most recent session

  if (avgFeel < 3) {
    // Too easy — suggest increase
    const newWeight = lastLog.weight_lbs ? lastLog.weight_lbs + 5 : null;
    const newReps = lastLog.reps ? lastLog.reps + 1 : null;
    return {
      type: 'increase',
      message: 'This feels easy for you. Time to level up.',
      suggestion: newWeight
        ? `Try ${newWeight}lbs next session`
        : newReps
        ? `Try ${newReps} reps next session`
        : 'Increase the challenge next session',
      avgFeel: avgFeel.toFixed(1),
    };
  } else if (avgFeel > 3.5) {
    // Too hard — suggest decrease or maintain
    return {
      type: 'maintain',
      message: 'This is challenging you well. Stay here.',
      suggestion: 'Keep the same weight and reps',
      avgFeel: avgFeel.toFixed(1),
    };
  } else {
    // Just right — maintain
    return {
      type: 'maintain',
      message: 'Perfect challenge level. Stay consistent.',
      suggestion: 'Keep the same weight and reps',
      avgFeel: avgFeel.toFixed(1),
    };
  }
}
