/**
 * BTDOAGS Set List — PWA: wake lock, fullscreen, install prompt
 */

const PWA = (function() {
  const STORAGE_KEY = 'pwa-install-prompt-dismissed';
  let wakeLock = null;
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

  /** Google Chrome on iPhone/iPad — still WebKit; same limits as Safari for fullscreen / wake lock. */
  function isChromeIOS() {
    return /CriOS/i.test(navigator.userAgent);
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

    const iosSafariSteps = [
      'Tap the <strong>Share</strong> button (square with arrow) at the bottom of the screen',
      'Scroll down and tap <strong>Add to Home Screen</strong>',
      'Tap <strong>Add</strong> in the top right'
    ];
    const iosChromeSteps = [
      'Tap <strong>⋯</strong> (menu) in Chrome',
      'Tap <strong>Add to Home Screen</strong> and confirm',
      'Open the set list from the new icon — same WebKit limits as Safari on iPhone'
    ];
    const androidSteps = [
      'Tap the <strong>⋮</strong> menu (three dots) in the top right',
      'Tap <strong>Add to Home screen</strong> or <strong>Install app</strong>',
      'Tap <strong>Add</strong> or <strong>Install</strong> to confirm'
    ];
    const steps = isAndroid() ? androidSteps : isChromeIOS() ? iosChromeSteps : iosSafariSteps;

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

  function getWakeLockStatusLine() {
    if (!window.isSecureContext) {
      return '○ Screen awake: needs https:// (not a file or http link).';
    }
    if (!('wakeLock' in navigator)) {
      if (isIOS()) {
        return '○ Screen awake: iPhone often hides this in the browser tab — add to Home Screen and open from the icon.';
      }
      return '○ This browser can’t keep the screen on.';
    }
    if (wakeLock !== null) {
      return '● Screen awake';
    }
    return '○ Screen may sleep';
  }

  async function enableWakeLock() {
    if (!window.isSecureContext) {
      return false;
    }
    if (!('wakeLock' in navigator)) {
      return false;
    }
    if (wakeLock !== null) {
      return true;
    }
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      return true;
    } catch (err) {
      return false;
    }
  }

  async function releaseWakeLock() {
    if (wakeLock) {
      try {
        await wakeLock.release();
      } catch (e) {}
      wakeLock = null;
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

  return {
    enableWakeLock,
    releaseWakeLock,
    toggleWakeLock,
    isWakeLockActive,
    getWakeLockStatusLine,
    isIOS,
    isChromeIOS,
    isStandalone
  };
})();
