import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { promptNotificationPermission } from '../lib/oneSignal';
import { localDateStr } from '../lib/dates';
import ProgressionCard from './ProgressionCard';
import styles from './Dashboard.module.css';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function getVelaMessage(streak) {
  if (streak >= 8) return "You're consistent. That's the hardest part.";
  if (streak >= 4) return 'One week in. This is where habits form.';
  if (streak >= 1) return "You're building momentum. Keep showing up.";
  return 'Every expert was once a beginner. Let\'s build something.';
}

function getTimeBreakdown(totalMins, noMindGames) {
  if (totalMins <= 15) {
    if (noMindGames) return { workout: 15, journal: 0, mindGame: 0 };
    return { workout: 10, journal: 0, mindGame: 5 };
  }
  if (totalMins <= 30) {
    if (noMindGames) return { workout: 25, journal: 5, mindGame: 0 };
    return { workout: 20, journal: 7, mindGame: 3 };
  }
  if (totalMins <= 45) {
    if (noMindGames) return { workout: 35, journal: 10, mindGame: 0 };
    return { workout: 30, journal: 10, mindGame: 5 };
  }
  if (noMindGames) return { workout: 45, journal: 15, mindGame: 0 };
  return { workout: 40, journal: 12, mindGame: 8 };
}

function computeStats(logs, activityLogs, userPlan) {
  const total = logs.length;

  // Current streak — count days with ANY entry (workout or activity)
  const allDates = new Set([
    ...logs.map((l) => l.date),
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

  // This week's sessions (workouts only for the X/Y count)
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const weekStr = localDateStr(startOfWeek);
  const thisWeekSessions = logs.filter((l) => l.date >= weekStr).length;
  const plannedPerWeek = userPlan?.days ? Object.keys(userPlan.days).length : 0;

  return { total, streak, thisWeekSessions, plannedPerWeek };
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function BreakdownBar({ breakdown }) {
  const total = breakdown.workout + breakdown.journal + breakdown.mindGame;
  if (total === 0) return null;
  return (
    <div className={styles.breakdownBar}>
      <div className={styles.breakdownWorkout} style={{ width: `${(breakdown.workout / total) * 100}%` }}>
        {breakdown.workout}m workout
      </div>
      {breakdown.journal > 0 && (
        <div className={styles.breakdownJournal} style={{ width: `${(breakdown.journal / total) * 100}%` }}>
          {breakdown.journal}m journal
        </div>
      )}
      {breakdown.mindGame > 0 && (
        <div className={styles.breakdownMind} style={{ width: `${(breakdown.mindGame / total) * 100}%` }}>
          {breakdown.mindGame}m mind
        </div>
      )}
    </div>
  );
}

// ISO week helper — returns YYYY-Www
function getISOWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export default function Dashboard({ onStartSession, onBuildPlan, onQuickSession, onLogActivity, onEditSchedule }) {
  const { user, userPlan, fitnessProfile, profile } = useAuth();
  const [logs, setLogs] = useState([]);
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
        .order('date', { ascending: false })
        .limit(50),
      supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(50),
    ]);
    setLogs(workoutRes.data || []);
    setActivityLogs(activityRes.data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const noMindGames = fitnessProfile?.mind_games?.includes('No mind games') ?? false;
  const userName = profile?.display_name || user?.email?.split('@')[0] || 'there';
  const stats = computeStats(logs, activityLogs, userPlan);

  // Today's schedule
  const todayIdx = new Date().getDay();
  const todayName = DAY_NAMES[todayIdx];
  const todayFullName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayMins = userPlan?.days?.[todayName] ?? null;
  const isTrainingDay = todayMins !== null;
  const hasPlan = !!userPlan?.days;

  const breakdown = isTrainingDay ? getTimeBreakdown(todayMins, noMindGames) : null;

  // Notification prompt — show if user has sessions and hasn't been prompted
  const [notifDismissed, setNotifDismissed] = useState(
    () => localStorage.getItem('vela_notif_prompted') === 'true'
  );
  const [delayedPrompt, setDelayedPrompt] = useState(false);

  // For users with sessions: show immediately. For zero sessions: show after 10s delay
  const showNotifPrompt = !notifDismissed && (stats.total >= 1 || delayedPrompt);

  useEffect(() => {
    if (stats.total === 0 && !notifDismissed && !loading) {
      const timer = setTimeout(() => setDelayedPrompt(true), 10000);
      return () => clearTimeout(timer);
    }
  }, [stats.total, notifDismissed, loading]);

  const handleEnableNotifications = useCallback(async () => {
    await promptNotificationPermission();
    localStorage.setItem('vela_notif_prompted', 'true');
    setNotifDismissed(true);
  }, []);

  const handleDismissNotif = useCallback(() => {
    localStorage.setItem('vela_notif_prompted', 'true');
    setNotifDismissed(true);
  }, []);

  // Weekly check-in — show on Sun/Mon if user has a plan and hasn't confirmed this week
  const currentWeek = getISOWeek();
  const dayOfWeek = new Date().getDay();
  const isCheckinDay = dayOfWeek === 0 || dayOfWeek === 1;
  const [checkinDismissed, setCheckinDismissed] = useState(() => {
    const stored = localStorage.getItem('vela_checkin_week');
    if (stored === currentWeek) return true;
    const skipTs = parseInt(localStorage.getItem('vela_checkin_skip') || '0', 10);
    if (skipTs && Date.now() - skipTs < 24 * 60 * 60 * 1000) return true;
    return false;
  });
  const showCheckin = isCheckinDay && hasPlan && !checkinDismissed;

  const handleConfirmCheckin = useCallback(() => {
    localStorage.setItem('vela_checkin_week', currentWeek);
    setCheckinDismissed(true);
  }, [currentWeek]);

  const handleTweakCheckin = useCallback(() => {
    localStorage.setItem('vela_checkin_week', currentWeek);
    setCheckinDismissed(true);
    onEditSchedule?.();
  }, [currentWeek, onEditSchedule]);

  const handleSkipCheckin = useCallback(() => {
    localStorage.setItem('vela_checkin_skip', String(Date.now()));
    setCheckinDismissed(true);
  }, []);

  // Evening streak alert — after 6pm on a training day when session not done
  const todayLocalStr = localDateStr();
  const completedToday = logs.some((l) => l.date === todayLocalStr);
  const [streakAlertDismissed, setStreakAlertDismissed] = useState(
    () => localStorage.getItem('vela_streak_alert_dismissed') === todayLocalStr
  );
  const isEvening = new Date().getHours() >= 18;
  const showStreakAlert =
    isEvening && isTrainingDay && !completedToday && !streakAlertDismissed;

  const handleDismissStreakAlert = useCallback(() => {
    localStorage.setItem('vela_streak_alert_dismissed', todayLocalStr);
    setStreakAlertDismissed(true);
  }, [todayLocalStr]);

  const planSummary = hasPlan
    ? Object.entries(userPlan.days)
        .map(([d, m]) => `${d} ${m}m`)
        .join(' · ')
    : '';

  const recentLogs = logs.slice(0, 3);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* ── Greeting ── */}
        <h1 className={styles.greeting}>
          {getGreeting()}, {userName}.
        </h1>
        <div className={styles.velaRow}>
          <div className={styles.velaAvatar}>🐸</div>
          <p className={styles.velaMessage}>{getVelaMessage(stats.streak)}</p>
        </div>

        {/* ── Weekly check-in ── */}
        {showCheckin && (
          <div className={styles.checkinCard}>
            <div className={styles.checkinHeader}>
              <span className={styles.checkinIcon}>📅</span>
              <div className={styles.checkinContent}>
                <strong>New week ahead.</strong>
                <p>Does your schedule still work for you?</p>
                <p className={styles.checkinSummary}>{planSummary}</p>
              </div>
            </div>
            <div className={styles.checkinActions}>
              <button
                className={styles.checkinConfirm}
                onClick={handleConfirmCheckin}
              >
                ✅ Same as last week
              </button>
              <button
                className={styles.checkinTweak}
                onClick={handleTweakCheckin}
              >
                ✏️ Tweak it
              </button>
            </div>
            <button
              className={styles.checkinSkip}
              onClick={handleSkipCheckin}
            >
              Skip for now
            </button>
          </div>
        )}

        {/* ── Progression suggestions ── */}
        {user && <ProgressionCard userId={user.id} />}

        {/* ── Today's Session ── */}
        {hasPlan ? (
          isTrainingDay ? (
            <div className={styles.todayCard}>
              <div className={styles.todayLabel}>Today's Session</div>
              <h2 className={styles.todayTitle}>
                {todayFullName} — {todayMins} min
              </h2>
              <p className={styles.todayMeta}>
                {breakdown.workout}m workout
                {breakdown.journal > 0 ? ` · ${breakdown.journal}m journal` : ''}
                {breakdown.mindGame > 0 ? ` · ${breakdown.mindGame}m mind` : ''}
              </p>
              <BreakdownBar breakdown={breakdown} />
              <button
                className={styles.btnStart}
                onClick={() => onStartSession?.(todayMins)}
              >
                Start Today's Session →
              </button>
            </div>
          ) : (
            <div className={styles.restCard}>
              <h2 className={styles.restTitle}>Rest Day</h2>
              <p className={styles.restSub}>Recovery is part of the plan.</p>
              <button className={styles.quickLink} onClick={onQuickSession}>
                Quick Session anyway? ⚡
              </button>
            </div>
          )
        ) : (
          <div className={styles.noPlanCard}>
            <h2 className={styles.noPlanTitle}>No plan yet</h2>
            <p className={styles.noPlanSub}>
              Build your first workout plan and Vela will start adapting to your schedule.
            </p>
            <button className={styles.btnBuild} onClick={onBuildPlan}>
              Build Your Plan →
            </button>
          </div>
        )}

        {/* ── Evening streak alert ── */}
        {showStreakAlert && (
          <div className={styles.streakAlert}>
            <p className={styles.streakAlertText}>
              <span className={styles.streakAlertBolt}>⚡</span>
              You're developing good habits, don't stop hopping now!
            </p>
            <button
              className={styles.streakAlertBtn}
              onClick={() => onStartSession?.(todayMins)}
            >
              Start Now →
            </button>
            <button
              className={styles.streakAlertClose}
              onClick={handleDismissStreakAlert}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}

        {user && (
          <button className={styles.logActivityLink} onClick={onLogActivity}>
            + Log other activity
          </button>
        )}

        {/* ── Notification prompt ── */}
        {showNotifPrompt && (
          <div className={styles.notifCard}>
            <span className={styles.notifIcon}>🔔</span>
            <div className={styles.notifContent}>
              <strong>Stay on track</strong>
              <p>Get reminders on your training days so you never miss a session.</p>
            </div>
            <div className={styles.notifActions}>
              <button className={styles.notifEnable} onClick={handleEnableNotifications}>
                Enable Reminders
              </button>
              <button className={styles.notifDismiss} onClick={handleDismissNotif}>
                Not now
              </button>
            </div>
          </div>
        )}

        {/* ── Stats ── */}
        <div className={styles.statsRow}>
          <div className={styles.statBox}>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statLabel}>Sessions</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statValue}>{stats.streak}</div>
            <div className={styles.statLabel}>Day Streak</div>
          </div>
          <div className={styles.statBox}>
            <div className={styles.statValue}>
              {stats.thisWeekSessions}{stats.plannedPerWeek > 0 ? ` / ${stats.plannedPerWeek}` : ''}
            </div>
            <div className={styles.statLabel}>This Week</div>
          </div>
        </div>

        {/* ── Recent Sessions ── */}
        <h3 className={styles.sectionTitle}>Recent Sessions</h3>
        {loading ? (
          <p className={styles.empty}>Loading...</p>
        ) : recentLogs.length === 0 ? (
          <p className={styles.empty}>Complete your first session to see it here.</p>
        ) : (
          <>
            {recentLogs.map((log, i) => (
              <div key={log.id || i} className={styles.recentCard}>
                <div className={styles.recentLeft}>
                  <span className={styles.recentDate}>{formatDate(log.date)}</span>
                  {log.journal_entry && (
                    <span className={styles.recentJournal}>
                      {log.journal_entry.slice(0, 60)}
                      {log.journal_entry.length > 60 ? '...' : ''}
                    </span>
                  )}
                </div>
                <div className={styles.recentRight}>
                  <span className={styles.recentLength}>{log.session_length}m</span>
                  {log.feeling_rating && (
                    <span className={styles.feelingBadge}>{log.feeling_rating}</span>
                  )}
                </div>
              </div>
            ))}
            <Link to="/history" className={styles.viewAll}>
              View all sessions →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
