import { useState, useEffect, useRef, useCallback } from 'react';
import velaImg from '../assets/vela.jpg';
import styles from './BreathingPlayer.module.css';

// ─────────────────────────────────────────────
// Box Breathing
// ─────────────────────────────────────────────

const BOX_PHASES = [
  { name: 'Inhale', duration: 4, expand: true },
  { name: 'Hold', duration: 4, expand: false, full: true },
  { name: 'Exhale', duration: 4, expand: false },
  { name: 'Hold', duration: 4, expand: false, empty: true },
];
const BOX_TOTAL_ROUNDS = 8;

function BoxBreathing({ onComplete }) {
  const [round, setRound] = useState(1);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [secLeft, setSecLeft] = useState(BOX_PHASES[0].duration);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecLeft((s) => {
        if (s > 1) return s - 1;
        // Advance phase
        setPhaseIdx((idx) => {
          const next = (idx + 1) % BOX_PHASES.length;
          if (next === 0) {
            setRound((r) => {
              if (r >= BOX_TOTAL_ROUNDS) {
                clearInterval(interval);
                setTimeout(onComplete, 500);
                return r;
              }
              return r + 1;
            });
          }
          return next;
        });
        return BOX_PHASES[(phaseIdx + 1) % BOX_PHASES.length].duration;
      });
    }, 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseIdx]);

  const phase = BOX_PHASES[phaseIdx];
  // Circle radius animates: 50 (small) → 95 (large) → 95 (hold full) → 50 (small) → 50 (hold empty)
  let radius = 50;
  if (phase.name === 'Inhale') radius = 95;
  else if (phase.full) radius = 95;
  else if (phase.name === 'Exhale') radius = 50;
  else radius = 50;

  return (
    <div className={styles.boxWrap}>
      <p className={styles.roundCounter}>
        Round {round} of {BOX_TOTAL_ROUNDS}
      </p>
      <div className={styles.boxCircle}>
        <svg viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="95" className={styles.boxCircleBg} />
          <circle
            cx="100"
            cy="100"
            r={radius}
            className={styles.boxCircleAnim}
          />
        </svg>
        <div className={styles.boxLabel}>
          <span className={styles.phaseText}>{phase.name}</span>
          <span className={styles.phaseCount}>{secLeft}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Free Timer
// ─────────────────────────────────────────────

const RING_R = 118;
const RING_C = 2 * Math.PI * RING_R;

function FreeTimer({ minutes, onComplete }) {
  const totalSec = minutes * 60;
  const [remaining, setRemaining] = useState(totalSec);

  useEffect(() => {
    if (remaining <= 0) {
      onComplete();
      return;
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, onComplete]);

  const fraction = remaining / totalSec;
  const offset = RING_C * (1 - fraction);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const display = `${mins}:${secs.toString().padStart(2, '0')}`;

  return (
    <div className={styles.freeWrap}>
      <div className={styles.freeRing}>
        <svg viewBox="0 0 260 260">
          <circle cx="130" cy="130" r={RING_R} className={styles.freeRingBg} />
          <circle
            cx="130"
            cy="130"
            r={RING_R}
            className={styles.freeRingFill}
            strokeDasharray={RING_C}
            strokeDashoffset={offset}
          />
        </svg>
        <div className={styles.freeRingInner}>
          <img src={velaImg} alt="Vela" className={styles.velaSmall} />
          <span className={styles.freeTime}>{display}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Body Scan
// ─────────────────────────────────────────────

const BODY_SCAN_STEPS = [
  { text: 'Find a comfortable position. Close your eyes if you can. Take three slow breaths.', duration: 30 },
  { text: 'Bring your attention to the top of your head. Notice any tension there. Let it soften.', duration: 15 },
  { text: 'Move your awareness to your forehead and eyes. Let them relax completely.', duration: 15 },
  { text: 'Soften your jaw. Let your tongue rest. Unclench your teeth.', duration: 15 },
  { text: 'Bring attention to your neck and shoulders. This is where we carry so much. Let it drop.', duration: 20 },
  { text: 'Notice your chest and heart. Feel it beating steadily. You are safe.', duration: 20 },
  { text: 'Move to your stomach and lower back. Let your breath expand here.', duration: 15 },
  { text: 'Your arms and hands. Unclench your fists. Let your fingers go loose.', duration: 15 },
  { text: 'Your hips, thighs, and knees. Heavy and warm.', duration: 15 },
  { text: 'Your calves, ankles, and feet. Let them sink.', duration: 15 },
  { text: 'Your whole body now. Completely supported. Nothing to do. Nowhere to be.', duration: 30 },
  { text: "When you're ready, gently bring your attention back. Take a slow breath in. Open your eyes.", duration: 20 },
];

function BodyScan({ onComplete, skipRef }) {
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    if (stepIdx >= BODY_SCAN_STEPS.length) {
      onComplete();
      return;
    }
    const ms = BODY_SCAN_STEPS[stepIdx].duration * 1000;
    const t = setTimeout(() => setStepIdx((i) => i + 1), ms);
    return () => clearTimeout(t);
  }, [stepIdx, onComplete]);

  // Expose skip function via ref
  useEffect(() => {
    if (skipRef) {
      skipRef.current = () => setStepIdx(BODY_SCAN_STEPS.length);
    }
  }, [skipRef]);

  const current = BODY_SCAN_STEPS[stepIdx];
  if (!current) return null;
  const progress = ((stepIdx + 1) / BODY_SCAN_STEPS.length) * 100;

  return (
    <div className={styles.scanWrap}>
      <p className={styles.scanText} key={stepIdx}>{current.text}</p>
      <div className={styles.scanProgress}>
        <div className={styles.scanProgressFill} style={{ width: `${progress}%` }} />
      </div>
      <img src={velaImg} alt="Vela" className={styles.velaScanFooter} />
    </div>
  );
}

// ─────────────────────────────────────────────
// Completion
// ─────────────────────────────────────────────

function Completion({ message, onDone }) {
  return (
    <div className={styles.completeWrap}>
      <img src={velaImg} alt="Vela" className={styles.completeVela} />
      <p className={styles.completeText}>{message}</p>
      <button className={styles.btnDone} onClick={onDone}>
        Done
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Player
// ─────────────────────────────────────────────

const MODE_LABELS = {
  box: 'Box Breathing',
  free: 'Free Timer',
  bodyscan: 'Guided Body Scan',
};

const COMPLETION_MESSAGES = {
  box: 'Well done. Your nervous system thanks you. 🐸',
  free: 'You took the time. That matters. 🐸',
  bodyscan: 'You gave yourself stillness. That matters. 🐸',
};

export default function BreathingPlayer({ open, session, onClose }) {
  const [completed, setCompleted] = useState(false);
  const skipRef = useRef(null);

  // Reset on open
  useEffect(() => {
    if (open) setCompleted(false);
  }, [open, session]);

  const handleComplete = useCallback(() => {
    setCompleted(true);
  }, []);

  const handleEnd = useCallback(() => {
    if (confirm('End this session early?')) {
      onClose();
    }
  }, [onClose]);

  if (!open || !session) return null;

  const { mode, minutes } = session;

  return (
    <div className={styles.overlay}>
      <div className={styles.header}>
        <span className={styles.modeLabel}>{MODE_LABELS[mode]}</span>
        <button
          className={styles.btnExit}
          onClick={completed ? onClose : (mode === 'bodyscan' ? () => skipRef.current?.() : handleEnd)}
        >
          {completed ? 'Close' : (mode === 'bodyscan' ? 'Skip to end' : 'End session')}
        </button>
      </div>

      <div className={styles.body}>
        {completed ? (
          <Completion message={COMPLETION_MESSAGES[mode]} onDone={onClose} />
        ) : mode === 'box' ? (
          <BoxBreathing onComplete={handleComplete} />
        ) : mode === 'free' ? (
          <FreeTimer minutes={minutes || 5} onComplete={handleComplete} />
        ) : mode === 'bodyscan' ? (
          <BodyScan onComplete={handleComplete} skipRef={skipRef} />
        ) : null}
      </div>
    </div>
  );
}
