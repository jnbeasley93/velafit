import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { promptNotificationPermission } from '../lib/oneSignal';
import OnboardingSurvey from './OnboardingSurvey';
import styles from './Settings.module.css';

const MIND_GAME_OPTIONS = [
  'Sudoku',
  'Crossword',
  'Word Puzzles',
  'Memory Games',
  'Logic Games',
  'No mind games',
];

const PROFILE_LABELS = {
  age_range: 'Age Range',
  activity_level: 'Activity Level',
  pushup_range: 'Push-up Range',
  exercise_frequency: 'Exercise Frequency',
  equipment: 'Equipment',
};

export default function Settings({ onEditSchedule }) {
  const { user, profile, fitnessProfile, refreshProfile } = useAuth();
  const [mindGames, setMindGames] = useState(
    fitnessProfile?.mind_games || [],
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [retakeOpen, setRetakeOpen] = useState(false);

  const handleToggle = useCallback((value) => {
    setMindGames((prev) => {
      if (value === 'No mind games') return ['No mind games'];
      const without = prev.filter((v) => v !== 'No mind games');
      return without.includes(value)
        ? without.filter((v) => v !== value)
        : [...without, value];
    });
    setSaved(false);
  }, []);

  const handleSaveMindGames = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      const updated = { ...fitnessProfile, mind_games: mindGames };
      await supabase
        .from('profiles')
        .update({ fitness_profile: updated })
        .eq('id', user.id);
      await refreshProfile();
      setSaved(true);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  }, [user, fitnessProfile, mindGames, refreshProfile]);

  const handleRetakeComplete = useCallback(() => {
    setRetakeOpen(false);
    // Refresh mind games state from the updated profile
    refreshProfile().then(() => {
      // Will update on next render via fitnessProfile prop
    });
  }, [refreshProfile]);

  if (!user) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <Link to="/" className={styles.backLink}>
            ← Back to home
          </Link>
          <h1 className={styles.title}>Settings</h1>
          <p className={styles.subtitle}>Please sign in to view settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link to="/dashboard" className={styles.backLink}>
          ← Back to dashboard
        </Link>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>
          Manage your preferences and fitness profile.
        </p>

        {/* Appearance */}
        <AppearanceSection />

        {/* Mind Game Preferences */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Mind Game Preferences</h3>
          <p className={styles.sectionDesc}>
            Choose which cognitive games appear in your sessions. These are
            played between sets or after workouts.
          </p>
          <div className={styles.chipGrid}>
            {MIND_GAME_OPTIONS.map((opt) => (
              <button
                key={opt}
                className={
                  mindGames.includes(opt) ? styles.chipSelected : styles.chip
                }
                onClick={() => handleToggle(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              className={styles.btnSave}
              onClick={handleSaveMindGames}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
            {saved && <span className={styles.saved}>Saved</span>}
          </div>
        </div>

        {/* Fitness Profile */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Fitness Profile</h3>
          <p className={styles.sectionDesc}>
            Your answers from the onboarding survey. These shape how Vela
            builds and scales your plan.
          </p>

          {fitnessProfile ? (
            <>
              {Object.entries(PROFILE_LABELS).map(([key, label]) => (
                <div key={key} className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>{label}</span>
                  <span className={styles.fieldValue}>
                    {Array.isArray(fitnessProfile[key])
                      ? fitnessProfile[key].join(', ')
                      : fitnessProfile[key] || '—'}
                  </span>
                </div>
              ))}
              <div className={styles.intensityRow}>
                <span className={styles.intensityLabel}>
                  Current Intensity Level
                </span>
                <span className={styles.intensityValue}>
                  {profile?.intensity_level ?? 2} / 5
                </span>
              </div>
            </>
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--stone)' }}>
              No fitness profile yet. Complete the onboarding survey to get
              started.
            </p>
          )}

          <div style={{ marginTop: '1.2rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              className={styles.btnRetake}
              onClick={() => setRetakeOpen(true)}
            >
              {fitnessProfile ? 'Retake Survey' : 'Take Survey'}
            </button>
            <button
              className={styles.btnRetake}
              onClick={() => onEditSchedule?.()}
            >
              Edit Schedule
            </button>
          </div>
        </div>
        {/* Notifications */}
        <NotificationsSection />
      </div>

      <OnboardingSurvey
        open={retakeOpen}
        onComplete={handleRetakeComplete}
      />
    </div>
  );
}

function AppearanceSection() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Appearance</h3>
      <p className={styles.sectionDesc}>
        Choose your preferred visual theme.
      </p>
      <div className={styles.themeToggleRow}>
        <span className={styles.themeLabel}>
          {isDark ? 'Dark' : 'Light'} Mode
        </span>
        <button
          className={isDark ? styles.pillSwitchOn : styles.pillSwitch}
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
        >
          <span className={styles.pillKnob}>
            {isDark ? '🌙' : '☀️'}
          </span>
        </button>
      </div>
    </div>
  );
}

function NotificationsSection() {
  const [status, setStatus] = useState(
    () => localStorage.getItem('vela_notif_prompted') === 'true' ? 'prompted' : 'not_prompted'
  );
  const [enabling, setEnabling] = useState(false);

  const handleEnable = useCallback(async () => {
    setEnabling(true);
    try {
      await promptNotificationPermission();
      localStorage.setItem('vela_notif_prompted', 'true');
      setStatus('enabled');
    } catch {
      setStatus('prompted');
    } finally {
      setEnabling(false);
    }
  }, []);

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Notifications</h3>
      <p className={styles.sectionDesc}>
        Get reminders on your training days so you never miss a session.
        Streak alerts help you stay consistent.
      </p>
      {status === 'enabled' ? (
        <p style={{ fontSize: '0.85rem', color: 'var(--green-accent)', fontWeight: 500 }}>
          Notifications enabled. You'll receive session reminders.
        </p>
      ) : (
        <button
          className={styles.btnSave}
          onClick={handleEnable}
          disabled={enabling}
        >
          {enabling ? 'Enabling...' : 'Enable Push Notifications'}
        </button>
      )}
    </div>
  );
}
