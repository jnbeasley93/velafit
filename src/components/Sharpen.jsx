import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import SudokuGame from './SudokuGame';
import WordPuzzleGame from './WordPuzzleGame';
import MemoryGame from './MemoryGame';
import LogicPuzzleGame from './LogicPuzzleGame';
import CrosswordGame from './CrosswordGame';
import styles from './Settle.module.css';

const GAMES = [
  { id: 'sudoku', label: 'Sudoku', Component: SudokuGame },
  { id: 'words', label: 'Words', Component: WordPuzzleGame },
  { id: 'memory', label: 'Memory', Component: MemoryGame },
  { id: 'logic', label: 'Logic', Component: LogicPuzzleGame },
  { id: 'crossword', label: 'Crossword', Component: CrosswordGame },
];

function computeMindStreak(logs) {
  if (logs.length === 0) return 0;
  const dates = new Set(logs.filter((l) => l.completed).map((l) => l.date));
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 365; i++) {
    const target = new Date(today);
    target.setDate(today.getDate() - i);
    const y = target.getFullYear();
    const m = String(target.getMonth() + 1).padStart(2, '0');
    const d = String(target.getDate()).padStart(2, '0');
    if (dates.has(`${y}-${m}-${d}`)) streak++;
    else if (i > 0) break;
  }
  return streak;
}

export default function Sharpen() {
  const { user } = useAuth();
  const [mindLogs, setMindLogs] = useState([]);
  const [activeGame, setActiveGame] = useState(
    () => localStorage.getItem('vela_sharpen_game') || 'sudoku',
  );

  const handleGameChange = useCallback((id) => {
    setActiveGame(id);
    localStorage.setItem('vela_sharpen_game', id);
  }, []);

  const fetchMindLogs = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('mind_game_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(100);
    setMindLogs(data || []);
  }, [user]);

  useEffect(() => { fetchMindLogs(); }, [fetchMindLogs]);

  const mindStreak = computeMindStreak(mindLogs);
  const totalCompleted = mindLogs.filter((l) => l.completed).length;

  if (!user) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.pageTitle}>Sharpen</h1>
          <p className={styles.pageSub}>Please sign in to use this space.</p>
        </div>
      </div>
    );
  }

  const ActiveComponent = GAMES.find((g) => g.id === activeGame)?.Component || SudokuGame;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>🧩 Sharpen</h1>
        <p className={styles.pageSub}>
          Daily cognitive training. One puzzle a day.
        </p>

        <div className={styles.cardJournal}>
          <div className={styles.velaPrompt}>
            <div className={styles.velaAvatar}>🐸</div>
            <p className={styles.velaText}>
              A sharp mind is part of the plan. Five to ten minutes here
              compounds over time.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                fontFamily: 'Space Mono, monospace',
                fontSize: '1.3rem',
                fontWeight: 700,
                color: 'var(--charcoal)',
              }}>
                {mindStreak}
              </div>
              <div style={{
                fontSize: '0.65rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--stone)',
                marginTop: '0.2rem',
              }}>
                Mind Streak
              </div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                fontFamily: 'Space Mono, monospace',
                fontSize: '1.3rem',
                fontWeight: 700,
                color: 'var(--charcoal)',
              }}>
                {totalCompleted}
              </div>
              <div style={{
                fontSize: '0.65rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--stone)',
                marginTop: '0.2rem',
              }}>
                Puzzles Solved
              </div>
            </div>
          </div>
        </div>

        {/* ── Game selector tabs ── */}
        <div className={styles.modeToggle} style={{ marginBottom: '1.2rem' }}>
          {GAMES.map((g) => (
            <button
              key={g.id}
              className={activeGame === g.id ? styles.modeActive : styles.modeInactive}
              onClick={() => handleGameChange(g.id)}
              style={{ fontSize: '0.72rem', padding: '0.45rem 0.5rem' }}
            >
              {g.label}
            </button>
          ))}
        </div>

        <ActiveComponent />
      </div>
    </div>
  );
}
