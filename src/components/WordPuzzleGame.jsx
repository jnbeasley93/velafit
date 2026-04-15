import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { localDateStr } from '../lib/dates';
import styles from './WordPuzzleGame.module.css';

const WORD_LIST = [
  { word: 'DOLPHIN', category: 'Animal' },
  { word: 'AVOCADO', category: 'Food' },
  { word: 'BLANKET', category: 'Home' },
  { word: 'CAPTAIN', category: 'Person' },
  { word: 'FEATHER', category: 'Nature' },
  { word: 'KITCHEN', category: 'Home' },
  { word: 'LANTERN', category: 'Object' },
  { word: 'MINERAL', category: 'Science' },
  { word: 'NURSING', category: 'Career' },
  { word: 'OCTOBER', category: 'Calendar' },
  { word: 'PANTHER', category: 'Animal' },
  { word: 'QUINTET', category: 'Music' },
  { word: 'RAINBOW', category: 'Nature' },
  { word: 'SANDALS', category: 'Clothing' },
  { word: 'THEATER', category: 'Arts' },
  { word: 'UNIFORM', category: 'Clothing' },
  { word: 'VINTAGE', category: 'Style' },
  { word: 'WARRIOR', category: 'Person' },
  { word: 'XYLOPHONE', category: 'Music' },
  { word: 'YELLOWED', category: 'Color' },
  { word: 'ZEALOUS', category: 'Emotion' },
  { word: 'BLOSSOM', category: 'Nature' },
  { word: 'COMPASS', category: 'Tool' },
  { word: 'DYNASTY', category: 'History' },
  { word: 'ECLIPSE', category: 'Science' },
  { word: 'FURNACE', category: 'Home' },
  { word: 'GLACIER', category: 'Nature' },
  { word: 'HARVEST', category: 'Season' },
  { word: 'ILLEGAL', category: 'Law' },
  { word: 'JOURNEY', category: 'Travel' },
  { word: 'CABINET', category: 'Furniture' },
  { word: 'DIPLOMA', category: 'Education' },
  { word: 'EPISODE', category: 'Media' },
  { word: 'FASHION', category: 'Style' },
  { word: 'GORILLA', category: 'Animal' },
  { word: 'HORIZON', category: 'Nature' },
  { word: 'IMAGINE', category: 'Concept' },
  { word: 'JASMINE', category: 'Plant' },
  { word: 'KNOWING', category: 'Concept' },
  { word: 'LOBSTER', category: 'Animal' },
  { word: 'MAGICAL', category: 'Concept' },
  { word: 'NAPKINS', category: 'Home' },
  { word: 'ORBITAL', category: 'Science' },
  { word: 'PILGRIM', category: 'History' },
  { word: 'QUALITY', category: 'Concept' },
  { word: 'REACHES', category: 'Action' },
  { word: 'SERPENT', category: 'Animal' },
  { word: 'TRUMPET', category: 'Music' },
  { word: 'UPRIGHT', category: 'Position' },
  { word: 'VIBRANT', category: 'Color' },
  { word: 'WEBSITE', category: 'Technology' },
  { word: 'EXCLUDE', category: 'Action' },
  { word: 'YOUNGER', category: 'Age' },
  { word: 'AGAINST', category: 'Concept' },
  { word: 'BALLOON', category: 'Object' },
  { word: 'CAPITAL', category: 'Geography' },
  { word: 'DENSITY', category: 'Science' },
  { word: 'EMPEROR', category: 'History' },
  { word: 'FEELING', category: 'Emotion' },
  { word: 'GENUINE', category: 'Concept' },
  { word: 'HELPFUL', category: 'Trait' },
  { word: 'ICEBERG', category: 'Nature' },
  { word: 'JUPITER', category: 'Science' },
  { word: 'KINGDOM', category: 'History' },
  { word: 'ELEMENT', category: 'Science' },
  { word: 'MONARCH', category: 'History' },
  { word: 'NETWORK', category: 'Technology' },
  { word: 'OPTICAL', category: 'Science' },
  { word: 'PASTURE', category: 'Nature' },
  { word: 'QUARTET', category: 'Music' },
  { word: 'REPLACE', category: 'Action' },
  { word: 'SILENCE', category: 'Concept' },
  { word: 'TADPOLE', category: 'Animal' },
  { word: 'UNCOVER', category: 'Action' },
  { word: 'VALLEYS', category: 'Geography' },
  { word: 'WARMING', category: 'Science' },
  { word: 'EXTRACT', category: 'Action' },
  { word: 'YOUTUBE', category: 'Technology' },
  { word: 'ATHLETE', category: 'Person' },
  { word: 'BUFFALO', category: 'Animal' },
  { word: 'CASHIER', category: 'Career' },
  { word: 'DECIMAL', category: 'Math' },
  { word: 'ELEGANT', category: 'Trait' },
  { word: 'FERTILE', category: 'Nature' },
  { word: 'GESTURE', category: 'Action' },
  { word: 'HOSTAGE', category: 'Concept' },
  { word: 'INSPECT', category: 'Action' },
  { word: 'JAYWALK', category: 'Action' },
  { word: 'KETCHUP', category: 'Food' },
  { word: 'LICENSE', category: 'Document' },
  { word: 'MIDWIFE', category: 'Career' },
  { word: 'NEUTRON', category: 'Science' },
  { word: 'ONGOING', category: 'Concept' },
  { word: 'PARADOX', category: 'Concept' },
  { word: 'REQUEST', category: 'Action' },
  { word: 'SHELVES', category: 'Furniture' },
  { word: 'TITANIC', category: 'History' },
  { word: 'UPSCALE', category: 'Style' },
  { word: 'VOLCANO', category: 'Nature' },
];

function getDailyWord(dateStr) {
  const d = dateStr || localDateStr();
  const hash = d.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return WORD_LIST[hash % WORD_LIST.length];
}

function scrambleWord(word, dateStr) {
  const d = dateStr || localDateStr();
  const seed = d.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7);
  const letters = word.split('');
  // Seeded Fisher-Yates
  let s = seed;
  for (let i = letters.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  // If scrambled === original, swap first two
  if (letters.join('') === word && letters.length > 1) {
    [letters[0], letters[1]] = [letters[1], letters[0]];
  }
  return letters;
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function WordPuzzleGame() {
  const { user } = useAuth();
  const today = localDateStr();
  const daily = getDailyWord(today);
  const [scrambled] = useState(() => scrambleWord(daily.word, today));

  // Track which pool indices have been used (moved to answer)
  const [used, setUsed] = useState(new Set());
  // Answer: array of { letter, poolIndex }
  const [answer, setAnswer] = useState([]);
  const [lives, setLives] = useState(3);
  const [feedback, setFeedback] = useState(null); // { type, msg }
  const [solved, setSolved] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [savedToDb, setSavedToDb] = useState(false);

  // Timer
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (solved || gameOver) return;
    intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(intervalRef.current);
  }, [solved, gameOver]);

  const handleTapPool = useCallback((idx) => {
    if (used.has(idx) || solved || gameOver) return;
    setUsed((prev) => new Set(prev).add(idx));
    setAnswer((prev) => [...prev, { letter: scrambled[idx], poolIndex: idx }]);
    setFeedback(null);
  }, [scrambled, used, solved, gameOver]);

  const handleTapAnswer = useCallback((ansIdx) => {
    if (solved || gameOver) return;
    const item = answer[ansIdx];
    if (!item) return;
    setUsed((prev) => {
      const next = new Set(prev);
      next.delete(item.poolIndex);
      return next;
    });
    setAnswer((prev) => prev.filter((_, i) => i !== ansIdx));
    setFeedback(null);
  }, [answer, solved, gameOver]);

  const handleClear = useCallback(() => {
    setUsed(new Set());
    setAnswer([]);
    setFeedback(null);
  }, []);

  const handleSubmit = useCallback(() => {
    const attempt = answer.map((a) => a.letter).join('');
    if (attempt.length !== daily.word.length) return;

    if (attempt === daily.word) {
      setSolved(true);
      setFeedback({ type: 'correct', msg: 'Correct!' });
    } else {
      const newLives = lives - 1;
      setLives(newLives);
      if (newLives <= 0) {
        setGameOver(true);
        setFeedback({ type: 'wrong', msg: 'No lives remaining.' });
      } else {
        setFeedback({ type: 'wrong', msg: `Not quite. ${newLives} ${newLives === 1 ? 'life' : 'lives'} left.` });
        // Reset answer for retry
        setUsed(new Set());
        setAnswer([]);
      }
    }
  }, [answer, daily.word, lives]);

  // Save to DB on solve
  useEffect(() => {
    if (!solved || savedToDb || !user) return;
    (async () => {
      const { error } = await supabase.from('mind_game_logs').insert({
        user_id: user.id,
        date: localDateStr(),
        game_type: 'word-puzzle',
        completed: true,
        duration_seconds: seconds,
        hints_used: 3 - lives,
      });
      if (error) console.error('[WordPuzzle] save failed:', error);
      else setSavedToDb(true);
    })();
  }, [solved, savedToDb, user, seconds, lives]);

  if (solved) {
    return (
      <div className={styles.wrap}>
        <div className={styles.endState}>
          <div className={styles.endEmoji}>🐸</div>
          <h3 className={styles.endTitle}>Sharp.</h3>
          <p className={styles.endAnswer}>{daily.word}</p>
          <p className={styles.timer}>{formatTime(seconds)} · {3 - lives} wrong</p>
          <p className={styles.endSub}>Come back tomorrow for a new word.</p>
        </div>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className={styles.wrap}>
        <div className={styles.endState}>
          <div className={styles.endEmoji}>😔</div>
          <h3 className={styles.endTitle}>Better luck tomorrow.</h3>
          <p className={styles.endSub}>The word was:</p>
          <p className={styles.endAnswer}>{daily.word}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Daily Word</h3>
          <p className={styles.dateLine}>
            {new Date(today + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
        </div>
        <div className={styles.lives}>
          {'❤️'.repeat(lives)}{'🖤'.repeat(3 - lives)}
        </div>
      </div>

      <p className={styles.category}>Category: {daily.category}</p>

      {/* Answer slots */}
      <div className={styles.answerArea}>
        {Array.from({ length: daily.word.length }).map((_, i) => {
          const a = answer[i];
          return (
            <div
              key={i}
              className={a ? styles.answerSlotFilled : styles.answerSlot}
              onClick={() => a && handleTapAnswer(i)}
            >
              {a ? a.letter : ''}
            </div>
          );
        })}
      </div>

      {/* Scrambled letter pool */}
      <div className={styles.letterPool}>
        {scrambled.map((letter, idx) => (
          <button
            key={idx}
            className={used.has(idx) ? styles.letterTileUsed : styles.letterTile}
            onClick={() => handleTapPool(idx)}
            disabled={used.has(idx)}
          >
            {letter}
          </button>
        ))}
      </div>

      {feedback && (
        <div className={feedback.type === 'correct' ? styles.feedbackCorrect : styles.feedbackWrong}>
          {feedback.msg}
        </div>
      )}

      <div className={styles.controls}>
        <button className={styles.btn} onClick={handleClear}>
          Clear
        </button>
        <button
          className={styles.btnSubmit}
          onClick={handleSubmit}
          disabled={answer.length !== daily.word.length}
        >
          Submit
        </button>
      </div>

      <p style={{ textAlign: 'center', marginTop: '0.75rem' }}>
        <span className={styles.timer}>{formatTime(seconds)}</span>
      </p>
    </div>
  );
}
