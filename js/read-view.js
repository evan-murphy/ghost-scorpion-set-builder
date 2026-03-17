/**
 * BTDOAGS Set List — Mobile read view (stage view)
 */

const READ_VIEW = (function() {
  async function render(container, id, { navigate }) {
    container.innerHTML = '<p style="text-align:center;color:#999;">Loading...</p>';

    let songs, setlists;
    try {
      [songs, setlists] = await Promise.all([
        DATA.fetchSongs(),
        DATA.fetchSetlists()
      ]);
    } catch (err) {
      container.innerHTML = `
        <p style="text-align:center;color:var(--accent-red);margin-bottom:0.5rem;">Failed to load: ${String(err.message).replace(/</g, '&lt;')}</p>
        <p style="text-align:center;font-size:0.9rem;color:var(--text-secondary);">
          <a href="/" data-route="/" style="color:var(--accent-yellow);">Back to Setlists</a>
        </p>
      `;
      return;
    }

    const setlist = DATA.getSetlistById(setlists, id);
    if (!setlist) {
      container.innerHTML = '<p style="text-align:center;">Set list not found.</p>';
      return;
    }

    const songMap = Object.fromEntries(songs.map(s => [s.id, s]));
    const items = buildDisplayItems(setlist, songMap);

    const basePath = CONFIG.BASE_PATH || '';
    const logoPath = basePath + '/assets/scorpion-white.png';

    container.innerHTML = `
      <div class="stage-root">
        <header class="stage-header">
          <a href="/" data-route="/" class="stage-logo-back" aria-label="Back to Setlists">
            <img src="${logoPath}" alt="" class="stage-logo">
            <span class="stage-logo-back-arrow material-icons" aria-hidden="true">arrow_back</span>
          </a>
        </header>
        <div class="stage-scroll">
        <ul class="stage-list">
          ${items.map(item => `
            <li class="${item.divider ? 'divider' : ''}">${item.divider ? '—' : item.display_title}</li>
          `).join('')}
        </ul>
        <div class="stage-control-bar">
          <div class="stage-control-divider"></div>
          <div class="stage-control-row stage-control-nav">
            <a href="/" data-route="/" class="stage-control-btn stage-control-back"><span class="material-icons">arrow_back</span> Back to Setlists</a>
          </div>
          <button type="button" class="stage-control-primary" id="btn-fullscreen"><span class="material-icons" id="btn-fullscreen-icon">fullscreen</span> <span id="btn-fullscreen-label">Enter Stage View</span></button>
          <div class="stage-control-row stage-control-utils">
            <div class="stage-control-more-wrap">
              <button type="button" class="stage-control-btn stage-control-more" id="btn-more" aria-haspopup="true" aria-expanded="false"><span class="material-icons">more_horiz</span> More</button>
              <div class="stage-control-more-menu" id="more-menu" aria-hidden="true">
                <div class="stage-control-more-item">
                  <label class="stage-control-toggle">
                    <input type="checkbox" id="wake-toggle" ${typeof PWA !== 'undefined' && PWA.isWakeLockActive() ? 'checked' : ''}>
                    <span class="stage-control-toggle-slider"></span>
                    <span class="stage-control-toggle-label">Keep screen awake</span>
                  </label>
                </div>
                <button type="button" class="stage-control-more-item stage-control-export-pdf" data-id="${setlist.id}"><span class="material-icons">description</span> Export PDF</button>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    `;

    if (typeof PWA !== 'undefined') {
      PWA.enableWakeLock().then(() => {
        const t = document.getElementById('wake-toggle');
        if (t) t.checked = PWA.isWakeLockActive();
      });
    }

    const fullscreenBtn = document.getElementById('btn-fullscreen');
    const fullscreenIcon = document.getElementById('btn-fullscreen-icon');
    const fullscreenLabel = document.getElementById('btn-fullscreen-label');
    if (fullscreenBtn) {
      const fsEl = document.documentElement;
      const hasFs = () => !!(document.fullscreenElement ?? document.webkitFullscreenElement);
      fullscreenBtn.addEventListener('click', async () => {
        try {
          if (hasFs()) {
            await (document.exitFullscreen ?? document.webkitExitFullscreen)?.();
          } else {
            await (fsEl.requestFullscreen ?? fsEl.webkitRequestFullscreen)?.();
            if (typeof PWA !== 'undefined') PWA.enableWakeLock();
          }
        } catch (e) {}
      });
      const onFsChange = () => {
        if (fullscreenIcon) fullscreenIcon.textContent = hasFs() ? 'fullscreen_exit' : 'fullscreen';
        if (fullscreenLabel) fullscreenLabel.textContent = hasFs() ? 'Exit Stage View' : 'Enter Stage View';
      };
      document.addEventListener('fullscreenchange', onFsChange);
      document.addEventListener('webkitfullscreenchange', onFsChange);
      onFsChange();
    }

    const moreBtn = document.getElementById('btn-more');
    const moreMenu = document.getElementById('more-menu');
    if (moreBtn && moreMenu) {
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = moreMenu.getAttribute('aria-hidden') === 'true';
        moreMenu.setAttribute('aria-hidden', isHidden ? 'false' : 'true');
        moreBtn.setAttribute('aria-expanded', isHidden);
      });
      const closeMore = () => {
        moreMenu.setAttribute('aria-hidden', 'true');
        moreBtn?.setAttribute('aria-expanded', 'false');
      };
      document.addEventListener('click', closeMore);
      moreMenu.addEventListener('click', (e) => e.stopPropagation());
    }

    const wakeToggle = document.getElementById('wake-toggle');
    if (wakeToggle && typeof PWA !== 'undefined') {
      wakeToggle.addEventListener('change', async () => {
        if (wakeToggle.checked) {
          await PWA.enableWakeLock();
        } else {
          await PWA.releaseWakeLock();
        }
      });
    }

    const pdfBtn = container.querySelector('.stage-control-export-pdf');
    if (pdfBtn && typeof PDF !== 'undefined') {
      pdfBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sl = { ...setlist, songs: setlist.song_ids.map(i => songMap[i]).filter(Boolean) };
        PDF.download(sl);
        if (moreMenu) moreMenu.setAttribute('aria-hidden', 'true');
        if (moreBtn) moreBtn.setAttribute('aria-expanded', 'false');
      });
    }
  }

  function buildDisplayItems(setlist, songMap) {
    const result = [];
    setlist.song_ids.forEach((id, idx) => {
      result.push({ display_title: songMap[id]?.display_title || '?', divider: false });
      if (setlist.divider_positions.includes(idx)) {
        result.push({ divider: true });
      }
    });
    return result;
  }

  return { render };
})();
