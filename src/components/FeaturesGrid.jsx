import styles from './FeaturesGrid.module.css';

const features = [
  {
    icon: '🏋️',
    name: 'Adaptive Workouts',
    desc: 'Home and gym workouts auto-generated around your available time. Short on time? 10-minute priority sessions. Open schedule? Full structured training.',
  },
  {
    icon: '🧠',
    name: 'Daily Mind Games',
    desc: 'Sudoku, crosswords, memory games, and word puzzles. Slotted into 5–10 minute windows to maintain mental sharpness throughout the day.',
  },
  {
    icon: '📓',
    name: 'Personal Journal',
    desc: 'Time-boxed daily or weekly journaling with structured prompts and free-write options. Reflection built into the routine, not bolted on.',
  },
  {
    icon: '🥦',
    name: 'Whole-Food Nutrition',
    desc: 'Simple, busy-person nutrition built on whole foods, water-first hydration, and reducing processed sugars. No macro obsession.',
  },
  {
    icon: '📊',
    name: 'Weekly Check-ins with Vela',
    desc: 'Every week Vela reviews your plan against what actually happened — then recalibrates without guilt or pressure. Data-driven, not emotional.',
  },
  {
    icon: '🔄',
    name: 'Auto-Recalibration',
    desc: "Missed sessions are treated as schedule data — the plan adjusts immediately. Nothing to make up. Nothing to catch up on. Just forward.",
  },
];

export default function FeaturesGrid() {
  return (
    <section id="features" className={styles.section}>
      <div className={styles.intro}>
        <div>
          <div className={styles.tag}>Platform Features</div>
          <h2 className={styles.title}>Everything a busy person actually needs.</h2>
        </div>
        <p className={styles.body}>
          One platform for fitness, mental sharpness, nutrition, and reflection — all structured around the time you actually have.
        </p>
      </div>

      <div className={styles.grid}>
        {features.map((f) => (
          <div className={styles.card} key={f.name}>
            <span className={styles.icon}>{f.icon}</span>
            <div className={styles.name}>{f.name}</div>
            <div className={styles.desc}>{f.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
