import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { localDateStr } from '../lib/dates';
import styles from './LogActivityModal.module.css';

const ACTIVITIES = [
  { emoji: '🏃', label: 'Walking/Running' },
  { emoji: '🏋️', label: 'Workout' },
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

const BACKDATE_DAYS = 10;

const feelingToIntensity = (f) => {
  if (f === 'Great') return 'Just right';
  if (f === 'Good') return 'Just right';
  if (f === 'Okay') return 'Too easy';
  return 'Too easy';
};

const feelingToCompletion = (f) => {
  if (f === 'Great') return 'Yes';
  if (f === 'Good') return 'Yes';
  if (f === 'Okay') return 'Mostly';
  return 'Mostly';
};

const feelingToFeeling = (f) => {
  if (f === 'Great') return 'Great';
  if (f === 'Good') return 'Good';
  if (f === 'Okay') return 'Okay';
  return 'Okay';
};

export default function LogActivityModal({ open, onClose }) {
  const { user } = useAuth();
  const [selectedActivity, setSelectedActivity] = useState('');
  const [customActivity, setCustomActivity] = useState('');
  const [duration, setDuration] = useState(null);
  const [feeling, setFeeling] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState(localDateStr());
  const [exercises, setExercises] = useState([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const today = localDateStr();
  const minDate = localDateStr(
    new Date(Date.now() - BACKDATE_DAYS * 24 * 60 * 60 * 1000),
  );

  const activityType = customActivity.trim() || selectedActivity;
  const canSubmit = activityType && duration;
  const showExercises = selectedActivity === 'Workout';

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSelectedActivity('');
      setCustomActivity('');
      setDuration(null);
      setFeeling('');
      setNotes('');
      setSelectedDate(localDateStr());
      setExercises([]);
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

  const addExercise = useCallback(() => {
    setExercises((prev) => [...prev, { name: '', sets: '', reps: '', weight: '' }]);
  }, []);

  const updateExercise = useCallback((index, field, value) => {
    setExercises((prev) =>
      prev.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex)),
    );
  }, []);

  const removeExercise = useCallback((index) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !user) return;
    setSaving(true);
    try {
      const exercisesPayload = exercises.length > 0 ? exercises : null;

      await supabase.from('activity_logs').insert({
        user_id: user.id,
        date: selectedDate,
        activity_type: activityType,
        duration_mins: duration,
        feeling: feeling || null,
        notes: notes.trim() || null,
        exercises_completed: exercisesPayload,
      });

      await supabase.from('workout_logs').insert({
        user_id: user.id,
        date: selectedDate,
        session_length: duration,
        intensity_rating: feelingToIntensity(feeling),
        completion_rating: feelingToCompletion(feeling),
        feeling_rating: feelingToFeeling(feeling),
        is_impromptu: true,
        exercises_completed: exercisesPayload,
        journal_entry: notes.trim() || null,
      });

      setSuccess(true);
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      console.error('Failed to log activity:', err);
      setSaving(false);
    }
  }, [canSubmit, user, selectedDate, activityType, duration, feeling, notes, exercises, onClose]);

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
          <label className={styles.label}>When did this happen?</label>
          <input
            type="date"
            className={styles.dateInput}
            value={selectedDate}
            min={minDate}
            max={today}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <p className={styles.dateHint}>
            You can log activities up to {BACKDATE_DAYS} days back
          </p>

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

          {showExercises && (
            <div className={styles.exerciseSection}>
              <div className={styles.exerciseHeader}>
                <label className={styles.label}>Exercises</label>
                <button
                  type="button"
                  className={styles.addExerciseBtn}
                  onClick={addExercise}
                >
                  + Add Exercise
                </button>
              </div>
              {exercises.length === 0 ? (
                <p className={styles.exerciseEmpty}>
                  Tap “Add Exercise” to log what you did.
                </p>
              ) : (
                <div className={styles.exerciseList}>
                  {exercises.map((ex, i) => (
                    <div key={i} className={styles.exerciseRow}>
                      <div className={styles.exerciseRowTop}>
                        <input
                          type="text"
                          className={styles.exerciseName}
                          placeholder="e.g. Kettlebell Swings"
                          value={ex.name}
                          onChange={(e) => updateExercise(i, 'name', e.target.value)}
                        />
                        <button
                          type="button"
                          className={styles.exerciseRemove}
                          onClick={() => removeExercise(i)}
                          aria-label="Remove exercise"
                        >
                          ×
                        </button>
                      </div>
                      <div className={styles.exerciseFields}>
                        <input
                          type="number"
                          className={styles.exerciseNum}
                          placeholder="Sets"
                          min={0}
                          value={ex.sets}
                          onChange={(e) => updateExercise(i, 'sets', e.target.value)}
                        />
                        <input
                          type="number"
                          className={styles.exerciseNum}
                          placeholder="Reps"
                          min={0}
                          value={ex.reps}
                          onChange={(e) => updateExercise(i, 'reps', e.target.value)}
                        />
                        <input
                          type="number"
                          className={styles.exerciseNum}
                          placeholder="lbs (optional)"
                          min={0}
                          value={ex.weight}
                          onChange={(e) => updateExercise(i, 'weight', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <label className={styles.label}>Notes (optional)</label>
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
