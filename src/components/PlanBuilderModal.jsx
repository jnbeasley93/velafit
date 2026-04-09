import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import styles from './PlanBuilderModal.module.css';

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TIME_OPTIONS = [
  { value: '15', label: '15 min — quick movement' },
  { value: '30', label: '30 min — focused session' },
  { value: '45', label: '45 min — full session' },
  { value: '60', label: '60 min — extended session' },
  { value: '90', label: '90 min — full programme' },
];

const GOALS = [
  'Build consistent habits',
  'Lose weight sustainably',
  'Increase strength',
  'Improve overall health',
  'Reduce stress & improve focus',
];

const LOCATIONS = [
  'Home — no equipment',
  'Home — some equipment',
  'Gym',
  'Mix of both',
];

function getTimeBreakdown(totalMins, noMindGames) {
  const mins = parseInt(totalMins, 10);
  if (mins <= 15) {
    if (noMindGames) return { workout: 15, journal: 0, mindGame: 0 };
    return { workout: 10, journal: 0, mindGame: 5 };
  }
  if (mins <= 30) {
    if (noMindGames) return { workout: 25, journal: 5, mindGame: 0 };
    return { workout: 20, journal: 7, mindGame: 3 };
  }
  if (mins <= 45) {
    if (noMindGames) return { workout: 35, journal: 10, mindGame: 0 };
    return { workout: 30, journal: 10, mindGame: 5 };
  }
  // 60+
  if (noMindGames) return { workout: 45, journal: 15, mindGame: 0 };
  return { workout: 40, journal: 12, mindGame: 8 };
}

function sessionDesc(mins) {
  if (mins <= 15)
    return 'Quick movement session — 1 priority block. Short and focused.';
  if (mins <= 30)
    return 'Focused session — upper & lower body priority blocks.';
  if (mins <= 45)
    return 'Full-body session — priority blocks first. If time runs short, complete the first two and continue tomorrow.';
  return 'Extended session — full programme with conditioning. Use the extra time well.';
}

function getTodayName() {
  return new Date()
    .toLocaleDateString('en-US', { weekday: 'short' })
    .slice(0, 3);
}

export default function PlanBuilderModal({ open, onClose, onSessionComplete }) {
  const { fitnessProfile } = useAuth();
  const noMindGames =
    fitnessProfile?.mind_games?.includes('No mind games') ?? false;

  const [name, setName] = useState('');
  const [selectedDays, setSelectedDays] = useState([]);
  const [dayTimes, setDayTimes] = useState({});
  const [goal, setGoal] = useState(GOALS[0]);

  // Pre-fill location from fitness profile equipment (array)
  function deriveLocation(equipment) {
    if (!equipment) return LOCATIONS[0];
    const list = Array.isArray(equipment) ? equipment : [equipment];
    if (list.includes('Commercial gym access')) return 'Gym';
    if (list.includes('Full home gym') || list.some((e) =>
      e !== 'None — bodyweight only'
    )) return 'Home — some equipment';
    return 'Home — no equipment';
  }
  const defaultLocation = deriveLocation(fitnessProfile?.equipment);
  const [location, setLocation] = useState(defaultLocation);
  const [showResult, setShowResult] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const reset = useCallback(() => {
    setName('');
    setSelectedDays([]);
    setDayTimes({});
    setGoal(GOALS[0]);
    setLocation(LOCATIONS[0]);
    setShowResult(false);
    setShowConfirmation(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const toggleDay = useCallback((day) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }, []);

  const setDayTime = useCallback((day, value) => {
    setDayTimes((prev) => ({ ...prev, [day]: value }));
  }, []);

  const handleBuild = useCallback(() => {
    if (selectedDays.length === 0) {
      alert('Please select at least one available day.');
      return;
    }
    setShowResult(true);
  }, [selectedDays]);

  if (!open) return null;

  const todayName = getTodayName();
  const displayName = name || 'there';

  return (
    <div
      className={styles.overlayOpen}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Build Your Plan</h2>
          <p>Vela will design your schedule in under 2 minutes.</p>
        </div>

        {!showResult && (
          <div className={styles.body}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Your Name</label>
              <input
                type="text"
                className={styles.formInput}
                placeholder="First name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Select Your Available Days
              </label>
              <p className={styles.dayHint}>
                Tap a day to select it, then set your available time for that
                day.
              </p>
              <div className={styles.dayPicker}>
                {ALL_DAYS.map((day) => (
                  <div
                    key={day}
                    className={
                      selectedDays.includes(day)
                        ? styles.dayChipSelected
                        : styles.dayChip
                    }
                    onClick={() => toggleDay(day)}
                  >
                    {day}
                  </div>
                ))}
              </div>
            </div>

            {selectedDays.length > 0 && (
              <div className={styles.dayTimeSlots}>
                <label className={styles.dayTimeSlotsLabel}>
                  Time Available Per Day
                </label>
                <div className={styles.dayTimeList}>
                  {selectedDays.map((day) => (
                    <div key={day} className={styles.dayTimeRow}>
                      <span className={styles.dayTimeRowLabel}>{day}</span>
                      <select
                        className={styles.dayTimeRowSelect}
                        value={dayTimes[day] || '30'}
                        onChange={(e) => setDayTime(day, e.target.value)}
                      >
                        {TIME_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.formGroup} style={{ marginTop: '1.2rem' }}>
              <label className={styles.formLabel}>Primary Goal</label>
              <select
                className={styles.formSelect}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              >
                {GOALS.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Workout Location</label>
              <select
                className={styles.formSelect}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              >
                {LOCATIONS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {showResult && !showConfirmation && (
          <PlanResult
            name={displayName}
            selectedDays={selectedDays}
            dayTimes={dayTimes}
            goal={goal}
            location={location}
            todayName={todayName}
            noMindGames={noMindGames}
          />
        )}

        {showConfirmation && (
          <div className={styles.planResultShow}>
            <h3>You're all set, {displayName}.</h3>
            <p className={styles.resultSummary}>
              Your plan has been saved. Your dashboard is coming soon — Vela
              will notify you when it's ready.
            </p>
            <p className={styles.resultGoal}>
              In the meantime, your daily briefing is active and your schedule
              is locked in. Consistency starts now.
            </p>
          </div>
        )}

        <div className={styles.footer}>
          <button className={styles.btnCancel} onClick={handleClose}>
            {showResult || showConfirmation ? 'Close' : 'Cancel'}
          </button>
          <button
            className={styles.btnBuild}
            onClick={
              showConfirmation
                ? () => {
                    const todayDay = getTodayName();
                    const todayMins = parseInt(dayTimes[todayDay] || '30', 10);
                    handleClose();
                    onSessionComplete?.(todayMins);
                  }
                : showResult
                  ? () => setShowConfirmation(true)
                  : handleBuild
            }
          >
            {showConfirmation
              ? 'Rate My Session →'
              : showResult
                ? 'Start My First Session →'
                : 'Build My Plan →'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BreakdownBar({ breakdown }) {
  const total = breakdown.workout + breakdown.journal + breakdown.mindGame;
  return (
    <div className={styles.breakdownBar}>
      <div
        className={styles.breakdownWorkout}
        style={{ width: `${(breakdown.workout / total) * 100}%` }}
      >
        {breakdown.workout}m workout
      </div>
      {breakdown.journal > 0 && (
        <div
          className={styles.breakdownJournal}
          style={{ width: `${(breakdown.journal / total) * 100}%` }}
        >
          {breakdown.journal}m journal
        </div>
      )}
      {breakdown.mindGame > 0 && (
        <div
          className={styles.breakdownMind}
          style={{ width: `${(breakdown.mindGame / total) * 100}%` }}
        >
          {breakdown.mindGame}m mind
        </div>
      )}
    </div>
  );
}

function PlanResult({ name, selectedDays, dayTimes, goal, location, todayName, noMindGames }) {
  return (
    <div className={styles.planResultShow}>
      <h3>Your plan is ready, {name}.</h3>
      <p className={styles.resultSummary}>
        {selectedDays.length} training day
        {selectedDays.length > 1 ? 's' : ''}. Each session is sized to your
        available time. Rest days are auto-placed. The plan adapts when life
        shifts.
      </p>

      <div className={styles.planWeek}>
        {ALL_DAYS.map((d) => {
          const isActive = selectedDays.includes(d);
          const mins = isActive ? dayTimes[d] || '30' : null;
          const isToday = d === todayName;
          return (
            <div
              key={d}
              className={isActive ? styles.dayBoxActive : styles.dayBox}
              style={
                isToday
                  ? { outline: '2px solid var(--gold)', outlineOffset: '2px' }
                  : undefined
              }
            >
              <span className={styles.dayAbbr}>{d.slice(0, 1)}</span>
              <span className={styles.dayType}>
                {isActive ? `${mins}m` : 'Rest'}
              </span>
            </div>
          );
        })}
      </div>

      <div className={styles.scheduleTable}>
        {selectedDays.map((d, i) => {
          const isToday = d === todayName;
          const mins = dayTimes[d] || '30';
          const breakdown = getTimeBreakdown(mins, noMindGames);
          return (
            <div key={d}>
              <div
                className={`${
                  i % 2 === 0 ? styles.scheduleRowEven : styles.scheduleRow
                } ${isToday ? styles.scheduleRowToday : ''}`}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {isToday && <span className={styles.todayBadge}>TODAY</span>}
                  {d}
                </span>
                <span className={styles.scheduleRowTime}>
                  {mins} min
                </span>
              </div>
              <div style={{ padding: '0.3rem 0.9rem 0.5rem' }}>
                <BreakdownBar breakdown={breakdown} />
              </div>
            </div>
          );
        })}
      </div>

      <p className={styles.resultGoal}>
        Goal:{' '}
        <strong className={styles.resultGoalHighlight}>{goal}</strong>{' '}
        &middot; {location}
        <br />
        This is your starting structure. Vela will refine it weekly based on
        what actually happens.
      </p>
    </div>
  );
}
