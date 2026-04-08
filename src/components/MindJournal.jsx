import styles from './MindJournal.module.css';

const cards = [
  {
    icon: '🧩',
    title: 'Daily Mind Games',
    desc: 'Five to ten minute brain challenges slotted into your available windows. Keeps the mind engaged without adding to your to-do list.',
    tags: ['Sudoku', 'Crossword', 'Memory', 'Word Puzzles', 'Logic Games'],
  },
  {
    icon: '✍️',
    title: 'Personal Journal',
    desc: 'Structured prompts or free-write — your choice. Designed for five to ten minute sessions that build self-awareness and reinforce consistency over time.',
    tags: ['Daily Prompts', 'Weekly Reflection', 'Free Write', 'Progress Log'],
  },
];

export default function MindJournal() {
  return (
    <section id="mind" className={styles.section}>
      <div className={styles.tag}>Mental Fitness</div>
      <h2 className={styles.title}>
        A sharp mind runs
        <br />
        the whole system.
      </h2>
      <p className={styles.body}>
        Short mental breaks aren't distractions — they're part of the plan.
        VelaFit builds mental sharpness into your daily structure.
      </p>

      <div className={styles.grid}>
        {cards.map((c) => (
          <div key={c.title} className={styles.card}>
            <div className={styles.cardIcon}>{c.icon}</div>
            <h3 className={styles.cardTitle}>{c.title}</h3>
            <p className={styles.cardDesc}>{c.desc}</p>
            <div className={styles.tags}>
              {c.tags.map((t) => (
                <span key={t} className={styles.tagChip}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
