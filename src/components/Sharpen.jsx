import { Link } from 'react-router-dom';
import styles from './Settle.module.css';

export default function Sharpen() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>Sharpen</h1>
        <p className={styles.pageSub}>
          Cognitive games and mental conditioning. Coming soon.
        </p>

        <div className={styles.card} style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧩</div>
          <h2 className={styles.sectionTitle}>Mind games coming soon</h2>
          <p className={styles.velaText} style={{ fontStyle: 'normal', marginBottom: '1.5rem' }}>
            Sudoku, crosswords, memory drills, and logic puzzles will live here.
            Built to fit between sets and after sessions — short cognitive
            workouts that pair with your physical training.
          </p>
          <Link
            to="/dashboard"
            style={{
              display: 'inline-block',
              padding: '0.65rem 1.4rem',
              background: 'var(--green-deep)',
              color: 'var(--cream)',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              borderRadius: '2px',
            }}
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
