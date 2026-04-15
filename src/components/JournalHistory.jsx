import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import styles from './JournalHistory.module.css';

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function detectSource(entry) {
  // Entries from SessionPlayer have prompt "What's one thing that felt different..."
  // Entries from Settle have the rotating day-of-week prompts
  const sessionPrompt = "What's one thing that felt different";
  if (entry.prompt?.startsWith(sessionPrompt)) return 'session';
  return 'settle';
}

// ─────────────────────────────────────────────
// Entry Card (shared between list and calendar)
// ─────────────────────────────────────────────

function EntryCard({ entry, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  const source = detectSource(entry);
  const cardClass = source === 'session' ? styles.entrySession : styles.entrySettle;

  const handleEdit = useCallback(() => {
    setEditText(entry.entry);
    setEditing(true);
    setConfirmDelete(false);
  }, [entry.entry]);

  const handleSave = useCallback(async () => {
    if (!editText.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('journal_entries')
      .update({ entry: editText.trim() })
      .eq('id', entry.id);
    if (error) {
      console.error('[JournalHistory] update failed:', error);
    } else {
      onUpdate({ ...entry, entry: editText.trim() });
    }
    setSaving(false);
    setEditing(false);
  }, [editText, entry, onUpdate]);

  const handleDelete = useCallback(async () => {
    setSaving(true);
    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', entry.id);
    if (error) {
      console.error('[JournalHistory] delete failed:', error);
    } else {
      onDelete(entry.id);
    }
    setSaving(false);
    setConfirmDelete(false);
  }, [entry.id, onDelete]);

  return (
    <div className={cardClass}>
      <div className={styles.entryHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className={styles.entryDate}>{formatDate(entry.date)}</span>
          <span className={source === 'session' ? styles.badgeSession : styles.badgeSettle}>
            {source === 'session' ? 'Session' : 'Settle'}
          </span>
        </div>
        <div className={styles.entryActions}>
          <button className={styles.iconBtn} onClick={handleEdit} title="Edit">✏️</button>
          <button className={styles.iconBtn} onClick={() => { setConfirmDelete(true); setEditing(false); }} title="Delete">🗑️</button>
        </div>
      </div>

      <div className={styles.entryBody}>
        {entry.prompt && (
          <p className={styles.entryPrompt}>{entry.prompt}</p>
        )}

        {editing ? (
          <>
            <textarea
              className={styles.editArea}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
            />
            <div className={styles.editActions}>
              <button className={styles.editSave} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button className={styles.editCancel} onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <p className={styles.entryText}>{entry.entry}</p>
        )}
      </div>

      {confirmDelete && (
        <div className={styles.deleteConfirm}>
          <span className={styles.deleteMsg}>Delete this entry? This cannot be undone.</span>
          <div className={styles.deleteActions}>
            <button className={styles.deleteYes} onClick={handleDelete} disabled={saving}>
              {saving ? '...' : 'Confirm'}
            </button>
            <button className={styles.deleteNo} onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Calendar View
// ─────────────────────────────────────────────

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function CalendarView({ entries, onUpdate, onDelete }) {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(null);

  const entryMap = {};
  for (const e of entries) {
    if (!entryMap[e.date]) entryMap[e.date] = [];
    entryMap[e.date].push(e);
  }

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
    setSelectedDate(null);
  };

  const cells = [];
  // Blanks for days before the 1st
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`blank-${i}`} className={styles.calCellEmpty} />);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const hasEntry = !!entryMap[dateStr];
    const isSelected = selectedDate === dateStr;

    const cellClass = isSelected
      ? styles.calCellSelected
      : hasEntry
        ? styles.calCellHasEntry
        : styles.calCell;

    cells.push(
      <div
        key={dateStr}
        className={cellClass}
        onClick={() => hasEntry && setSelectedDate(isSelected ? null : dateStr)}
      >
        {d}
        {hasEntry && <div className={styles.calDot} />}
      </div>
    );
  }

  const selectedEntries = selectedDate ? (entryMap[selectedDate] || []) : [];

  return (
    <>
      <div className={styles.calHeader}>
        <button className={styles.calNav} onClick={prevMonth}>←</button>
        <span className={styles.calMonth}>{monthName}</span>
        <button className={styles.calNav} onClick={nextMonth}>→</button>
      </div>

      <div className={styles.calGrid}>
        {DAY_LABELS.map((d) => (
          <div key={d} className={styles.calDayLabel}>{d}</div>
        ))}
        {cells}
      </div>

      {selectedEntries.length > 0 && (
        <div className={styles.calExpanded}>
          {selectedEntries.map((e) => (
            <EntryCard key={e.id} entry={e} onUpdate={onUpdate} onDelete={onDelete} />
          ))}
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────

export default function JournalHistory() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    setEntries(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handleUpdate = useCallback((updated) => {
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }, []);

  const handleDelete = useCallback((id) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  if (!user) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.pageTitle}>Your Journal</h1>
          <p className={styles.pageSub}>Please sign in to view your journal.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>Your Journal</h1>
        <p className={styles.pageSub}>Every reflection, saved.</p>

        <div className={styles.velaRow}>
          <div className={styles.velaAvatar}>🐸</div>
          <p className={styles.velaText}>
            Writing about your experience is part of the work. These entries are yours.
          </p>
        </div>

        <p className={styles.countBadge}>
          {entries.length} entr{entries.length === 1 ? 'y' : 'ies'}
        </p>

        <div className={styles.toggleRow}>
          <button
            className={view === 'list' ? styles.toggleBtnActive : styles.toggleBtn}
            onClick={() => setView('list')}
          >
            📋 List
          </button>
          <button
            className={view === 'calendar' ? styles.toggleBtnActive : styles.toggleBtn}
            onClick={() => setView('calendar')}
          >
            📅 Calendar
          </button>
        </div>

        {loading ? (
          <p className={styles.empty}>Loading...</p>
        ) : entries.length === 0 ? (
          <p className={styles.empty}>
            No journal entries yet. Write your first reflection on the Settle page.
          </p>
        ) : view === 'list' ? (
          entries.map((e) => (
            <EntryCard
              key={e.id}
              entry={e}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))
        ) : (
          <CalendarView
            entries={entries}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}
