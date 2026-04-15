import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { localDateStr } from '../lib/dates';
import {
  getDailyPuzzle,
  generateSolution,
  createPuzzle,
  isSolved,
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

function emptyNotes() {
  return Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => new Set()),
  );
}

function cloneNotes(notes) {
  return notes.map((row) => row.map((s) => new Set(s)));
}

export default function SudokuGame() {
  const { user } = useAuth();

  // Puzzle state
  const [daily, setDaily] = useState(() => getDailyPuzzle());
  const [board, setBoard] = useState(() => cloneBoard(daily.puzzle));
  const [clues, setClues] = useState(() => cloneBoard(daily.puzzle));
  const [selected, setSelected] = useState(null); // { r, c }
  const [errors, setErrors] = useState(new Set());
  const [notes, setNotes] = useState(emptyNotes);
  const [notesMode, setNotesMode] = useState(false);
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

  // Allow selecting clue cells for highlighting (but not editing)
  const handleCellClick = useCallback(
    (r, c) => {
      if (completed || paused) return;
      setSelected({ r, c });
    },
    [completed, paused],
  );

  // Clear notes for a number from related cells (same row, col, box)
  const clearRelatedNotes = useCallback((r, c, num) => {
    setNotes((prev) => {
      const next = cloneNotes(prev);
      const boxR = Math.floor(r / 3) * 3;
      const boxC = Math.floor(c / 3) * 3;
      for (let i = 0; i < 9; i++) {
        next[r][i].delete(num); // row
        next[i][c].delete(num); // col
      }
      for (let dr = 0; dr < 3; dr++) {
        for (let dc = 0; dc < 3; dc++) {
          next[boxR + dr][boxC + dc].delete(num); // box
        }
      }
      return next;
    });
  }, []);

  const handleNumberInput = useCallback(
    (num) => {
      if (!selected || completed || paused) return;
      const { r, c } = selected;
      if (clues[r][c] !== 0) return;

      if (notesMode) {
        // Toggle note
        setNotes((prev) => {
          const next = cloneNotes(prev);
          if (next[r][c].has(num)) next[r][c].delete(num);
          else next[r][c].add(num);
          return next;
        });
        // Clear the cell value if it had one
        setBoard((prev) => {
          if (prev[r][c] === 0) return prev;
          const next = cloneBoard(prev);
          next[r][c] = 0;
          return next;
        });
      } else {
        // Place number — clear notes for this cell and related cells
        setBoard((prev) => {
          const next = cloneBoard(prev);
          next[r][c] = num;
          return next;
        });
        setNotes((prev) => {
          const next = cloneNotes(prev);
          next[r][c].clear();
          return next;
        });
        clearRelatedNotes(r, c, num);
        setErrors((prev) => {
          const next = new Set(prev);
          next.delete(cellKey(r, c));
          return next;
        });
      }
    },
    [selected, clues, completed, paused, notesMode, clearRelatedNotes],
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
    setNotes((prev) => {
      const next = cloneNotes(prev);
      next[r][c].clear();
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
    const num = daily.solution[pick.r][pick.c];
    setBoard((prev) => {
      const next = cloneBoard(prev);
      next[pick.r][pick.c] = num;
      return next;
    });
    setNotes((prev) => {
      const next = cloneNotes(prev);
      next[pick.r][pick.c].clear();
      return next;
    });
    clearRelatedNotes(pick.r, pick.c, num);
    setErrors((prev) => {
      const next = new Set(prev);
      next.delete(cellKey(pick.r, pick.c));
      return next;
    });
    setHintsUsed((n) => n + 1);
  }, [board, clues, daily.solution, hintsUsed, completed, clearRelatedNotes]);

  const handleNewPuzzle = useCallback(() => {
    if (!confirm('Generate a fresh puzzle? Your current progress will be lost.')) return;
    const seed = Math.floor(Math.random() * 2 ** 32);
    const solution = generateSolution(seed);
    const puzzle = createPuzzle(solution, 'medium', seed);
    setDaily({ puzzle, solution, date: localDateStr(), difficulty: 'medium' });
    setBoard(cloneBoard(puzzle));
    setClues(cloneBoard(puzzle));
    setSelected(null);
    setErrors(new Set());
    setNotes(emptyNotes());
    setNotesMode(false);
    setHintsUsed(0);
    setCompleted(false);
    setSavedToDb(false);
    setSeconds(0);
    setPaused(false);
  }, []);

  // Keyboard input
  useEffect(() => {
    const onKey = (e) => {
      if (completed || paused) return;

      // Number keys
      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        handleNumberInput(parseInt(e.key, 10));
        return;
      }

      // Erase
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleErase();
        return;
      }

      // Escape — deselect
      if (e.key === 'Escape') {
        setSelected(null);
        return;
      }

      // Arrow keys — move selection
      if (selected && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        setSelected((prev) => {
          if (!prev) return prev;
          let { r, c } = prev;
          if (e.key === 'ArrowUp') r = Math.max(0, r - 1);
          if (e.key === 'ArrowDown') r = Math.min(8, r + 1);
          if (e.key === 'ArrowLeft') c = Math.max(0, c - 1);
          if (e.key === 'ArrowRight') c = Math.min(8, c + 1);
          return { r, c };
        });
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [completed, paused, selected, handleNumberInput, handleErase]);

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
      if (error) console.error('[SudokuGame] save failed:', error);
      else setSavedToDb(true);
    })();
  }, [completed, savedToDb, user, seconds, hintsUsed]);

  const togglePause = useCallback(() => {
    if (completed) return;
    setPaused((p) => !p);
  }, [completed]);

  // ── Cell highlight logic ─────────────────────
  const selectedVal = selected
    ? (board[selected.r][selected.c] || clues[selected.r][selected.c])
    : 0;

  function getCellHighlight(r, c) {
    if (!selected) return null;
    const sr = selected.r;
    const sc = selected.c;
    if (r === sr && c === sc) return 'selected';
    // Same row or column
    if (r === sr || c === sc) return 'rowcol';
    // Same 3x3 box
    if (Math.floor(r / 3) === Math.floor(sr / 3) &&
        Math.floor(c / 3) === Math.floor(sc / 3)) return 'box';
    // Same number
    const cellVal = board[r][c] || clues[r][c];
    if (selectedVal && cellVal === selectedVal) return 'samenum';
    return null;
  }

  const HIGHLIGHT_COLORS = {
    selected: 'rgba(201, 168, 76, 0.35)',
    rowcol: 'rgba(100, 160, 220, 0.12)',
    box: 'rgba(100, 160, 220, 0.07)',
    samenum: 'rgba(100, 160, 220, 0.12)',
  };

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
              const isClueCell = clues[r][c] !== 0;
              const highlight = getCellHighlight(r, c);
              const cellNotes = notes[r][c];

              let className;
              if (isSel && isErr) className = styles.cellSelectedError;
              else if (isSel) className = styles.cellSelected;
              else if (isErr) className = styles.cellError;
              else if (isClueCell) className = styles.cellClue;
              else className = styles.cell;

              const style = {};
              if (r === 2 || r === 5) style.borderBottom = '2px solid var(--charcoal)';
              // Apply highlight background (unless selected — that has its own gold)
              if (highlight && highlight !== 'selected') {
                style.background = HIGHLIGHT_COLORS[highlight];
              }

              return (
                <div
                  key={key}
                  className={className}
                  style={style}
                  onClick={() => handleCellClick(r, c)}
                >
                  {val !== 0 ? (
                    val
                  ) : cellNotes.size > 0 ? (
                    <div className={styles.notesGrid}>
                      {[1,2,3,4,5,6,7,8,9].map((n) => (
                        <span key={n} className={styles.noteNum}>
                          {cellNotes.has(n) ? n : ''}
                        </span>
                      ))}
                    </div>
                  ) : ''}
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
        <button
          className={notesMode ? styles.ctrlBtnActive : styles.ctrlBtn}
          onClick={() => setNotesMode((m) => !m)}
        >
          📝 {notesMode ? 'Notes ON' : 'Notes'}
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
