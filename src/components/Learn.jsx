import { useState } from 'react';
import { Link } from 'react-router-dom';
import Nutrition from './Nutrition';
import Research from './Research';
import styles from './Learn.module.css';

const TABS = [
  { key: 'nutrition', label: '🥗 Nutrition' },
  { key: 'research', label: '🔬 Research' },
];

export default function Learn() {
  const [tab, setTab] = useState('nutrition');

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link to="/dashboard" className={styles.backLink}>
          ← Back to dashboard
        </Link>
        <h1 className={styles.title}>Learn</h1>
        <p className={styles.subtitle}>
          Practical guides and curated research, in one place.
        </p>

        <div className={styles.tabSwitcher} role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              className={tab === t.key ? styles.tabBtnActive : styles.tabBtn}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className={styles.tabPanel}>
          {tab === 'nutrition' ? (
            <Nutrition embedded />
          ) : (
            <Research embedded />
          )}
        </div>
      </div>
    </div>
  );
}
