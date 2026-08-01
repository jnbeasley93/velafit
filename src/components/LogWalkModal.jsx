import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { localDateStr } from '../lib/dates';
import styles from './LogWalkModal.module.css';

// A walk is bonus movement: it always counts toward the streak, but it is
// never a substitute for a planned session. That's why this writes ONLY to
// activity_logs (which feeds streak/active-day math) and never touches
// workout_logs (which is what marks sessions done and fills the weekly count).
const CELEBRATIONS = [
  'A walk counts. It always counts.',
  'Twenty minutes in the sun beats zero minutes of the perfect plan.',
  'Extra credit! No notes.',
  'Hopping around outside is basically my entire philosophy.',
];

export default function LogWalkModal({ open, onClose, onSaved }) {
  const { user } = useAuth();
  const [minutes, setMinutes] = useState('');
  const [distance, setDistance] = useState('');
  const [saving, setSaving] = useState(false);
  const [celebration, setCelebration] = useState(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setMinutes('');
      setDistance('');
      setSaving(false);
      setCelebration(null);
    }
  }, [open]);

  const mins = parseInt(minutes, 10);
  const canSubmit = Number.isFinite(mins) && mins > 0;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !user || saving) return;
    setSaving(true);
    const { error } = await supabase.from('activity_logs').insert({
      user_id: user.id,
      date: localDateStr(),
      activity_type: 'Walk',
      duration_mins: mins,
      notes: distance.trim() || null,
    });
    if (error) {
      console.error('[LogWalkModal] save failed:', error);
      setSaving(false);
      return;
    }
    setCelebration(
      CELEBRATIONS[Math.floor(Math.random() * CELEBRATIONS.length)],
    );
    onSaved?.();
    setTimeout(() => onClose(), 2200);
  }, [canSubmit, user, saving, mins, distance, onSaved, onClose]);

  if (!open) return null;

  if (celebration) {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.header}>
            <h2>Log a Walk</h2>
          </div>
          <div className={styles.successState}>
            <div className={styles.successEmoji}>🐸</div>
            <p className={styles.successText}>{celebration}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Log a Walk</h2>
          <p className={styles.velaLine}>
            Bonus movement. It counts — it always counts.
          </p>
        </div>

        <div className={styles.body}>
          <label className={styles.label}>How many minutes?</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className={styles.input}
            placeholder="e.g. 20"
            value={minutes}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))}
          />

          <label className={styles.label}>Distance (optional)</label>
          <input
            type="text"
            className={styles.input}
            placeholder="e.g. 1.5 mi or 2k"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
          />
        </div>

        <div className={styles.footer}>
          <button className={styles.btnCancel} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.btnSubmit}
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
          >
            {saving ? 'Saving...' : 'Log It →'}
          </button>
        </div>
      </div>
    </div>
  );
}
