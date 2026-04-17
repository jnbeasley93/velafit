import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { localDateStr } from '../lib/dates';
import { CROSSWORD_PUZZLES } from '../data/crosswordPuzzles';
import styles from './CrosswordGame.module.css';


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

  const hiddenInputRef = useRef(null);

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
        .eq('game_type', 'crossword')
        .eq('completed', true)
        .limit(1);
      if (data && data.length > 0) setAlreadyCompleted(data[0]);
      setLoadingCheck(false);
    })();
  }, [user]);

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
    hiddenInputRef.current?.focus();
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
    const revealedBoard = puzzle.grid.map((row) => row.map((c) => (c === '#' ? '#' : c)));
    setBoard(revealedBoard);
    setRevealed(true);
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
            Words crossed, mind sharpened. See you tomorrow.
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--stone)' }}>Come back tomorrow for a new puzzle &#x1F438;</p>
        </div>
      </div>
    );
  }

  if (completed && !revealed) {
    return (
      <div className={styles.wrap}>
        <div className={styles.endState}>
          <div className={styles.endEmoji}>🐸</div>
          <h3 className={styles.endTitle}>Solved.</h3>
          <p className={styles.endSub}>{formatTime(seconds)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <input
        ref={hiddenInputRef}
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        onKeyDown={(e) => {
          if (completed) return;
          if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
            e.preventDefault();
            handleKeyInput(e.key);
            return;
          }
          if (e.key === 'Backspace') { e.preventDefault(); handleBackspace(); return; }
        }}
        onInput={(e) => {
          if (completed) return;
          const ch = e.data;
          if (ch && ch.length === 1 && /[a-zA-Z]/.test(ch)) {
            handleKeyInput(ch);
          }
          e.target.value = '';
        }}
      />
      <div className={styles.header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h3 className={styles.title}>Mini Crossword</h3>
            {puzzle.difficulty && (
              <span className={
                puzzle.difficulty === 'Easy' ? styles.diffEasy
                : puzzle.difficulty === 'Hard' ? styles.diffHard
                : styles.diffMedium
              }>
                {puzzle.difficulty}
              </span>
            )}
          </div>
          <p className={styles.dateLine}>
            {new Date(today + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
        </div>
        <span className={styles.timer}>{formatTime(seconds)}</span>
      </div>

      {puzzle.theme && (
        <span className={styles.themeTag}>Theme: {puzzle.theme}</span>
      )}

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

      {revealed ? (
        <div className={styles.endState}>
          <p className={styles.endSub}>Revealed. No shame in peeking.</p>
        </div>
      ) : (
        <div className={styles.controls}>
          <button className={styles.btn} onClick={handleCheck}>Check</button>
          <button className={styles.btn} onClick={handleReveal}>Reveal</button>
        </div>
      )}
    </div>
  );
}
