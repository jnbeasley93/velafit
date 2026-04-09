import { useState, useCallback } from 'react';
import styles from './QuickSession.module.css';

const TIME_OPTIONS = [10, 15, 20, 30, 45, 60];

export function QuickSessionFAB({ onClick }) {
  return (
    <button className={styles.fab} onClick={onClick}>
      <span className={styles.fabIcon}>⚡</span>
      Quick Session
    </button>
  );
}

export function QuickSessionModal({ open, onClose, onStart }) {
  const [minutes, setMinutes] = useState(null);
  const [useSavedEquipment, setUseSavedEquipment] = useState(true);

  const handleStart = useCallback(() => {
    if (!minutes) return;
    onStart({ minutes, bodyweightOnly: !useSavedEquipment });
    setMinutes(null);
    setUseSavedEquipment(true);
  }, [minutes, useSavedEquipment, onStart]);

  const handleClose = useCallback(() => {
    setMinutes(null);
    setUseSavedEquipment(true);
    onClose();
  }, [onClose]);

  if (!open) return null;

  return (
    <div
      className={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Quick Session</h2>
          <p>No plan needed — just pick a time and go.</p>
        </div>

        <div className={styles.body}>
          <label className={styles.label}>How much time do you have?</label>
          <div className={styles.timeChips}>
            {TIME_OPTIONS.map((t) => (
              <button
                key={t}
                className={minutes === t ? styles.chipSelected : styles.chip}
                onClick={() => setMinutes(t)}
              >
                {t} min
              </button>
            ))}
          </div>

          <div className={styles.toggleRow}>
            <span className={styles.toggleLabel}>
              {useSavedEquipment
                ? 'Use my saved equipment'
                : 'Bodyweight only'}
            </span>
            <button
              className={
                useSavedEquipment
                  ? styles.toggleSwitchOn
                  : styles.toggleSwitch
              }
              onClick={() => setUseSavedEquipment((v) => !v)}
            >
              <span className={styles.toggleKnob} />
            </button>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.btnCancel} onClick={handleClose}>
            Cancel
          </button>
          <button
            className={styles.btnGo}
            onClick={handleStart}
            disabled={!minutes}
          >
            Let's go →
          </button>
        </div>
      </div>
    </div>
  );
}
