import { useAuth } from '../contexts/AuthContext';
import styles from './WaitlistCTA.module.css';

export default function WaitlistCTA({ onSignUp }) {
  const { user } = useAuth();

  if (user) {
    return (
      <section id="cta" className={styles.section}>
        <h2 className={styles.title}>
          You're in.
          <br />
          <em>Let's go.</em>
        </h2>
        <p className={styles.sub}>
          Your plan is active. Vela is calibrating around your schedule.
        </p>
      </section>
    );
  }

  return (
    <section id="cta" className={styles.section}>
      <h2 className={styles.title}>
        Small leaps.
        <br />
        <em>Real progress.</em>
      </h2>
      <p className={styles.sub}>
        Create a free account and build your first plan in under 2 minutes.
      </p>
      <button className={styles.signUpBtn} onClick={() => onSignUp?.()}>
        Create Free Account
      </button>
    </section>
  );
}
