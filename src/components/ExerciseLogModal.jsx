import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { localDateStr } from '../lib/dates';
import {
  getExerciseHistory,
  analyzeProgression,
  setExercisePreference,
} from '../lib/progressiveOverload';
import styles from './ExerciseLogModal.module.css';

const FEEL_LABELS = ['1 Easy', '2', '3', '4', '5 Max'];

const DEFAULT_SETS = 3;
const DEFAULT_REPS = 10;

// Field state stays a string while editing (so it can be empty);
// clamp to a valid number on blur/save.
const clampInt = (value, min, max, fallback) => {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
};

export default function ExerciseLogModal({ open, onClose, exercise, userId, sessionId, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [suggestion, setSuggestion] = useState(null);

  const [sets, setSets] = useState(String(DEFAULT_SETS));
  const [reps, setReps] = useState(String(DEFAULT_REPS));
  const [weight, setWeight] = useState('');
  const [feel, setFeel] = useState(null);
  const [saving, setSaving] = useState(false);

  const [showNotDoable, setShowNotDoable] = useState(false);
  const [buildUpNote, setBuildUpNote] = useState('');

  const isBodyweightOnly = exercise?.equipment?.length === 1 && exercise.equipment[0] === 'none';

  // Fetch history when modal opens
  useEffect(() => {
    if (!open || !exercise || !userId) return;
    setLoading(true);
    setShowNotDoable(false);
    setBuildUpNote('');
    (async () => {
      const hist = await getExerciseHistory(userId, exercise.id);
      setHistory(hist);
      setSuggestion(analyzeProgression(hist));
      // Pre-fill from last session
      if (hist.length > 0) {
        const last = hist[0];
        if (last.sets) setSets(String(last.sets));
        if (last.reps) setReps(String(last.reps));
        if (last.weight_lbs) setWeight(String(last.weight_lbs));
      }
      setLoading(false);
    })();
  }, [open, exercise, userId]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSets(String(DEFAULT_SETS));
      setReps(String(DEFAULT_REPS));
      setWeight('');
      setFeel(null);
      setSaving(false);
    }
  }, [open]);

  const lastSession = history.length > 0 ? history[0] : null;

  const handleLog = useCallback(async () => {
    if (!exercise || !userId) return;
    setSaving(true);
    const { error } = await supabase.from('exercise_logs').insert({
      user_id: userId,
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      session_id: sessionId || null,
      date: localDateStr(),
      sets: clampInt(sets, 1, 10, DEFAULT_SETS),
      reps: clampInt(reps, 1, 100, DEFAULT_REPS),
      weight_lbs: isBodyweightOnly ? 0 : (parseFloat(weight) || 0),
      intensity_feel: feel,
    });
    if (error) console.error('[ExerciseLogModal] save failed:', error);
    setSaving(false);
    onSaved?.();
    onClose();
  }, [exercise, userId, sessionId, sets, reps, weight, feel, isBodyweightOnly, onSaved, onClose]);

  const handleRemove = useCallback(async () => {
    if (!exercise || !userId) return;
    await setExercisePreference(userId, exercise.id, exercise.name, 'removed');
    onClose();
  }, [exercise, userId, onClose]);

  const handleBuildUp = useCallback(async () => {
    if (!exercise || !userId) return;
    await setExercisePreference(userId, exercise.id, exercise.name, 'build_up');
    setBuildUpNote("We'll suggest a scaled version next session");
    setTimeout(() => onClose(), 1500);
  }, [exercise, userId, onClose]);

  if (!open || !exercise) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>{exercise.name}</h2>
          {lastSession && !loading && (
            <p className={styles.prevSession}>
              Last time: {lastSession.sets}&times;{lastSession.reps}
              {lastSession.weight_lbs > 0 ? ` @ ${lastSession.weight_lbs}lbs` : ''}
              {lastSession.intensity_feel != null ? ` — Felt: ${lastSession.intensity_feel}/5` : ''}
            </p>
          )}
        </div>

        <div className={styles.body}>
          {loading ? (
            <p className={styles.loading}>Loading...</p>
          ) : (
            <>
              {suggestion && (
                <div className={styles.suggestionCard}>
                  <p className={styles.suggestionMsg}>{suggestion.message}</p>
                  <p className={styles.suggestionDetail}>{suggestion.suggestion}</p>
                </div>
              )}

              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Sets</label>
                  <input
                    className={styles.fieldInput}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={sets}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setSets(e.target.value.replace(/\D/g, ''))}
                    onBlur={() => setSets(String(clampInt(sets, 1, 10, DEFAULT_SETS)))}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Reps</label>
                  <input
                    className={styles.fieldInput}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={reps}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setReps(e.target.value.replace(/\D/g, ''))}
                    onBlur={() => setReps(String(clampInt(reps, 1, 100, DEFAULT_REPS)))}
                  />
                </div>
                {!isBodyweightOnly && (
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Weight (lbs)</label>
                    <input
                      className={styles.fieldInput}
                      type="text"
                      inputMode="decimal"
                      placeholder="0 = bodyweight"
                      value={weight}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setWeight(e.target.value.replace(/[^0-9.]/g, ''))}
                    />
                  </div>
                )}
              </div>

              <label className={styles.fieldLabel}>Intensity Feel</label>
              <div className={styles.feelRow}>
                {FEEL_LABELS.map((label, i) => (
                  <button
                    key={i}
                    className={feel === i + 1 ? styles.feelBtnSelected : styles.feelBtn}
                    onClick={() => setFeel(i + 1)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {buildUpNote && (
                <p className={styles.buildUpNote}>{buildUpNote}</p>
              )}

              {!showNotDoable ? (
                <button
                  className={styles.notDoableLink}
                  onClick={() => setShowNotDoable(true)}
                >
                  Not doable
                </button>
              ) : (
                <div className={styles.notDoableConfirm}>
                  <p className={styles.notDoableText}>
                    Mark this exercise as not doable? We can either remove it from your
                    program or help you build up to it.
                  </p>
                  <div className={styles.notDoableActions}>
                    <button className={styles.notDoableBtn} onClick={handleRemove}>
                      Remove it
                    </button>
                    <button className={styles.notDoableBtn} onClick={handleBuildUp}>
                      Build up to it
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {!loading && (
          <div className={styles.footer}>
            <button
              className={styles.btnLog}
              onClick={handleLog}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Log this set \u2192'}
            </button>
            <button className={styles.btnSkip} onClick={onClose}>
              Skip \u2192
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
