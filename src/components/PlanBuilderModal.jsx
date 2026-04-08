import { useState, useCallback } from 'react';
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

export default function PlanBuilderModal({ open, onClose }) {
  const [name, setName] = useState('');
  const [selectedDays, setSelectedDays] = useState([]);
  const [dayTimes, setDayTimes] = useState({});
  const [goal, setGoal] = useState(GOALS[0]);
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [showResult, setShowResult] = useState(false);

  const reset = useCallback(() => {
    setName('');
    setSelectedDays([]);
    setDayTimes({});
    setGoal(GOALS[0]);
    setLocation(LOCATIONS[0]);
    setShowResult(false);
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

        {showResult && (
          <PlanResult
            name={displayName}
            selectedDays={selectedDays}
            dayTimes={dayTimes}
            goal={goal}
            location={location}
            todayName={todayName}
          />
        )}

        <div className={styles.footer}>
          <button className={styles.btnCancel} onClick={handleClose}>
            {showResult ? 'Close' : 'Cancel'}
          </button>
          <button
            className={styles.btnBuild}
            onClick={showResult ? handleClose : handleBuild}
          >
            {showResult ? 'Start My First Session →' : 'Build My Plan →'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlanResult({ name, selectedDays, dayTimes, goal, location, todayName }) {
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
          return (
            <div
              key={d}
              className={`${
                i % 2 === 0 ? styles.scheduleRowEven : styles.scheduleRow
              } ${isToday ? styles.scheduleRowToday : ''}`}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isToday && <span className={styles.todayBadge}>TODAY</span>}
                {d}
              </span>
              <span className={styles.scheduleRowTime}>
                {dayTimes[d] || '30'} min
              </span>
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
