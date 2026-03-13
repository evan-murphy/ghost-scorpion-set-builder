/**
 * BTDOAGS Set List — Setlists home (Phase 1)
 */

const ARCHIVE = (function() {
  let documentClickCleanup = null;

  async function render(container, { navigate }) {
    if (documentClickCleanup) {
      documentClickCleanup();
      documentClickCleanup = null;
    }
    container.innerHTML = '<p>Loading...</p>';

    let songs, setlists;
    try {
      [songs, setlists] = await Promise.all([
        DATA.fetchSongs(),
        DATA.fetchSetlists()
      ]);
    } catch (err) {
      const mockUrl = window.location.pathname + '?mock=1';
      container.innerHTML = `
        <p style="color: var(--accent-red); margin-bottom: 0.5rem;">Failed to load: ${String(err.message).replace(/</g, '&lt;')}</p>
        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem;">Check: spreadsheets shared "Anyone with the link can view", API key has Sheets API enabled, HTTP referrers include your domain.</p>
        <a href="${mockUrl}" style="display:inline-block;padding:0.5rem 1rem;background:var(--accent-red);color:white;text-decoration:none;border-radius:6px;font-size:0.9rem;">Use sample data (works offline)</a>
      `;
      return;
    }

    const songMap = Object.fromEntries(songs.map(s => [s.id, s]));

    const today = new Date().toISOString().slice(0, 10);
    setlists.sort((a, b) => {
      const da = new Date(a.date || 0);
      const db = new Date(b.date || 0);
      return db - da;
    });

    const tonight = setlists.find(sl => sl.date === today);
    const hasCatalog = songs.length > 0;

    if (!hasCatalog) {
      container.innerHTML = `
        <div class="setlists-empty">
          <h2 class="setlists-empty-title">No setlists yet</h2>
          <p class="setlists-empty-text">Add songs to your catalog first, then create your first setlist.</p>
          <a href="/new" data-route="/new" class="btn-start"><span class="material-icons">add</span> Create your first setlist</a>
        </div>
      `;
      return;
    }

    const formatDate = (dateStr) => {
      if (!dateStr) return '—';
      const d = new Date(dateStr + 'T12:00:00');
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatShortDate = (dateStr) => {
      if (!dateStr) return '—';
      return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    let html = '';

    if (tonight) {
      html += `
        <div class="section-title">Tonight</div>
        <div class="setlists-card">
          <div class="setlists-card-date">${formatDate(tonight.date)}</div>
          <div class="setlists-card-venue">${tonight.venue || '—'}</div>
          <a href="/${tonight.id}" class="btn-start" data-route="/${tonight.id}"><span class="material-icons">play_arrow</span> Start set</a>
        </div>
      `;
    }

    html += '<div class="section-title">All setlists</div>';

    setlists.forEach(sl => {
      const songCount = sl.song_ids.filter(id => songMap[id]).length;
      html += `
        <div class="setlists-row" data-id="${sl.id}" tabindex="0" role="button">
          <div class="setlists-row-main">
            <div class="setlists-row-date">${formatShortDate(sl.date)}</div>
            <div class="setlists-row-venue">${sl.venue || '—'}</div>
            <div class="setlists-row-meta">${songCount} song${songCount !== 1 ? 's' : ''}</div>
          </div>
          <span class="setlists-row-chevron" aria-hidden="true"><span class="material-icons">chevron_right</span></span>
          <button type="button" class="setlists-row-overflow icon-btn" aria-label="More actions" aria-haspopup="true" aria-expanded="false" data-id="${sl.id}"><span class="material-icons">more_horiz</span></button>
          <div class="setlists-overflow-menu" role="menu" aria-label="Setlist actions">
            <button type="button" role="menuitem" data-action="open" data-id="${sl.id}"><span class="material-icons">play_arrow</span> Open</button>
            <button type="button" role="menuitem" data-action="edit" data-id="${sl.id}"><span class="material-icons">edit</span> Edit</button>
            <button type="button" role="menuitem" data-action="dup" data-id="${sl.id}"><span class="material-icons">content_copy</span> Duplicate</button>
            <button type="button" role="menuitem" data-action="pdf" data-id="${sl.id}"><span class="material-icons">picture_as_pdf</span> Export PDF</button>
            <button type="button" role="menuitem" data-action="del" data-id="${sl.id}" class="overflow-menu-item-danger"><span class="material-icons">delete</span> Delete</button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    function closeAllOverflowMenus() {
      container.querySelectorAll('.setlists-overflow-menu.is-open').forEach(m => {
        m.classList.remove('is-open');
        m.closest('.setlists-row')?.querySelector('.setlists-row-overflow')?.setAttribute('aria-expanded', 'false');
      });
    }

    container.addEventListener('click', (e) => {
      const overflowBtn = e.target.closest('.setlists-row-overflow');
      const menu = e.target.closest('.setlists-overflow-menu');
      const menuItem = e.target.closest('.setlists-overflow-menu [role="menuitem"]');
      const row = e.target.closest('.setlists-row');

      if (overflowBtn) {
        e.preventDefault();
        e.stopPropagation();
        const r = overflowBtn.closest('.setlists-row');
        const m = r?.querySelector('.setlists-overflow-menu');
        const isOpen = m?.classList.contains('is-open');
        closeAllOverflowMenus();
        if (m && !isOpen) {
          m.classList.add('is-open');
          overflowBtn.setAttribute('aria-expanded', 'true');
        }
        return;
      }

      if (menuItem) {
        e.preventDefault();
        e.stopPropagation();
        closeAllOverflowMenus();
        const id = menuItem.dataset.id;
        const action = menuItem.dataset.action;
        const sl = setlists.find(s => s.id === id);
        if (action === 'open') navigate('/' + id);
        else if (action === 'edit') navigate('/' + id + '/edit');
        else if (action === 'dup') navigate('/new?clone=' + id);
        else if (action === 'del') {
          if (confirm('Delete this setlist?')) {
            /* TODO: delete */
          }
        } else if (action === 'pdf' && sl && typeof PDF !== 'undefined') {
          const setlistWithSongs = { ...sl, songs: sl.song_ids.map(i => songMap[i]).filter(Boolean) };
          PDF.download(setlistWithSongs);
        }
        return;
      }

      if (menu) return;

      if (row) {
        e.preventDefault();
        const openMenu = container.querySelector('.setlists-overflow-menu.is-open');
        if (openMenu) {
          closeAllOverflowMenus();
        } else {
          navigate('/' + row.dataset.id);
        }
      }
    });

    document.addEventListener('click', closeAllOverflowMenus);
    documentClickCleanup = () => document.removeEventListener('click', closeAllOverflowMenus);

    container.addEventListener('keydown', (e) => {
      const row = e.target.closest('.setlists-row');
      if (row && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        if (!e.target.closest('.setlists-row-overflow, .setlists-overflow-menu')) {
          navigate('/' + row.dataset.id);
        }
      }
    });
  }

  return { render };
})();
