import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { localDateStr } from '../lib/dates';
import {
  getDailyPuzzle,
  generateSolution,
  createPuzzle,
  isSolved,
  isValidPlacement,
} from '../lib/sudoku';
import styles from './SudokuGame.module.css';

const MAX_HINTS = 3;

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function cloneBoard(board) {
  return board.map((row) => [...row]);
}

export default function SudokuGame() {
  const { user } = useAuth();

  // Puzzle state
  const [daily, setDaily] = useState(() => getDailyPuzzle());
  const [board, setBoard] = useState(() => cloneBoard(daily.puzzle));
  const [clues, setClues] = useState(() => cloneBoard(daily.puzzle));
  const [selected, setSelected] = useState(null); // { r, c }
  const [errors, setErrors] = useState(new Set()); // Set of "r-c" keys
  const [hintsUsed, setHintsUsed] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [savedToDb, setSavedToDb] = useState(false);

  // Timer
  const [seconds, setSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (paused || completed) return;
    intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(intervalRef.current);
  }, [paused, completed]);

  const cellKey = (r, c) => `${r}-${c}`;

  const handleCellClick = useCallback(
    (r, c) => {
      if (completed || paused) return;
      if (clues[r][c] !== 0) return; // can't select clue cells
      setSelected({ r, c });
    },
    [clues, completed, paused],
  );

  const handleNumberInput = useCallback(
    (num) => {
      if (!selected || completed || paused) return;
      const { r, c } = selected;
      if (clues[r][c] !== 0) return;

      setBoard((prev) => {
        const next = cloneBoard(prev);
        next[r][c] = num;
        return next;
      });

      // Clear this cell's error if present
      setErrors((prev) => {
        const next = new Set(prev);
        next.delete(cellKey(r, c));
        return next;
      });
    },
    [selected, clues, completed, paused],
  );

  const handleErase = useCallback(() => {
    if (!selected || completed || paused) return;
    const { r, c } = selected;
    if (clues[r][c] !== 0) return;
    setBoard((prev) => {
      const next = cloneBoard(prev);
      next[r][c] = 0;
      return next;
    });
    setErrors((prev) => {
      const next = new Set(prev);
      next.delete(cellKey(r, c));
      return next;
    });
  }, [selected, clues, completed, paused]);

  const handleCheck = useCallback(() => {
    const newErrors = new Set();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const val = board[r][c];
        if (val !== 0 && clues[r][c] === 0) {
          if (val !== daily.solution[r][c]) {
            newErrors.add(cellKey(r, c));
          }
        }
      }
    }
    setErrors(newErrors);
  }, [board, clues, daily.solution]);

  const handleHint = useCallback(() => {
    if (hintsUsed >= MAX_HINTS || completed) return;
    // Find all empty/incorrect cells
    const candidates = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (clues[r][c] === 0 && board[r][c] !== daily.solution[r][c]) {
          candidates.push({ r, c });
        }
      }
    }
    if (candidates.length === 0) return;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    setBoard((prev) => {
      const next = cloneBoard(prev);
      next[pick.r][pick.c] = daily.solution[pick.r][pick.c];
      return next;
    });
    setErrors((prev) => {
      const next = new Set(prev);
      next.delete(cellKey(pick.r, pick.c));
      return next;
    });
    setHintsUsed((n) => n + 1);
  }, [board, clues, daily.solution, hintsUsed, completed]);

  const handleNewPuzzle = useCallback(() => {
    if (!confirm('Generate a fresh puzzle? Your current progress will be lost.')) return;
    // Use a random (non-daily) seed for a fresh puzzle
    const seed = Math.floor(Math.random() * 2 ** 32);
    const solution = generateSolution(seed);
    const puzzle = createPuzzle(solution, 'medium', seed);
    const fresh = {
      puzzle,
      solution,
      date: localDateStr(),
      difficulty: 'medium',
    };
    setDaily(fresh);
    setBoard(cloneBoard(puzzle));
    setClues(cloneBoard(puzzle));
    setSelected(null);
    setErrors(new Set());
    setHintsUsed(0);
    setCompleted(false);
    setSavedToDb(false);
    setSeconds(0);
    setPaused(false);
  }, []);

  // Detect completion
  useEffect(() => {
    if (completed) return;
    const filled = board.every((row) => row.every((v) => v !== 0));
    if (filled && isSolved(board)) {
      setCompleted(true);
      setPaused(true);
    }
  }, [board, completed]);

  // Save completion to Supabase once
  useEffect(() => {
    if (!completed || savedToDb || !user) return;
    (async () => {
      const { error } = await supabase.from('mind_game_logs').insert({
        user_id: user.id,
        date: localDateStr(),
        game_type: 'sudoku',
        completed: true,
        duration_seconds: seconds,
        hints_used: hintsUsed,
      });
      if (error) {
        console.error('[SudokuGame] save failed:', error);
      } else {
        setSavedToDb(true);
      }
    })();
  }, [completed, savedToDb, user, seconds, hintsUsed]);

  const togglePause = useCallback(() => {
    if (completed) return;
    setPaused((p) => !p);
  }, [completed]);

  const isClue = (r, c) => clues[r][c] !== 0;

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h3 className={styles.title}>Daily Puzzle</h3>
          <div className={styles.dateLine}>
            <span>{new Date(daily.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            <span className={styles.diffBadge}>{daily.difficulty}</span>
          </div>
        </div>
        <div className={styles.timerBox}>
          <span className={styles.timer}>{formatTime(seconds)}</span>
          <button className={styles.pauseBtn} onClick={togglePause} disabled={completed}>
            {paused ? '▶' : '❚❚'}
          </button>
        </div>
      </div>

      <div className={styles.gridContainer}>
        <div className={styles.grid}>
          {board.map((row, r) =>
            row.map((val, c) => {
              const key = cellKey(r, c);
              const isErr = errors.has(key);
              const isSel = selected?.r === r && selected?.c === c;
              let className;
              if (isClue(r, c)) className = styles.cellClue;
              else if (isSel && isErr) className = styles.cellSelectedError;
              else if (isSel) className = styles.cellSelected;
              else if (isErr) className = styles.cellError;
              else className = styles.cell;

              // Add thicker bottom border for rows 2, 5
              const style = {};
              if (r === 2 || r === 5) style.borderBottom = '2px solid var(--charcoal)';

              return (
                <div
                  key={key}
                  className={className}
                  style={style}
                  onClick={() => handleCellClick(r, c)}
                >
                  {val !== 0 ? val : ''}
                </div>
              );
            }),
          )}
        </div>
        {paused && !completed && (
          <div className={styles.pauseOverlay}>Paused</div>
        )}
      </div>

      <div className={styles.numPad}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} className={styles.numBtn} onClick={() => handleNumberInput(n)}>
            {n}
          </button>
        ))}
        {[6, 7, 8, 9].map((n) => (
          <button key={n} className={styles.numBtn} onClick={() => handleNumberInput(n)}>
            {n}
          </button>
        ))}
        <button className={styles.numBtnErase} onClick={handleErase}>
          ⌫
        </button>
      </div>

      <div className={styles.controls}>
        <button className={styles.ctrlBtn} onClick={handleNewPuzzle}>
          New Puzzle
        </button>
        <button className={styles.ctrlBtn} onClick={handleCheck}>
          Check
        </button>
        <button
          className={styles.ctrlBtn}
          onClick={handleHint}
          disabled={hintsUsed >= MAX_HINTS}
        >
          Hint
        </button>
      </div>
      <p className={styles.hintsLeft}>
        {MAX_HINTS - hintsUsed} hint{MAX_HINTS - hintsUsed === 1 ? '' : 's'} left
      </p>

      {completed && (
        <div className={styles.completeOverlay}>
          <div className={styles.completeEmoji}>🐸</div>
          <h2 className={styles.completeTitle}>Sharp mind.</h2>
          <p className={styles.completeTime}>
            {formatTime(seconds)} · {hintsUsed} hint{hintsUsed === 1 ? '' : 's'}
          </p>
          <p className={styles.completeMsg}>
            Come back tomorrow for a new puzzle. Consistency compounds —
            for your body and your mind.
          </p>
          <button className={styles.btnClose} onClick={() => setCompleted(false)}>
            Done
          </button>
        </div>
      )}
    </div>
  );
}
