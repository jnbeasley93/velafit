import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { localDateStr } from '../lib/dates';
import styles from './LogicPuzzleGame.module.css';

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
];

const PUZZLES_PER_SESSION = 5;

function getDailyPuzzles(dateStr) {
  const d = dateStr || localDateStr();
  let seed = d.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7);
  // Seeded shuffle to pick 5
  const indices = Array.from({ length: PUZZLE_POOL.length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const j = seed % (i + 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, PUZZLES_PER_SESSION).map((i) => PUZZLE_POOL[i]);
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
