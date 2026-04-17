import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { localDateStr } from '../lib/dates';
import { requestWakeLock, releaseWakeLock } from '../lib/wakeLock';
import ExerciseLogModal from './ExerciseLogModal';
import styles from './SessionPlayer.module.css';

const CIRCLE_R = 70;
const CIRCLE_C = 2 * Math.PI * CIRCLE_R;

// ─────────────────────────────────────────────
// Phase: Workout
// ─────────────────────────────────────────────

function ExerciseView({ exercise, intensityLevel, onDone }) {
  const [howToOpen, setHowToOpen] = useState(false);
  const setsLabel = exercise.sets?.[intensityLevel] || exercise.sets?.[2] || '3x10';

  return (
    <div className={styles.exerciseCard}>
      <div className={styles.exerciseHeader}>
        <h3 className={styles.exerciseName}>{exercise.name}</h3>
        <div className={styles.exerciseMeta}>
          <span className={styles.badgeSets}>{setsLabel}</span>
          <span className={styles.badgeCategory}>{exercise.category}</span>
          {exercise.intimidationLevel && (
            <span className={styles.badgeIntimidation}>
              {exercise.intimidationLevel.split('.')[0]}
            </span>
          )}
        </div>
      </div>

      <div className={styles.exerciseBody}>
        <p className={styles.sectionLabel}>Setup</p>
        <p className={styles.exerciseText}>{exercise.setup}</p>

        <p className={styles.sectionLabel}>Movement</p>
        <p className={styles.exerciseText}>{exercise.movement}</p>

        {exercise.cues && exercise.cues.length > 0 && (
          <>
            <p className={styles.sectionLabel}>Cues</p>
            <ul className={styles.cueList}>
              {exercise.cues.map((c) => (
                <li key={c} className={styles.cueItem}>{c}</li>
              ))}
            </ul>
          </>
        )}
      </div>

      <button
        className={styles.howToToggle}
        onClick={() => setHowToOpen((v) => !v)}
      >
        {howToOpen ? '▾ Hide details' : '▸ Common mistakes & tips'}
      </button>

      {howToOpen && (
        <div className={styles.howToBody}>
          {exercise.mistakes && exercise.mistakes.length > 0 && (
            <>
              <p className={styles.sectionLabel} style={{ marginTop: 0 }}>
                Mistakes to avoid
              </p>
              <ul className={styles.mistakeList}>
                {exercise.mistakes.map((m) => (
                  <li key={m} className={styles.mistakeItem}>{m}</li>
                ))}
              </ul>
            </>
          )}
          {exercise.progressions && exercise.progressions.length > 0 && (
            <>
              <p className={styles.sectionLabel}>Progression</p>
              <p className={styles.exerciseText}>{exercise.progressions[0]}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function RestTimer({ seconds, nextExercise, onDone, onSkip }) {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef(null);

  useEffect(() => {
    setRemaining(seconds);
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(intervalRef.current);
          onDone();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [seconds, onDone]);

  const fraction = remaining / seconds;
  const offset = CIRCLE_C * (1 - fraction);

  return (
    <div className={styles.restOverlay}>
      <p className={styles.restLabel}>Rest</p>
      <div className={styles.timerRing}>
        <svg viewBox="0 0 160 160">
          <circle cx="80" cy="80" r={CIRCLE_R} className={styles.timerTrack} />
          <circle
            cx="80"
            cy="80"
            r={CIRCLE_R}
            className={styles.timerFill}
            strokeDasharray={CIRCLE_C}
            strokeDashoffset={offset}
          />
        </svg>
        <span className={styles.timerText}>{remaining}</span>
      </div>
      {nextExercise && (
        <>
          <p className={styles.restNextLabel}>Up next</p>
          <p className={styles.restExerciseName}>{nextExercise.name}</p>
        </>
      )}
      <button className={styles.btnSkipRest} onClick={onSkip} style={{ marginTop: '1.5rem' }}>
        Skip rest
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Phase: Journal
// ─────────────────────────────────────────────

function JournalPhase({ onDone, onSkip, journalText, setJournalText }) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!journalText.trim() || !user) { onSkip(); return; }
    setSaving(true);
    try {
      await supabase.from('journal_entries').insert({
        user_id: user.id,
        date: localDateStr(),
        prompt: "What's one thing that felt different today than last session?",
        entry: journalText.trim(),
        created_at: new Date().toISOString(),
      });
      onDone();
    } catch (err) {
      console.error('Journal save failed:', err);
      onDone();
    } finally {
      setSaving(false);
    }
  }, [journalText, user, onDone, onSkip]);

  return (
    <div className={styles.bodyInner}>
      <div className={styles.journalCard}>
        <p className={styles.journalPrompt}>
          What's one thing that felt different today than last session?
        </p>
        <p className={styles.journalHint}>
          Even small observations build awareness over time. One sentence is enough.
        </p>
        <textarea
          className={styles.journalTextarea}
          placeholder="Today I noticed..."
          value={journalText}
          onChange={(e) => setJournalText(e.target.value)}
        />
      </div>
      <div className={styles.footer} style={{ border: 'none', padding: '1rem 0 0' }}>
        <button className={styles.btnSecondary} onClick={onSkip}>
          Skip
        </button>
        <button
          className={styles.btnPrimary}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save & Continue →'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Phase: Mind Game Placeholder
// ─────────────────────────────────────────────

function MindGamePhase({ preferences, onDone }) {
  const prefs = (preferences || []).filter((p) => p !== 'No mind games');

  return (
    <div className={styles.bodyInner}>
      <div className={styles.mindCard}>
        <div className={styles.mindEmoji}>🧩</div>
        <h3 className={styles.mindTitle}>Mind game coming soon</h3>
        <p className={styles.mindSub}>
          Cognitive exercises will appear here between sets and after workouts.
          Your session will include short games to sharpen focus and give your
          body micro-recovery time.
        </p>
        {prefs.length > 0 && (
          <div className={styles.mindPrefs}>
            {prefs.map((p) => (
              <span key={p} className={styles.mindPrefChip}>{p}</span>
            ))}
          </div>
        )}
        <button className={styles.btnPrimary} onClick={onDone}>
          Continue to rating →
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main SessionPlayer
// ─────────────────────────────────────────────

export default function SessionPlayer({ open, session, sessionMins, isImpromptu, onClose, onRequestRating }) {
  const { user, profile, fitnessProfile } = useAuth();
  const intensityLevel = profile?.intensity_level ?? 2;
  const noMindGames = fitnessProfile?.mind_games?.includes('No mind games') ?? false;
  const mindGamePrefs = fitnessProfile?.mind_games || [];

  // All exercises flattened in order
  const allExercises = session
    ? [...(session.warmup || []), ...(session.main || []), ...(session.cooldown || [])]
    : [];

  // Block labels for each exercise index
  const blockLabels = [];
  if (session) {
    const wLen = session.warmup?.length || 0;
    const mLen = session.main?.length || 0;
    const cLen = session.cooldown?.length || 0;
    for (let i = 0; i < wLen; i++) blockLabels.push('Warm-up');
    for (let i = 0; i < mLen; i++) blockLabels.push('Main');
    for (let i = 0; i < cLen; i++) blockLabels.push('Cooldown');
  }

  const total = allExercises.length;

  // State
  const [phase, setPhase] = useState('workout'); // workout | rest | journal | mind | done
  const [exIndex, setExIndex] = useState(0);
  const [journalText, setJournalText] = useState('');
  const [showExerciseLog, setShowExerciseLog] = useState(false);
  const sessionIdRef = useRef(localDateStr() + '-' + Date.now());

  // Reset on open + wake lock
  useEffect(() => {
    if (open) {
      setPhase('workout');
      setExIndex(0);
      setJournalText('');
      setShowExerciseLog(false);
      sessionIdRef.current = localDateStr() + '-' + Date.now();
      requestWakeLock();
    }
    return () => { releaseWakeLock(); };
  }, [open]);

  const currentEx = allExercises[exIndex] || null;
  const nextEx = allExercises[exIndex + 1] || null;
  const progress = total > 0 ? ((exIndex + 1) / total) * 100 : 0;
  const currentBlock = blockLabels[exIndex] || '';

  const goNext = useCallback(() => {
    if (exIndex < total - 1) {
      // Show rest timer between exercises
      setPhase('rest');
      setShowExerciseLog(true);
    } else {
      // Last exercise done — offer log for last exercise, then journal
      setShowExerciseLog(true);
      setPhase('journal');
    }
  }, [exIndex, total]);

  const handleRestDone = useCallback(() => {
    setExIndex((i) => i + 1);
    setPhase('workout');
  }, []);

  const handleRestSkip = useCallback(() => {
    setExIndex((i) => i + 1);
    setPhase('workout');
  }, []);

  const goPrev = useCallback(() => {
    if (exIndex > 0) {
      setExIndex((i) => i - 1);
      setPhase('workout');
    }
  }, [exIndex]);

  const handleJournalDone = useCallback(() => {
    if (noMindGames) {
      setPhase('done');
    } else {
      setPhase('mind');
    }
  }, [noMindGames]);

  const handleMindDone = useCallback(() => {
    setPhase('done');
  }, []);

  // "done" phase triggers rating and closes
  useEffect(() => {
    if (phase === 'done' && open) {
      const exerciseNames = allExercises.map((e) => e.name);
      const ratingPayload = {
        sessionMins,
        isImpromptu: isImpromptu || false,
        exercisesCompleted: exerciseNames,
        journalEntry: journalText.trim() || null,
      };
      console.log('[SessionPlayer] done phase, triggering rating with:', ratingPayload);
      releaseWakeLock();
      onClose();
      onRequestRating?.(ratingPayload);
    }
  }, [phase, open, onClose, onRequestRating, sessionMins, isImpromptu, allExercises, journalText]);

  if (!open || !session) return null;

  const phaseTitle =
    phase === 'rest'
      ? 'Rest'
      : phase === 'journal'
        ? 'Journal'
        : phase === 'mind'
          ? 'Mind Game'
          : `Exercise ${exIndex + 1} of ${total}`;

  return (
    <div className={styles.overlay}>
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{
            width:
              phase === 'journal'
                ? '85%'
                : phase === 'mind'
                  ? '95%'
                  : `${progress}%`,
          }}
        />
      </div>

      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.phaseLabel}>
            {phase === 'workout' || phase === 'rest' ? 'Workout' : phase === 'journal' ? 'Reflect' : 'Mind'}
          </span>
          <h2 className={styles.headerTitle}>{phaseTitle}</h2>
        </div>
        <button
          className={styles.btnExit}
          onClick={() => {
            if (confirm('End session early? Your progress so far won\'t be saved.')) {
              onClose();
            }
          }}
        >
          End Session
        </button>
      </div>

      <div className={styles.body}>
        {/* ── Workout phase ── */}
        {phase === 'workout' && currentEx && (
          <div className={styles.bodyInner}>
            {/* Show block label when transitioning */}
            {(exIndex === 0 ||
              blockLabels[exIndex] !== blockLabels[exIndex - 1]) && (
              <div className={styles.blockLabel}>{currentBlock}</div>
            )}
            <ExerciseView
              exercise={currentEx}
              intensityLevel={intensityLevel}
              onDone={goNext}
            />
          </div>
        )}

        {/* ── Rest phase ── */}
        {phase === 'rest' && currentEx && (
          <RestTimer
            seconds={currentEx.restSeconds || 60}
            nextExercise={nextEx}
            onDone={handleRestDone}
            onSkip={handleRestSkip}
          />
        )}

        {/* ── Journal phase ── */}
        {phase === 'journal' && (
          <JournalPhase
            onDone={handleJournalDone}
            onSkip={handleJournalDone}
            journalText={journalText}
            setJournalText={setJournalText}
          />
        )}

        {/* ── Mind game phase ── */}
        {phase === 'mind' && (
          <MindGamePhase preferences={mindGamePrefs} onDone={handleMindDone} />
        )}
      </div>

      {/* ── Footer nav (workout phase only) ── */}
      {phase === 'workout' && (
        <div className={styles.footer}>
          <button
            className={styles.btnSecondary}
            onClick={goPrev}
            disabled={exIndex === 0}
          >
            ← Previous
          </button>
          <button className={styles.btnPrimary} onClick={goNext}>
            {exIndex === total - 1
              ? 'Finish Workout →'
              : 'Done — Next Exercise →'}
          </button>
        </div>
      )}

      {/* ── Exercise log modal (overlays rest timer) ── */}
      <ExerciseLogModal
        open={showExerciseLog}
        onClose={() => setShowExerciseLog(false)}
        exercise={currentEx}
        userId={user?.id}
        sessionId={sessionIdRef.current}
        onSaved={() => setShowExerciseLog(false)}
      />
    </div>
  );
}
