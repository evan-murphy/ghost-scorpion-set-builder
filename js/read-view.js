/**
 * BTDOAGS Set List — Mobile read view (stage view)
 */

const READ_VIEW = (function() {
  async function render(container, id, { navigate }) {
    container.innerHTML = '<p style="text-align:center;color:#999;">Loading...</p>';

    const [songs, setlists] = await Promise.all([
      DATA.fetchSongs(),
      DATA.fetchSetlists()
    ]);

    const setlist = DATA.getSetlistById(setlists, id);
    if (!setlist) {
      container.innerHTML = '<p style="text-align:center;">Set list not found.</p>';
      return;
    }

    const songMap = Object.fromEntries(songs.map(s => [s.id, s]));
    const items = buildDisplayItems(setlist, songMap);

    const dateStr = setlist.show_date && setlist.date
      ? new Date(setlist.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
      : '';
    const venueStr = setlist.show_venue && setlist.venue ? setlist.venue : '';
    const metaStr = [dateStr, venueStr].filter(Boolean).join(' · ');

    const basePath = CONFIG.BASE_PATH || '';
    const logoPath = basePath + '/assets/scorpion-white.png';

    container.innerHTML = `
      <div class="stage-root">
        <img src="${logoPath}" alt="" class="stage-logo">
        ${metaStr ? `<div class="stage-meta">${metaStr}</div>` : ''}
        <ul class="stage-list">
          ${items.map(item => `
            <li class="${item.divider ? 'divider' : ''}">${item.divider ? '—' : item.display_title}</li>
          `).join('')}
        </ul>
        <div class="stage-footer">
          BEWARE THE DANGERS OF A GHOST SCORPION!<br>HTTP://HORROR.SURF
        </div>
        <div class="stage-actions">
          <a href="/" data-route="/" style="color:#666;font-size:0.85rem;display:inline-flex;align-items:center;gap:0.35rem;"><span class="material-icons" style="font-size:1rem;">arrow_back</span> Setlists</a>
          <a href="/${setlist.id}/edit" data-route="/${setlist.id}/edit" style="display:inline-flex;align-items:center;gap:0.35rem;padding:0.5rem 1rem;background:rgba(255,255,255,0.15);color:#F0F0F0;text-decoration:none;border-radius:6px;font-size:0.9rem;"><span class="material-icons" style="font-size:1rem;">edit</span> Edit set list</a>
          <button class="btn-fullscreen" id="btn-fullscreen">Enter Stage View</button>
          <span class="wake-status" id="wake-status">○ Screen may sleep</span>
          <button class="btn-pdf-stage" data-id="${setlist.id}" style="display:inline-flex;align-items:center;gap:0.35rem;padding:0.5rem 1rem;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:6px;color:#F0F0F0;cursor:pointer;font-size:0.9rem;"><span class="material-icons" style="font-size:1rem;">picture_as_pdf</span> PDF</button>
        </div>
      </div>
    `;

    if (typeof PWA !== 'undefined') {
      PWA.enableWakeLock();
      PWA.updateStatusEl(document.getElementById('wake-status'));
    }

    const fullscreenBtn = document.getElementById('btn-fullscreen');
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', async () => {
        try {
          await document.documentElement.requestFullscreen?.();
          if (typeof PWA !== 'undefined') PWA.enableWakeLock();
        } catch (e) {}
      });
    }

    const pdfBtn = container.querySelector('.btn-pdf-stage');
    if (pdfBtn && typeof PDF !== 'undefined') {
      pdfBtn.addEventListener('click', () => {
        const sl = { ...setlist, songs: setlist.song_ids.map(i => songMap[i]).filter(Boolean) };
        PDF.download(sl);
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
