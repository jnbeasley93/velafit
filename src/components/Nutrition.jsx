import styles from './Nutrition.module.css';

const principles = [
  {
    icon: '🥗',
    title: 'Eat Whole Foods',
    text: "Build most meals around foods you can recognise and prepare simply. Highly processed foods aren't banned — they're just not the foundation.",
  },
  {
    icon: '🚫',
    title: 'Reduce Processed Sugars',
    text: 'Added sugars are treated as occasional, not routine. The system supports this without tracking obsession or moral judgment.',
  },
  {
    icon: '💧',
    title: 'Water First, Always',
    text: 'When choosing a drink, water is the default. Simple, sustainable, and consistently reinforced throughout the day.',
  },
];

export default function Nutrition() {
  return (
    <section id="nutrition" className={styles.section}>
      <div className={styles.layout}>
        <div>
          <div className={styles.tag}>Nutrition Philosophy</div>
          <h2 className={styles.title}>
            Simple rules.
            <br />
            Repeatable results.
          </h2>
          <p className={styles.body}>
            VelaFit doesn't count macros or assign guilt. It builds nutrition
            around three clear principles that busy people can actually follow
            every day.
          </p>
        </div>
        <div className={styles.principles}>
          {principles.map((p) => (
            <div key={p.title} className={styles.principle}>
              <div className={styles.principleIcon}>{p.icon}</div>
              <div>
                <div className={styles.principleTitle}>{p.title}</div>
                <div className={styles.principleText}>{p.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
