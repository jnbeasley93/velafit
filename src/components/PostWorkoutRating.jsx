import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { localDateStr } from '../lib/dates';
import { sendTag } from '../lib/oneSignal';
import styles from './PostWorkoutRating.module.css';

const INTENSITY_OPTIONS = ['Too easy', 'Just right', 'Too hard'];
const COMPLETION_OPTIONS = ['Yes', 'Mostly', 'No — ran out of time'];
const FEELING_OPTIONS = ['Great', 'Good', 'Tired', 'Drained'];

export default function PostWorkoutRating({ open, onClose, sessionLength, isImpromptu, exercisesCompleted, exerciseObjects, sessionId, journalEntry }) {
  const { user, profile, refreshProfile } = useAuth();
  const [intensity, setIntensity] = useState('');
  const [completion, setCompletion] = useState('');
  const [feeling, setFeeling] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Exercise logging section
  const [exLogOpen, setExLogOpen] = useState(false);
  const [exLogData, setExLogData] = useState({}); // { [exerciseId]: { reps, weight, feel } }
  const [alreadyLogged, setAlreadyLogged] = useState(new Set());
  const [exLogSaving, setExLogSaving] = useState(false);
  const [exLogSaved, setExLogSaved] = useState(false);

  // Check which exercises were already logged during the session
  useEffect(() => {
    if (!open || !user || !sessionId || !exerciseObjects?.length) return;
    (async () => {
      const { data } = await supabase
        .from('exercise_logs')
        .select('exercise_id')
        .eq('user_id', user.id)
        .eq('session_id', sessionId);
      if (data) setAlreadyLogged(new Set(data.map((d) => d.exercise_id)));
    })();
  }, [open, user, sessionId, exerciseObjects]);

  const handleSaveExerciseLogs = useCallback(async () => {
    if (!user) return;
    setExLogSaving(true);
    const rows = [];
    for (const [exId, vals] of Object.entries(exLogData)) {
      if (!vals.reps && !vals.weight) continue;
      const ex = exerciseObjects?.find((e) => e.id === exId);
      rows.push({
        user_id: user.id,
        exercise_id: exId,
        exercise_name: ex?.name || exId,
        session_id: sessionId || null,
        date: localDateStr(),
        sets: 1,
        reps: parseInt(vals.reps) || 0,
        weight_lbs: parseFloat(vals.weight) || 0,
        intensity_feel: vals.feel || null,
      });
    }
    if (rows.length > 0) {
      const { error: err } = await supabase.from('exercise_logs').insert(rows);
      if (err) console.error('[PostWorkoutRating] exercise log save failed:', err);
    }
    setExLogSaving(false);
    setExLogSaved(true);
  }, [user, exLogData, exerciseObjects, sessionId]);

  const canSubmit = intensity && completion && feeling;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !user) return;
    setSaving(true);
    setError('');

    const payload = {
      user_id: user.id,
      date: localDateStr(),
      session_length: sessionLength || 30,
      intensity_rating: intensity,
      completion_rating: completion,
      feeling_rating: feeling,
      is_impromptu: isImpromptu || false,
      exercises_completed: exercisesCompleted || [],
      journal_entry: journalEntry || null,
    };

    console.log('[PostWorkoutRating] attempting insert:', payload);

    try {
      // Save workout log — MUST destructure { error } since Supabase doesn't throw on DB errors
      const { data: insertData, error: insertError } = await supabase
        .from('workout_logs')
        .insert(payload)
        .select();

      if (insertError) {
        console.error('[PostWorkoutRating] Supabase insert error:', insertError);
        setError(`Save failed: ${insertError.message}`);
        setSaving(false);
        return;
      }

      console.log('[PostWorkoutRating] insert success:', insertData);

      // OneSignal tags — notification scheduling uses these
      const totalSessions = (profile?.total_sessions || 0) + 1;
      sendTag('last_session', localDateStr());
      sendTag('total_sessions', String(totalSessions));
      sendTag('session_completed_today', 'true');

      // Auto-adjust intensity level based on recent ratings
      const { data: recentLogs, error: fetchError } = await supabase
        .from('workout_logs')
        .select('intensity_rating')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(2);

      if (fetchError) {
        console.warn('[PostWorkoutRating] recent logs fetch failed:', fetchError);
      } else if (recentLogs && recentLogs.length >= 2) {
        const currentLevel = profile?.intensity_level ?? 2;
        const lastTwo = recentLogs.map((l) => l.intensity_rating);

        if (lastTwo.every((r) => r === 'Too easy') && currentLevel < 5) {
          await supabase
            .from('profiles')
            .update({ intensity_level: currentLevel + 1 })
            .eq('id', user.id);
        } else if (lastTwo.every((r) => r === 'Too hard') && currentLevel > 1) {
          await supabase
            .from('profiles')
            .update({ intensity_level: currentLevel - 1 })
            .eq('id', user.id);
        }
      }

      await refreshProfile();
      onClose();
    } catch (err) {
      console.error('[PostWorkoutRating] unexpected error:', err);
      setError(`Unexpected error: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  }, [canSubmit, user, profile, intensity, completion, feeling, sessionLength, isImpromptu, exercisesCompleted, journalEntry, refreshProfile, onClose]);

  const handleSkip = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!open) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>How did it go?</h2>
          <p>Quick check-in — this helps Vela adjust your plan.</p>
        </div>

        <div className={styles.body}>
          {error && (
            <p style={{
              padding: '0.6rem 0.8rem',
              background: 'rgba(201, 168, 76, 0.15)',
              color: '#c9a84c',
              fontSize: '0.78rem',
              borderRadius: '2px',
              marginBottom: '1rem',
              fontWeight: 500,
            }}>
              {error}
            </p>
          )}
          <div className={styles.question}>
            <label className={styles.questionLabel}>
              How was the intensity?
            </label>
            <div className={styles.optionRow}>
              {INTENSITY_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  className={
                    intensity === opt ? styles.chipSelected : styles.chip
                  }
                  onClick={() => setIntensity(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.question}>
            <label className={styles.questionLabel}>
              Did you complete the full session?
            </label>
            <div className={styles.optionRow}>
              {COMPLETION_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  className={
                    completion === opt ? styles.chipSelected : styles.chip
                  }
                  onClick={() => setCompletion(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.question}>
            <label className={styles.questionLabel}>How do you feel?</label>
            <div className={styles.optionRow}>
              {FEELING_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  className={
                    feeling === opt ? styles.chipSelected : styles.chip
                  }
                  onClick={() => setFeeling(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {exerciseObjects?.length > 0 && (
          <div style={{ padding: '0 2rem 1rem' }}>
            <button
              onClick={() => setExLogOpen((v) => !v)}
              style={{
                background: 'none',
                border: 'none',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--green-accent)',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {exLogOpen ? '▾ Hide exercise details' : '▸ Log exercise details (optional)'}
            </button>

            {exLogOpen && (
              <div style={{ marginTop: '0.75rem' }}>
                {exerciseObjects.map((ex) => {
                  const logged = alreadyLogged.has(ex.id);
                  const vals = exLogData[ex.id] || {};
                  return (
                    <div
                      key={ex.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.6rem',
                        opacity: logged ? 0.5 : 1,
                      }}
                    >
                      <span style={{ flex: 1, fontSize: '0.78rem', color: 'var(--charcoal)', fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {logged ? `${ex.name} ✓` : ex.name}
                      </span>
                      {!logged && (
                        <>
                          <input
                            type="number"
                            placeholder="reps"
                            min={0}
                            value={vals.reps || ''}
                            onChange={(e) => setExLogData((d) => ({ ...d, [ex.id]: { ...d[ex.id], reps: e.target.value } }))}
                            style={{ width: 52, padding: '0.3rem 0.4rem', border: '1px solid rgba(74,140,92,0.15)', borderRadius: 2, fontSize: '0.78rem', fontFamily: "'DM Sans',sans-serif" }}
                          />
                          <input
                            type="number"
                            placeholder="lbs"
                            min={0}
                            value={vals.weight || ''}
                            onChange={(e) => setExLogData((d) => ({ ...d, [ex.id]: { ...d[ex.id], weight: e.target.value } }))}
                            style={{ width: 52, padding: '0.3rem 0.4rem', border: '1px solid rgba(74,140,92,0.15)', borderRadius: 2, fontSize: '0.78rem', fontFamily: "'DM Sans',sans-serif" }}
                          />
                          <select
                            value={vals.feel || ''}
                            onChange={(e) => setExLogData((d) => ({ ...d, [ex.id]: { ...d[ex.id], feel: e.target.value ? parseInt(e.target.value) : null } }))}
                            style={{ width: 48, padding: '0.3rem 0.2rem', border: '1px solid rgba(74,140,92,0.15)', borderRadius: 2, fontSize: '0.72rem', fontFamily: "'DM Sans',sans-serif" }}
                          >
                            <option value="">feel</option>
                            {[1,2,3,4,5].map((n) => (
                              <option key={n} value={n}>{n}/5</option>
                            ))}
                          </select>
                        </>
                      )}
                    </div>
                  );
                })}
                {!exLogSaved ? (
                  <button
                    onClick={handleSaveExerciseLogs}
                    disabled={exLogSaving}
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.5rem 1rem',
                      background: 'var(--green-deep)',
                      color: 'var(--cream)',
                      border: 'none',
                      borderRadius: 2,
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {exLogSaving ? 'Saving...' : 'Save exercise logs \u2192'}
                  </button>
                ) : (
                  <p style={{ fontSize: '0.78rem', color: 'var(--green-accent)', fontWeight: 600, marginTop: '0.5rem' }}>
                    Exercise logs saved &#10003;
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className={styles.footer}>
          <button className={styles.btnSkip} onClick={handleSkip}>
            Skip
          </button>
          <button
            className={styles.btnSubmit}
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
          >
            {saving ? 'Saving...' : 'Submit →'}
          </button>
        </div>
      </div>
    </div>
  );
}
