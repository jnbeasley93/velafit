import styles from './Pricing.module.css';

const plans = [
  {
    tier: 'Free',
    amount: '$0',
    per: 'forever',
    features: [
      'Schedule-based workout plan',
      'Daily check-in with Vela',
      'Basic mind games',
      'Whole-food nutrition guide',
      '3 journal entries / week',
    ],
    btnLabel: 'Get Started',
    featured: false,
  },
  {
    tier: 'Pro',
    amount: '$15',
    per: 'per month',
    features: [
      'Everything in Free',
      'Full mind game library',
      'Unlimited journaling',
      'Weekly recalibration with Vela',
      'Nutrition meal templates',
      'Progress analytics',
    ],
    btnLabel: 'Start Free Trial',
    featured: true,
    badge: 'Most Popular',
  },
  {
    tier: 'Employer',
    amount: '$\u2014',
    per: 'custom pricing',
    features: [
      'Team wellness dashboard',
      'HR integration',
      'Group check-ins',
      'Aggregate analytics',
      'Dedicated onboarding',
    ],
    btnLabel: 'Contact Us',
    featured: false,
  },
];

export default function Pricing({ onGetStarted }) {
  return (
    <section id="pricing" className={styles.section}>
      <span className={styles.tag}>Simple Pricing</span>
      <h2 className={styles.title}>
        Start free.
        <br />
        Grow when ready.
      </h2>
      <p className={styles.body}>
        No hidden fees. No upsell pressure. A plan that adapts to where you are.
      </p>

      <div className={styles.grid}>
        {plans.map((p) => (
          <div
            key={p.tier}
            className={p.featured ? styles.cardFeatured : styles.card}
          >
            {p.badge && <div className={styles.badge}>{p.badge}</div>}
            <div className={styles.tier}>{p.tier}</div>
            <div className={styles.amount}>{p.amount}</div>
            <div className={styles.per}>{p.per}</div>
            <ul className={styles.features}>
              {p.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <button
              className={p.featured ? styles.btnFeatured : styles.btn}
              onClick={() => onGetStarted?.()}
            >
              {p.btnLabel}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
