import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { localDateStr } from '../lib/dates';
import styles from './EditScheduleModal.module.css';

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME_OPTIONS = [
  { value: '15', label: '15 min — quick' },
  { value: '30', label: '30 min — focused' },
  { value: '45', label: '45 min — full' },
  { value: '60', label: '60 min — extended' },
  { value: '90', label: '90 min — programme' },
];

function getTimeBreakdown(totalMins, noMindGames) {
  const mins = parseInt(totalMins, 10);
  if (mins <= 15) {
    if (noMindGames) return { workout: 15, journal: 0, mindGame: 0 };
    return { workout: 10, journal: 0, mindGame: 5 };
  }
  if (mins <= 30) {
    if (noMindGames) return { workout: 25, journal: 5, mindGame: 0 };
    return { workout: 20, journal: 7, mindGame: 3 };
  }
  if (mins <= 45) {
    if (noMindGames) return { workout: 35, journal: 10, mindGame: 0 };
    return { workout: 30, journal: 10, mindGame: 5 };
  }
  if (noMindGames) return { workout: 45, journal: 15, mindGame: 0 };
  return { workout: 40, journal: 12, mindGame: 8 };
}

function BreakdownBar({ mins, noMindGames }) {
  const b = getTimeBreakdown(mins, noMindGames);
  const total = b.workout + b.journal + b.mindGame;
  return (
    <div className={styles.breakdownBar}>
      <div
        className={styles.breakdownWorkout}
        style={{ width: `${(b.workout / total) * 100}%` }}
      >
        {b.workout}m work
      </div>
      {b.journal > 0 && (
        <div
          className={styles.breakdownJournal}
          style={{ width: `${(b.journal / total) * 100}%` }}
        >
          {b.journal}m journal
        </div>
      )}
      {b.mindGame > 0 && (
        <div
          className={styles.breakdownMind}
          style={{ width: `${(b.mindGame / total) * 100}%` }}
        >
          {b.mindGame}m mind
        </div>
      )}
    </div>
  );
}

export default function EditScheduleModal({ open, onClose }) {
  const { user, userPlan, fitnessProfile, refreshPlan } = useAuth();
  const noMindGames = fitnessProfile?.mind_games?.includes('No mind games') ?? false;

  const [selectedDays, setSelectedDays] = useState([]);
  const [dayTimes, setDayTimes] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Pre-fill from existing plan whenever the modal opens
  useEffect(() => {
    if (open && userPlan?.days) {
      const days = Object.keys(userPlan.days);
      const times = {};
      for (const d of days) {
        times[d] = String(userPlan.days[d]);
      }
      setSelectedDays(days);
      setDayTimes(times);
      setError('');
      setSuccess(false);
    } else if (open) {
      setSelectedDays([]);
      setDayTimes({});
      setError('');
      setSuccess(false);
    }
  }, [open, userPlan]);

  const toggleDay = useCallback((day) => {
    setSelectedDays((prev) => {
      if (prev.includes(day)) {
        const next = prev.filter((d) => d !== day);
        setDayTimes((t) => {
          const copy = { ...t };
          delete copy[day];
          return copy;
        });
        return next;
      }
      setDayTimes((t) => ({ ...t, [day]: t[day] || '30' }));
      return [...prev, day];
    });
  }, []);

  const setDayTime = useCallback((day, value) => {
    setDayTimes((prev) => ({ ...prev, [day]: value }));
  }, []);

  const handleCopyAll = useCallback(() => {
    if (selectedDays.length < 2) return;
    const firstTime = dayTimes[selectedDays[0]] || '30';
    const copy = {};
    for (const d of selectedDays) copy[d] = firstTime;
    setDayTimes(copy);
  }, [selectedDays, dayTimes]);

  const handleSave = useCallback(async () => {
    if (selectedDays.length === 0) {
      setError('Select at least one training day.');
      return;
    }
    if (!user) return;
    setSaving(true);
    setError('');

    const days = {};
    for (const d of selectedDays) {
      days[d] = parseInt(dayTimes[d] || '30', 10);
    }
    const plan = {
      days,
      goal: userPlan?.goal || 'Build consistent habits',
      location: userPlan?.location || 'Home — no equipment',
      createdAt: userPlan?.createdAt || localDateStr(),
      updatedAt: localDateStr(),
    };

    const { error: saveError } = await supabase
      .from('user_plans')
      .upsert(
        { user_id: user.id, plan, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );

    if (saveError) {
      console.error('[EditScheduleModal] save failed:', saveError);
      setError(`Save failed: ${saveError.message}`);
      setSaving(false);
      return;
    }

    await refreshPlan?.();
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setSaving(false);
      onClose();
    }, 1500);
  }, [selectedDays, dayTimes, user, userPlan, refreshPlan, onClose]);

  if (!open) return null;

  if (success) {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.header}>
            <h2>Edit Your Schedule</h2>
          </div>
          <div className={styles.successState}>
            <div className={styles.successEmoji}>🐸</div>
            <p className={styles.successText}>Schedule updated.</p>
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
          <h2>Edit Your Schedule</h2>
          <p className={styles.velaLine}>Life shifts. Your plan should too.</p>
        </div>

        <div className={styles.body}>
          {error && <p className={styles.errorMsg}>{error}</p>}

          <label className={styles.label}>Training Days</label>
          <p className={styles.hint}>
            Tap to toggle. You can always tweak this again later.
          </p>
          <div className={styles.dayPicker}>
            {ALL_DAYS.map((d) => (
              <button
                key={d}
                className={
                  selectedDays.includes(d) ? styles.dayChipSelected : styles.dayChip
                }
                onClick={() => toggleDay(d)}
              >
                {d}
              </button>
            ))}
          </div>

          {selectedDays.length > 0 && (
            <>
              <label className={styles.label}>Time Per Day</label>
              <div className={styles.dayTimeList}>
                {selectedDays.map((d) => (
                  <div key={d}>
                    <div className={styles.dayTimeRow}>
                      <span className={styles.dayTimeLabel}>{d}</span>
                      <select
                        className={styles.dayTimeSelect}
                        value={dayTimes[d] || '30'}
                        onChange={(e) => setDayTime(d, e.target.value)}
                      >
                        {TIME_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <BreakdownBar
                      mins={dayTimes[d] || '30'}
                      noMindGames={noMindGames}
                    />
                  </div>
                ))}
              </div>

              {selectedDays.length >= 2 && (
                <button className={styles.copyAll} onClick={handleCopyAll}>
                  ↓ Copy {selectedDays[0]}'s time to all days
                </button>
              )}
            </>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.btnCancel} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.btnSave}
            onClick={handleSave}
            disabled={saving || selectedDays.length === 0}
          >
            {saving ? 'Saving...' : 'Save Schedule →'}
          </button>
        </div>
      </div>
    </div>
  );
}
