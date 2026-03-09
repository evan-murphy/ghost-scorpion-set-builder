/**
 * BTDOAGS Set List — Catalog view
 * Auth required to save display titles to sheet; otherwise saves locally only
 * Add new song: 1 at a time in memory until you save to the sheet
 */

const CATALOG = (function() {
  async function render(container, { navigate }) {
    container.innerHTML = '<p>Loading...</p>';

    const songs = await DATA.fetchSongs();
    const signedIn = typeof AUTH !== 'undefined' && AUTH.isSignedIn();
    const canSaveToSheet = !!CONFIG.APPS_SCRIPT_URL;
    const pending = typeof PENDING_SONG !== 'undefined' ? PENDING_SONG.get() : null;

    const rows = songs.map(s => `
      <tr data-id="${s.id}">
        <td>
          <input type="text" class="catalog-display-title" value="${escapeHtml(s.display_title)}" data-id="${s.id}">
        </td>
        <td>${escapeHtml(s.title)}</td>
        <td>${escapeHtml(s.album)}</td>
        <td>${s.year || '—'}</td>
      </tr>
    `).join('');

    const authBanner = !signedIn && canSaveToSheet ? `
      <div class="catalog-auth-banner" id="catalog-auth-banner">
        <p>Sign in with Google to save display titles to the sheet.</p>
        <div id="catalog-google-signin"></div>
      </div>
    ` : signedIn ? `
      <div class="catalog-auth-banner catalog-signed-in">
        <p>Signed in. Edits save to the sheet.</p>
      </div>
    ` : '';

    const addSongForm = `
      <div class="catalog-add-song">
        <h2 style="font-family: var(--font-display); font-size: 1.1rem; margin-bottom: 0.75rem;">Add new song</h2>
        <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 1rem;">Staged in memory until you save to the sheet.</p>
        <div class="catalog-add-form">
          <div class="catalog-add-field">
            <label>Title</label>
            <input type="text" id="new-song-title" placeholder="Canonical title">
          </div>
          <div class="catalog-add-field">
            <label>Display Title</label>
            <input type="text" id="new-song-display" placeholder="Optional, defaults to title">
          </div>
          <div class="catalog-add-field">
            <label>Album</label>
            <input type="text" id="new-song-album" placeholder="e.g. Acid Chalet">
          </div>
          <div class="catalog-add-field">
            <label>Year</label>
            <input type="number" id="new-song-year" placeholder="e.g. 2025" min="1900" max="2100">
          </div>
          <div class="catalog-add-field catalog-add-check">
            <input type="checkbox" id="new-song-active" checked>
            <label for="new-song-active">Active (show in builder)</label>
          </div>
          <div class="catalog-add-actions">
            <button type="button" class="btn-stage" id="stage-song-btn">Stage song</button>
          </div>
        </div>
      </div>
    `;

    const stagedBlock = pending ? `
      <div class="catalog-staged">
        <h2 style="font-family: var(--font-display); font-size: 1.1rem; margin-bottom: 0.5rem;">Staged song</h2>
        <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 0.75rem;">In memory — save to add to the sheet.</p>
        <div class="catalog-staged-row">
          <span class="catalog-staged-title">${escapeHtml(pending.display_title || pending.title || 'Untitled')}</span>
          <span class="catalog-staged-meta">${escapeHtml(pending.album || '')} ${pending.year ? '(' + pending.year + ')' : ''}</span>
        </div>
        <div class="catalog-staged-actions">
          <button type="button" class="btn-save-staged" id="save-staged-btn">Save to sheet</button>
          <button type="button" class="btn-clear-staged" id="clear-staged-btn">Clear</button>
        </div>
      </div>
    ` : '';

    container.innerHTML = `
      <h1 style="font-family: var(--font-display); margin-bottom: 1rem;">Song Catalog</h1>
      ${authBanner}
      ${addSongForm}
      ${stagedBlock}
      <p style="color: var(--text-secondary); font-size: 0.9rem; margin: 1.5rem 0 1rem;">
        ${signedIn && canSaveToSheet ? 'Edit display titles below. Changes save to the sheet.' : 'Edit display titles below. Changes save locally.'}
      </p>
      <table class="catalog-table">
        <thead>
          <tr>
            <th>Display Title</th>
            <th>Canonical Title</th>
            <th>Album</th>
            <th>Year</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;

    if (!signedIn && canSaveToSheet && typeof AUTH !== 'undefined' && AUTH.renderButton) {
      AUTH.renderButton(container.querySelector('#catalog-google-signin'));
      const unsub = AUTH.onAuthChange && AUTH.onAuthChange(() => {
        if (AUTH.isSignedIn()) {
          unsub && unsub();
          render(container, { navigate });
        }
      });
    }

    container.querySelector('#stage-song-btn')?.addEventListener('click', () => {
      const title = container.querySelector('#new-song-title')?.value?.trim();
      const display = container.querySelector('#new-song-display')?.value?.trim();
      const album = container.querySelector('#new-song-album')?.value?.trim();
      const yearVal = container.querySelector('#new-song-year')?.value;
      const active = container.querySelector('#new-song-active')?.checked;
      if (!title && !display) return;
      if (typeof PENDING_SONG !== 'undefined') {
        PENDING_SONG.set({
          title: title || display,
          display_title: display || title,
          album: album || '',
          year: yearVal ? parseInt(yearVal, 10) : null,
          active: active !== false
        });
      }
      render(container, { navigate });
    });

    container.querySelector('#save-staged-btn')?.addEventListener('click', async () => {
      const p = typeof PENDING_SONG !== 'undefined' ? PENDING_SONG.get() : null;
      if (!p || !CONFIG.APPS_SCRIPT_URL) return;
      if (typeof AUTH === 'undefined' || !AUTH.isSignedIn()) {
        alert('Sign in with Google to save to the sheet.');
        return;
      }
      const btn = container.querySelector('#save-staged-btn');
      if (btn) btn.disabled = true;
      try {
        await DATA.saveNewSong(p, AUTH.getToken());
        if (typeof PENDING_SONG !== 'undefined') PENDING_SONG.clear();
        render(container, { navigate });
      } catch (e) {
        alert(e.message || 'Save failed');
      } finally {
        if (btn) btn.disabled = false;
      }
    });

    container.querySelector('#clear-staged-btn')?.addEventListener('click', () => {
      if (typeof PENDING_SONG !== 'undefined') PENDING_SONG.clear();
      render(container, { navigate });
    });

    container.querySelectorAll('.catalog-display-title').forEach(input => {
      const handleEdit = async () => {
        const id = parseInt(input.dataset.id, 10);
        const val = input.value.trim();
        if (typeof DISPLAY_TITLE_OVERRIDES !== 'undefined') {
          DISPLAY_TITLE_OVERRIDES.set(id, val || null);
        }
        if (typeof AUTH !== 'undefined' && AUTH.isSignedIn() && CONFIG.APPS_SCRIPT_URL) {
          try {
            await DATA.saveCatalogDisplayTitle(id, val || null, AUTH.getToken());
            if (typeof DISPLAY_TITLE_OVERRIDES !== 'undefined') {
              DISPLAY_TITLE_OVERRIDES.remove(id);
            }
          } catch (e) {
            console.warn('Catalog save to sheet failed:', e);
          }
        }
      };
      input.addEventListener('change', handleEdit);
      input.addEventListener('blur', handleEdit);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { render };
})();
