import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { promptNotificationPermission } from '../lib/oneSignal';
import OnboardingSurvey, {
  NOTIFICATION_TIME_MAP,
  NOTIFICATION_TIME_OPTIONS,
  TIME_TO_LABEL,
} from './OnboardingSurvey';
import { detectPlatform, INSTALL_CONTENT } from './InstallPrompt';
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
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [nameError, setNameError] = useState('');
  const [mindGames, setMindGames] = useState(
    fitnessProfile?.mind_games || [],
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [retakeOpen, setRetakeOpen] = useState(false);

  // Sync display name when profile loads after mount
  useEffect(() => {
    if (profile?.display_name) setDisplayName(profile.display_name);
  }, [profile?.display_name]);

  const handleSaveName = useCallback(async () => {
    if (!user) return;
    setNameSaving(true);
    setNameError('');
    console.log('[Settings] saving display_name:', displayName.trim(), 'for user.id:', user.id);
    const { data, error } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim() || null })
      .eq('id', user.id)
      .select();
    console.log('[Settings] update result:', { data, error });
    if (error) {
      console.error('[Settings] name save failed:', error);
      setNameError(`Save failed: ${error.message}`);
    } else if (!data || data.length === 0) {
      console.warn('[Settings] update returned no rows — .eq("id", user.id) may not match any row');
      setNameError('No profile row found. The profiles table may use a different column name.');
    } else {
      console.log('[Settings] saved successfully, refreshing profile...');
      setNameSaved(true);
      await refreshProfile();
      setTimeout(() => setNameSaved(false), 2000);
    }
    setNameSaving(false);
  }, [user, displayName, refreshProfile]);

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

        {/* Display Name */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Your Name</h3>
          <p className={styles.sectionDesc}>
            How should Vela address you?
          </p>
          {nameError && (
            <p style={{ fontSize: '0.78rem', color: '#c9534c', marginBottom: '0.5rem' }}>
              {nameError}
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              className={styles.chipGrid ? undefined : undefined}
              style={{
                flex: 1,
                padding: '0.6rem 0.85rem',
                border: '1.5px solid var(--card-border)',
                borderRadius: '2px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '0.9rem',
                color: 'var(--charcoal)',
                background: 'var(--warm-white)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              placeholder="How should Vela call you?"
              value={displayName}
              onChange={(e) => { setDisplayName(e.target.value); setNameSaved(false); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
            />
            <button
              className={styles.btnSave}
              onClick={handleSaveName}
              disabled={nameSaving}
            >
              {nameSaving ? 'Saving...' : 'Save'}
            </button>
            {nameSaved && <span className={styles.saved}>Saved! 🐸</span>}
          </div>
        </div>

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

        {/* Add to Home Screen */}
        <InstallInstructionsSection />
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

function InstallInstructionsSection() {
  const [expanded, setExpanded] = useState(false);
  const platform = detectPlatform();
  const config = INSTALL_CONTENT[platform];

  return (
    <div className={styles.section}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <div>
          <h3 className={styles.sectionTitle} style={{ marginBottom: 0 }}>
            Add to Home Screen
          </h3>
          <p
            className={styles.sectionDesc}
            style={{ marginBottom: 0, marginTop: '0.3rem' }}
          >
            Install VelaFit on your device for the full app experience.
          </p>
        </div>
        <button
          aria-label={expanded ? 'Collapse' : 'Expand'}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.1rem',
            color: 'var(--stone)',
            padding: '0.2rem 0.4rem',
          }}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          {expanded ? '−' : '+'}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: '1.2rem' }}>
          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--charcoal)',
              fontStyle: 'italic',
              fontWeight: 300,
              lineHeight: 1.5,
              marginBottom: '1rem',
            }}
          >
            {config.vela}
          </p>

          {platform === 'desktop' ? (
            <div
              style={{
                padding: '1rem',
                border: '1.5px solid var(--gold)',
                borderRadius: '4px',
                textAlign: 'center',
                background: 'rgba(212, 165, 116, 0.06)',
              }}
            >
              <div
                style={{
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--stone)',
                  marginBottom: '0.4rem',
                }}
              >
                Open on your phone
              </div>
              <div
                style={{
                  fontFamily: 'Space Mono, monospace',
                  fontSize: '1rem',
                  color: 'var(--green-deep)',
                  fontWeight: 600,
                }}
              >
                vela-fitness.vercel.app
              </div>
            </div>
          ) : (
            <ol
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.55rem',
              }}
            >
              {config.steps.map((step, i) => (
                <li
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.8rem 0.9rem',
                    background: 'var(--warm-white)',
                    border: '1.5px solid var(--card-border)',
                    borderRadius: '4px',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '0.88rem',
                    color: 'var(--charcoal)',
                    lineHeight: 1.4,
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      width: '1.5rem',
                      height: '1.5rem',
                      borderRadius: '50%',
                      background: 'var(--gold)',
                      color: 'var(--green-deep)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'Space Mono, monospace',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationsSection() {
  const supported = typeof window !== 'undefined' && 'Notification' in window;
  const { user, profile, refreshProfile } = useAuth();
  const [permission, setPermission] = useState(
    () => (supported ? Notification.permission : 'unsupported'),
  );
  const [enabling, setEnabling] = useState(false);
  const currentLabel =
    TIME_TO_LABEL[profile?.notification_time] ||
    TIME_TO_LABEL['07:00'];
  const [selectedLabel, setSelectedLabel] = useState(currentLabel);
  const [timeSaving, setTimeSaving] = useState(false);
  const [timeSaved, setTimeSaved] = useState(false);

  useEffect(() => {
    if (profile?.notification_time && TIME_TO_LABEL[profile.notification_time]) {
      setSelectedLabel(TIME_TO_LABEL[profile.notification_time]);
    }
  }, [profile?.notification_time]);

  const handleEnable = useCallback(async () => {
    setEnabling(true);
    try {
      await promptNotificationPermission();
    } finally {
      if (supported) setPermission(Notification.permission);
      setEnabling(false);
    }
  }, [supported]);

  const handlePickTime = useCallback(
    async (label) => {
      if (!user) return;
      const time = NOTIFICATION_TIME_MAP[label];
      if (!time) return;
      setSelectedLabel(label);
      setTimeSaving(true);
      setTimeSaved(false);
      const { error } = await supabase
        .from('profiles')
        .update({ notification_time: time })
        .eq('id', user.id);
      if (!error) {
        await refreshProfile();
        setTimeSaved(true);
        setTimeout(() => setTimeSaved(false), 2000);
      } else {
        console.error('Failed to save notification_time:', error);
      }
      setTimeSaving(false);
    },
    [user, refreshProfile],
  );

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Training Reminders</h3>
      <p className={styles.sectionDesc}>
        Get a reminder on your training days so you never miss a session.
      </p>
      {!supported && (
        <p style={{ fontSize: '0.85rem', color: 'var(--stone)' }}>
          Notifications aren't supported in this browser.
        </p>
      )}
      {supported && permission === 'granted' && (
        <p style={{ fontSize: '0.85rem', color: 'var(--green-accent)', fontWeight: 500 }}>
          ✓ Reminders enabled
        </p>
      )}
      {supported && permission === 'denied' && (
        <p style={{ fontSize: '0.85rem', color: 'var(--stone)', lineHeight: 1.5 }}>
          Notifications blocked. Enable them in your browser settings
          (site settings → Notifications → Allow), then reload this page.
        </p>
      )}
      {supported && permission === 'default' && (
        <button
          className={styles.btnSave}
          onClick={handleEnable}
          disabled={enabling}
        >
          {enabling ? 'Requesting...' : 'Enable Reminders →'}
        </button>
      )}

      <div style={{ marginTop: '1.4rem' }}>
        <p
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--green-deep)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '0.6rem',
          }}
        >
          Reminder time
        </p>
        <div className={styles.chipGrid}>
          {NOTIFICATION_TIME_OPTIONS.map((label) => (
            <button
              key={label}
              className={
                selectedLabel === label ? styles.chipSelected : styles.chip
              }
              onClick={() => handlePickTime(label)}
              disabled={timeSaving}
            >
              {label}
            </button>
          ))}
        </div>
        {timeSaved && <span className={styles.saved}>Saved! 🐸</span>}
      </div>
    </div>
  );
}
