/**
 * BTDOAGS Set List — Setlists home (Phase 1)
 */

const ARCHIVE = (function() {
  async function render(container, { navigate }) {
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
      const subtitle = [sl.venue, sl.venue && sl.date ? '·' : '', songCount + ' songs'].filter(Boolean).join(' ');
      html += `
        <div class="setlists-row" data-id="${sl.id}">
          <div class="setlists-row-main">
            <div class="setlists-row-title">${formatShortDate(sl.date)} — ${sl.venue || '—'}</div>
            <div class="setlists-row-subtitle">${subtitle}</div>
          </div>
          <div class="setlists-row-actions">
            <button type="button" class="icon-btn" aria-label="Edit" data-edit="${sl.id}"><span class="material-icons">edit</span></button>
            <button type="button" class="icon-btn" aria-label="Duplicate" data-dup="${sl.id}"><span class="material-icons">content_copy</span></button>
            <button type="button" class="icon-btn" aria-label="Delete" data-del="${sl.id}"><span class="material-icons">delete</span></button>
            <button type="button" class="icon-btn" aria-label="PDF" data-pdf="${sl.id}"><span class="material-icons">picture_as_pdf</span></button>
            <a href="/${sl.id}" data-route="/${sl.id}" class="icon-btn" aria-label="Start set"><span class="material-icons">play_arrow</span></a>
            <a href="/${sl.id}" data-route="/${sl.id}" class="setlists-row-chevron"><span class="material-icons">chevron_right</span></a>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    container.addEventListener('click', (e) => {
      const row = e.target.closest('.setlists-row');
      if (!row) return;

      const id = row.dataset.id;
      const editBtn = e.target.closest('[data-edit]');
      const dupBtn = e.target.closest('[data-dup]');
      const delBtn = e.target.closest('[data-del]');
      const playBtn = e.target.closest('[data-route]');
      const chevron = e.target.closest('.setlists-row-chevron');

      if (editBtn) {
        e.preventDefault();
        e.stopPropagation();
        navigate('/' + id + '/edit');
        return;
      }
      if (dupBtn) {
        e.preventDefault();
        e.stopPropagation();
        navigate('/new?clone=' + id);
        return;
      }
      if (delBtn) {
        e.preventDefault();
        e.stopPropagation();
        if (confirm('Delete this setlist?')) {
          /* TODO: delete */
        }
        return;
      }
      const pdfBtn = e.target.closest('[data-pdf]');
      if (pdfBtn) {
        e.preventDefault();
        e.stopPropagation();
        const sl = setlists.find(s => s.id === pdfBtn.dataset.pdf);
        if (sl && typeof PDF !== 'undefined') {
          const setlistWithSongs = { ...sl, songs: sl.song_ids.map(i => songMap[i]).filter(Boolean) };
          PDF.download(setlistWithSongs);
        }
        return;
      }
      if (playBtn || chevron) {
        e.preventDefault();
        e.stopPropagation();
        navigate('/' + id);
        return;
      }
      navigate('/' + id);
    });
  }

  return { render };
})();
