import { useMemo } from 'react';
import styles from './DailyBriefing.module.css';

const planItems = [
  {
    dot: 'dot',
    text: 'Full-body strength session — priority blocks first. If time runs short, complete the first two and continue tomorrow.',
    duration: '45 min',
  },
  {
    dot: 'dotGold',
    text: "5-minute brain break — today's crossword is queued and ready.",
    duration: '5 min',
  },
  {
    dot: 'dotGold',
    text: 'Journal prompt: What got in the way this week — and what adjusted?',
    duration: '8 min',
  },
  {
    dot: 'dotDim',
    text: 'Nutrition reminder: Protein-first lunch. Water before any other drink today.',
    duration: '\u2014',
  },
];

export default function DailyBriefing() {
  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  return (
    <section id="daily" className={styles.section}>
      <div className={styles.grid}>
        <div className={styles.left}>
          <div className={styles.tag}>Daily Briefing</div>
          <h2 className={styles.title}>
            Today's plan,
            <br />
            built around today.
          </h2>
          <p className={styles.body}>
            Every morning Vela delivers a clear, concise briefing. No decisions
            required — just direction. This is what leadership looks like.
          </p>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Today's Plan</span>
            <span className={styles.date}>{todayStr}</span>
          </div>
          <div className={styles.cardBody}>
            {planItems.map((item) => (
              <div className={styles.planLine} key={item.text}>
                <div className={styles[item.dot]} />
                <div className={styles.planText}>{item.text}</div>
                <div className={styles.planDuration}>{item.duration}</div>
              </div>
            ))}
          </div>
          <div className={styles.cardFooter}>
            <div className={styles.sig}>
              <div className={styles.sigDot}>🐸</div>
              <span>Vela &middot; Your plan is ready.</span>
            </div>
            <button className={styles.beginBtn}>Begin →</button>
          </div>
        </div>
      </div>
    </section>
  );
}
