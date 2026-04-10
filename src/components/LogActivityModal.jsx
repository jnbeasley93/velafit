import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { localDateStr } from '../lib/dates';
import styles from './LogActivityModal.module.css';

const ACTIVITIES = [
  { emoji: '🚶', label: 'Walking' },
  { emoji: '🏃', label: 'Running' },
  { emoji: '🚴', label: 'Cycling' },
  { emoji: '🏊', label: 'Swimming' },
  { emoji: '🌿', label: 'Yard Work' },
  { emoji: '👶', label: 'Playing with Kids' },
  { emoji: '⚽', label: 'Outdoor Sports' },
  { emoji: '🧘', label: 'Yoga / Stretching' },
];

const DURATIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
  { value: 90, label: '90 min' },
  { value: 120, label: '2+ hrs' },
];

const FEELINGS = ['Great', 'Good', 'Tired', 'Tough'];

export default function LogActivityModal({ open, onClose }) {
  const { user } = useAuth();
  const [selectedActivity, setSelectedActivity] = useState('');
  const [customActivity, setCustomActivity] = useState('');
  const [duration, setDuration] = useState(null);
  const [feeling, setFeeling] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const activityType = customActivity.trim() || selectedActivity;
  const canSubmit = activityType && duration;

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSelectedActivity('');
      setCustomActivity('');
      setDuration(null);
      setFeeling('');
      setNotes('');
      setSaving(false);
      setSuccess(false);
    }
  }, [open]);

  const handleSelectActivity = useCallback((label) => {
    setSelectedActivity(label);
    setCustomActivity('');
  }, []);

  const handleCustomChange = useCallback((e) => {
    setCustomActivity(e.target.value);
    if (e.target.value.trim()) setSelectedActivity('');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !user) return;
    setSaving(true);
    try {
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        date: localDateStr(),
        activity_type: activityType,
        duration_mins: duration,
        feeling: feeling || null,
        notes: notes.trim() || null,
      });
      setSuccess(true);
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      console.error('Failed to log activity:', err);
      setSaving(false);
    }
  }, [canSubmit, user, activityType, duration, feeling, notes, onClose]);

  if (!open) return null;

  if (success) {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.header}>
            <h2>Log Activity</h2>
          </div>
          <div className={styles.successState}>
            <div className={styles.successEmoji}>🐸</div>
            <p className={styles.successText}>Logged. That counts.</p>
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
          <h2>Log Activity</h2>
          <p className={styles.velaLine}>
            Life moves in more ways than one. Every active minute counts.
          </p>
        </div>

        <div className={styles.body}>
          <label className={styles.label}>What did you do?</label>
          <div className={styles.activityGrid}>
            {ACTIVITIES.map(({ emoji, label }) => (
              <button
                key={label}
                className={
                  selectedActivity === label
                    ? styles.activityChipSelected
                    : styles.activityChip
                }
                onClick={() => handleSelectActivity(label)}
              >
                <span className={styles.activityEmoji}>{emoji}</span>
                <span className={styles.activityLabel}>{label}</span>
              </button>
            ))}
          </div>

          <input
            type="text"
            className={styles.customInput}
            placeholder="Something else?"
            value={customActivity}
            onChange={handleCustomChange}
          />

          <label className={styles.label}>How long?</label>
          <div className={styles.durationRow}>
            {DURATIONS.map(({ value, label }) => (
              <button
                key={value}
                className={
                  duration === value ? styles.durChipSelected : styles.durChip
                }
                onClick={() => setDuration(value)}
              >
                {label}
              </button>
            ))}
          </div>

          <label className={styles.label}>How did it feel?</label>
          <div className={styles.feelingRow}>
            {FEELINGS.map((f) => (
              <button
                key={f}
                className={
                  feeling === f ? styles.feelChipSelected : styles.feelChip
                }
                onClick={() => setFeeling(f)}
              >
                {f}
              </button>
            ))}
          </div>

          <label className={styles.label}>Notes</label>
          <textarea
            className={styles.notesArea}
            placeholder="Any notes? (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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
