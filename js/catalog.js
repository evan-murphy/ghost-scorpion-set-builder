/**
 * Catalog view — iTunes Get Info + table, mobile-first, DDEX-aligned
 * Library table + Track detail drawer with simple/advanced mode
 */

const CATALOG = (function() {
  let state = {
    tracks: [],
    selectedIds: new Set(),
    drawerOpen: false,
    activeTab: 'summary',
    pendingEdits: {},
    prefs: null
  };

  function escapeHtml(str) {
    if (str == null || str === '') return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  function formatCellValue(track, key) {
    const v = track[key];
    if (v == null || v === '') return '—';
    if (key === 'explicit') return v ? 'E' : '';
    if (key === 'release_status') return String(v);
    if (Array.isArray(v)) return v.length ? v.map(p => p.name || p).join(', ') : '—';
    return String(v);
  }

  function renderCell(track, key) {
    const field = CATALOG_METADATA.getField(key);
    if (!field) return escapeHtml(formatCellValue(track, key));
    const val = track[key];
    if (key === 'explicit' && val === true) return '<span class="catalog-badge explicit">E</span>';
    if (key === 'explicit' && val == null) return '<span class="catalog-badge missing">?</span>';
    if (key === 'isrc' && !val) return '<span class="catalog-badge missing">MISSING</span>';
    if (key === 'release_status' && val === 'draft') return '<span class="catalog-badge draft">DRAFT</span>';
    return escapeHtml(formatCellValue(track, key));
  }

  function getTracksForSelection() {
    return state.tracks.filter(t => state.selectedIds.has(t.id));
  }

  function getTriStateValues(key) {
    const selected = getTracksForSelection();
    const values = selected.map(t => t[key]);
    return CATALOG_METADATA.getTriState(values);
  }

  function applyPendingToTracks() {
    Object.entries(state.pendingEdits).forEach(([key, val]) => {
      getTracksForSelection().forEach(t => { t[key] = val; });
    });
  }

  function persistDisplayTitle(id, val) {
    if (typeof DISPLAY_TITLE_OVERRIDES !== 'undefined') {
      DISPLAY_TITLE_OVERRIDES.set(id, val || null);
    }
    if (typeof AUTH !== 'undefined' && AUTH.isSignedIn() && CONFIG.APPS_SCRIPT_URL) {
      DATA.saveCatalogDisplayTitle(id, val || null, AUTH.getToken()).catch(e => console.warn('Save failed:', e));
    }
  }

  function openDrawer(container, { navigate }) {
    state.drawerOpen = true;
    state.pendingEdits = {};
    const selected = getTracksForSelection();
    selected.forEach(t => {
      state.pendingEdits = { ...state.pendingEdits, ...t };
    });
    renderDrawer(container, { navigate });
    document.body.classList.add('catalog-drawer-open');
  }

  function closeDrawer(container, { navigate }) {
    state.drawerOpen = false;
    state.drawerKeydownCleanup?.();
    state.drawerKeydownCleanup = null;
    document.body.classList.remove('catalog-drawer-open');
    render(container, { navigate });
  }

  function renderTable(container, { navigate }) {
    const prefs = state.prefs;
    const columns = prefs.getColumns();
    const sortKey = prefs.get('sortKey') || 'display_title';
    const sortAsc = prefs.get('sortAsc') !== false;

    let sorted = [...state.tracks];
    sorted.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      const cmp = (va == null ? '' : String(va)).localeCompare(vb == null ? '' : String(vb), undefined, { numeric: true });
      return sortAsc ? cmp : -cmp;
    });

    const activeFilter = prefs.get('activeFilter');
    if (activeFilter) {
      const preset = CATALOG_METADATA.FILTER_PRESETS.find(f => f.id === activeFilter);
      if (preset) sorted = sorted.filter(preset.fn);
    }

    const thead = columns.map(col => {
      const f = CATALOG_METADATA.getField(col);
      const label = f ? f.label : col;
      const isSorted = sortKey === col;
      const cls = ['sortable', isSorted ? (sortAsc ? 'sorted-asc' : 'sorted-desc') : ''].filter(Boolean).join(' ');
      return `<th class="${cls}" data-sort="${col}">${escapeHtml(label)}</th>`;
    }).join('');

    const rows = sorted.map(t => {
      const selected = state.selectedIds.has(t.id) ? ' selected' : '';
      const inactive = !t.active ? ' inactive' : '';
      const cells = columns.map(col => {
        const isEditable = col === 'display_title';
        const val = renderCell(t, col);
        if (isEditable) {
          return `<td class="catalog-cell-editable" data-id="${t.id}" data-col="${col}"><input type="text" value="${escapeHtml(t[col] || '')}" data-id="${t.id}"></td>`;
        }
        return `<td data-id="${t.id}">${val}</td>`;
      }).join('');
      return `<tr data-id="${t.id}" class="${selected}${inactive}">${cells}</tr>`;
    }).join('');

    const tableWrap = `
      <div class="catalog-table-wrap">
        <table class="catalog-table">
          <thead><tr>${thead}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;

    const mobileItems = sorted.map(t => {
      const selected = state.selectedIds.has(t.id) ? ' selected' : '';
      const badges = [];
      if (t.explicit) badges.push('<span class="catalog-badge explicit">E</span>');
      if (!t.isrc) badges.push('<span class="catalog-badge missing">ISRC</span>');
      if (t.release_status === 'draft') badges.push('<span class="catalog-badge draft">DRAFT</span>');
      const line2 = [t.primary_artist, t.album].filter(Boolean).join(' · ');
      return `
        <li class="catalog-list-item${selected}" data-id="${t.id}">
          <div class="catalog-list-main">
            <div class="catalog-list-line1">${escapeHtml((t.display_title || t.title) + (t.title_version ? ` (${t.title_version})` : ''))}</div>
            <div class="catalog-list-line2">${escapeHtml(line2 || '—')}</div>
          </div>
          <div class="catalog-list-badges">${badges.join('')}</div>
          <span class="catalog-list-chevron">›</span>
        </li>
      `;
    }).join('');

    const filterBar = `
      <div class="catalog-filter-bar">
        <select id="catalog-filter" aria-label="Filter">
          <option value="">All tracks</option>
          ${CATALOG_METADATA.FILTER_PRESETS.map(f => `
            <option value="${f.id}" ${activeFilter === f.id ? 'selected' : ''}>${escapeHtml(f.label)}</option>
          `).join('')}
        </select>
      </div>
    `;

    return { tableWrap, mobileItems, filterBar, sorted };
  }

  function renderDrawer(container, { navigate }) {
    const selected = getTracksForSelection();
    const count = selected.length;
    const isBatch = count > 1;

    const overlay = document.getElementById('catalog-drawer-overlay');
    const drawer = document.getElementById('catalog-drawer');
    if (!overlay || !drawer) return;

    const advanced = state.prefs.get('advancedMode');

    let summaryHtml = '';
    if (selected.length > 0) {
      const t = selected[0];
      summaryHtml = `
        <div class="catalog-summary-card">
          <div class="catalog-summary-art">${t.artwork ? `<img src="${escapeHtml(t.artwork)}" alt="">` : ''}</div>
          <div class="catalog-summary-info">
            <div class="title">${escapeHtml(t.display_title || t.title)}</div>
            <div class="artist">${escapeHtml(t.primary_artist || '—')}</div>
            <div class="catalog-summary-badges">
              ${!t.isrc ? '<span class="catalog-badge missing">Missing ISRC</span>' : ''}
              ${t.explicit ? '<span class="catalog-badge explicit">Explicit</span>' : ''}
              ${t.release_status === 'draft' ? '<span class="catalog-badge draft">Draft</span>' : ''}
            </div>
          </div>
        </div>
      `;
    }

    const basicFields = CATALOG_METADATA.getFieldsForSection('basic', advanced);
    const basicForm = basicFields.map(f => {
      const tri = isBatch ? getTriStateValues(f.key) : 'single';
      const val = isBatch && tri === 'mixed' ? 'Mixed' : (selected[0] ? selected[0][f.key] : '');
      const inputType = f.type === 'boolean' ? 'checkbox' : f.type === 'number' ? 'number' : 'text';
      const placeholder = tri === 'mixed' ? 'Mixed' : '';
      if (f.type === 'boolean') {
        const checked = tri === 'single' && val ? ' checked' : '';
        return `
          <div class="catalog-form-field checkbox-row">
            <input type="checkbox" id="drawer-${f.key}" data-key="${f.key}"${checked}>
            <label for="drawer-${f.key}">${escapeHtml(f.label)}</label>
          </div>
        `;
      }
      return `
        <div class="catalog-form-field ${tri === 'mixed' ? 'mixed' : ''}">
          <label for="drawer-${f.key}">${escapeHtml(f.label)}</label>
          ${tri === 'mixed' ? '<span class="catalog-mixed-chip">Mixed — change to apply to all</span>' : ''}
          <input type="${inputType}" id="drawer-${f.key}" data-key="${f.key}" value="${escapeHtml(val || '')}" placeholder="${escapeHtml(placeholder)}">
          ${f.helper ? `<span class="helper">${escapeHtml(f.helper)}</span>` : ''}
        </div>
      `;
    }).join('');

    const idsFields = CATALOG_METADATA.getFieldsForSection('ids', advanced);
    const idsForm = idsFields.map(f => {
      const tri = isBatch ? getTriStateValues(f.key) : 'single';
      const val = isBatch && tri === 'mixed' ? '' : (selected[0] ? selected[0][f.key] : '');
      return `
        <div class="catalog-form-field ${tri === 'mixed' ? 'mixed' : ''}">
          <label for="drawer-${f.key}">${escapeHtml(f.label)}</label>
          ${tri === 'mixed' ? '<span class="catalog-mixed-chip">Mixed</span>' : ''}
          <input type="text" id="drawer-${f.key}" data-key="${f.key}" value="${escapeHtml(val || '')}">
          ${f.helper ? `<span class="helper">${escapeHtml(f.helper)}</span>` : ''}
        </div>
      `;
    }).join('');

    const rightsFields = CATALOG_METADATA.getFieldsForSection('rights', advanced);
    const rightsForm = rightsFields.map(f => {
      const tri = isBatch ? getTriStateValues(f.key) : 'single';
      const val = isBatch && tri === 'mixed' ? '' : (selected[0] ? selected[0][f.key] : '');
      const opts = f.options ? `<option value="">—</option>` + f.options.map(o => `<option value="${o}" ${val === o ? 'selected' : ''}>${escapeHtml(o)}</option>`).join('') : '';
      const input = f.type === 'select' && opts
        ? `<select id="drawer-${f.key}" data-key="${f.key}">${opts}</select>`
        : `<input type="text" id="drawer-${f.key}" data-key="${f.key}" value="${escapeHtml(val || '')}">`;
      return `
        <div class="catalog-form-field ${tri === 'mixed' ? 'mixed' : ''}">
          <label for="drawer-${f.key}">${escapeHtml(f.label)}</label>
          ${tri === 'mixed' ? '<span class="catalog-mixed-chip">Mixed</span>' : ''}
          ${input}
          ${f.helper ? `<span class="helper">${escapeHtml(f.helper)}</span>` : ''}
        </div>
      `;
    }).join('');

    const creditsFields = CATALOG_METADATA.getFieldsForSection('credits', advanced);
    const creditsForm = creditsFields.length ? creditsFields.map(f => {
      const tri = isBatch ? getTriStateValues(f.key) : 'single';
      const val = isBatch && tri === 'mixed' ? '' : (selected[0] ? (Array.isArray(selected[0][f.key]) ? selected[0][f.key].map(p => p.name || p).join(', ') : selected[0][f.key]) : '');
      return `
        <div class="catalog-form-field ${tri === 'mixed' ? 'mixed' : ''}">
          <label for="drawer-${f.key}">${escapeHtml(f.label)}</label>
          ${tri === 'mixed' ? '<span class="catalog-mixed-chip">Mixed</span>' : ''}
          <input type="text" id="drawer-${f.key}" data-key="${f.key}" value="${escapeHtml(val || '')}" placeholder="Comma-separated names">
          ${f.helper ? `<span class="helper">${escapeHtml(f.helper)}</span>` : ''}
        </div>
      `;
    }).join('') : '<p class="catalog-form-helper">Writers, composers, producers, publishers (DDEX PIE).</p>';

    drawer.innerHTML = `
      <div class="catalog-drawer-header">
        <h2 class="catalog-drawer-title">${isBatch ? `Edit ${count} tracks` : 'Track Info'}</h2>
        <button type="button" class="catalog-drawer-close" id="drawer-close" aria-label="Close">×</button>
      </div>
      ${isBatch ? `<div class="catalog-drawer-batch-banner">Editing ${count} tracks — changes apply to all selected</div>` : ''}
      <div class="catalog-drawer-tabs">
        ${CATALOG_METADATA.DRAWER_TABS.map(t => `
          <button type="button" class="catalog-drawer-tab ${state.activeTab === t.id ? 'active' : ''}" data-tab="${t.id}">${escapeHtml(t.label)}</button>
        `).join('')}
      </div>
      <div class="catalog-drawer-body">
        <div class="catalog-drawer-section" data-section="summary" style="display:${state.activeTab === 'summary' ? 'block' : 'none'}">
          ${summaryHtml}
          ${basicForm}
        </div>
        <div class="catalog-drawer-section" data-section="basic" style="display:${state.activeTab === 'basic' ? 'block' : 'none'}">
          <h3>Basic info</h3>
          ${basicForm}
        </div>
        <div class="catalog-drawer-section" data-section="credits" style="display:${state.activeTab === 'credits' ? 'block' : 'none'}">
          <h3>Credits & parties</h3>
          ${creditsForm}
        </div>
        <div class="catalog-drawer-section" data-section="ids" style="display:${state.activeTab === 'ids' ? 'block' : 'none'}">
          <h3>Identifiers</h3>
          ${idsForm}
        </div>
        <div class="catalog-drawer-section" data-section="rights" style="display:${state.activeTab === 'rights' ? 'block' : 'none'}">
          <h3>Rights & territory</h3>
          ${rightsForm}
        </div>
        <div class="catalog-drawer-section" data-section="advanced" style="display:${state.activeTab === 'advanced' ? 'block' : 'none'}">
          <h3>Advanced</h3>
          <p class="catalog-form-helper">Additional options and DSP-specific fields.</p>
        </div>
      </div>
      <div class="catalog-drawer-footer">
        <button type="button" class="btn-save" id="drawer-save">Save</button>
        <button type="button" class="btn-discard" id="drawer-discard">Discard</button>
      </div>
    `;

    drawer.querySelectorAll('.catalog-drawer-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        state.activeTab = btn.dataset.tab;
        drawer.querySelectorAll('.catalog-drawer-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        drawer.querySelectorAll('.catalog-drawer-section').forEach(s => s.style.display = 'none');
        const section = drawer.querySelector(`[data-section="${state.activeTab}"]`);
        if (section) section.style.display = 'block';
      });
    });

    drawer.querySelector('#drawer-close')?.addEventListener('click', () => closeDrawer(container, { navigate }));
    drawer.querySelector('#drawer-discard')?.addEventListener('click', () => closeDrawer(container, { navigate }));
    overlay.addEventListener('click', () => closeDrawer(container, { navigate }));

    const handleKeydown = (e) => {
      if (e.key === 'Escape') closeDrawer(container, { navigate });
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        drawer.querySelector('#drawer-save')?.click();
      }
    };
    document.addEventListener('keydown', handleKeydown);
    state.drawerKeydownCleanup = () => document.removeEventListener('keydown', handleKeydown);

    drawer.querySelector('#drawer-save')?.addEventListener('click', () => {
      const inputs = drawer.querySelectorAll('input[data-key], select[data-key]');
      inputs.forEach(inp => {
        const key = inp.dataset.key;
        let val = inp.type === 'checkbox' ? inp.checked : inp.value;
        if (inp.type === 'number' && val !== '') val = parseInt(val, 10);
        if (['writers', 'composers', 'producers', 'publishers'].includes(key) && typeof val === 'string') {
          val = val.split(',').map(s => s.trim()).filter(Boolean).map(name => ({ name }));
        }
        getTracksForSelection().forEach(t => {
          t[key] = val;
          if (key === 'display_title') persistDisplayTitle(t.id, val);
        });
      });
      closeDrawer(container, { navigate });
    });
  }

  async function render(container, { navigate }) {
    state.prefs = CATALOG_PREFS;

    container.innerHTML = '<p style="padding: 1.5rem; color: var(--text);">Loading...</p>';
    let songs;
    try {
      songs = await DATA.fetchSongs();
    } catch (e) {
      console.warn('Catalog: fetch failed, using mock data', e);
      if (typeof DATA !== 'undefined' && DATA.MOCK_SONGS) {
        songs = [...DATA.MOCK_SONGS];
      } else {
        container.innerHTML = `<p style="padding: 1.5rem; color: var(--text);">Could not load catalog. <a href="?mock=1">Try with mock data</a>.</p>`;
        return;
      }
    }
    state.tracks = songs.map(s => DATA.normalizeTrack(s));

    const signedIn = typeof AUTH !== 'undefined' && AUTH.isSignedIn();
    const canSaveToSheet = !!CONFIG.APPS_SCRIPT_URL;
    const advanced = state.prefs.get('advancedMode');

    const authBanner = !signedIn && canSaveToSheet ? `
      <div class="catalog-auth-banner" id="catalog-auth-banner">
        <p>Sign in with Google to save edits to the sheet.</p>
        <div id="catalog-google-signin"></div>
      </div>
    ` : signedIn ? `
      <div class="catalog-auth-banner catalog-signed-in">
        <p>Signed in. Edits save to the sheet.</p>
      </div>
    ` : '';

    const pending = typeof PENDING_SONG !== 'undefined' ? PENDING_SONG.get() : null;
    const addSongForm = `
      <div class="catalog-add-song">
        <h2 style="font-family: var(--font-display); font-size: 1rem; margin-bottom: 0.5rem;">Add new song</h2>
        <div class="catalog-add-form">
          <div class="catalog-add-field"><label>Title</label><input type="text" id="new-song-title" placeholder="Canonical title"></div>
          <div class="catalog-add-field"><label>Display Title</label><input type="text" id="new-song-display" placeholder="Optional"></div>
          <div class="catalog-add-field"><label>Album</label><input type="text" id="new-song-album" placeholder="e.g. Acid Chalet"></div>
          <div class="catalog-add-field"><label>Year</label><input type="number" id="new-song-year" placeholder="e.g. 2025" min="1900" max="2100"></div>
          <div class="catalog-add-field catalog-add-check"><input type="checkbox" id="new-song-active" checked><label for="new-song-active">Active</label></div>
          <button type="button" class="btn-stage" id="stage-song-btn">Stage song</button>
        </div>
      </div>
    `;
    const stagedBlock = pending ? `
      <div class="catalog-staged">
        <span class="catalog-staged-title">${escapeHtml(pending.display_title || pending.title || 'Untitled')}</span>
        <span class="catalog-staged-meta">${escapeHtml(pending.album || '')} ${pending.year ? '(' + pending.year + ')' : ''}</span>
        <div class="catalog-staged-actions">
          <button type="button" class="btn-save-staged" id="save-staged-btn">Save to sheet</button>
          <button type="button" class="btn-clear-staged" id="clear-staged-btn">Clear</button>
        </div>
      </div>
    ` : '';

    const { tableWrap, mobileItems, filterBar } = renderTable(container, { navigate });

    const columnPopoverId = 'catalog-column-popover';
    const columns = state.prefs.getColumns();
    const presetOptions = Object.values(CATALOG_METADATA.COLUMN_PRESETS).map(p =>
      `<option value="${p.id}" ${state.prefs.get('columnPreset') === p.id ? 'selected' : ''}>${escapeHtml(p.label)}</option>`
    ).join('');
    const columnKeys = ['display_title', 'title', 'primary_artist', 'album', 'track_number', 'disc_number', 'year', 'genre', 'release_date', 'explicit', 'isrc', 'iswc', 'release_status'];
    const columnCheckboxes = (state.prefs.get('advancedMode') ? CATALOG_METADATA.ALL_FIELDS : CATALOG_METADATA.SIMPLE_FIELDS)
      .filter(f => columnKeys.includes(f.key))
      .map(f => `
        <li>
          <input type="checkbox" id="col-${f.key}" data-key="${f.key}" ${columns.includes(f.key) ? 'checked' : ''}>
          <label for="col-${f.key}">${escapeHtml(f.label)}</label>
        </li>
      `).join('');

    container.innerHTML = `
      <div class="catalog-header">
        <h1>Song Catalog</h1>
        <div class="catalog-toolbar">
          <div class="catalog-mode-toggle">
            <input type="checkbox" id="catalog-advanced" ${advanced ? 'checked' : ''}>
            <label for="catalog-advanced">Show advanced metadata</label>
          </div>
          <div style="position:relative">
            <button type="button" class="catalog-toolbar-btn" id="catalog-columns-btn">Fields shown</button>
            <div class="catalog-column-popover" id="${columnPopoverId}" style="display:none">
              <div class="catalog-column-presets">
                <label>Preset</label>
                <select id="catalog-preset">${presetOptions}</select>
              </div>
              <ul class="catalog-column-list">${columnCheckboxes}</ul>
            </div>
          </div>
          ${state.selectedIds.size > 0 ? `
            <button type="button" class="catalog-toolbar-btn active" id="catalog-get-info">Get Info (${state.selectedIds.size})</button>
          ` : `
            <button type="button" class="catalog-toolbar-btn" id="catalog-get-info" disabled>Get Info</button>
          `}
        </div>
      </div>
      ${authBanner}
      <div style="margin: 0 1.5rem 1rem; display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-start;">
        ${addSongForm}
        ${stagedBlock}
      </div>
      ${filterBar}
      <div class="catalog-library">
        ${tableWrap}
        <ul class="catalog-list-mobile">${mobileItems}</ul>
      </div>
      <div class="catalog-drawer-overlay" id="catalog-drawer-overlay"></div>
      <div class="catalog-drawer" id="catalog-drawer"></div>
    `;

    if (!signedIn && canSaveToSheet && typeof AUTH !== 'undefined' && AUTH.renderButton) {
      AUTH.renderButton(container.querySelector('#catalog-google-signin'));
      const unsub = AUTH.onAuthChange && AUTH.onAuthChange(() => {
        if (AUTH.isSignedIn()) { unsub && unsub(); render(container, { navigate }); }
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
        PENDING_SONG.set({ title: title || display, display_title: display || title, album: album || '', year: yearVal ? parseInt(yearVal, 10) : null, active: active !== false });
      }
      render(container, { navigate });
    });

    container.querySelector('#save-staged-btn')?.addEventListener('click', async () => {
      const p = typeof PENDING_SONG !== 'undefined' ? PENDING_SONG.get() : null;
      if (!p || !CONFIG.APPS_SCRIPT_URL) return;
      if (typeof AUTH === 'undefined' || !AUTH.isSignedIn()) { alert('Sign in with Google to save to the sheet.'); return; }
      const btn = container.querySelector('#save-staged-btn');
      if (btn) btn.disabled = true;
      try {
        await DATA.saveNewSong(p, AUTH.getToken());
        if (typeof PENDING_SONG !== 'undefined') PENDING_SONG.clear();
        const songs = await DATA.fetchSongs();
        state.tracks = songs.map(s => DATA.normalizeTrack(s));
        render(container, { navigate });
      } catch (e) { alert(e.message || 'Save failed'); } finally { if (btn) btn.disabled = false; }
    });

    container.querySelector('#clear-staged-btn')?.addEventListener('click', () => {
      if (typeof PENDING_SONG !== 'undefined') PENDING_SONG.clear();
      render(container, { navigate });
    });

    container.querySelector('#catalog-advanced')?.addEventListener('change', e => {
      state.prefs.set('advancedMode', e.target.checked);
      render(container, { navigate });
    });

    container.querySelector('#catalog-filter')?.addEventListener('change', e => {
      state.prefs.set('activeFilter', e.target.value || null);
      render(container, { navigate });
    });

    container.querySelector('#catalog-columns-btn')?.addEventListener('click', () => {
      const pop = document.getElementById(columnPopoverId);
      pop.style.display = pop.style.display === 'none' ? 'block' : 'none';
    });

    document.addEventListener('click', e => {
      const pop = document.getElementById(columnPopoverId);
      if (pop && !pop.contains(e.target) && !e.target.closest('#catalog-columns-btn')) {
        pop.style.display = 'none';
      }
    });

    container.querySelector('#catalog-preset')?.addEventListener('change', e => {
      const preset = e.target.value;
      state.prefs.setColumnPreset(preset);
      state.prefs.setColumns(CATALOG_METADATA.getColumnsForPreset(preset));
      render(container, { navigate });
    });

    container.querySelectorAll(`#${columnPopoverId} input[data-key]`).forEach(cb => {
      cb.addEventListener('change', () => {
        const key = cb.dataset.key;
        let cols = state.prefs.getColumns();
        if (cb.checked) cols = [...cols, key];
        else cols = cols.filter(c => c !== key);
        state.prefs.setColumns(cols);
        render(container, { navigate });
      });
    });

    container.querySelector('#catalog-get-info')?.addEventListener('click', () => {
      if (state.selectedIds.size > 0) {
        state.drawerOpen = true;
        const overlay = document.getElementById('catalog-drawer-overlay');
        const drawer = document.getElementById('catalog-drawer');
        if (overlay) overlay.classList.add('open');
        if (drawer) drawer.classList.add('open');
        renderDrawer(container, { navigate });
        document.body.classList.add('catalog-drawer-open');
      }
    });

    container.querySelector('.catalog-table-wrap')?.addEventListener('click', e => {
      const row = e.target.closest('tbody tr[data-id]');
      if (!row) return;
      const id = parseInt(row.dataset.id, 10);
      if (e.target.closest('input')) return;
      if (e.shiftKey) {
        state.selectedIds.has(id) ? state.selectedIds.delete(id) : state.selectedIds.add(id);
      } else {
        state.selectedIds.clear();
        state.selectedIds.add(id);
      }
      render(container, { navigate });
    });

    container.querySelector('.catalog-list-mobile')?.addEventListener('click', e => {
      const item = e.target.closest('.catalog-list-item[data-id]');
      if (!item) return;
      const id = parseInt(item.dataset.id, 10);
      state.selectedIds.clear();
      state.selectedIds.add(id);
      state.drawerOpen = true;
      render(container, { navigate });
    });

    container.querySelectorAll('.catalog-table th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.sort;
        const prev = state.prefs.get('sortKey');
        state.prefs.set('sortKey', key);
        state.prefs.set('sortAsc', prev === key ? !state.prefs.get('sortAsc') : true);
        render(container, { navigate });
      });
    });

    container.querySelectorAll('.catalog-table .catalog-cell-editable input').forEach(input => {
      const handleEdit = () => {
        const id = parseInt(input.dataset.id, 10);
        const val = input.value.trim();
        const t = state.tracks.find(tr => tr.id === id);
        if (t) {
          t.display_title = val || t.title;
          persistDisplayTitle(id, val || null);
        }
      };
      input.addEventListener('change', handleEdit);
      input.addEventListener('blur', handleEdit);
    });

    if (state.drawerOpen) {
      const overlay = document.getElementById('catalog-drawer-overlay');
      const drawer = document.getElementById('catalog-drawer');
      if (overlay) overlay.classList.add('open');
      if (drawer) drawer.classList.add('open');
      renderDrawer(container, { navigate });
    }
  }

  return { render };
})();
