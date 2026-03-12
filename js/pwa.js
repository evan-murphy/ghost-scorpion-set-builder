/**
 * BTDOAGS Set List — PWA: wake lock, fullscreen
 */

const PWA = (function() {
  let wakeLock = null;
  let statusEl = null;

  async function enableWakeLock() {
    if (!('wakeLock' in navigator)) return;
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      if (statusEl) statusEl.textContent = '● Screen awake';
      return true;
    } catch (err) {
      if (statusEl) statusEl.textContent = '○ Screen may sleep';
      return false;
    }
  }

  async function releaseWakeLock() {
    if (wakeLock) {
      try {
        await wakeLock.release();
      } catch (e) {}
      wakeLock = null;
      if (statusEl) statusEl.textContent = '○ Screen may sleep';
    }
  }

  function isWakeLockActive() {
    return wakeLock !== null;
  }

  async function toggleWakeLock() {
    if (wakeLock) {
      await releaseWakeLock();
      return false;
    } else {
      return await enableWakeLock();
    }
  }

  function updateStatusEl(el) {
    statusEl = el;
    if (wakeLock) {
      if (el) el.textContent = '● Screen awake';
    } else {
      if (el) el.textContent = '○ Screen may sleep';
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
      enableWakeLock();
    }
  });

  return { enableWakeLock, releaseWakeLock, toggleWakeLock, isWakeLockActive, updateStatusEl };
})();
