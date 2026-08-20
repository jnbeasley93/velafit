import { useState, useEffect, useMemo, useCallback } from 'react';
import velaImg from '../assets/vela.jpg';
import {
  getDeferredInstallPrompt,
  subscribeInstallPrompt,
  promptInstall,
  isStandalone,
} from '../lib/installPrompt';
import styles from './InstallPrompt.module.css';

export const INSTALL_PROMPTED_KEY = 'vela_install_prompted';
const APP_URL = 'vela-fitness.vercel.app';

export function detectPlatform() {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  if (isIOS) return 'ios';
  if (isAndroid) return 'android';
  return 'desktop';
}

const INCENTIVE_LINE = 'Installing is what turns on your workout reminders.';

// Still consumed by Settings' "Add to Home Screen" section — keep the shape.
export const INSTALL_CONTENT = {
  ios: {
    title: 'Add VelaFit to your home screen',
    vela: INCENTIVE_LINE,
    steps: [
      '📤 Tap the Share button at the bottom of your browser',
      '📲 Scroll down and tap "Add to Home Screen"',
      '✅ Tap "Add" — done!',
    ],
    showArrow: true,
  },
  android: {
    title: 'Add VelaFit to your home screen',
    vela: INCENTIVE_LINE,
    steps: [
      '⋮ Tap the three dots menu in the top right',
      '📲 Tap "Add to Home Screen" or "Install App"',
      '✅ Tap "Add" — done!',
    ],
    showArrow: false,
  },
  desktop: {
    title: 'Get VelaFit on your phone',
    vela:
      'Open vela-fitness.vercel.app on your phone and add it to your home screen for the full app experience.',
    steps: [],
    showArrow: false,
  },
};

// The iOS share glyph (tray with an up arrow), inline so the instruction can
// show the exact icon the user must find in Safari's toolbar.
function ShareIcon() {
  return (
    <svg
      className={styles.shareIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="Share icon"
    >
      <path d="M8 8H6.5A1.5 1.5 0 0 0 5 9.5v10A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-10A1.5 1.5 0 0 0 17.5 8H16" />
      <path d="M12 14V3" />
      <path d="M8.5 6.5 12 3l3.5 3.5" />
    </svg>
  );
}

export function InstallSteps({ platform }) {
  const config = INSTALL_CONTENT[platform] || INSTALL_CONTENT.desktop;

  if (platform === 'desktop') {
    return (
      <div className={styles.urlBox}>
        <span className={styles.urlLabel}>Open on your phone</span>
        <span className={styles.url}>{APP_URL}</span>
      </div>
    );
  }

  return (
    <ol className={styles.steps}>
      {config.steps.map((step, i) => (
        <li key={i} className={styles.step}>
          <span className={styles.stepNumber}>{i + 1}</span>
          <span className={styles.stepText}>{step}</span>
        </li>
      ))}
    </ol>
  );
}

export default function InstallPrompt({ open, onClose }) {
  const platform = useMemo(() => detectPlatform(), []);
  const [installEvt, setInstallEvt] = useState(getDeferredInstallPrompt);
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => subscribeInstallPrompt(setInstallEvt), []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(INSTALL_PROMPTED_KEY, 'true');
    } catch {
      // localStorage may be unavailable (private mode) — ignore
    }
    onClose();
  }, [onClose]);

  const handleInstall = useCallback(async () => {
    const outcome = await promptInstall();
    if (outcome === 'accepted') {
      setCelebrating(true);
      setTimeout(() => {
        try {
          localStorage.setItem(INSTALL_PROMPTED_KEY, 'true');
        } catch {
          // ignore
        }
        onClose();
      }, 2400);
    }
    // Declined the native dialog: the event is spent, so the component falls
    // back to manual instructions automatically.
  }, [onClose]);

  if (!open) return null;
  // Already running installed — this screen has no job to do.
  if (isStandalone()) return null;

  if (celebrating) {
    return (
      <div className={styles.overlay} role="dialog" aria-modal="true">
        <div className={styles.modal}>
          <img src={velaImg} alt="" className={styles.mascot} />
          <h2 className={styles.title}>Installed! 🎉</h2>
          <p className={styles.velaLine}>
            Vela is one tap away now — see you on the home screen. 🐸
          </p>
        </div>
      </div>
    );
  }

  // Native install available (Android / desktop Chrome & Edge): one button,
  // no instructions to follow.
  if (installEvt) {
    return (
      <div className={styles.overlay} role="dialog" aria-modal="true">
        <div className={styles.modal}>
          <img src={velaImg} alt="" className={styles.mascot} />
          <h2 className={styles.title}>Add VelaFit to your home screen</h2>
          <p className={styles.incentive}>{INCENTIVE_LINE}</p>
          <button className={styles.btnPrimary} onClick={handleInstall}>
            Install VelaFit
          </button>
          <button className={styles.btnSkip} onClick={dismiss}>
            I&apos;ll do this later
          </button>
        </div>
      </div>
    );
  }

  // iOS Safari: no install API. Nothing may sit below the arrow — the only
  // tap target down there must be Safari's own share button. Dismiss lives
  // at the top as a small text link.
  if (platform === 'ios') {
    return (
      <div className={styles.overlay} role="dialog" aria-modal="true">
        <div className={`${styles.modal} ${styles.modalIos}`}>
          <button className={styles.laterLink} onClick={dismiss}>
            I&apos;ll do this later
          </button>
          <img src={velaImg} alt="" className={styles.mascot} />
          <h2 className={styles.title}>Add VelaFit to your home screen</h2>
          <p className={styles.incentive}>{INCENTIVE_LINE}</p>
          <p className={styles.iosInstruction}>
            Tap the <ShareIcon /> in Safari&apos;s toolbar below, then{' '}
            <strong>&ldquo;Add to Home Screen&rdquo;</strong>.
          </p>
          <div className={styles.arrowHint} aria-hidden="true">
            <span className={styles.arrowText}>
              Safari&apos;s share button is down here
            </span>
            <span className={styles.arrowIcon}>⌄</span>
          </div>
        </div>
      </div>
    );
  }

  // Android without a captured prompt, or desktop: manual instructions.
  // No arrow points down here, so bottom buttons don't compete with anything.
  const config = INSTALL_CONTENT[platform];
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <img src={velaImg} alt="" className={styles.mascot} />
        <h2 className={styles.title}>{config.title}</h2>
        <p className={styles.velaLine}>{config.vela}</p>
        <InstallSteps platform={platform} />
        <button className={styles.btnPrimary} onClick={dismiss}>
          Got it! 🐸
        </button>
        <button className={styles.btnSkip} onClick={dismiss}>
          Skip for now
        </button>
      </div>
    </div>
  );
}
