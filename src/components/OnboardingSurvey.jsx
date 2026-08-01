import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { localDateStr } from '../lib/dates';
import { promptNotificationPermission, sendTag } from '../lib/oneSignal';
import styles from './OnboardingSurvey.module.css';

const NOTIF_SUPPORTED = typeof window !== 'undefined' && 'Notification' in window;

export const NOTIFICATION_TIME_MAP = {
  '🌅 Early Bird — 5:30 AM': '05:30',
  '☀️ Morning — 7:00 AM': '07:00',
  '🏃 Midmorning — 9:00 AM': '09:00',
  '🥗 Lunch — 12:00 PM': '12:00',
  '🌇 After Work — 5:00 PM': '17:00',
  '🌙 Night Owl — 7:30 PM': '19:30',
};

export const NOTIFICATION_TIME_OPTIONS = Object.keys(NOTIFICATION_TIME_MAP);

export const TIME_TO_LABEL = Object.fromEntries(
  Object.entries(NOTIFICATION_TIME_MAP).map(([label, time]) => [time, label]),
);

// Optional get-to-know-you questions. These are NOT part of signup onboarding —
// nothing in plan/session generation reads them today — so they live in
// Settings ("About You") where users can fill them in later.
export const OPTIONAL_PROFILE_QUESTIONS = [
  {
    key: 'age_range',
    label: 'Age Range',
    options: ['Under 20', '21–29', '30–39', '40–49', '50+'],
  },
  {
    key: 'activity_level',
    label: 'Activity Level',
    options: [
      'Mostly sitting (desk job / sedentary)',
      'Lightly active (some walking)',
      'Moderately active (on my feet often)',
      'Very active (physical job)',
    ],
  },
  {
    key: 'pushup_range',
    label: 'Push-up Range',
    options: ['0–5', '6–15', '16–30', '30+'],
  },
  {
    key: 'exercise_frequency',
    label: 'Exercise Frequency',
    options: ['Never', '1–2x per week', '3–4x per week', '5+ per week'],
  },
];

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const SESSION_LENGTHS = [15, 30, 45, 60];

// The two questions the plan/session engine actually consumes.
const PROFILE_STEPS = [
  {
    key: 'equipment',
    title: 'Available equipment',
    vela: "What do you have access to? Select all that apply — I'll build around whatever you've got.",
    type: 'multi',
    exclusive: 'None — bodyweight only',
    options: [
      'None — bodyweight only',
      'Resistance bands',
      'Dumbbells and/or Kettlebells',
      'Pull-up bar',
      'Full home gym',
      'Commercial gym access',
    ],
  },
  {
    key: 'mind_games',
    title: 'Mind game preferences',
    vela: "VelaFit includes short cognitive games between sets and after sessions. Pick what sounds fun — you can change these later in settings.",
    type: 'multi',
    exclusive: 'No mind games',
    options: [
      'Sudoku',
      'Crossword',
      'Word Puzzles',
      'Memory Games',
      'Logic Games',
      'No mind games',
    ],
  },
];

const FULL_STEPS = [
  ...PROFILE_STEPS,
  {
    key: 'training_days',
    title: 'When can you train?',
    vela: "Pick your training days — even two is a real plan. I'll place rest days around them and adapt when life shifts.",
    type: 'days',
  },
  {
    key: 'notifications',
    title: 'When should Vela check in?',
    vela: "Consistency beats intensity. Tell me when to nudge you on training days — nothing spammy, just Vela checking in.",
    type: 'notifications',
    perks: [
      '🏋️ Training day reminders at your time',
      "⚡ Evening nudge if you haven't trained yet",
      '📅 Weekly schedule check-in on Sundays',
    ],
  },
];

function getTodayName() {
  return new Date()
    .toLocaleDateString('en-US', { weekday: 'short' })
    .slice(0, 3);
}

// Mirrors PlanBuilderModal's location derivation so plans built here and there
// carry the same shape.
function deriveLocation(equipment) {
  const list = Array.isArray(equipment) ? equipment : [equipment].filter(Boolean);
  if (list.includes('Commercial gym access')) return 'Gym';
  if (list.some((e) => e && e !== 'None — bodyweight only')) return 'Home — some equipment';
  return 'Home — no equipment';
}

/**
 * variant:
 *  - 'full' (default): signup onboarding — profile questions, training days,
 *    notification opt-in; saves fitness_profile AND creates the user_plan.
 *  - 'profile': Settings retake — profile questions only; saves fitness_profile
 *    and never touches user_plans, notifications, or onboarding_completed.
 */
export default function OnboardingSurvey({ open, onComplete, onShowInstallPrompt, variant = 'full' }) {
  const { user, profile, fitnessProfile, userPlan, refreshProfile, refreshPlan } = useAuth();
  const steps = variant === 'profile' ? PROFILE_STEPS : FULL_STEPS;

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selectedDays, setSelectedDays] = useState([]);
  const [sessionLen, setSessionLen] = useState(30);
  const [daysTouched, setDaysTouched] = useState(false);
  const [notifTimeLabel, setNotifTimeLabel] = useState(NOTIFICATION_TIME_OPTIONS[1]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [requestingPerm, setRequestingPerm] = useState(false);
  const [notifPermission, setNotifPermission] = useState(
    () => (NOTIF_SUPPORTED ? Notification.permission : 'unsupported'),
  );

  // (Re)initialize whenever the survey opens: prefill from the existing
  // profile (retakes), preselect today as a training day, reset errors.
  useEffect(() => {
    if (!open) return;
    setStep(0);
    setSaveError(false);
    setAnswers({
      equipment: fitnessProfile?.equipment ?? [],
      mind_games: fitnessProfile?.mind_games ?? [],
    });
    setSelectedDays([getTodayName()]);
    setSessionLen(30);
    setDaysTouched(false);
    setNotifTimeLabel(
      TIME_TO_LABEL[profile?.notification_time] || NOTIFICATION_TIME_OPTIONS[1],
    );
    if (NOTIF_SUPPORTED) setNotifPermission(Notification.permission);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- prefill snapshot on open only
  }, [open]);

  // Prefill the days step from an existing plan (e.g. a tester who built one
  // via the plan builder before completing onboarding) so finishing doesn't
  // silently replace their schedule with the today+30min default. Only runs
  // until the user edits the step, so a plan arriving mid-survey (the plan
  // fetch is async) can't stomp their selection.
  useEffect(() => {
    if (!open || variant !== 'full' || daysTouched) return;
    const days = userPlan?.days;
    if (!days || Object.keys(days).length === 0) return;
    setSelectedDays(ALL_DAYS.filter((d) => d in days));
    const firstLen = Object.values(days)[0];
    setSessionLen(
      SESSION_LENGTHS.reduce((a, b) =>
        Math.abs(b - firstLen) < Math.abs(a - firstLen) ? b : a,
      ),
    );
  }, [open, variant, daysTouched, userPlan]);

  // Funnel tracking: record the highest step reached, fire-and-forget. Errors
  // are swallowed on purpose — if the onboarding_step column hasn't been
  // migrated yet, onboarding must still work.
  useEffect(() => {
    if (!open || !user || variant !== 'full') return;
    supabase
      .from('profiles')
      .update({ onboarding_step: step + 1 })
      .eq('id', user.id)
      .then(({ error }) => {
        if (error) console.warn('[Onboarding] step tracking skipped:', error.message);
      });
  }, [open, user, variant, step]);

  const current = steps[step];
  const totalSteps = steps.length;
  const progress = ((step + 1) / totalSteps) * 100;
  const isLast = step === totalSteps - 1;

  const handleMultiToggle = useCallback(
    (value) => {
      setAnswers((prev) => {
        const existing = prev[current.key] || [];
        const exclusive = current.exclusive;
        if (exclusive && value === exclusive) {
          return { ...prev, [current.key]: [exclusive] };
        }
        const without = exclusive
          ? existing.filter((v) => v !== exclusive)
          : existing;
        const next = without.includes(value)
          ? without.filter((v) => v !== value)
          : [...without, value];
        return { ...prev, [current.key]: next };
      });
    },
    [current],
  );

  const toggleDay = useCallback((day) => {
    setDaysTouched(true);
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }, []);

  const pickSessionLen = useCallback((mins) => {
    setDaysTouched(true);
    setSessionLen(mins);
  }, []);

  const canProceed =
    current.type === 'multi'
      ? (answers[current.key] || []).length > 0
      : current.type === 'days'
        ? selectedDays.length > 0
        : true;

  const finishSetup = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    setSaveError(false);
    try {
      // Merge, don't replace: retakes must not wipe optional About You answers.
      const mergedProfile = {
        ...(fitnessProfile || {}),
        equipment: answers.equipment,
        mind_games: answers.mind_games,
      };

      if (variant === 'profile') {
        const { error } = await supabase
          .from('profiles')
          .update({ fitness_profile: mergedProfile })
          .eq('id', user.id);
        if (error) throw error;
        await refreshProfile();
        onComplete();
        return;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          fitness_profile: mergedProfile,
          notification_time: NOTIFICATION_TIME_MAP[notifTimeLabel] || '07:00',
          onboarding_completed: true,
          intensity_level: 2,
        })
        .eq('id', user.id);
      if (profileError) throw profileError;

      const days = {};
      for (const d of selectedDays) days[d] = sessionLen;
      const plan = {
        days,
        goal: 'Build consistent habits',
        location: deriveLocation(answers.equipment),
        createdAt: localDateStr(),
      };
      const { error: planError } = await supabase.from('user_plans').upsert(
        { user_id: user.id, plan, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      );
      if (planError) throw planError;

      // Terminal funnel marker — fire-and-forget like the per-step updates.
      supabase
        .from('profiles')
        .update({ onboarding_step: totalSteps + 1 })
        .eq('id', user.id)
        .then(() => {});

      sendTag('training_days', Object.keys(days).join(','));
      sendTag('has_plan', 'true');
      sendTag('plan_updated', new Date().toISOString());

      await refreshProfile();
      await refreshPlan();
      onComplete();
      onShowInstallPrompt?.();
    } catch (err) {
      console.error('[Onboarding] save failed:', err);
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }, [
    user,
    variant,
    fitnessProfile,
    answers,
    selectedDays,
    sessionLen,
    notifTimeLabel,
    totalSteps,
    refreshProfile,
    refreshPlan,
    onComplete,
    onShowInstallPrompt,
  ]);

  const handleNext = useCallback(() => {
    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }
    finishSetup();
  }, [isLast, finishSetup]);

  const handleBack = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  const handleEnableNotifs = useCallback(async () => {
    setRequestingPerm(true);
    try {
      // CRITICAL (iOS): promptNotificationPermission() must be invoked
      // synchronously inside this tap handler with no await before it —
      // Promise.race's arguments are evaluated synchronously, so the request
      // fires within the user gesture. See lib/oneSignal.js.
      await Promise.race([
        promptNotificationPermission(),
        new Promise((resolve) => setTimeout(resolve, 5000)),
      ]);
    } catch {
      // Permission flow errored — proceed anyway, user is not blocked.
    } finally {
      setRequestingPerm(false);
      if (NOTIF_SUPPORTED) setNotifPermission(Notification.permission);
    }
    finishSetup();
  }, [finishSetup]);

  if (!open) return null;

  const alreadyGranted = notifPermission === 'granted';
  const notifBlocked = notifPermission === 'denied';

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className={styles.header}>
          <div className={styles.stepLabel}>
            Step {step + 1} of {totalSteps}
          </div>
          <h2>{current.title}</h2>
        </div>

        <div className={styles.velaPrompt}>
          <div className={styles.velaAvatar}>🐸</div>
          <p className={styles.velaText}>{current.vela}</p>
        </div>

        <div className={styles.body}>
          {current.type === 'multi' && (
            <div className={styles.chipGrid}>
              {current.options.map((opt) => (
                <button
                  key={opt}
                  className={
                    (answers[current.key] || []).includes(opt)
                      ? styles.chipSelected
                      : styles.chip
                  }
                  onClick={() => handleMultiToggle(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {current.type === 'days' && (
            <div>
              <div className={styles.chipGrid}>
                {ALL_DAYS.map((day) => (
                  <button
                    key={day}
                    className={
                      selectedDays.includes(day)
                        ? styles.chipSelected
                        : styles.chip
                    }
                    onClick={() => toggleDay(day)}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <p className={styles.fieldCaption}>Minutes per session</p>
              <div className={styles.chipGrid}>
                {SESSION_LENGTHS.map((mins) => (
                  <button
                    key={mins}
                    className={
                      sessionLen === mins ? styles.chipSelected : styles.chip
                    }
                    onClick={() => pickSessionLen(mins)}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
              <p className={styles.fieldHint}>
                You can fine-tune each day&apos;s length later from your dashboard.
              </p>
            </div>
          )}

          {current.type === 'notifications' && (
            <div>
              <div className={styles.optionList}>
                {NOTIFICATION_TIME_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    className={
                      notifTimeLabel === opt
                        ? styles.optionSelected
                        : styles.option
                    }
                    onClick={() => setNotifTimeLabel(opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <ul className={styles.perkList}>
                {current.perks.map((perk) => (
                  <li key={perk} className={styles.perkItem}>
                    {perk}
                  </li>
                ))}
              </ul>
              {alreadyGranted && (
                <p className={styles.fieldHint}>
                  ✓ Notifications are already on for this device.
                </p>
              )}
              {notifBlocked && (
                <p className={styles.fieldHint}>
                  Notifications are blocked in this browser — you can enable
                  them later from Settings.
                </p>
              )}
              {!NOTIF_SUPPORTED && (
                <p className={styles.fieldHint}>
                  Notifications aren&apos;t supported in this browser. You can
                  enable them later from Settings.
                </p>
              )}
            </div>
          )}

          {saveError && (
            <p className={styles.saveError}>
              Couldn&apos;t save your setup — check your connection and try
              again. Your answers are still here.
            </p>
          )}
        </div>

        <div className={styles.footer}>
          {step > 0 && (
            <button className={styles.btnBack} onClick={handleBack} disabled={saving}>
              Back
            </button>
          )}
          {current.type === 'notifications' ? (
            <div className={styles.notifActions}>
              {NOTIF_SUPPORTED && !alreadyGranted && !notifBlocked ? (
                <>
                  <button
                    className={styles.btnNext}
                    onClick={handleEnableNotifs}
                    disabled={requestingPerm || saving}
                  >
                    {requestingPerm
                      ? 'Requesting...'
                      : saving
                        ? 'Saving...'
                        : saveError
                          ? 'Retry — Enable Reminders →'
                          : 'Enable Reminders →'}
                  </button>
                  <button
                    className={styles.skipLink}
                    onClick={finishSetup}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Maybe later'}
                  </button>
                </>
              ) : (
                <button
                  className={styles.btnNext}
                  onClick={finishSetup}
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : saveError
                      ? 'Retry →'
                      : 'Finish Setup →'}
                </button>
              )}
            </div>
          ) : (
            <button
              className={styles.btnNext}
              onClick={handleNext}
              disabled={!canProceed || saving}
            >
              {saving
                ? 'Saving...'
                : isLast
                  ? saveError
                    ? 'Retry →'
                    : 'Finish Setup →'
                  : 'Continue →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
