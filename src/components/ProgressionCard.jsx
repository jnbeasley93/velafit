import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { analyzeProgression } from '../lib/progressiveOverload';
import styles from './ProgressionCard.module.css';

const DISMISS_KEY = 'vela_progression_dismissed';
const DISMISS_DAYS = 7;

export default function ProgressionCard({ userId }) {
  const [suggestions, setSuggestions] = useState([]);
  const [dismissed, setDismissed] = useState(() => {
    const ts = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
    return ts && Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  });

  useEffect(() => {
    if (!userId || dismissed) return;
    (async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

      const { data } = await supabase
        .from('exercise_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('date', dateStr)
        .order('date', { ascending: false });

      if (!data || data.length === 0) return;

      // Group by exercise_id
      const grouped = {};
      for (const log of data) {
        if (!grouped[log.exercise_id]) grouped[log.exercise_id] = [];
        grouped[log.exercise_id].push(log);
      }

      // Analyze each exercise
      const results = [];
      for (const [exId, history] of Object.entries(grouped)) {
        if (history.length < 3) continue;
        const result = analyzeProgression(history);
        if (result && result.type === 'increase') {
          results.push({
            exerciseId: exId,
            exerciseName: history[0].exercise_name || exId,
            ...result,
          });
        }
        if (results.length >= 3) break;
      }
      setSuggestions(results);
    })();
  }, [userId, dismissed]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  if (dismissed || suggestions.length === 0) return null;

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Ready to level up?</h3>
      {suggestions.map((s) => (
        <div key={s.exerciseId} className={styles.exerciseRow}>
          <span className={styles.exerciseName}>{s.exerciseName}</span>
          <span className={styles.exerciseSuggestion}>{s.suggestion}</span>
        </div>
      ))}
      <button className={styles.dismiss} onClick={handleDismiss}>
        Dismiss
      </button>
    </div>
  );
}
