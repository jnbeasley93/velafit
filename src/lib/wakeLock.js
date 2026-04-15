let wakeLockSentinel = null;

export async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLockSentinel = await navigator.wakeLock.request('screen');
      console.log('[WakeLock] Screen wake lock acquired');
    }
  } catch (err) {
    console.warn('[WakeLock] Could not acquire wake lock:', err);
  }
}

export async function releaseWakeLock() {
  try {
    if (wakeLockSentinel) {
      await wakeLockSentinel.release();
      wakeLockSentinel = null;
      console.log('[WakeLock] Screen wake lock released');
    }
  } catch (err) {
    console.warn('[WakeLock] Could not release wake lock:', err);
  }
}

// Re-acquire wake lock if the page becomes visible again
// (wake lock is automatically released when page is hidden)
export function setupWakeLockVisibilityHandler() {
  document.addEventListener('visibilitychange', async () => {
    if (wakeLockSentinel !== null && document.visibilityState === 'visible') {
      await requestWakeLock();
    }
  });
}
