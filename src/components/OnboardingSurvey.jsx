import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import styles from './OnboardingSurvey.module.css';

const STEPS = [
  {
    key: 'age_range',
    title: 'How old are you?',
    vela: "Let's start with the basics. This helps me scale your plan to where your body is right now.",
    type: 'single',
    options: ['Under 20', '21–29', '30–39', '40–49', '50+'],
  },
  {
    key: 'activity_level',
    title: 'How sedentary is your day?',
    vela: "No judgement here — most of us sit more than we think. I just need to know your baseline.",
    type: 'single',
    options: [
      'Mostly sitting (desk job / sedentary)',
      'Lightly active (some walking)',
      'Moderately active (on my feet often)',
      'Very active (physical job)',
    ],
  },
  {
    key: 'pushup_range',
    title: 'Push-up check',
    vela: "Quick benchmark — how many push-ups can you do right now, cold, no warm-up? Be honest.",
    type: 'single',
    options: ['0–5', '6–15', '16–30', '30+'],
  },
  {
    key: 'exercise_frequency',
    title: 'Current exercise habits',
    vela: "How often do you currently move with intention? Even walks count.",
    type: 'single',
    options: ['Never', '1–2x per week', '3–4x per week', '5+ per week'],
  },
  {
    key: 'equipment',
    title: 'Available equipment',
    vela: "What do you have access to? I'll build around whatever you've got.",
    type: 'single',
    options: [
      'None — bodyweight only',
      'Resistance bands',
      'Dumbbells',
      'Full home gym',
      'Commercial gym access',
    ],
  },
  {
    key: 'mind_games',
    title: 'Mind game preferences',
    vela: "VelaFit includes short cognitive games between sets and after sessions. Pick what sounds fun — you can change these later in settings.",
    type: 'multi',
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

export default function OnboardingSurvey({ open, onComplete }) {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);

  const current = STEPS[step];
  const totalSteps = STEPS.length;
  const progress = ((step + 1) / totalSteps) * 100;

  const handleSingleSelect = useCallback(
    (value) => {
      setAnswers((prev) => ({ ...prev, [current.key]: value }));
    },
    [current],
  );

  const handleMultiToggle = useCallback(
    (value) => {
      setAnswers((prev) => {
        const existing = prev[current.key] || [];
        if (value === 'No mind games') {
          return { ...prev, [current.key]: ['No mind games'] };
        }
        const without = existing.filter((v) => v !== 'No mind games');
        const next = without.includes(value)
          ? without.filter((v) => v !== value)
          : [...without, value];
        return { ...prev, [current.key]: next };
      });
    },
    [current],
  );

  const canProceed =
    current.type === 'single'
      ? !!answers[current.key]
      : (answers[current.key] || []).length > 0;

  const handleNext = useCallback(async () => {
    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
      return;
    }

    // Final step — save to Supabase
    setSaving(true);
    try {
      const fitnessProfile = {};
      for (const s of STEPS) {
        fitnessProfile[s.key] = answers[s.key];
      }

      await supabase
        .from('profiles')
        .update({
          fitness_profile: fitnessProfile,
          onboarding_completed: true,
          intensity_level: 2,
        })
        .eq('id', user.id);

      await refreshProfile();
      onComplete();
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setSaving(false);
    }
  }, [step, totalSteps, answers, user, refreshProfile, onComplete]);

  const handleBack = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  if (!open) return null;

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
          {current.type === 'single' && (
            <div className={styles.optionList}>
              {current.options.map((opt) => (
                <button
                  key={opt}
                  className={
                    answers[current.key] === opt
                      ? styles.optionSelected
                      : styles.option
                  }
                  onClick={() => handleSingleSelect(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

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
        </div>

        <div className={styles.footer}>
          {step > 0 && (
            <button className={styles.btnBack} onClick={handleBack}>
              Back
            </button>
          )}
          <button
            className={styles.btnNext}
            onClick={handleNext}
            disabled={!canProceed || saving}
          >
            {saving
              ? 'Saving...'
              : step === totalSteps - 1
                ? 'Finish Setup →'
                : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  );
}
