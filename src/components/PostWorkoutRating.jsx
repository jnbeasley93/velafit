import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { localDateStr } from '../lib/dates';
import styles from './PostWorkoutRating.module.css';

const INTENSITY_OPTIONS = ['Too easy', 'Just right', 'Too hard'];
const COMPLETION_OPTIONS = ['Yes', 'Mostly', 'No — ran out of time'];
const FEELING_OPTIONS = ['Great', 'Good', 'Tired', 'Drained'];

export default function PostWorkoutRating({ open, onClose, sessionLength, isImpromptu, exercisesCompleted, journalEntry }) {
  const { user, profile, refreshProfile } = useAuth();
  const [intensity, setIntensity] = useState('');
  const [completion, setCompletion] = useState('');
  const [feeling, setFeeling] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
