import { useState, useCallback } from 'react';
import styles from './WaitlistCTA.module.css';

export default function WaitlistCTA() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = useCallback(() => {
    if (!email || !email.includes('@')) {
      setError(true);
      setSubmitted(false);
      return;
    }
    setError(false);
    setSubmitted(true);
    setEmail('');
  }, [email]);

  return (
    <section id="cta" className={styles.section}>
      <h2 className={styles.title}>
        Small leaps.
        <br />
        <em>Real progress.</em>
      </h2>
      <p className={styles.sub}>
        Join the waitlist and be first to build your plan when we launch.
      </p>
      <div className={styles.form}>
        <input
          type="email"
          className={styles.input}
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        <button className={styles.submit} onClick={handleSubmit}>
          Join Waitlist
        </button>
      </div>
      {error && (
        <p className={styles.note} style={{ color: '#c9a84c' }}>
          Please enter a valid email address.
        </p>
      )}
      {submitted && (
        <p className={styles.noteSuccess}>
          You're on the list. Vela will be in touch.
        </p>
      )}
      {!error && !submitted && (
        <p className={styles.note}>No spam. Launch updates only.</p>
      )}
    </section>
  );
}
