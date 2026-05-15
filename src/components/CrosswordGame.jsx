import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { localDateStr } from '../lib/dates';
import { CROSSWORD_PUZZLES } from '../data/crosswordPuzzles';
import styles from './CrosswordGame.module.css';

const SIZE = 5;

function getDailyPuzzle(dateStr) {
  const d = dateStr || localDateStr();
  const hash = d.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return CROSSWORD_PUZZLES[hash % CROSSWORD_PUZZLES.length];
}

function buildNumberMap(clues) {
  const map = {};
  for (const [num, c] of Object.entries(clues.across || {})) {
    const key = `${c.row}-${c.col}`;
    map[key] = map[key] ? `${map[key]} ${num}A` : `${num}A`;
  }
  for (const [num, c] of Object.entries(clues.down || {})) {
    const key = `${c.row}-${c.col}`;
    map[key] = map[key] ? `${map[key]} ${num}D` : `${num}D`;
  }
  return map;
}

function findWordForCell(r, c, dir, clues) {
  for (const [num, cl] of Object.entries(clues[dir] || {})) {
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
  const numberMap = useMemo(() => buildNumberMap(puzzle.clues), [puzzle.clues]);

  const [board, setBoard] = useState(() =>
    puzzle.grid.map((row) => row.map((c) => (c === '#' ? '#' : ''))),
  );

  const a1Start = puzzle.clues.across[1];
  const [selected, setSelected] = useState({ r: a1Start.row, c: a1Start.col });
  const [direction, setDirection] = useState('across');
  const [completed, setCompleted] = useState(false);
  const [savedToDb, setSavedToDb] = useState(false);
  const [answerStatus, setAnswerStatus] = useState({});

  const hiddenInputRef = useRef(null);

  const [loadingCheck, setLoadingCheck] = useState(true);
  const [alreadyCompleted, setAlreadyCompleted] = useState(null);
  const [seconds, setSeconds] = useState(0);

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

  useEffect(() => {
    if (completed) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [completed]);

  const activeClueNum = findWordForCell(selected.r, selected.c, direction, puzzle.clues);
  const activeClue = activeClueNum ? puzzle.clues[direction][activeClueNum] : null;

  const wordCells = useMemo(() => {
    const set = new Set();
    if (!activeClue) return set;
    for (let i = 0; i < activeClue.len; i++) {
      if (direction === 'across') set.add(`${activeClue.row}-${activeClue.col + i}`);
      else set.add(`${activeClue.row + i}-${activeClue.col}`);
    }
    return set;
  }, [activeClue, direction]);

  const handleCellClick = useCallback((r, c) => {
    if (puzzle.grid[r][c] === '#' || completed) return;
    const inAcross = findWordForCell(r, c, 'across', puzzle.clues) !== null;
    const inDown = findWordForCell(r, c, 'down', puzzle.clues) !== null;
    if (selected.r === r && selected.c === c && inAcross && inDown) {
      setDirection((d) => (d === 'across' ? 'down' : 'across'));
    } else {
      setSelected({ r, c });
      if (!inAcross && inDown) setDirection('down');
      else if (inAcross && !inDown) setDirection('across');
    }
    hiddenInputRef.current?.focus();
  }, [selected, puzzle, completed]);

  const handleClueClick = useCallback((dir, num) => {
    const cl = puzzle.clues[dir][num];
    setDirection(dir);
    setSelected({ r: cl.row, c: cl.col });
  }, [puzzle.clues]);

  const advanceCursor = useCallback(() => {
    setSelected((prev) => {
      if (direction === 'across') {
        const nc = prev.c + 1;
        if (nc < SIZE && puzzle.grid[prev.r][nc] !== '#') return { r: prev.r, c: nc };
      } else {
        const nr = prev.r + 1;
        if (nr < SIZE && puzzle.grid[nr][prev.c] !== '#') return { r: nr, c: prev.c };
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
    setAnswerStatus({});
    advanceCursor();
  }, [selected, puzzle.grid, advanceCursor]);

  const handleBackspace = useCallback(() => {
    const { r, c } = selected;
    if (puzzle.grid[r][c] === '#') return;
    setAnswerStatus({});
    if (board[r][c] !== '') {
      setBoard((prev) => {
        const next = prev.map((row) => [...row]);
        next[r][c] = '';
        return next;
      });
    } else {
      setSelected((prev) => {
        if (direction === 'across' && prev.c > 0 && puzzle.grid[prev.r][prev.c - 1] !== '#') return { r: prev.r, c: prev.c - 1 };
        if (direction === 'down' && prev.r > 0 && puzzle.grid[prev.r - 1][prev.c] !== '#') return { r: prev.r - 1, c: prev.c };
        return prev;
      });
    }
  }, [selected, board, direction, puzzle.grid]);

  useEffect(() => {
    const onKey = (e) => {
      if (completed) return;
      if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
        e.preventDefault();
        handleKeyInput(e.key);
        return;
      }
      if (e.key === 'Backspace') { e.preventDefault(); handleBackspace(); return; }
      const move = (dr, dc) => {
        setSelected((p) => {
          let r = p.r + dr;
          let c = p.c + dc;
          while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && puzzle.grid[r][c] === '#') {
            r += dr;
            c += dc;
          }
          if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return p;
          return { r, c };
        });
      };
      if (e.key === 'ArrowUp') { e.preventDefault(); move(-1, 0); }
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1, 0); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); move(0, -1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); move(0, 1); }
      if (e.key === 'Tab') { e.preventDefault(); setDirection((d) => d === 'across' ? 'down' : 'across'); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [completed, handleKeyInput, handleBackspace, puzzle.grid]);

  const handleSubmit = useCallback(() => {
    const status = {};
    for (const [num, c] of Object.entries(puzzle.clues.across)) {
      let actual = '';
      let expected = '';
      for (let i = 0; i < c.len; i++) {
        actual += board[c.row][c.col + i] || ' ';
        expected += puzzle.grid[c.row][c.col + i];
      }
      status[`across-${num}`] = actual === expected;
    }
    for (const [num, c] of Object.entries(puzzle.clues.down)) {
      let actual = '';
      let expected = '';
      for (let i = 0; i < c.len; i++) {
        actual += board[c.row + i][c.col] || ' ';
        expected += puzzle.grid[c.row + i][c.col];
      }
      status[`down-${num}`] = actual === expected;
    }
    setAnswerStatus(status);
    if (Object.values(status).every(Boolean)) setCompleted(true);
  }, [board, puzzle]);

  useEffect(() => {
    if (!completed || savedToDb || !user) return;
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
  }, [completed, savedToDb, user, seconds]);

  const submitted = Object.keys(answerStatus).length > 0;

  // Per-cell feedback: only after submit, based on whether the filled
  // letter matches the puzzle answer
  const cellFeedback = useMemo(() => {
    const map = {};
    if (!submitted) return map;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (puzzle.grid[r][c] === '#') continue;
        if (board[r][c] === '') continue;
        map[`${r}-${c}`] = board[r][c] === puzzle.grid[r][c] ? 'correct' : 'wrong';
      }
    }
    return map;
  }, [board, puzzle.grid, submitted]);

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

  if (completed) {
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
              const fb = cellFeedback[`${r}-${c}`];
              const num = numberMap[`${r}-${c}`];

              let className;
              if (isBlack) className = styles.cellBlack;
              else if (isSel) className = styles.cellSelected;
              else if (isWord) className = styles.cellHighlighted;
              else className = styles.cell;

              const cellStyle = fb === 'correct'
                ? { color: 'var(--green-accent)' }
                : undefined;

              return (
                <div
                  key={`${r}-${c}`}
                  className={`${className} ${fb === 'wrong' ? styles.cellError : ''}`}
                  onClick={() => handleCellClick(r, c)}
                  style={cellStyle}
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
            {activeClueNum} {direction === 'across' ? 'Across' : 'Down'}
          </p>
          <p className={styles.currentClueText}>{activeClue.clue}</p>
        </div>
      )}

      <div className={styles.cluePanel}>
        <div className={styles.clueSection}>
          <p className={styles.clueSectionTitle}>Across</p>
          {Object.entries(puzzle.clues.across).map(([num, cl]) => {
            const fb = answerStatus[`across-${num}`];
            const isActive = direction === 'across' && activeClueNum === num;
            const mark = fb === true ? ' ✓' : fb === false ? ' ✗' : '';
            const color = fb === true
              ? { color: 'var(--green-accent)' }
              : fb === false ? { color: '#c9534c' } : undefined;
            return (
              <p
                key={`a-${num}`}
                className={isActive ? styles.clueItemActive : styles.clueItem}
                onClick={() => handleClueClick('across', num)}
                style={color}
              >
                {num}. {cl.clue}{mark}
              </p>
            );
          })}
        </div>
        <div className={styles.clueSection}>
          <p className={styles.clueSectionTitle}>Down</p>
          {Object.entries(puzzle.clues.down).map(([num, cl]) => {
            const fb = answerStatus[`down-${num}`];
            const isActive = direction === 'down' && activeClueNum === num;
            const mark = fb === true ? ' ✓' : fb === false ? ' ✗' : '';
            const color = fb === true
              ? { color: 'var(--green-accent)' }
              : fb === false ? { color: '#c9534c' } : undefined;
            return (
              <p
                key={`d-${num}`}
                className={isActive ? styles.clueItemActive : styles.clueItem}
                onClick={() => handleClueClick('down', num)}
                style={color}
              >
                {num}. {cl.clue}{mark}
              </p>
            );
          })}
        </div>
      </div>

      <div className={styles.controls}>
        <button className={styles.btn} onClick={handleSubmit}>Submit</button>
      </div>
    </div>
  );
}
