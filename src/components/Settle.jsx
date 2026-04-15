import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
  const guidedPrompt = JOURNAL_PROMPTS[dayOfWeek];

  const [mode, setMode] = useState(
    () => localStorage.getItem('vela_journal_mode') || 'guided'
  );
  const [entry, setEntry] = useState('');
  const [savedEntry, setSavedEntry] = useState(null);
  const [recentEntries, setRecentEntries] = useState([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleModeChange = useCallback((m) => {
    setMode(m);
    localStorage.setItem('vela_journal_mode', m);
  }, []);

  const fetchToday = useCallback(async () => {
    if (!user) return;
    const { data: todayData } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', todayStr())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (todayData) setSavedEntry(todayData);

    const { data: recent } = await supabase
      .from('journal_entries')
      .select('id, date, entry')
      .eq('user_id', user.id)
      .neq('date', todayStr())
      .order('date', { ascending: false })
      .limit(2);
    setRecentEntries(recent || []);
  }, [user]);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  const activePrompt = mode === 'guided' ? guidedPrompt : 'free-write';

  const handleSave = useCallback(async () => {
    if (!entry.trim() || !user) return;
    setSaving(true);
    try {
      const { data } = await supabase
        .from('journal_entries')
        .insert({
          user_id: user.id,
          date: todayStr(),
          prompt: activePrompt,
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
  }, [entry, user, activePrompt]);

  return (
    <div className={styles.cardJournal}>
      <h2 className={styles.sectionTitle}>Reflect.</h2>

      <div className={styles.modeToggle}>
        <button
          className={mode === 'guided' ? styles.modeActive : styles.modeInactive}
          onClick={() => handleModeChange('guided')}
        >
          Guided Reflection
        </button>
        <button
          className={mode === 'free' ? styles.modeActive : styles.modeInactive}
          onClick={() => handleModeChange('free')}
        >
          Free Write
        </button>
      </div>

      {mode === 'guided' && (
        <p className={styles.promptBox}>{guidedPrompt}</p>
      )}

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
            placeholder={mode === 'free'
              ? 'Write freely. No structure, no rules. Just you.'
              : 'Write freely. No one\'s grading this.'}
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

      {recentEntries.length > 0 && (
        <div style={{ marginTop: '1.2rem', borderTop: '1px solid var(--card-border)', paddingTop: '1rem' }}>
          <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--stone)', marginBottom: '0.5rem' }}>
            Recent entries
          </p>
          {recentEntries.map((re) => (
            <Link
              to="/journal"
              key={re.id}
              style={{
                display: 'block',
                padding: '0.55rem 0.75rem',
                background: 'var(--warm-white)',
                borderRadius: '2px',
                marginBottom: '0.35rem',
                textDecoration: 'none',
                transition: 'background 0.15s',
              }}
            >
              <span style={{ fontSize: '0.72rem', color: 'var(--stone)', fontWeight: 500 }}>
                {new Date(re.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <span style={{ fontSize: '0.82rem', color: 'var(--charcoal)', fontWeight: 300, marginLeft: '0.5rem' }}>
                {re.entry.length > 80 ? re.entry.slice(0, 80) + '...' : re.entry}
              </span>
            </Link>
          ))}
        </div>
      )}

      <Link
        to="/journal"
        style={{
          display: 'block',
          textAlign: 'center',
          marginTop: '1rem',
          fontSize: '0.82rem',
          color: 'var(--green-accent)',
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        Your Journal →
      </Link>
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
