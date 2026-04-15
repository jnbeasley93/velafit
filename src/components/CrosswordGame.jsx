import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { localDateStr } from '../lib/dates';
import styles from './CrosswordGame.module.css';

const CROSSWORD_PUZZLES = [
  {
    grid: [['F','R','O','G','#'],['I','#','A','#','B'],['S','T','R','O','N'],['H','#','E','#','E'],['#','B','A','T','S']],
    clues: {
      across: { 1: { clue: 'VelaFit mascot', row: 0, col: 0, len: 4 }, 3: { clue: 'Powerful, fit', row: 2, col: 0, len: 5 }, 5: { clue: 'Flying mammals', row: 4, col: 1, len: 4 } },
      down: { 1: { clue: 'Fish (plural)', row: 0, col: 0, len: 4 }, 2: { clue: 'Uncovered', row: 0, col: 2, len: 5 }, 4: { clue: 'One more than one', row: 1, col: 4, len: 4 } },
    },
  },
  {
    grid: [['M','O','V','E','#'],['#','A','#','A','#'],['P','U','S','H','#'],['#','T','#','#','W'],['R','E','S','T','S']],
    clues: {
      across: { 1: { clue: 'Stay active', row: 0, col: 0, len: 4 }, 3: { clue: 'Upper body exercise', row: 2, col: 0, len: 4 }, 5: { clue: 'Recovery days (plural)', row: 4, col: 0, len: 5 } },
      down: { 1: { clue: 'Measure of pressure (abbr.)', row: 0, col: 0, len: 3 }, 2: { clue: 'Exit', row: 0, col: 1, len: 4 }, 4: { clue: 'Eats', row: 0, col: 3, len: 3 } },
    },
  },
  {
    grid: [['#','B','O','D','Y'],['P','#','A','#','O'],['L','I','F','T','G'],['A','#','T','#','A'],['N','A','P','S','#']],
    clues: {
      across: { 1: { clue: 'Physical form', row: 0, col: 1, len: 4 }, 3: { clue: 'Raise weights', row: 2, col: 0, len: 4 }, 5: { clue: 'Short sleeps', row: 4, col: 0, len: 4 } },
      down: { 1: { clue: 'Flat surface for exercises', row: 1, col: 0, len: 4 }, 2: { clue: 'Daily routine', row: 1, col: 2, len: 4 }, 4: { clue: 'Positive affirmation', row: 0, col: 4, len: 4 } },
    },
  },
  {
    grid: [['S','W','E','A','T'],['#','A','#','#','R'],['G','R','I','T','A'],['#','M','#','#','I'],['P','A','C','E','N']],
    clues: {
      across: { 1: { clue: 'What hard work produces', row: 0, col: 0, len: 5 }, 3: { clue: 'Determination', row: 2, col: 0, len: 4 }, 5: { clue: 'Speed of movement', row: 4, col: 0, len: 4 } },
      down: { 1: { clue: 'Warmth (plural)', row: 0, col: 1, len: 4 }, 2: { clue: 'Work out intensely', row: 0, col: 4, len: 5 }, 4: { clue: 'Workout log', row: 2, col: 1, len: 3 } },
    },
  },
  {
    grid: [['V','E','L','A','#'],['I','#','E','#','S'],['T','O','N','E','D'],['A','#','S','#','E'],['L','E','A','P','#']],
    clues: {
      across: { 1: { clue: 'VelaFit mascot name', row: 0, col: 0, len: 4 }, 3: { clue: 'Fit and defined', row: 2, col: 0, len: 5 }, 5: { clue: 'Jump forward', row: 4, col: 0, len: 4 } },
      down: { 1: { clue: 'Life force', row: 0, col: 0, len: 4 }, 2: { clue: 'Stretch muscles', row: 0, col: 2, len: 5 }, 4: { clue: 'Speed up', row: 1, col: 4, len: 4 } },
    },
  },
  {
    grid: [['W','A','L','K','#'],['A','#','I','#','R'],['T','R','A','I','N'],['E','#','T','#','U'],['R','U','N','S','#']],
    clues: {
      across: { 1: { clue: 'Move on foot', row: 0, col: 0, len: 4 }, 3: { clue: 'Exercise with weights', row: 2, col: 0, len: 5 }, 5: { clue: 'Sprints (plural)', row: 4, col: 0, len: 4 } },
      down: { 1: { clue: 'H2O', row: 0, col: 0, len: 5 }, 2: { clue: 'Thin (adjective)', row: 0, col: 2, len: 5 }, 4: { clue: 'Governing body', row: 1, col: 4, len: 4 } },
    },
  },
  {
    grid: [['C','O','R','E','#'],['A','#','E','#','F'],['L','U','N','G','E'],['M','#','E','#','E'],['#','P','W','O','D']],
    clues: {
      across: { 1: { clue: 'Center muscles', row: 0, col: 0, len: 4 }, 3: { clue: 'Step forward exercise', row: 2, col: 0, len: 5 }, 5: { clue: 'Workout of the day (abbr.)', row: 4, col: 1, len: 4 } },
      down: { 1: { clue: 'Peaceful', row: 0, col: 0, len: 4 }, 2: { clue: 'Restore energy', row: 0, col: 2, len: 5 }, 4: { clue: 'Pay attention', row: 1, col: 4, len: 4 } },
    },
  },
  {
    grid: [['P','L','A','N','#'],['U','#','I','#','G'],['S','T','R','E','S'],['H','#','E','#','O'],['#','G','A','I','N']],
    clues: {
      across: { 1: { clue: 'Schedule or strategy', row: 0, col: 0, len: 4 }, 3: { clue: 'Mental pressure', row: 2, col: 0, len: 5 }, 5: { clue: 'Progress made', row: 4, col: 1, len: 4 } },
      down: { 1: { clue: 'Upper body exercise', row: 0, col: 0, len: 4 }, 2: { clue: 'Breathe in', row: 0, col: 2, len: 5 }, 4: { clue: 'Musical notes (plural)', row: 1, col: 4, len: 4 } },
    },
  },
  {
    grid: [['F','L','E','X','#'],['O','#','A','#','S'],['C','H','R','O','N'],['U','#','N','#','A'],['S','P','I','N','#']],
    clues: {
      across: { 1: { clue: 'Show muscles', row: 0, col: 0, len: 4 }, 3: { clue: 'Related to time', row: 2, col: 0, len: 5 }, 5: { clue: 'Cycle class move', row: 4, col: 0, len: 4 } },
      down: { 1: { clue: 'Concentrate', row: 0, col: 0, len: 5 }, 2: { clue: 'Study', row: 0, col: 2, len: 5 }, 4: { clue: 'Breakfast food', row: 1, col: 4, len: 4 } },
    },
  },
  {
    grid: [['M','I','N','D','#'],['E','#','O','#','B'],['D','I','E','T','S'],['I','#','S','#','E'],['#','Y','O','G','A']],
    clues: {
      across: { 1: { clue: 'Brain and thoughts', row: 0, col: 0, len: 4 }, 3: { clue: 'Eating plans', row: 2, col: 0, len: 5 }, 5: { clue: 'Ancient practice', row: 4, col: 1, len: 4 } },
      down: { 1: { clue: 'Substance, material', row: 0, col: 0, len: 4 }, 2: { clue: 'Foot digits', row: 0, col: 2, len: 5 }, 4: { clue: 'Wager', row: 1, col: 4, len: 4 } },
    },
  },
  {
    grid: [['H','A','B','I','T'],['E','#','R','#','A'],['A','R','E','A','S'],['L','#','A','#','K'],['#','S','T','E','P']],
    clues: {
      across: { 1: { clue: 'Daily routine', row: 0, col: 0, len: 5 }, 3: { clue: 'Regions (plural)', row: 2, col: 0, len: 5 }, 5: { clue: 'One stair', row: 4, col: 1, len: 4 } },
      down: { 1: { clue: 'Cure or fix', row: 0, col: 0, len: 4 }, 2: { clue: 'Exhale hard', row: 0, col: 2, len: 5 }, 4: { clue: 'Job or duty', row: 0, col: 4, len: 4 } },
    },
  },
  {
    grid: [['S','L','E','E','P'],['T','#','N','#','O'],['R','E','S','E','T'],['E','#','T','#','E'],['#','F','U','E','L']],
    clues: {
      across: { 1: { clue: 'Rest at night', row: 0, col: 0, len: 5 }, 3: { clue: 'Start fresh', row: 2, col: 0, len: 5 }, 5: { clue: 'Energy source', row: 4, col: 1, len: 4 } },
      down: { 1: { clue: 'Extend muscles', row: 0, col: 0, len: 4 }, 2: { clue: 'Nervous system', row: 0, col: 2, len: 5 }, 4: { clue: 'Poem (plural)', row: 0, col: 4, len: 4 } },
    },
  },
  {
    grid: [['B','U','R','N','#'],['A','#','E','#','C'],['L','A','P','S','E'],['A','#','S','#','L'],['#','W','I','N','S']],
    clues: {
      across: { 1: { clue: 'Calories used', row: 0, col: 0, len: 4 }, 3: { clue: 'A slip or gap', row: 2, col: 0, len: 5 }, 5: { clue: 'Victories', row: 4, col: 1, len: 4 } },
      down: { 1: { clue: 'Equilibrium', row: 0, col: 0, len: 4 }, 2: { clue: 'Do again', row: 0, col: 2, len: 5 }, 4: { clue: 'Mobile phones', row: 1, col: 4, len: 4 } },
    },
  },
  {
    grid: [['Z','O','N','E','#'],['E','#','U','#','P'],['S','T','R','I','D'],['T','#','S','#','E'],['#','B','E','A','T']],
    clues: {
      across: { 1: { clue: 'Heart rate zone', row: 0, col: 0, len: 4 }, 3: { clue: 'Big step forward', row: 2, col: 0, len: 5 }, 5: { clue: 'Rhythm or pulse', row: 4, col: 1, len: 4 } },
      down: { 1: { clue: 'Energetic enthusiasm', row: 0, col: 0, len: 4 }, 2: { clue: 'Feed', row: 0, col: 2, len: 5 }, 4: { clue: 'Earned points', row: 1, col: 4, len: 4 } },
    },
  },
  {
    grid: [['G','R','I','P','#'],['O','#','N','#','S'],['A','D','A','P','T'],['L','#','L','#','E'],['#','P','S','E','T']],
    clues: {
      across: { 1: { clue: 'Hold tightly', row: 0, col: 0, len: 4 }, 3: { clue: 'Adjust and evolve', row: 2, col: 0, len: 5 }, 5: { clue: 'Group of reps', row: 4, col: 1, len: 4 } },
      down: { 1: { clue: 'Aim or target', row: 0, col: 0, len: 4 }, 2: { clue: 'Inner self', row: 0, col: 2, len: 5 }, 4: { clue: 'Rigid', row: 1, col: 4, len: 4 } },
    },
  },
];

function getDailyPuzzle(dateStr) {
  const d = dateStr || localDateStr();
  const hash = d.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return CROSSWORD_PUZZLES[hash % CROSSWORD_PUZZLES.length];
}

// Build a map of cell → clue numbers
function buildNumberMap(clues) {
  const map = {};
  for (const dir of ['across', 'down']) {
    for (const [num, c] of Object.entries(clues[dir])) {
      const key = `${c.row}-${c.col}`;
      if (!map[key]) map[key] = parseInt(num, 10);
      else map[key] = Math.min(map[key], parseInt(num, 10));
    }
  }
  return map;
}

// Find which word (direction + number) a cell belongs to
function findWordForCell(r, c, dir, clues) {
  for (const [num, cl] of Object.entries(clues[dir])) {
    if (dir === 'across' && r === cl.row && c >= cl.col && c < cl.col + cl.len) return num;
    if (dir === 'down' && c === cl.col && r >= cl.row && r < cl.row + cl.len) return num;
  }
  return null;
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function CrosswordGame() {
  const { user } = useAuth();
  const today = localDateStr();
  const puzzle = getDailyPuzzle(today);
  const numberMap = buildNumberMap(puzzle.clues);

  const [board, setBoard] = useState(() =>
    puzzle.grid.map((row) => row.map((c) => (c === '#' ? '#' : ''))),
  );
  const [selected, setSelected] = useState({ r: 0, c: 0 });
  const [direction, setDirection] = useState('across');
  const [errors, setErrors] = useState(new Set());
  const [completed, setCompleted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [savedToDb, setSavedToDb] = useState(false);

  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (completed) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [completed]);

  // Current active word info
  const activeClueNum = findWordForCell(selected.r, selected.c, direction, puzzle.clues);
  const activeClue = activeClueNum ? puzzle.clues[direction][activeClueNum] : null;

  // Get cells belonging to the active word
  function getWordCells() {
    if (!activeClue) return new Set();
    const cells = new Set();
    for (let i = 0; i < activeClue.len; i++) {
      if (direction === 'across') cells.add(`${activeClue.row}-${activeClue.col + i}`);
      else cells.add(`${activeClue.row + i}-${activeClue.col}`);
    }
    return cells;
  }
  const wordCells = getWordCells();

  const handleCellClick = useCallback((r, c) => {
    if (puzzle.grid[r][c] === '#' || completed) return;
    if (selected.r === r && selected.c === c) {
      // Toggle direction
      setDirection((d) => (d === 'across' ? 'down' : 'across'));
    } else {
      setSelected({ r, c });
    }
    setErrors(new Set());
  }, [selected, puzzle.grid, completed]);

  const handleClueClick = useCallback((dir, num) => {
    const cl = puzzle.clues[dir][num];
    setDirection(dir);
    setSelected({ r: cl.row, c: cl.col });
    setErrors(new Set());
  }, [puzzle.clues]);

  // Advance to next cell in the active word
  const advanceCursor = useCallback(() => {
    setSelected((prev) => {
      if (direction === 'across') {
        const nc = prev.c + 1;
        if (nc < 5 && puzzle.grid[prev.r][nc] !== '#') return { r: prev.r, c: nc };
      } else {
        const nr = prev.r + 1;
        if (nr < 5 && puzzle.grid[nr][prev.c] !== '#') return { r: nr, c: prev.c };
      }
      return prev;
    });
  }, [direction, puzzle.grid]);

  const handleKeyInput = useCallback((letter) => {
    const { r, c } = selected;
    if (puzzle.grid[r][c] === '#') return;
    setBoard((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = letter.toUpperCase();
      return next;
    });
    advanceCursor();
  }, [selected, puzzle.grid, advanceCursor]);

  const handleBackspace = useCallback(() => {
    const { r, c } = selected;
    if (puzzle.grid[r][c] === '#') return;
    if (board[r][c] !== '') {
      setBoard((prev) => {
        const next = prev.map((row) => [...row]);
        next[r][c] = '';
        return next;
      });
    } else {
      // Move back
      setSelected((prev) => {
        if (direction === 'across' && prev.c > 0 && puzzle.grid[prev.r][prev.c - 1] !== '#') return { r: prev.r, c: prev.c - 1 };
        if (direction === 'down' && prev.r > 0 && puzzle.grid[prev.r - 1][prev.c] !== '#') return { r: prev.r - 1, c: prev.c };
        return prev;
      });
    }
  }, [selected, board, direction, puzzle.grid]);

  // Keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (completed) return;
      if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
        e.preventDefault();
        handleKeyInput(e.key);
        return;
      }
      if (e.key === 'Backspace') { e.preventDefault(); handleBackspace(); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((p) => ({ r: Math.max(0, p.r - 1), c: p.c })); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((p) => ({ r: Math.min(4, p.r + 1), c: p.c })); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); setSelected((p) => ({ r: p.r, c: Math.max(0, p.c - 1) })); }
      if (e.key === 'ArrowRight') { e.preventDefault(); setSelected((p) => ({ r: p.r, c: Math.min(4, p.c + 1) })); }
      if (e.key === 'Tab') { e.preventDefault(); setDirection((d) => d === 'across' ? 'down' : 'across'); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [completed, handleKeyInput, handleBackspace]);

  // Check completion
  useEffect(() => {
    if (completed) return;
    let allFilled = true;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (puzzle.grid[r][c] !== '#' && board[r][c] !== puzzle.grid[r][c]) allFilled = false;
      }
    }
    if (allFilled) setCompleted(true);
  }, [board, puzzle.grid, completed]);

  const handleCheck = useCallback(() => {
    const errs = new Set();
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (board[r][c] !== '' && board[r][c] !== '#' && board[r][c] !== puzzle.grid[r][c]) {
          errs.add(`${r}-${c}`);
        }
      }
    }
    setErrors(errs);
  }, [board, puzzle.grid]);

  const handleReveal = useCallback(() => {
    setBoard(puzzle.grid.map((row) => [...row]));
    setRevealed(true);
    setCompleted(true);
  }, [puzzle.grid]);

  // Save
  useEffect(() => {
    if (!completed || savedToDb || !user || revealed) return;
    (async () => {
      const { error } = await supabase.from('mind_game_logs').insert({
        user_id: user.id,
        date: localDateStr(),
        game_type: 'crossword',
        completed: true,
        duration_seconds: seconds,
        hints_used: 0,
      });
      if (error) console.error('[Crossword] save failed:', error);
      else setSavedToDb(true);
    })();
  }, [completed, savedToDb, user, seconds, revealed]);

  if (completed) {
    return (
      <div className={styles.wrap}>
        <div className={styles.endState}>
          <div className={styles.endEmoji}>🐸</div>
          <h3 className={styles.endTitle}>
            {revealed ? 'Revealed.' : 'Solved.'}
          </h3>
          <p className={styles.endSub}>
            {revealed ? 'No shame in peeking.' : formatTime(seconds)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Mini Crossword</h3>
          <p className={styles.dateLine}>
            {new Date(today + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
        </div>
        <span className={styles.timer}>{formatTime(seconds)}</span>
      </div>

      <div className={styles.gridWrap}>
        <div className={styles.grid}>
          {puzzle.grid.map((row, r) =>
            row.map((_, c) => {
              const isBlack = puzzle.grid[r][c] === '#';
              const isSel = selected.r === r && selected.c === c;
              const isWord = wordCells.has(`${r}-${c}`);
              const isErr = errors.has(`${r}-${c}`);
              const num = numberMap[`${r}-${c}`];

              let className;
              if (isBlack) className = styles.cellBlack;
              else if (isSel) className = styles.cellSelected;
              else if (isWord) className = styles.cellHighlighted;
              else className = styles.cell;

              return (
                <div
                  key={`${r}-${c}`}
                  className={`${className} ${isErr ? styles.cellError : ''}`}
                  onClick={() => handleCellClick(r, c)}
                >
                  {num && <span className={styles.cellNumber}>{num}</span>}
                  {!isBlack && board[r][c]}
                </div>
              );
            }),
          )}
        </div>
      </div>

      {activeClue && (
        <div className={styles.currentClue}>
          <p className={styles.currentClueDir}>
            {activeClueNum} {direction}
          </p>
          <p className={styles.currentClueText}>{activeClue.clue}</p>
        </div>
      )}

      <div className={styles.cluePanel}>
        <div className={styles.clueSection}>
          <p className={styles.clueSectionTitle}>Across</p>
          {Object.entries(puzzle.clues.across).map(([num, cl]) => (
            <p
              key={`a-${num}`}
              className={direction === 'across' && activeClueNum === num ? styles.clueItemActive : styles.clueItem}
              onClick={() => handleClueClick('across', num)}
            >
              {num}. {cl.clue}
            </p>
          ))}
        </div>
        <div className={styles.clueSection}>
          <p className={styles.clueSectionTitle}>Down</p>
          {Object.entries(puzzle.clues.down).map(([num, cl]) => (
            <p
              key={`d-${num}`}
              className={direction === 'down' && activeClueNum === num ? styles.clueItemActive : styles.clueItem}
              onClick={() => handleClueClick('down', num)}
            >
              {num}. {cl.clue}
            </p>
          ))}
        </div>
      </div>

      <div className={styles.controls}>
        <button className={styles.btn} onClick={handleCheck}>Check</button>
        <button className={styles.btn} onClick={handleReveal}>Reveal</button>
      </div>
    </div>
  );
}
