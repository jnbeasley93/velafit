import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import styles from './FeedbackModal.module.css';

// Insert-only from the client (see the feedback table's RLS): logged-in
// feedback carries user_id, logged-out feedback may carry an optional email.
export default function FeedbackModal({ open, onClose }) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setMessage('');
      setEmail('');
      setSaving(false);
      setSuccess(false);
      setSaveError(false);
    }
  }, [open]);

  const canSubmit = message.trim().length > 0;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    setSaveError(false);
    const { error } = await supabase.from('feedback').insert({
      user_id: user?.id ?? null,
      email: user ? null : email.trim() || null,
      message: message.trim(),
      page: window.location.pathname,
    });
    if (error) {
      console.error('[FeedbackModal] save failed:', error);
      setSaveError(true);
      setSaving(false);
      return;
    }
    setSuccess(true);
    setTimeout(() => onClose(), 2600);
  }, [canSubmit, saving, user, email, message, onClose]);

  if (!open) return null;

  if (success) {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.header}>
            <h2>Tell me anything.</h2>
          </div>
          <div className={styles.successState}>
            <div className={styles.successEmoji}>🐸</div>
            <p className={styles.successText}>
              Got it. I read every one of these — and I&apos;m a frog, so I
              have the time.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Tell me anything.</h2>
          <p className={styles.velaLine}>
            A bug, an idea, a gripe, a frog compliment — it all helps.
          </p>
        </div>

        <div className={styles.body}>
          <label className={styles.label}>Your feedback</label>
          <textarea
            className={styles.messageArea}
            placeholder="What's on your mind?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          {!user && (
            <>
              <label className={styles.label}>
                Email — if you&apos;d like a reply (optional)
              </label>
              <input
                type="email"
                className={styles.emailInput}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </>
          )}

          {saveError && (
            <p className={styles.errorMsg}>
              Couldn&apos;t send — check your connection and try again. Your
              message is still here.
            </p>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.btnCancel} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.btnSubmit}
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
          >
            {saving ? 'Sending...' : saveError ? 'Retry →' : 'Send →'}
          </button>
        </div>
      </div>
    </div>
  );
}
