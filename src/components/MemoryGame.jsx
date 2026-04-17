import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { localDateStr } from '../lib/dates';
import styles from './MemoryGame.module.css';

const EMOJI_POOL = ['🐸','🌿','⚡','🎯','🧩','💪','🏃','🌙','☀️','🎵','🦋','🌊','🔥','❄️','🌸','🎪','🦊','🐺','🌴','🎭'];
const DIFFICULTIES = { easy: { cols: 4, rows: 3, pairs: 6 }, medium: { cols: 4, rows: 4, pairs: 8 }, hard: { cols: 5, rows: 4, pairs: 10 } };

function seededShuffle(arr, seed) {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(pairs, seed) {
  const emojis = seededShuffle(EMOJI_POOL, seed).slice(0, pairs);
  const deck = [...emojis, ...emojis]; // duplicate for pairs
  return seededShuffle(deck, seed + 999);
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function MemoryGame() {
  const { user } = useAuth();
  const today = localDateStr();
  const dateSeed = today.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7);

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
        .eq('game_type', 'memory')
        .eq('completed', true)
        .limit(1);
      if (data && data.length > 0) setAlreadyCompleted(data[0]);
      setLoadingCheck(false);
    })();
  }, [user]);

  const [difficulty, setDifficulty] = useState('medium');
  const cfg = DIFFICULTIES[difficulty];
  const [deck, setDeck] = useState(() => buildDeck(cfg.pairs, dateSeed));
  const [flipped, setFlipped] = useState(new Set());
  const [matched, setMatched] = useState(new Set());
  const [firstPick, setFirstPick] = useState(null);
  const [locked, setLocked] = useState(false);
  const [moves, setMoves] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [savedToDb, setSavedToDb] = useState(false);

  // Timer
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (completed) return;
    intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(intervalRef.current);
  }, [completed]);

  // Reset when difficulty changes
  useEffect(() => {
    const c = DIFFICULTIES[difficulty];
    setDeck(buildDeck(c.pairs, dateSeed + difficulty.charCodeAt(0)));
    setFlipped(new Set());
    setMatched(new Set());
    setFirstPick(null);
    setLocked(false);
    setMoves(0);
    setCompleted(false);
    setSavedToDb(false);
    setSeconds(0);
  }, [difficulty, dateSeed]);

  const handleFlip = useCallback((idx) => {
    if (locked || flipped.has(idx) || matched.has(idx) || completed) return;

    const newFlipped = new Set(flipped).add(idx);
    setFlipped(newFlipped);

    if (firstPick === null) {
      setFirstPick(idx);
    } else {
      setMoves((m) => m + 1);
      const first = firstPick;
      setFirstPick(null);

      if (deck[first] === deck[idx]) {
        // Match
        const newMatched = new Set(matched).add(first).add(idx);
        setMatched(newMatched);
        setFlipped(new Set());

        if (newMatched.size === deck.length) {
          setCompleted(true);
        }
      } else {
        // No match — flip back after delay
        setLocked(true);
        setTimeout(() => {
          setFlipped(new Set());
          setLocked(false);
        }, 1000);
      }
    }
  }, [locked, flipped, matched, firstPick, deck, completed]);

  const handlePlayAgain = useCallback(() => {
    const seed = Math.floor(Math.random() * 2 ** 32);
    const c = DIFFICULTIES[difficulty];
    setDeck(buildDeck(c.pairs, seed));
    setFlipped(new Set());
    setMatched(new Set());
    setFirstPick(null);
    setLocked(false);
    setMoves(0);
    setCompleted(false);
    setSavedToDb(false);
    setSeconds(0);
  }, [difficulty]);

  // Save to DB
  useEffect(() => {
    if (!completed || savedToDb || !user) return;
    (async () => {
      const { error } = await supabase.from('mind_game_logs').insert({
        user_id: user.id,
        date: localDateStr(),
        game_type: 'memory',
        completed: true,
        duration_seconds: seconds,
        hints_used: 0,
      });
      if (error) console.error('[MemoryGame] save failed:', error);
      else setSavedToDb(true);
    })();
  }, [completed, savedToDb, user, seconds]);

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
            Pattern recognized. A sharp memory is a trained memory.
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
          <h3 className={styles.endTitle}>Pattern recognized.</h3>
          <p className={styles.endSub}>
            {moves} moves · {formatTime(seconds)}
          </p>
          <button className={styles.btn} onClick={handlePlayAgain}>
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h3 className={styles.title}>Memory</h3>
        <div className={styles.statsRow}>
          <span className={styles.stat}>
            Moves: <span className={styles.statVal}>{moves}</span>
          </span>
          <span className={styles.stat}>
            <span className={styles.statVal}>{formatTime(seconds)}</span>
          </span>
        </div>
      </div>

      <div className={styles.diffRow}>
        {Object.keys(DIFFICULTIES).map((d) => (
          <button
            key={d}
            className={difficulty === d ? styles.diffChipActive : styles.diffChip}
            onClick={() => setDifficulty(d)}
          >
            {d.charAt(0).toUpperCase() + d.slice(1)}
          </button>
        ))}
      </div>

      <div
        className={styles.grid}
        style={{ gridTemplateColumns: `repeat(${cfg.cols}, minmax(0, 64px))` }}
      >
        {deck.map((emoji, idx) => {
          const isFlipped = flipped.has(idx);
          const isMatched = matched.has(idx);
          const showFace = isFlipped || isMatched;

          return (
            <div
              key={idx}
              className={`${styles.card} ${showFace ? styles.cardFlipped : ''} ${isMatched ? styles.cardMatched : ''}`}
              onClick={() => handleFlip(idx)}
            >
              <div className={styles.cardInner}>
                <div className={styles.cardFront}>?</div>
                <div className={styles.cardBack}>{emoji}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.controls}>
        <button className={styles.btn} onClick={handlePlayAgain}>
          Shuffle New
        </button>
      </div>
    </div>
  );
}
