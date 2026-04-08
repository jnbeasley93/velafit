import styles from './Hero.module.css';

const stats = [
  { num: '30min', label: 'Minimum session' },
  { num: '7', label: 'Wellness features' },
  { num: '100%', label: 'Schedule-adaptive' },
];

export default function Hero({ onBuildPlan }) {
  return (
    <section id="hero" className={styles.section}>
      <div className={styles.bgPattern} />

      <div className={styles.left}>
        <div className={styles.tag}>Schedule-First Fitness Platform</div>
        <h1 className={styles.title}>
          Fitness that
          <br />
          fits <em>your life.</em>
        </h1>
        <p className={styles.sub}>
          Most fitness plans fail because they ignore real life. VelaFit starts
          with your schedule — not the other way around.
        </p>
        <div className={styles.actions}>
          <a
            href="#"
            className={styles.btnPrimary}
            onClick={(e) => {
              e.preventDefault();
              onBuildPlan?.();
            }}
          >
            Build My Plan
          </a>
          <button
            className={styles.btnGhost}
            onClick={() =>
              document
                .getElementById('how')
                ?.scrollIntoView({ behavior: 'smooth' })
            }
          >
            ↓ See how it works
          </button>
        </div>
        <div className={styles.stats}>
          {stats.map((s) => (
            <div key={s.label}>
              <div className={styles.statNum}>{s.num}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.velaCard}>
          <div className={styles.velaHeader}>
            <div className={styles.velaAvatar}>🐸</div>
            <div>
              <div className={styles.velaName}>Vela</div>
              <div className={styles.velaRole}>Your Fitness Architect</div>
            </div>
          </div>
          <div className={styles.velaMessage}>
            <p>
              This platform starts with one assumption:{' '}
              <strong>your life is already full.</strong>
            </p>
            <p>
              Instead of asking you to force fitness in, we'll design a plan
              around the time you actually have.
            </p>
            <p>
              Progress doesn't come from intensity alone — it comes from
              consistency, and consistency comes from a plan that adapts.
            </p>
          </div>
          <hr className={styles.velaDivider} />
          <div className={styles.velaAction}>
            <span className={styles.velaActionText}>
              Ready to build your plan?
            </span>
            <button
              className={styles.velaActionBtn}
              onClick={() => onBuildPlan?.()}
            >
              Let's start →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
