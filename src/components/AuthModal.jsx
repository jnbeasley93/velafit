import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import styles from './AuthModal.module.css';

export default function AuthModal({ open, onClose, onSuccess, initialMode = 'login' }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = useCallback(() => {
    setEmail('');
    setPassword('');
    setError('');
    setSuccess('');
    setSubmitting(false);
    setMode(initialMode);
  }, [initialMode]);

  // Sync mode when initialMode prop changes (e.g. opening from different buttons)
  useEffect(() => {
    if (open) setMode(initialMode);
  }, [open, initialMode]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleSubmit = useCallback(async () => {
    setError('');
    setSuccess('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
        reset();
        onSuccess?.();
      } else {
        const data = await signUp(email, password);
        // If Supabase returns a session (email confirmation disabled), proceed immediately
        if (data?.session) {
          reset();
          onSuccess?.();
        } else {
          setSuccess('Check your email to confirm your account.');
          setEmail('');
          setPassword('');
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }, [email, password, mode, signIn, signUp, reset, onSuccess]);

  if (!open) return null;

  return (
    <div
      className={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
          <p>
            {mode === 'login'
              ? 'Sign in to access your plan.'
              : 'Join VelaFit and start building your plan.'}
          </p>
        </div>

        <div className={styles.body}>
          {error && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.success}>{success}</p>}

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Email</label>
            <input
              type="email"
              className={styles.formInput}
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Password</label>
            <input
              type="password"
              className={styles.formInput}
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          <div className={styles.toggle}>
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <button
                  className={styles.toggleLink}
                  onClick={() => {
                    setMode('signup');
                    setError('');
                    setSuccess('');
                  }}
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  className={styles.toggleLink}
                  onClick={() => {
                    setMode('login');
                    setError('');
                    setSuccess('');
                  }}
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.btnCancel} onClick={handleClose}>
            Cancel
          </button>
          <button
            className={styles.btnSubmit}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? 'Loading...'
              : mode === 'login'
                ? 'Sign In'
                : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  );
}
