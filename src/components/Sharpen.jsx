import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import SudokuGame from './SudokuGame';
import styles from './Settle.module.css';

const LOCKED_GAMES = [
  { emoji: '🔤', name: 'Crossword', desc: 'Daily themed crossword puzzles.' },
  { emoji: '📝', name: 'Word Puzzles', desc: 'Anagrams, word ladders, and more.' },
  { emoji: '🧠', name: 'Memory Games', desc: 'Pattern matching and recall drills.' },
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
    const ds = `${y}-${m}-${d}`;
    if (dates.has(ds)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

export default function Sharpen() {
  const { user } = useAuth();
  const [mindLogs, setMindLogs] = useState([]);

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

        <SudokuGame />

        <h2 style={{
          fontFamily: 'DM Serif Display, serif',
          fontSize: '1.1rem',
          color: 'var(--charcoal)',
          marginBottom: '0.75rem',
          marginTop: '0.5rem',
        }}>
          Coming Soon
        </h2>

        {LOCKED_GAMES.map((g) => (
          <div
            key={g.name}
            style={{
              background: 'var(--card-bg)',
              border: '1.5px dashed var(--card-border)',
              borderRadius: '4px',
              padding: '1rem 1.2rem',
              marginBottom: '0.6rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.9rem',
              opacity: 0.7,
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>{g.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: 'DM Serif Display, serif',
                fontSize: '1rem',
                color: 'var(--charcoal)',
              }}>
                {g.name}
              </div>
              <div style={{
                fontSize: '0.78rem',
                color: 'var(--stone)',
                fontWeight: 300,
                marginTop: '0.15rem',
              }}>
                {g.desc}
              </div>
            </div>
            <span style={{
              fontFamily: 'Space Mono, monospace',
              fontSize: '0.6rem',
              background: 'var(--gold)',
              color: 'var(--green-deep)',
              padding: '0.2rem 0.5rem',
              borderRadius: '2px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 700,
            }}>
              PRO
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
