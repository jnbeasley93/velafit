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

export default function ExerciseLogModal({ open, onClose, exercise, userId, sessionId, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [suggestion, setSuggestion] = useState(null);

  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
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
        if (last.sets) setSets(last.sets);
        if (last.reps) setReps(last.reps);
        if (last.weight_lbs) setWeight(String(last.weight_lbs));
      }
      setLoading(false);
    })();
  }, [open, exercise, userId]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSets(3);
      setReps(10);
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
      sets,
      reps,
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
                    type="number"
                    min={1}
                    max={10}
                    value={sets}
                    onChange={(e) => setSets(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Reps</label>
                  <input
                    className={styles.fieldInput}
                    type="number"
                    min={1}
                    max={100}
                    value={reps}
                    onChange={(e) => setReps(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                  />
                </div>
                {!isBodyweightOnly && (
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Weight (lbs)</label>
                    <input
                      className={styles.fieldInput}
                      type="number"
                      min={0}
                      placeholder="0 = bodyweight"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
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
