/**
 * BTDOAGS Set List — PWA: wake lock, fullscreen, install prompt
 */

const PWA = (function() {
  const STORAGE_KEY = 'pwa-install-prompt-dismissed';
  let wakeLock = null;
  let statusEl = null;
  let deferredInstallPrompt = null;

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator.standalone === true);
  }

  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function isAndroid() {
    return /Android/.test(navigator.userAgent);
  }

  function wasPromptDismissed() {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function dismissPrompt() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch (e) {}
  }

  function showInstallBanner() {
    if (isStandalone() || wasPromptDismissed()) return;
    if (!isIOS() && !isAndroid()) return;

    const header = document.getElementById('main-header');
    if (!header || document.getElementById('pwa-install-banner')) return;

    const iosSteps = [
      'Tap the <strong>Share</strong> button (square with arrow) at the bottom of the screen',
      'Scroll down and tap <strong>Add to Home Screen</strong>',
      'Tap <strong>Add</strong> in the top right'
    ];
    const androidSteps = [
      'Tap the <strong>⋮</strong> menu (three dots) in the top right',
      'Tap <strong>Add to Home screen</strong> or <strong>Install app</strong>',
      'Tap <strong>Add</strong> or <strong>Install</strong> to confirm'
    ];
    const steps = isIOS() ? iosSteps : androidSteps;

    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.className = 'pwa-install-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Add to home screen');
    banner.innerHTML = `
      <div class="pwa-install-content">
        <div class="pwa-install-header">
          <span class="material-icons pwa-install-icon">get_app</span>
          <span>Add to home screen for stage use</span>
          <button type="button" class="pwa-install-dismiss" aria-label="Dismiss" title="Dismiss">×</button>
        </div>
        <ol class="pwa-install-steps">
          ${steps.map((s, i) => `<li>${s}</li>`).join('')}
        </ol>
      </div>
    `;

    header.after(banner);

    banner.querySelector('.pwa-install-dismiss').addEventListener('click', () => {
      banner.remove();
      dismissPrompt();
    });

    maybeAddInstallButton();
  }

  function maybeAddInstallButton() {
    const banner = document.getElementById('pwa-install-banner');
    if (!banner || !deferredInstallPrompt || banner.querySelector('.pwa-install-add-btn')) return;
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'pwa-install-add-btn';
    addBtn.textContent = 'Add to Home screen';
    addBtn.addEventListener('click', async () => {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') dismissPrompt();
      banner.remove();
    });
    banner.querySelector('.pwa-install-content').appendChild(addBtn);
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    showInstallBanner();
    maybeAddInstallButton();
  });

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => showInstallBanner());
  } else {
    showInstallBanner();
  }

  return { enableWakeLock, releaseWakeLock, toggleWakeLock, isWakeLockActive, updateStatusEl };
})();
