import { useMemo } from 'react';
import velaImg from '../assets/vela.jpg';
import styles from './InstallPrompt.module.css';

export const INSTALL_PROMPTED_KEY = 'vela_install_prompted';
const APP_URL = 'vela-fitness.vercel.app';

export function detectPlatform() {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isChrome = /Chrome/.test(ua);
  const isSafari = /Safari/.test(ua) && !isChrome;
  if (isIOS) return isSafari ? 'ios' : 'ios';
  if (isAndroid) return isChrome ? 'android' : 'android';
  return 'desktop';
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    window.navigator.standalone === true
  );
}

const VELA_LINE =
  'For the best experience — and so Vela is always one tap away — add this to your home screen.';

export const INSTALL_CONTENT = {
  ios: {
    title: 'Add VelaFit to your home screen',
    vela: VELA_LINE,
    steps: [
      '📤 Tap the Share button at the bottom of your browser',
      '📲 Scroll down and tap "Add to Home Screen"',
      '✅ Tap "Add" — done!',
    ],
    showArrow: true,
  },
  android: {
    title: 'Add VelaFit to your home screen',
    vela: VELA_LINE,
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
    <>
      <ol className={styles.steps}>
        {config.steps.map((step, i) => (
          <li key={i} className={styles.step}>
            <span className={styles.stepNumber}>{i + 1}</span>
            <span className={styles.stepText}>{step}</span>
          </li>
        ))}
      </ol>
      {config.showArrow && (
        <div className={styles.arrowHint} aria-hidden="true">
          <span className={styles.arrowText}>Share button is below ↓</span>
          <span className={styles.arrowIcon}>⌄</span>
        </div>
      )}
    </>
  );
}

export default function InstallPrompt({ open, onClose }) {
  const platform = useMemo(() => detectPlatform(), []);

  if (!open) return null;
  if (typeof window !== 'undefined' && isStandalone()) return null;

  const config = INSTALL_CONTENT[platform];

  const dismiss = () => {
    try {
      localStorage.setItem(INSTALL_PROMPTED_KEY, 'true');
    } catch {
      // localStorage may be unavailable (private mode) — ignore
    }
    onClose();
  };

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
