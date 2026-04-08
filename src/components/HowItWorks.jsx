import { useState, useCallback } from 'react';
import styles from './HowItWorks.module.css';

const steps = [
  {
    num: '01',
    title: 'Map your available time',
    desc: "Tell us which days you have and how much time — even 15 minutes counts. Your schedule is the foundation, not an afterthought.",
  },
  {
    num: '02',
    title: 'Receive your adaptive plan',
    desc: "Vela builds a workout, mind, and nutrition plan that fits within your windows. Short days get short sessions. Open days get more structure.",
  },
  {
    num: '03',
    title: 'The plan adjusts automatically',
    desc: "Missed a session? The plan recalibrates — no guilt, no catching up. Progress doesn't reset. It recalibrates.",
  },
  {
    num: '04',
    title: 'Weekly review with Vela',
    desc: "Each week, Vela reviews what actually happened and refines the structure. Not a pep talk — a system update.",
  },
];

const initialDays = [
  { label: 'M', active: true },
  { label: 'T', active: false },
  { label: 'W', active: true },
  { label: 'T', active: false },
  { label: 'F', active: true },
  { label: 'S', active: false },
  { label: 'S', active: false },
];

const timeData = [
  { label: 'M', width: '60%', duration: '45 min' },
  { label: 'W', width: '40%', duration: '30 min' },
  { label: 'F', width: '80%', duration: '60 min' },
];

export default function HowItWorks() {
  const [days, setDays] = useState(initialDays);

  const toggleDay = useCallback((idx) => {
    setDays((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, active: !d.active } : d))
    );
  }, []);

  return (
    <section id="how" className={styles.section}>
      <div className={styles.tag}>The System</div>
      <h2 className={styles.title}>
        Built around
        <br />
        your real schedule.
      </h2>

      <div className={styles.grid}>
        <div className={styles.steps}>
          {steps.map((s) => (
            <div key={s.num} className={styles.step}>
              <div className={styles.stepNum}>{s.num}</div>
              <div>
                <div className={styles.stepTitle}>{s.title}</div>
                <div className={styles.stepDesc}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.schedulePreview}>
          <div className={styles.scheduleLabel}>// Your Available Days</div>
          <div className={styles.daysGrid}>
            {days.map((d, i) => (
              <div
                key={i}
                className={d.active ? styles.dayBtnActive : styles.dayBtn}
                onClick={() => toggleDay(i)}
              >
                {d.label}
              </div>
            ))}
          </div>
          <div className={styles.scheduleLabel}>
            // Time Available Per Session
          </div>
          <div className={styles.timeSlots}>
            {timeData.map((t) => (
              <div key={t.label} className={styles.timeRow}>
                <span className={styles.timeRowLabel}>{t.label}</span>
                <div className={styles.timeBar}>
                  <div
                    className={styles.timeFill}
                    style={{ width: t.width }}
                  />
                </div>
                <span className={styles.timeDuration}>{t.duration}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
