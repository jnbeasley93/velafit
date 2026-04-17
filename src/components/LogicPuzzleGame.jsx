import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { localDateStr } from '../lib/dates';
import styles from './LogicPuzzleGame.module.css';

// ── Algorithmic puzzle generator ────────────────
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hashDate(s) { return s.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0); }

function genArithmetic(rng) {
  const start = Math.floor(rng() * 20) + 1;
  const diff = Math.floor(rng() * 10) + 2;
  const len = Math.floor(rng() * 2) + 4;
  const seq = Array.from({ length: len }, (_, i) => start + i * diff);
  return { sequence: [...seq, '?'], answer: start + len * diff, explanation: `Add ${diff} each time.` };
}
function genGeometric(rng) {
  const start = Math.floor(rng() * 5) + 1;
  const ratio = Math.floor(rng() * 3) + 2;
  const len = Math.floor(rng() * 2) + 3;
  const seq = Array.from({ length: len }, (_, i) => start * Math.pow(ratio, i));
  return { sequence: [...seq, '?'], answer: start * Math.pow(ratio, len), explanation: `Multiply by ${ratio} each time.` };
}
function genSquares(rng) {
  const start = Math.floor(rng() * 4) + 1;
  const len = Math.floor(rng() * 2) + 4;
  const seq = Array.from({ length: len }, (_, i) => Math.pow(start + i, 2));
  return { sequence: [...seq, '?'], answer: Math.pow(start + len, 2), explanation: `Perfect squares starting from ${start}\u00B2.` };
}
function genFibonacci(rng) {
  const a = Math.floor(rng() * 5) + 1, b = Math.floor(rng() * 5) + 1;
  const len = Math.floor(rng() * 2) + 5;
  const seq = [a, b]; while (seq.length < len) seq.push(seq[seq.length - 1] + seq[seq.length - 2]);
  return { sequence: [...seq, '?'], answer: seq[seq.length - 1] + seq[seq.length - 2], explanation: 'Each number is the sum of the two before it.' };
}
function genDoublePlusOne(rng) {
  const start = Math.floor(rng() * 5) + 1;
  const len = Math.floor(rng() * 2) + 4;
  const seq = [start]; while (seq.length < len) seq.push(seq[seq.length - 1] * 2 + 1);
  return { sequence: [...seq, '?'], answer: seq[seq.length - 1] * 2 + 1, explanation: 'Double the previous number then add 1.' };
}
function genSubtracting(rng) {
  const start = Math.floor(rng() * 50) + 50;
  const diff = Math.floor(rng() * 10) + 2;
  const len = Math.floor(rng() * 2) + 4;
  const seq = Array.from({ length: len }, (_, i) => start - i * diff);
  return { sequence: [...seq, '?'], answer: start - len * diff, explanation: `Subtract ${diff} each time.` };
}
function genIncreasingDiff(rng) {
  const start = Math.floor(rng() * 10) + 1;
  const initDiff = Math.floor(rng() * 3) + 1;
  const len = Math.floor(rng() * 2) + 4;
  const seq = [start]; for (let i = 1; i < len; i++) seq.push(seq[i - 1] + initDiff + (i - 1));
  return { sequence: [...seq, '?'], answer: seq[seq.length - 1] + initDiff + (len - 1), explanation: `Add increasing numbers: +${initDiff}, +${initDiff + 1}, +${initDiff + 2}...` };
}
function genPrimes(rng) {
  const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];
  const start = Math.floor(rng() * 8);
  const len = Math.floor(rng() * 2) + 4;
  return { sequence: [...primes.slice(start, start + len), '?'], answer: primes[start + len], explanation: 'Prime numbers in order.' };
}
const GENERATORS = [genArithmetic, genGeometric, genSquares, genFibonacci, genDoublePlusOne, genSubtracting, genIncreasingDiff, genPrimes];

function generateDailyPuzzles(dateStr, count = 5) {
  const seed = Math.abs(hashDate(dateStr + '-logic'));
  const rng = mulberry32(seed);
  const puzzles = [];
  const used = new Set();
  let attempts = 0;
  while (puzzles.length < count && attempts < 50) {
    attempts++;
    const unused = GENERATORS.map((_, i) => i).filter((i) => !used.has(i));
    const genIdx = unused.length > 0 ? unused[Math.floor(rng() * unused.length)] : Math.floor(rng() * GENERATORS.length);
    used.add(genIdx);
    try {
      const p = GENERATORS[genIdx](rng);
      if (typeof p.answer === 'number' && isFinite(p.answer) && p.answer >= -100 && p.answer < 100000) puzzles.push(p);
    } catch { /* skip */ }
  }
  return puzzles;
}

// Keep a static fallback pool for edge cases where generators produce < 5 valid puzzles
const PUZZLE_POOL = [
  { sequence: [2, 4, 8, 16, '?'], answer: 32, explanation: 'Each number doubles.' },
  { sequence: [1, 4, 9, 16, '?'], answer: 25, explanation: 'Perfect squares: 1\u00B2, 2\u00B2, 3\u00B2, 4\u00B2, 5\u00B2.' },
  { sequence: [3, 6, 9, 12, '?'], answer: 15, explanation: 'Multiples of 3.' },
  { sequence: [1, 1, 2, 3, 5, '?'], answer: 8, explanation: 'Fibonacci sequence \u2014 each number is the sum of the two before it.' },
  { sequence: [100, 50, 25, '?'], answer: 12.5, explanation: 'Each number is halved.' },
  { sequence: [1, 3, 7, 15, '?'], answer: 31, explanation: 'Each number doubles then adds 1.' },
  { sequence: [5, 10, 20, 40, '?'], answer: 80, explanation: 'Each number doubles.' },
  { sequence: [2, 5, 10, 17, '?'], answer: 26, explanation: 'Add consecutive odd numbers: +3, +5, +7, +9.' },
  { sequence: [81, 27, 9, 3, '?'], answer: 1, explanation: 'Each number is divided by 3.' },
  { sequence: [0, 1, 4, 9, 16, '?'], answer: 25, explanation: 'Square numbers starting from 0.' },
  { sequence: [7, 14, 21, 28, '?'], answer: 35, explanation: 'Multiples of 7.' },
  { sequence: [1, 2, 4, 7, 11, '?'], answer: 16, explanation: 'Add increasing numbers: +1, +2, +3, +4, +5.' },
  { sequence: [512, 256, 128, 64, '?'], answer: 32, explanation: 'Each number is halved.' },
  { sequence: [3, 9, 27, 81, '?'], answer: 243, explanation: 'Each number multiplied by 3.' },
  { sequence: [1, 8, 27, 64, '?'], answer: 125, explanation: 'Perfect cubes: 1\u00B3, 2\u00B3, 3\u00B3, 4\u00B3, 5\u00B3.' },
  { sequence: [10, 9, 7, 4, '?'], answer: 0, explanation: 'Subtract increasing numbers: -1, -2, -3, -4.' },
  { sequence: [2, 3, 5, 7, 11, '?'], answer: 13, explanation: 'Prime numbers in order.' },
  { sequence: [1, 5, 14, 30, '?'], answer: 55, explanation: 'Tetrahedral numbers.' },
  { sequence: [4, 7, 12, 19, 28, '?'], answer: 39, explanation: 'Add consecutive odd numbers: +3, +5, +7, +9, +11.' },
  { sequence: [1000, 100, 10, '?'], answer: 1, explanation: 'Each number divided by 10.' },
  { sequence: [1, 2, 6, 24, '?'], answer: 120, explanation: 'Factorials: 1!, 2!, 3!, 4!, 5!' },
  { sequence: [1, 3, 6, 10, '?'], answer: 15, explanation: 'Triangular numbers \u2014 add 2, 3, 4, 5.' },
  { sequence: [2, 6, 12, 20, '?'], answer: 30, explanation: 'n \u00D7 (n+1): 1\u00D72, 2\u00D73, 3\u00D74, 4\u00D75, 5\u00D76.' },
  { sequence: [1, 4, 13, 40, '?'], answer: 121, explanation: 'Multiply by 3 then add 1.' },
  { sequence: [64, 32, 16, 8, '?'], answer: 4, explanation: 'Each number is halved.' },
  { sequence: [1, 2, 3, 5, 8, 13, '?'], answer: 21, explanation: 'Fibonacci \u2014 sum of two previous.' },
  { sequence: [4, 9, 16, 25, 36, '?'], answer: 49, explanation: 'Perfect squares: 2\u00B2, 3\u00B2, 4\u00B2, 5\u00B2, 6\u00B2, 7\u00B2.' },
  { sequence: [6, 11, 16, 21, '?'], answer: 26, explanation: 'Add 5 each time.' },
  { sequence: [3, 7, 15, 31, '?'], answer: 63, explanation: 'Double then add 1.' },
  { sequence: [1000, 500, 250, 125, '?'], answer: 62.5, explanation: 'Each number is halved.' },
  { sequence: [2, 9, 28, 65, '?'], answer: 126, explanation: 'n\u00B3 + 1: 1\u00B3+1, 2\u00B3+1, 3\u00B3+1, 4\u00B3+1, 5\u00B3+1.' },
  { sequence: [0, 3, 8, 15, 24, '?'], answer: 35, explanation: 'n\u00B2 - 1: 0, 3, 8, 15, 24, 35.' },
  { sequence: [5, 11, 23, 47, '?'], answer: 95, explanation: 'Double then add 1.' },
  { sequence: [1, 6, 15, 28, '?'], answer: 45, explanation: 'Hexagonal numbers.' },
  { sequence: [2, 4, 12, 48, '?'], answer: 240, explanation: 'Multiply by 1, 2, 3, 4, 5.' },
  { sequence: [100, 91, 83, 76, '?'], answer: 70, explanation: 'Subtract 9, 8, 7, 6.' },
  { sequence: [3, 5, 8, 13, 21, '?'], answer: 34, explanation: 'Fibonacci-like \u2014 each is sum of previous two.' },
  { sequence: [256, 64, 16, 4, '?'], answer: 1, explanation: 'Each divided by 4.' },
  { sequence: [1, 10, 100, 1000, '?'], answer: 10000, explanation: 'Multiply by 10.' },
  { sequence: [7, 8, 10, 13, 17, '?'], answer: 22, explanation: 'Add 1, 2, 3, 4, 5.' },
  { sequence: [2, 3, 5, 8, 12, '?'], answer: 17, explanation: 'Add consecutive numbers: +1, +2, +3, +4, +5.' },
  { sequence: [36, 30, 24, 18, '?'], answer: 12, explanation: 'Subtract 6 each time.' },
  { sequence: [4, 16, 36, 64, '?'], answer: 100, explanation: 'Even perfect squares: 2\u00B2, 4\u00B2, 6\u00B2, 8\u00B2, 10\u00B2.' },
  { sequence: [1, 3, 9, 27, 81, '?'], answer: 243, explanation: 'Multiply by 3 each time.' },
  { sequence: [50, 48, 44, 38, 30, '?'], answer: 20, explanation: 'Subtract 2, 4, 6, 8, 10.' },
  { sequence: [1, 5, 9, 13, '?'], answer: 17, explanation: 'Add 4 each time.' },
  { sequence: [6, 7, 9, 12, 16, '?'], answer: 21, explanation: 'Add 1, 2, 3, 4, 5.' },
  { sequence: [8, 4, 2, 1, '?'], answer: 0.5, explanation: 'Each number is halved.' },
  { sequence: [1, 2, 4, 8, 16, 32, '?'], answer: 64, explanation: 'Each number doubles.' },
  { sequence: [9, 18, 36, 72, '?'], answer: 144, explanation: 'Each number doubles.' },
];

const PUZZLES_PER_SESSION = 5;

function getDailyPuzzles(dateStr) {
  const d = dateStr || localDateStr();
  // Try algorithmic generation first
  const generated = generateDailyPuzzles(d, PUZZLES_PER_SESSION);
  if (generated.length >= PUZZLES_PER_SESSION) return generated;
  // Fallback: pad with static pool
  let seed = d.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7);
  const indices = Array.from({ length: PUZZLE_POOL.length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const j = seed % (i + 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const fallback = indices.map((i) => PUZZLE_POOL[i]);
  return [...generated, ...fallback].slice(0, PUZZLES_PER_SESSION);
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function LogicPuzzleGame() {
  const { user } = useAuth();
  const today = localDateStr();
  const [puzzles] = useState(() => getDailyPuzzles(today));

  // Already-completed check
  const [loadingCheck, setLoadingCheck] = useState(true);
  const [alreadyCompleted, setAlreadyCompleted] = useState(null);

  useEffect(() => {
    if (!user) { setLoadingCheck(false); return; }
    (async () => {
      const { data } = await supabase
        .from('mind_game_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', localDateStr())
        .eq('game_type', 'logic-puzzle')
        .eq('completed', true)
        .limit(1);
      if (data && data.length > 0) setAlreadyCompleted(data[0]);
      setLoadingCheck(false);
    })();
  }, [user]);
  const [current, setCurrent] = useState(0);
  const [input, setInput] = useState('');
  const [attempt, setAttempt] = useState(1); // 1 or 2
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null); // { correct, explanation }
  const [finished, setFinished] = useState(false);
  const [savedToDb, setSavedToDb] = useState(false);

  // Timer
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (finished) return;
    intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(intervalRef.current);
  }, [finished]);

  const puzzle = puzzles[current];

  const handleSubmit = useCallback(() => {
    const num = parseFloat(input);
    if (isNaN(num)) return;

    const correct = num === puzzle.answer;
    if (correct) {
      const pts = attempt === 1 ? 10 : 5;
      setScore((s) => s + pts);
      setFeedback({ correct: true, explanation: puzzle.explanation, pts });
    } else if (attempt === 1) {
      setAttempt(2);
      setInput('');
      setFeedback({ correct: false, explanation: null, msg: 'Not quite. One more try.' });
      return; // Don't show explanation yet
    } else {
      setFeedback({ correct: false, explanation: puzzle.explanation, msg: `The answer was ${puzzle.answer}.` });
    }
  }, [input, puzzle, attempt]);

  const handleNext = useCallback(() => {
    if (current + 1 >= PUZZLES_PER_SESSION) {
      setFinished(true);
    } else {
      setCurrent((c) => c + 1);
      setInput('');
      setAttempt(1);
      setFeedback(null);
    }
  }, [current]);

  // Save to DB
  useEffect(() => {
    if (!finished || savedToDb || !user) return;
    (async () => {
      const { error } = await supabase.from('mind_game_logs').insert({
        user_id: user.id,
        date: localDateStr(),
        game_type: 'logic-puzzle',
        completed: true,
        duration_seconds: seconds,
        hints_used: 0,
      });
      if (error) console.error('[LogicPuzzle] save failed:', error);
      else setSavedToDb(true);
    })();
  }, [finished, savedToDb, user, seconds]);

  if (loadingCheck) {
    return (
      <div className={styles.wrap}>
        <p style={{ textAlign: 'center', color: 'var(--stone)', padding: '2rem 0' }}>Loading...</p>
      </div>
    );
  }

  if (alreadyCompleted) {
    return (
      <div className={styles.wrap}>
        <div className={styles.endState}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>&#10003;</div>
          <h3 className={styles.endTitle}>You already completed today's puzzle!</h3>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.9rem', color: 'var(--stone)', marginBottom: '0.25rem' }}>
            Time: {formatTime(alreadyCompleted.duration_seconds)}
          </p>
          <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1rem', color: 'var(--green-accent)', margin: '1rem 0', lineHeight: 1.5 }}>
            Logic is a muscle. You just trained it.
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--stone)' }}>Come back tomorrow for a new puzzle &#x1F438;</p>
        </div>
      </div>
    );
  }

  if (finished) {
    const maxScore = PUZZLES_PER_SESSION * 10;
    return (
      <div className={styles.wrap}>
        <div className={styles.endState}>
          <div className={styles.endEmoji}>🐸</div>
          <h3 className={styles.endTitle}>
            {score >= maxScore * 0.8 ? 'Brilliant.' : score >= maxScore * 0.5 ? 'Nice work.' : 'Keep at it.'}
          </h3>
          <p className={styles.endSub}>
            {score} / {maxScore} points
          </p>
          <p className={styles.timer}>{formatTime(seconds)}</p>
          <p style={{ fontSize: '0.82rem', color: 'var(--stone)', fontWeight: 300, marginTop: '0.75rem' }}>
            Come back tomorrow for a new set.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Logic</h3>
          <p className={styles.progress}>
            Puzzle {current + 1} of {PUZZLES_PER_SESSION}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p className={styles.score}>{score} pts</p>
          <p className={styles.timer}>{formatTime(seconds)}</p>
        </div>
      </div>

      <div className={styles.seqRow}>
        {puzzle.sequence.map((v, i) => (
          <div
            key={i}
            className={v === '?' ? styles.seqMissing : styles.seqNum}
          >
            {v}
          </div>
        ))}
      </div>

      {!feedback?.explanation && (
        <>
          <p className={styles.attempts}>
            Attempt {attempt} of 2
            {attempt === 1 ? ' \u2014 +10 pts' : ' \u2014 +5 pts'}
          </p>
          <div className={styles.inputRow}>
            <input
              className={styles.answerInput}
              type="number"
              step="any"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="?"
              autoFocus
            />
            <button
              className={styles.btnSubmit}
              onClick={handleSubmit}
              disabled={!input}
            >
              Submit
            </button>
          </div>

          {feedback && !feedback.explanation && (
            <div className={styles.explanationWrong}>
              {feedback.msg}
            </div>
          )}
        </>
      )}

      {feedback?.explanation && (
        <>
          <div className={feedback.correct ? styles.explanationCorrect : styles.explanationWrong}>
            {feedback.correct
              ? `Correct! +${feedback.pts} points`
              : feedback.msg}
            <p className={styles.explanationText}>{feedback.explanation}</p>
          </div>
          <button className={styles.btnNext} onClick={handleNext}>
            {current + 1 >= PUZZLES_PER_SESSION ? 'See Results' : 'Next Puzzle \u2192'}
          </button>
        </>
      )}
    </div>
  );
}
