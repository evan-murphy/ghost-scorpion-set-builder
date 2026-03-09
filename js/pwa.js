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
    } catch (err) {
      if (statusEl) statusEl.textContent = '○ Screen may sleep';
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

  return { enableWakeLock, updateStatusEl };
})();
