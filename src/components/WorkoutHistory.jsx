import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { localDateStr } from '../lib/dates';
import styles from './WorkoutHistory.module.css';

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function computeStats(workoutLogs, activityLogs) {
  const total = workoutLogs.length;

  // Current streak — count days with ANY entry
  const allDates = new Set([
    ...workoutLogs.map((l) => l.date),
    ...activityLogs.map((l) => l.date),
  ]);
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 365; i++) {
    const target = new Date(today);
    target.setDate(today.getDate() - i);
    const targetStr = localDateStr(target);
    if (allDates.has(targetStr)) {
      streak++;
    } else {
      break;
    }
  }

  // Most common feeling (from workouts)
  const feelings = {};
  for (const l of workoutLogs) {
    if (l.feeling_rating) {
      feelings[l.feeling_rating] = (feelings[l.feeling_rating] || 0) + 1;
    }
  }
  const topFeeling =
    Object.entries(feelings).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  return { total, streak, topFeeling };
}

const ACTIVITY_EMOJIS = {
  'Walking': '🚶',
  'Running': '🏃',
  'Walking/Running': '🏃',
  'Workout': '🏋️',
  'Cycling': '🚴',
  'Swimming': '🏊',
  'Yard Work': '🌿',
  'Playing with Kids': '👶',
  'Outdoor Sports': '⚽',
  'Yoga / Stretching': '🧘',
};

function ExercisesBlock({ exercises }) {
  if (!exercises || exercises.length === 0) {
    return (
      <div className={styles.exercisesList}>
        <p className={styles.exercisesLabel}>Exercises</p>
        <p className={styles.noExercises}>No exercises logged</p>
      </div>
    );
  }

  // Detect shape: array of strings (scripted) vs array of objects (logged workout)
  const firstObj = exercises.find((e) => e && typeof e === 'object');
  const isObjectShape = Boolean(firstObj);

  if (!isObjectShape) {
    return (
      <div className={styles.exercisesList}>
        <p className={styles.exercisesLabel}>Exercises</p>
        <ul className={styles.exerciseBullets}>
          {exercises.map((name, i) => (
            <li key={i}>{String(name)}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={styles.exercisesList}>
      <p className={styles.exercisesLabel}>Exercises</p>
      <div className={styles.exerciseTableWrap}>
        <table className={styles.exerciseTable}>
          <thead>
            <tr>
              <th>Exercise</th>
              <th>Sets</th>
              <th>Reps</th>
              <th>Weight</th>
            </tr>
          </thead>
          <tbody>
            {exercises.map((ex, i) => {
              if (typeof ex === 'string') {
                return (
                  <tr key={i}>
                    <td>{ex}</td>
                    <td>—</td>
                    <td>—</td>
                    <td>—</td>
                  </tr>
                );
              }
              return (
                <tr key={i}>
                  <td>{ex.name || '—'}</td>
                  <td>{ex.sets || '—'}</td>
                  <td>{ex.reps || '—'}</td>
                  <td>{ex.weight ? `${ex.weight} lbs` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SessionCard({ log, expanded, onToggle, onRepeat }) {
  const exercises = log.exercises_completed || [];
  const sessionType = log.is_impromptu ? 'Logged Activity' : 'Scripted Session';
  const badgeClass = log.is_impromptu
    ? styles.badgeImpromptu
    : styles.badgeScheduled;

  return (
    <div className={styles.card}>
      <button
        type="button"
        className={styles.cardHeaderBtn}
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <div className={styles.cardHeaderLeft}>
          <p className={styles.cardDate}>{formatDate(log.date)}</p>
          <p className={styles.cardLength}>
            {log.session_length} min
            {log.feeling_rating ? ` · ${log.feeling_rating}` : ''}
          </p>
        </div>
        <div className={styles.cardHeaderRight}>
          <span className={badgeClass}>{sessionType}</span>
          <span className={styles.chevron}>
            {expanded ? '▴ Hide details' : '▾ See details'}
          </span>
        </div>
      </button>

      {expanded && (
        <div className={styles.cardBody}>
          <ExercisesBlock exercises={exercises} />

          <div className={styles.ratingsRow}>
            {log.intensity_rating && (
              <span className={styles.ratingChip}>
                Intensity: {log.intensity_rating}
              </span>
            )}
            {log.completion_rating && (
              <span className={styles.ratingChip}>
                Completed: {log.completion_rating}
              </span>
            )}
            {log.feeling_rating && (
              <span className={styles.ratingChip}>
                Feeling: {log.feeling_rating}
              </span>
            )}
          </div>

          {log.journal_entry && (
            <blockquote className={styles.journalQuote}>
              {log.journal_entry}
            </blockquote>
          )}

          <div className={styles.cardActions}>
            <button
              type="button"
              className={styles.repeatBtn}
              onClick={onRepeat}
            >
              Repeat this session →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityCard({ log, expanded, onToggle, onRepeat }) {
  const emoji = ACTIVITY_EMOJIS[log.activity_type] || '🏃';
  const exercises = log.exercises_completed || [];

  return (
    <div className={styles.activityCard}>
      <button
        type="button"
        className={styles.cardHeaderBtn}
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <div className={styles.cardHeaderLeft}>
          <p className={styles.cardDate}>
            {emoji} {formatDate(log.date)}
          </p>
          <p className={styles.cardLength}>
            {log.activity_type}
            {log.duration_mins ? ` · ${log.duration_mins} min` : ''}
            {log.feeling ? ` · ${log.feeling}` : ''}
          </p>
        </div>
        <div className={styles.cardHeaderRight}>
          <span className={styles.badgeActivity}>Life Movement</span>
          <span className={styles.chevron}>
            {expanded ? '▴ Hide details' : '▾ See details'}
          </span>
        </div>
      </button>

      {expanded && (
        <div className={styles.cardBody}>
          {exercises.length > 0 && <ExercisesBlock exercises={exercises} />}
          {log.notes && (
            <blockquote className={styles.journalQuote}>
              {log.notes}
            </blockquote>
          )}
          {exercises.length === 0 && !log.notes && (
            <p className={styles.noExercises}>No additional details logged</p>
          )}

          <div className={styles.cardActions}>
            <button
              type="button"
              className={styles.repeatBtn}
              onClick={onRepeat}
            >
              Repeat this session →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorkoutHistory({ onRepeatLog }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [workoutLogs, setWorkoutLogs] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState(new Set());

  const toggleExpand = useCallback((id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const fetchLogs = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [workoutRes, activityRes] = await Promise.all([
      supabase
        .from('workout_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false }),
      supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false }),
    ]);
    // Dedupe: a Workout-type impromptu log dual-writes to both tables.
    // Drop the activity_logs row only when its date matches an impromptu
    // workout_logs row AND both are tagged activity_type === 'Workout',
    // so unrelated same-day activities (e.g. Cycling) aren't dropped.
    const workoutDates = new Set(
      (workoutRes.data ?? [])
        .filter((w) => w.is_impromptu && w.activity_type === 'Workout')
        .map((w) => w.date),
    );
    const dedupedActivityLogs = (activityRes.data ?? []).filter(
      (a) => !(workoutDates.has(a.date) && a.activity_type === 'Workout'),
    );

    setWorkoutLogs(workoutRes.data || []);
    setActivityLogs(dedupedActivityLogs);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const stats = computeStats(workoutLogs, activityLogs);

  // Merge and sort all entries chronologically
  const allEntries = [
    ...workoutLogs.map((l) => ({ ...l, _type: 'workout' })),
    ...activityLogs.map((l) => ({ ...l, _type: 'activity' })),
  ].sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));

  if (!user) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <Link to="/dashboard" className={styles.backLink}>← Back to dashboard</Link>
          <h1 className={styles.title}>Workout History</h1>
          <p className={styles.subtitle}>Please sign in to view your history.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link to="/dashboard" className={styles.backLink}>← Back to dashboard</Link>
        <h1 className={styles.title}>Workout History</h1>
        <p className={styles.subtitle}>Every session, tracked and reviewed.</p>

        <div className={styles.statsStrip}>
          <div className={styles.statBox}>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statLabel}>Sessions</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statValue}>{stats.streak}</div>
            <div className={styles.statLabel}>Day Streak</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statValue}>{stats.topFeeling}</div>
            <div className={styles.statLabel}>Top Feeling</div>
          </div>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--stone)', padding: '2rem' }}>
            Loading...
          </p>
        ) : allEntries.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🏋️</div>
            <p className={styles.emptyTitle}>No sessions yet</p>
            <p className={styles.emptySub}>
              Complete your first workout to see your history here.
            </p>
          </div>
        ) : (
          allEntries.map((entry, i) => {
            const id = `${entry._type}-${entry.id || i}`;
            const isExpanded = expandedIds.has(id);

            if (entry._type === 'workout') {
              const handleRepeat = () => {
                if (!entry.is_impromptu) {
                  navigate('/dashboard');
                  return;
                }
                onRepeatLog?.({
                  activity_type: entry.activity_type,
                  duration: entry.session_length,
                });
              };
              return (
                <SessionCard
                  key={id}
                  log={entry}
                  expanded={isExpanded}
                  onToggle={() => toggleExpand(id)}
                  onRepeat={handleRepeat}
                />
              );
            }

            const handleActivityRepeat = () => {
              onRepeatLog?.({
                activity_type: entry.activity_type,
                duration: entry.duration_mins,
              });
            };
            return (
              <ActivityCard
                key={id}
                log={entry}
                expanded={isExpanded}
                onToggle={() => toggleExpand(id)}
                onRepeat={handleActivityRepeat}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
