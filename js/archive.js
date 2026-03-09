/**
 * BTDOAGS Set List — Archive view
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
      container.innerHTML = `
        <p style="color: var(--accent-red); margin-bottom: 0.5rem;">Failed to load: ${String(err.message).replace(/</g, '&lt;')}</p>
        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem;">Check: spreadsheets shared "Anyone with the link can view", API key has Sheets API enabled, HTTP referrers include your domain.</p>
        <a href="?mock=1" style="color: var(--accent-red); text-decoration: underline;">Use mock data for now</a>
      `;
      return;
    }

    const songMap = Object.fromEntries(songs.map(s => [s.id, s]));

    setlists.sort((a, b) => {
      const da = new Date(a.date);
      const db = new Date(b.date);
      return db - da;
    });

    const rows = setlists.map(sl => {
      const items = sl.song_ids.map(id => songMap[id]?.display_title || '?').length;
      const dateStr = sl.date ? new Date(sl.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
      const basePath = CONFIG.BASE_PATH || '';
      return `
        <tr>
          <td><strong>${dateStr}</strong></td>
          <td>${sl.venue || '—'}</td>
          <td>${sl.mode}</td>
          <td>${items}</td>
          <td>
            <div class="archive-actions">
              <a href="/${sl.id}" class="btn-view">Stage View</a>
              <a href="/${sl.id}/edit">Edit</a>
              <button type="button" class="btn-clone" data-id="${sl.id}">Clone</button>
              <button type="button" class="btn-pdf" data-id="${sl.id}">PDF</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
        <h1 style="font-family: var(--font-display); margin: 0;">Archive</h1>
        <a href="/new" style="padding:0.5rem 1rem;background:var(--accent-red);color:white;text-decoration:none;border-radius:4px;font-size:0.9rem;">New Set List</a>
      </div>
      <table class="archive-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Venue</th>
            <th>Mode</th>
            <th>Songs</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;

    container.querySelectorAll('.btn-clone').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sl = setlists.find(s => s.id === btn.dataset.id);
        if (sl) navigate('/new?clone=' + sl.id);
      });
    });

    container.querySelectorAll('.btn-pdf').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const sl = setlists.find(s => s.id === btn.dataset.id);
        if (sl && typeof PDF !== 'undefined') {
          const setlistWithSongs = {
            ...sl,
            songs: sl.song_ids.map(id => songMap[id]).filter(Boolean)
          };
          PDF.download(setlistWithSongs);
        }
      });
    });
  }

  return { render };
})();
