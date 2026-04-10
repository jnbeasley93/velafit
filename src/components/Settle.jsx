import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { localDateStr } from '../lib/dates';
import BreathingPlayer from './BreathingPlayer';
import styles from './Settle.module.css';

const JOURNAL_PROMPTS = [
  "What does next week need from you?", // Sunday (0)
  "What felt hard this week that you pushed through anyway?", // Monday (1)
  "Where did you show up for yourself today?", // Tuesday (2)
  "What would you tell a friend who had your exact day?", // Wednesday (3)
  "What drained you today and what gave you energy?", // Thursday (4)
  "What's one thing you want to leave behind this week?", // Friday (5)
  "What are you most proud of from this week?", // Saturday (6)
];

function todayStr() {
  return localDateStr();
}

// ─────────────────────────────────────────────
// Gratitude Section
// ─────────────────────────────────────────────

function GratitudeSection() {
  const { user } = useAuth();
  const [entry, setEntry] = useState('');
  const [savedEntry, setSavedEntry] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchToday = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('gratitude_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', todayStr())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) setSavedEntry(data);
  }, [user]);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  const handleSave = useCallback(async () => {
    if (!entry.trim() || !user) return;
    setSaving(true);
    try {
      const { data } = await supabase
        .from('gratitude_entries')
        .insert({
          user_id: user.id,
          date: todayStr(),
          entry: entry.trim(),
        })
        .select()
        .single();
      if (data) setSavedEntry(data);
      setEntry('');
    } catch (err) {
      console.error('Gratitude save failed:', err);
    } finally {
      setSaving(false);
    }
  }, [entry, user]);

  return (
    <div className={styles.cardGratitude}>
      <h2 className={styles.sectionTitle}>One good thing.</h2>
      <div className={styles.velaPrompt}>
        <div className={styles.velaAvatar}>🐸</div>
        <p className={styles.velaText}>
          What's one thing — big or small — that you're grateful for today?
        </p>
      </div>

      {savedEntry ? (
        <div className={styles.savedState}>
          <span className={styles.savedCheck}>✓</span>
          <div>
            <p className={styles.savedText}>{savedEntry.entry}</p>
            <p className={styles.savedHint}>Come back tomorrow.</p>
          </div>
        </div>
      ) : (
        <>
          <input
            type="text"
            className={styles.input}
            placeholder="Today I'm grateful for..."
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
          <button
            className={styles.btnSave}
            onClick={handleSave}
            disabled={!entry.trim() || saving}
          >
            {saving ? 'Saving...' : 'Save →'}
          </button>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Journal Section
// ─────────────────────────────────────────────

function JournalSection() {
  const { user } = useAuth();
  const dayOfWeek = new Date().getDay();
  const prompt = JOURNAL_PROMPTS[dayOfWeek];

  const [entry, setEntry] = useState('');
  const [savedEntry, setSavedEntry] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchToday = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', todayStr())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) setSavedEntry(data);
  }, [user]);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  const handleSave = useCallback(async () => {
    if (!entry.trim() || !user) return;
    setSaving(true);
    try {
      const { data } = await supabase
        .from('journal_entries')
        .insert({
          user_id: user.id,
          date: todayStr(),
          prompt,
          entry: entry.trim(),
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (data) setSavedEntry(data);
      setEntry('');
      setEditing(false);
    } catch (err) {
      console.error('Journal save failed:', err);
    } finally {
      setSaving(false);
    }
  }, [entry, user, prompt]);

  return (
    <div className={styles.cardJournal}>
      <h2 className={styles.sectionTitle}>Reflect.</h2>
      <p className={styles.promptBox}>{prompt}</p>

      {savedEntry && !editing ? (
        <div className={styles.savedState}>
          <span className={styles.savedCheck}>✓</span>
          <div style={{ flex: 1 }}>
            <p className={styles.savedText}>
              {savedEntry.entry.length > 200
                ? savedEntry.entry.slice(0, 200) + '...'
                : savedEntry.entry}
            </p>
            <button
              className={styles.btnEdit}
              onClick={() => { setEntry(''); setEditing(true); }}
            >
              + Add another reflection
            </button>
          </div>
        </div>
      ) : (
        <>
          <textarea
            className={styles.textarea}
            placeholder="Write freely. No one's grading this."
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
          />
          <button
            className={styles.btnSave}
            onClick={handleSave}
            disabled={!entry.trim() || saving}
          >
            {saving ? 'Saving...' : 'Save reflection →'}
          </button>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Breathing Section
// ─────────────────────────────────────────────

function BreatheSection({ onLaunch }) {
  const [freeTimerMins, setFreeTimerMins] = useState(5);

  return (
    <div className={styles.card}>
      <h2 className={styles.sectionTitle}>Breathe.</h2>
      <div className={styles.velaPrompt}>
        <div className={styles.velaAvatar}>🐸</div>
        <p className={styles.velaText}>
          A few minutes of intentional breathing changes everything. Pick one.
        </p>
      </div>

      <div className={styles.breatheGrid}>
        <button
          className={styles.modeCard}
          onClick={() => onLaunch({ mode: 'box' })}
        >
          <span className={styles.modeEmoji}>🫁</span>
          <p className={styles.modeTitle}>Box Breathing</p>
          <p className={styles.modeDesc}>
            Inhale · Hold · Exhale · Hold — 4 counts each. The classic stress
            reset.
          </p>
        </button>

        <button
          className={styles.modeCard}
          onClick={() => onLaunch({ mode: 'free', minutes: freeTimerMins })}
        >
          <span className={styles.modeEmoji}>⏱️</span>
          <p className={styles.modeTitle}>Free Timer</p>
          <p className={styles.modeDesc}>
            Set your own duration. Just you and silence.
          </p>
          <div className={styles.modeTimerChips} onClick={(e) => e.stopPropagation()}>
            {[2, 5, 10].map((m) => (
              <button
                key={m}
                className={
                  freeTimerMins === m ? styles.timeChipSelected : styles.timeChip
                }
                onClick={(e) => {
                  e.stopPropagation();
                  setFreeTimerMins(m);
                }}
              >
                {m} min
              </button>
            ))}
          </div>
        </button>

        <button
          className={styles.modeCard}
          style={{ gridColumn: '1 / -1' }}
          onClick={() => onLaunch({ mode: 'bodyscan' })}
        >
          <span className={styles.modeEmoji}>🧘</span>
          <p className={styles.modeTitle}>Guided Body Scan</p>
          <p className={styles.modeDesc}>
            Progressive relaxation from head to toe. 8–10 minutes.
          </p>
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Settle Page
// ─────────────────────────────────────────────

export default function Settle() {
  const { user } = useAuth();
  const [breathSession, setBreathSession] = useState(null);

  if (!user) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.pageTitle}>Settle</h1>
          <p className={styles.pageSub}>Please sign in to use this space.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>Settle</h1>
        <p className={styles.pageSub}>
          A space to slow down. Reflect, breathe, and return to yourself.
        </p>

        <GratitudeSection />
        <JournalSection />
        <BreatheSection onLaunch={setBreathSession} />
      </div>

      <BreathingPlayer
        open={!!breathSession}
        session={breathSession}
        onClose={() => setBreathSession(null)}
      />
    </div>
  );
}
