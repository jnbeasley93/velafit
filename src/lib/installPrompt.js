// Captures Chrome/Edge's `beforeinstallprompt` at module load — the event
// often fires before React mounts, so a component-level listener would miss
// it. Consumers subscribe for changes and call promptInstall() to show the
// native install dialog. iOS Safari has no install API; callers fall back to
// manual instructions there.

let deferredPrompt = null;
let installedThisSession = false;
const listeners = new Set();

function notify() {
  for (const fn of listeners) fn(deferredPrompt);
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installedThisSession = true;
    notify();
  });
}

export function getDeferredInstallPrompt() {
  return deferredPrompt;
}

export function wasInstalledThisSession() {
  return installedThisSession;
}

/** Subscribe to deferred-prompt changes. Returns an unsubscribe function. */
export function subscribeInstallPrompt(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Show the native install dialog. Returns 'accepted' | 'dismissed', or null
 * if no deferred prompt is available. The event is single-use, so it's
 * cleared either way.
 */
export async function promptInstall() {
  if (!deferredPrompt) return null;
  const evt = deferredPrompt;
  evt.prompt();
  const choice = await evt.userChoice;
  // Cleared only after the dialog settles, so callers keep rendering their
  // "install available" UI (not the manual fallback) behind the native dialog.
  deferredPrompt = null;
  notify();
  return choice?.outcome ?? null;
}

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    window.navigator.standalone === true
  );
}
