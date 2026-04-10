import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
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
    const targetStr = target.toISOString().slice(0, 10);
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
  'Cycling': '🚴',
  'Swimming': '🏊',
  'Yard Work': '🌿',
  'Playing with Kids': '👶',
  'Outdoor Sports': '⚽',
  'Yoga / Stretching': '🧘',
};

function JournalEntry({ text }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 100;

  return (
    <div className={styles.journalSection}>
      <p className={styles.journalLabel}>Journal</p>
      <p className={styles.journalText}>
        {isLong && !expanded ? text.slice(0, 100) + '...' : text}
      </p>
      {isLong && (
        <button
          className={styles.journalToggle}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}

function SessionCard({ log }) {
  const exercises = log.exercises_completed || [];

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <p className={styles.cardDate}>{formatDate(log.date)}</p>
          <p className={styles.cardLength}>{log.session_length} min session</p>
        </div>
        <span
          className={
            log.is_impromptu ? styles.badgeImpromptu : styles.badgeScheduled
          }
        >
          {log.is_impromptu ? 'Impromptu' : 'Scheduled'}
        </span>
      </div>

      <div className={styles.cardBody}>
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

        {exercises.length > 0 && (
          <div className={styles.exercisesList}>
            <p className={styles.exercisesLabel}>Exercises</p>
            <div className={styles.exerciseChips}>
              {exercises.map((name, i) => (
                <span key={i} className={styles.exerciseChip}>
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {log.journal_entry && <JournalEntry text={log.journal_entry} />}
      </div>
    </div>
  );
}

function ActivityCard({ log }) {
  const emoji = ACTIVITY_EMOJIS[log.activity_type] || '🏃';

  return (
    <div className={styles.activityCard}>
      <div className={styles.cardHeader}>
        <div>
          <p className={styles.cardDate}>
            {emoji} {formatDate(log.date)}
          </p>
          <p className={styles.cardLength}>
            {log.activity_type}
            {log.duration_mins ? ` · ${log.duration_mins} min` : ''}
          </p>
        </div>
        <span className={styles.badgeActivity}>Life Movement</span>
      </div>

      <div className={styles.cardBody}>
        <div className={styles.ratingsRow}>
          {log.feeling && (
            <span className={styles.ratingChip}>Feeling: {log.feeling}</span>
          )}
        </div>
        {log.notes && (
          <p className={styles.activityNotes}>{log.notes}</p>
        )}
      </div>
    </div>
  );
}

export default function WorkoutHistory() {
  const { user } = useAuth();
  const [workoutLogs, setWorkoutLogs] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!user) return;
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
    setWorkoutLogs(workoutRes.data || []);
    setActivityLogs(activityRes.data || []);
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
              Complete your first workout and it will show up here.
            </p>
          </div>
        ) : (
          allEntries.map((entry, i) =>
            entry._type === 'workout' ? (
              <SessionCard key={`w-${entry.id || i}`} log={entry} />
            ) : (
              <ActivityCard key={`a-${entry.id || i}`} log={entry} />
            )
          )
        )}
      </div>
    </div>
  );
}
