/**
 * BTDOAGS Set List — Builder (Clear-inspired)
 * Single surface, gesture-driven, minimal chrome
 */

const BUILDER = (function() {
  const BREAK_HINT_STORAGE_KEY = 'btdoags-break-hint-dismissed';
  let sortable = null;
  let trashSortable = null;
  let saveDraftTimer = null;

  function wasBreakHintDismissed() {
    try {
      return localStorage.getItem(BREAK_HINT_STORAGE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function dismissBreakHint() {
    try {
      localStorage.setItem(BREAK_HINT_STORAGE_KEY, '1');
    } catch (e) {}
  }

  async function render(container, id, { navigate }) {
    container.innerHTML = '<p>Loading...</p>';

    const [songs, setlists] = await Promise.all([
      DATA.fetchSongs(),
      DATA.fetchSetlists()
    ]);

    const activeSongs = songs.filter(s => s.active);
    const songMap = Object.fromEntries(songs.map(s => [s.id, s]));

    const context = id || 'new';
    const params = new URLSearchParams(window.location.search);
    const cloneId = params.get('clone');

    let setlist = null;
    if (cloneId) {
      setlist = DATA.getSetlistById(setlists, cloneId);
      if (setlist) {
        setlist = { ...setlist, id: null, date: '', notes: `Cloned from ${setlist.date}` };
      }
    } else if (id) {
      setlist = DATA.getSetlistById(setlists, id);
    }

    if (!setlist) {
      setlist = {
        id: null,
        date: new Date().toISOString().slice(0, 10),
        venue: '',
        mode: 'medium',
        song_ids: [],
        divider_positions: [],
        show_date: true,
        show_venue: false,
        logo_variant: 'black',
        notes: ''
      };
    }

    const draft = !cloneId && typeof DRAFT_STORE !== 'undefined' ? DRAFT_STORE.load(context) : null;
    if (draft) {
      setlist = {
        ...setlist,
        date: draft.date ?? setlist.date,
        venue: draft.venue ?? setlist.venue,
        mode: draft.mode ?? setlist.mode,
        song_ids: draft.song_ids ?? setlist.song_ids,
        divider_positions: draft.divider_positions ?? setlist.divider_positions,
        show_date: draft.show_date ?? setlist.show_date,
        show_venue: draft.show_venue ?? setlist.show_venue,
        logo_variant: draft.logo_variant ?? setlist.logo_variant,
        notes: draft.notes ?? setlist.notes
      };
    }

    const sortedSetlists = [...setlists].sort((a, b) => {
      const da = new Date(a.date || 0);
      const db = new Date(b.date || 0);
      return db - da;
    });
    const state = { ...setlist, songs, songMap, sortedSetlists };

    renderClearUI(container, state, activeSongs, { navigate });
    initClearInteractions(container, state, activeSongs, { navigate }, context);
  }

  function renderClearUI(container, state, activeSongs, { navigate }) {
    const dateStr = state.date ? new Date(state.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Set list';
    const basePath = CONFIG.BASE_PATH || '';

    const sortedSetlists = state.sortedSetlists || [];
    const currentIdx = state.id ? sortedSetlists.findIndex(s => String(s.id) === String(state.id)) : -1;
    const prevSetlist = currentIdx > 0 ? sortedSetlists[currentIdx - 1] : null;
    const nextSetlist = currentIdx >= 0 && currentIdx < sortedSetlists.length - 1 ? sortedSetlists[currentIdx + 1] : null;
    const showArchiveNav = state.id && sortedSetlists.length > 1;

    const listHtml = buildListHTML(state);

    container.innerHTML = `
      <div class="clear-builder">
        <header class="clear-header">
          <button type="button" class="clear-back" aria-label="Back to Setlists"><span class="material-icons">arrow_back</span></button>
          <button type="button" class="clear-header-logo-btn" aria-label="Back to Setlists"><img src="${basePath}/assets/scorpion-black.png" alt="" class="clear-header-logo" height="40"></button>
          <div class="clear-header-center">
            ${showArchiveNav ? `
            <div class="clear-archive-nav">
              <button type="button" class="clear-archive-prev" aria-label="Previous setlist" ${prevSetlist ? '' : 'disabled'} data-id="${prevSetlist?.id ?? ''}"><span class="material-icons">chevron_left</span></button>
              <button type="button" class="clear-meta-trigger" id="meta-trigger">
                <span class="clear-meta-date">${dateStr}</span>
                ${state.venue ? `<span class="clear-meta-venue">${state.venue}</span>` : ''}
              </button>
              <button type="button" class="clear-archive-next" aria-label="Next setlist" ${nextSetlist ? '' : 'disabled'} data-id="${nextSetlist?.id ?? ''}"><span class="material-icons">chevron_right</span></button>
            </div>
            ` : `
            <button type="button" class="clear-meta-trigger" id="meta-trigger">
              <span class="clear-meta-date">${dateStr}</span>
              ${state.venue ? `<span class="clear-meta-venue">${state.venue}</span>` : ''}
            </button>
            `}
            <span class="clear-draft-badge" title="Edits saved locally">●</span>
            <div class="clear-header-buttons">
              <button type="button" class="clear-clear-btn" id="clear-setlist-btn" aria-label="Clear all songs" title="Remove all songs from this set list" ${state.song_ids.length === 0 && (state.divider_positions?.length ?? 0) === 0 ? 'disabled' : ''}><span class="material-icons">delete</span></button>
              <button type="button" class="clear-save-btn" id="save-setlist-btn" aria-label="Save"><span class="material-icons">check</span></button>
            </div>
          </div>
        </header>

        <main class="clear-list-surface">
          <ul class="clear-list" id="setlist-items">${listHtml}</ul>
          <div class="clear-bottom-zone">
            <button type="button" class="clear-break-hint hidden" id="break-hint" aria-label="Dismiss tip" title="Long-press a song to add a break">Tip: Long-press a song to add a break</button>
            <button type="button" class="clear-random-row" id="random-songs-trigger" title="Fill with 13 random songs" ${state.song_ids.length === 0 ? '' : 'hidden'}>
              <span class="clear-random-icon">🦇</span>
              <span>Random</span>
            </button>
            <button type="button" class="clear-add-row" id="add-song-trigger">
              <span class="clear-add-icon">+</span>
              <span>Add song</span>
            </button>
            <div class="clear-trash-zone" id="trash-zone" aria-hidden="true">
              <ul class="clear-trash-list" id="trash-list"></ul>
              <span class="clear-trash-label">Drop to remove</span>
            </div>
          </div>
        </main>

        <div class="clear-sheet" id="song-sheet" aria-hidden="true">
          <div class="clear-sheet-handle"></div>
          <input type="text" class="clear-sheet-search" id="song-search" placeholder="Search songs..." autocomplete="off">
          <ul class="clear-sheet-list" id="song-picker-list"></ul>
        </div>

        <div class="clear-sheet" id="meta-sheet" aria-hidden="true">
          <div class="clear-sheet-handle"></div>
          <div class="clear-meta-form" id="meta-form"></div>
        </div>

        <div class="clear-sheet" id="save-sheet" aria-hidden="true">
          <div class="clear-sheet-handle"></div>
          <div class="clear-save-sheet-content" id="save-sheet-content"></div>
        </div>

        <div class="clear-overlay" id="sheet-overlay" aria-hidden="true"></div>
      </div>
    `;

    renderMetaForm(container.querySelector('#meta-form'), state);
    updateSongPickerList(container.querySelector('#song-picker-list'), state, activeSongs);
  }

  function buildListHTML(state) {
    const items = [];
    state.song_ids.forEach((id, idx) => {
      const song = state.songMap[id];
      items.push({ id, display_title: song?.display_title || '?', divider: false, index: idx });
      if (state.divider_positions.includes(idx)) {
        items.push({ divider: true, index: idx });
      }
    });

    return items.map((item) => {
      if (item.divider) {
        return `<li class="clear-item clear-divider" data-divider data-after="${item.index}">
          <span class="clear-item-text">—</span>
        </li>`;
      }
      return `<li class="clear-item" data-id="${item.id}" data-index="${item.index}">
        <span class="clear-item-text">${item.display_title}</span>
      </li>`;
    }).join('');
  }

  function renderMetaForm(container, state) {
    if (!container) return;
    container.innerHTML = `
      <div class="clear-meta-field">
        <label>Date</label>
        <input type="date" name="date" value="${state.date || ''}">
      </div>
      <div class="clear-meta-field">
        <label>Venue</label>
        <input type="text" name="venue" value="${state.venue || ''}" placeholder="Optional">
      </div>
      <div class="clear-meta-field">
        <label>Mode</label>
        <select name="mode">
          <option value="short" ${state.mode === 'short' ? 'selected' : ''}>Short</option>
          <option value="medium" ${state.mode === 'medium' ? 'selected' : ''}>Medium</option>
          <option value="long" ${state.mode === 'long' ? 'selected' : ''}>Long</option>
        </select>
      </div>
      <div class="clear-meta-field">
        <label>Logo</label>
        <select name="logo_variant">
          <option value="black" ${state.logo_variant === 'black' ? 'selected' : ''}>Black</option>
          <option value="white" ${state.logo_variant === 'white' ? 'selected' : ''}>White</option>
        </select>
      </div>
      <div class="clear-meta-field checkbox-row">
        <input type="checkbox" name="show_date" id="show_date" ${state.show_date ? 'checked' : ''}>
        <label for="show_date">Show date on PDF</label>
      </div>
      <div class="clear-meta-field checkbox-row">
        <input type="checkbox" name="show_venue" id="show_venue" ${state.show_venue ? 'checked' : ''}>
        <label for="show_venue">Show venue on PDF</label>
      </div>
      <div class="clear-meta-field">
        <button type="button" class="clear-discard-draft" id="discard-draft">Discard draft & start fresh</button>
      </div>
    `;
  }

  function updateSongPickerList(ul, state, activeSongs) {
    if (!ul) return;
    const addedIds = new Set(state.song_ids);
    const search = (ul.closest('.clear-sheet')?.querySelector('#song-search')?.value || '').toLowerCase();
    const filtered = activeSongs.filter(s =>
      !addedIds.has(s.id) &&
      (s.display_title.toLowerCase().includes(search) || s.title.toLowerCase().includes(search))
    );
    ul.innerHTML = filtered.slice(0, 60).map(s =>
      `<li class="clear-sheet-item" data-id="${s.id}">${s.title}</li>`
    ).join('');
  }

  function initClearInteractions(container, state, activeSongs, { navigate }, context) {
    const list = container.querySelector('#setlist-items');
    const addTrigger = container.querySelector('#add-song-trigger');
    const metaTrigger = container.querySelector('#meta-trigger');
    const songSheet = container.querySelector('#song-sheet');
    const metaSheet = container.querySelector('#meta-sheet');
    const saveSheet = container.querySelector('#save-sheet');
    const overlay = container.querySelector('#sheet-overlay');

    const openSaveSheet = () => {
      const content = container.querySelector('#save-sheet-content');
      if (typeof AUTH !== 'undefined' && AUTH.isSignedIn()) {
        doSave(state, container, context, navigate, closeSheets);
        return;
      }
      content.innerHTML = `
        <p class="clear-save-prompt">Sign in with Google to save</p>
        <div id="google-signin-btn"></div>
        <button type="button" class="btn-google-fallback" id="google-fallback-btn">Sign in with Google</button>
      `;
      const fallbackBtn = content.querySelector('#google-fallback-btn');
      if (typeof AUTH !== 'undefined' && AUTH.renderButton) {
        AUTH.renderButton(content.querySelector('#google-signin-btn'));
      }
      fallbackBtn.addEventListener('click', () => {
        if (typeof AUTH !== 'undefined' && AUTH.prompt) AUTH.prompt();
      });
      saveSheet?.classList.add('open');
      overlay?.classList.add('open');
      document.body.style.overflow = 'hidden';
      songSheet?.classList.remove('open');
      metaSheet?.classList.remove('open');
      saveSheetUnsub = typeof AUTH !== 'undefined' && AUTH.onAuthChange ? AUTH.onAuthChange(() => {
        if (AUTH.isSignedIn()) {
          saveSheetUnsub && saveSheetUnsub();
          saveSheetUnsub = null;
          closeSheets();
          doSave(state, container, context, navigate, closeSheets);
        }
      }) : null;
    };

    const updateBreakHint = () => {
      const breakHint = container.querySelector('#break-hint');
      if (breakHint) {
        const show = state.song_ids.length > 0 && !wasBreakHintDismissed();
        breakHint.classList.toggle('hidden', !show);
      }
    };

    const refresh = () => {
      list.innerHTML = buildListHTML(state);
      updateSongPickerList(container.querySelector('#song-picker-list'), state, activeSongs);
      const randomBtn = container.querySelector('#random-songs-trigger');
      if (randomBtn) {
        const isEmpty = state.song_ids.length === 0;
        if (isEmpty) {
          randomBtn.removeAttribute('hidden');
        } else {
          if (document.activeElement === randomBtn) {
            container.querySelector('#add-song-trigger')?.focus();
          }
          randomBtn.setAttribute('hidden', '');
        }
      }
      const clearBtn = container.querySelector('#clear-setlist-btn');
      if (clearBtn) {
        const hasItems = state.song_ids.length > 0 || (state.divider_positions?.length ?? 0) > 0;
        clearBtn.disabled = !hasItems;
      }
      updateBreakHint();
      initSortable(container, state, refresh, context);
      initLongPress(container, state, refresh);
      scheduleDraftSave(state, context);
    };

    let saveSheetUnsub = null;
    const closeSheets = () => {
      saveSheetUnsub && saveSheetUnsub();
      saveSheetUnsub = null;
      songSheet?.classList.remove('open');
      metaSheet?.classList.remove('open');
      saveSheet?.classList.remove('open');
      overlay?.classList.remove('open');
      document.body.style.overflow = '';
    };

    container.querySelector('#break-hint')?.addEventListener('click', () => {
      dismissBreakHint();
      container.querySelector('#break-hint')?.classList.add('hidden');
    });

    container.querySelector('#random-songs-trigger')?.addEventListener('click', (e) => {
      e.stopPropagation();
      haptic();
      if (state.song_ids.length > 0) return;
      const shuffled = [...activeSongs].sort(() => Math.random() - 0.5);
      state.song_ids = shuffled.slice(0, 13).map(s => s.id);
      refresh();
    });

    addTrigger?.addEventListener('click', (e) => {
      e.stopPropagation();
      haptic();
      songSheet?.classList.add('open');
      metaSheet?.classList.remove('open');
      overlay?.classList.add('open');
      document.body.style.overflow = 'hidden';
      container.querySelector('#song-search')?.focus();
    });

    metaTrigger?.addEventListener('click', (e) => {
      e.stopPropagation();
      haptic();
      metaSheet?.classList.add('open');
      songSheet?.classList.remove('open');
      overlay?.classList.add('open');
      document.body.style.overflow = 'hidden';
    });

    overlay?.addEventListener('click', closeSheets);

    container.querySelector('#clear-setlist-btn')?.addEventListener('click', () => {
      haptic();
      if (state.song_ids.length === 0 && (state.divider_positions?.length ?? 0) === 0) return;
      state.song_ids = [];
      state.divider_positions = [];
      refresh();
    });

    container.querySelector('#save-setlist-btn')?.addEventListener('click', () => {
      haptic();
      if (!CONFIG.APPS_SCRIPT_URL && !CONFIG.APPS_SCRIPT_PROXY_URL) {
        alert('Save is not configured.\n\n1. Deploy the Apps Script (apps-script/Code.gs) at script.google.com as a Web app\n2. Deploy the CORS proxy (cloudflare-worker/) and set APPS_SCRIPT_PROXY_URL in config.js');
        return;
      }
      syncStateFromDOM(container, state);
      openSaveSheet();
    });

    const goBack = () => {
      haptic();
      if (typeof DRAFT_STORE !== 'undefined') DRAFT_STORE.save(state, context);
      navigate('/');
    };
    container.querySelector('.clear-back')?.addEventListener('click', goBack);
    container.querySelector('.clear-header-logo-btn')?.addEventListener('click', goBack);

    const goToSetlist = (targetId) => {
      if (!targetId) return;
      haptic();
      if (typeof DRAFT_STORE !== 'undefined') DRAFT_STORE.save(state, context);
      navigate(`/${targetId}/edit`);
    };
    container.querySelector('.clear-archive-prev')?.addEventListener('click', (e) => {
      const id = e.currentTarget?.dataset?.id;
      if (id) goToSetlist(id);
    });
    container.querySelector('.clear-archive-next')?.addEventListener('click', (e) => {
      const id = e.currentTarget?.dataset?.id;
      if (id) goToSetlist(id);
    });

    container.querySelector('#song-picker-list')?.addEventListener('click', (e) => {
      const li = e.target.closest('.clear-sheet-item[data-id]');
      if (li) {
        e.stopPropagation();
        haptic();
        const id = parseInt(li.dataset.id, 10);
        state.song_ids.push(id);
        closeSheets();
        refresh();
      }
    });

    const scheduleDraftSave = (s, ctx) => {
      if (typeof DRAFT_STORE === 'undefined') return;
      clearTimeout(saveDraftTimer);
      saveDraftTimer = setTimeout(() => {
        DRAFT_STORE.save(s, ctx);
      }, 300);
    };

    container.querySelector('#song-search')?.addEventListener('input', () => {
      updateSongPickerList(container.querySelector('#song-picker-list'), state, activeSongs);
    });

    const metaForm = container.querySelector('#meta-form');
    const syncMetaDisplay = () => {
      const dateInput = metaForm?.querySelector('[name="date"]');
      const venueInput = metaForm?.querySelector('[name="venue"]');
      state.date = dateInput?.value || state.date;
      state.venue = venueInput?.value || state.venue;
      const dateStr = state.date ? new Date(state.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Set list';
      const dateEl = metaTrigger?.querySelector('.clear-meta-date');
      if (dateEl) dateEl.textContent = dateStr;
      const venueEl = metaTrigger?.querySelector('.clear-meta-venue');
      if (state.venue) {
        if (!venueEl) {
          const span = document.createElement('span');
          span.className = 'clear-meta-venue';
          span.textContent = state.venue;
          metaTrigger?.appendChild(span);
        } else venueEl.textContent = state.venue;
      } else venueEl?.remove();
    };

    metaForm?.addEventListener('change', (e) => {
      const target = e.target;
      if (target.name === 'date') state.date = target.value;
      else if (target.name === 'venue') state.venue = target.value;
      else if (target.name === 'mode') state.mode = target.value;
      else if (target.name === 'logo_variant') state.logo_variant = target.value;
      else if (target.name === 'show_date') state.show_date = target.checked;
      else if (target.name === 'show_venue') state.show_venue = target.checked;
      syncMetaDisplay();
      scheduleDraftSave(state, context);
    });

    metaForm?.addEventListener('input', (e) => {
      if (e.target.name === 'date' || e.target.name === 'venue') syncMetaDisplay();
      scheduleDraftSave(state, context);
    });

    container.querySelector('#discard-draft')?.addEventListener('click', () => {
      if (typeof DRAFT_STORE !== 'undefined') DRAFT_STORE.clear(context);
      closeSheets();
      navigate(context === 'new' ? '/new' : `/${context}/edit`);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSheets();
    });

    initSortable(container, state, refresh, context);
    initLongPress(container, state, refresh);
    updateBreakHint();
  }

  function initSortable(container, state, refresh, context) {
    const ul = container?.querySelector('#setlist-items');
    const trashZone = container?.querySelector('#trash-zone');
    const trashList = container?.querySelector('#trash-list');
    const addTrigger = container?.querySelector('#add-song-trigger');

    if (!ul || typeof Sortable === 'undefined') return;

    if (sortable) sortable.destroy();
    if (trashSortable) trashSortable.destroy();

    const group = { name: 'setlist', pull: true, put: ['setlist', 'trash'] };

    const hideTrash = () => {
      trashZone?.classList.remove('active');
      trashZone?.setAttribute('aria-hidden', 'true');
      addTrigger?.setAttribute('aria-hidden', 'false');
    };

    sortable = Sortable.create(ul, {
      animation: 200,
      handle: '.clear-item-text',
      ghostClass: 'clear-item-ghost',
      group: { name: 'setlist', pull: true, put: true },
      onStart: () => {
        trashZone?.classList.add('active');
        trashZone?.setAttribute('aria-hidden', 'false');
        addTrigger?.setAttribute('aria-hidden', 'true');
      },
      onMove: (evt) => {
        trashZone?.classList.toggle('drag-over', evt.to === trashList);
      },
      onEnd: (evt) => {
        trashZone?.classList.remove('drag-over');
        if (evt.to !== trashList) {
          syncStateFromDOM(container, state);
          haptic();
        }
        hideTrash();
        if (typeof DRAFT_STORE !== 'undefined' && context) DRAFT_STORE.save(state, context);
      }
    });

    trashSortable = Sortable.create(trashList, {
      group: { name: 'setlist', put: true, pull: false },
      sort: false,
      onAdd: (evt) => {
        const item = evt.item;
        const isDivider = item?.dataset?.divider;
        if (isDivider) {
          const after = parseInt(item?.dataset?.after, 10);
          state.divider_positions = state.divider_positions.filter(p => p !== after);
        } else {
          const id = parseInt(item?.dataset?.id, 10);
          if (!isNaN(id)) state.song_ids = state.song_ids.filter(x => x !== id);
        }
        item?.remove();
        haptic();
        hideTrash();
        if (typeof DRAFT_STORE !== 'undefined' && context) DRAFT_STORE.save(state, context);
        refresh();
      }
    });
  }

  function syncStateFromDOM(container, state) {
    const ul = container?.querySelector('#setlist-items');
    if (!ul) return;

    const songIds = [];
    const dividerPositions = [];
    let songIndex = 0;

    ul.querySelectorAll('.clear-item').forEach(li => {
      if (li.dataset.divider) {
        if (songIndex > 0) dividerPositions.push(songIndex - 1);
      } else {
        const id = parseInt(li.dataset.id, 10);
        if (!isNaN(id)) {
          songIds.push(id);
          songIndex++;
        }
      }
    });

    state.song_ids = songIds;
    state.divider_positions = [...new Set(dividerPositions)].sort((a, b) => a - b);
  }

  function initLongPress(container, state, refresh) {
    const items = container?.querySelectorAll('.clear-item:not(.clear-divider)');
    if (!items) return;

    const addBreak = (li) => {
      const idx = parseInt(li.dataset.index, 10);
      const insertAfter = idx; // break appears below this song (between it and the next)
      if (!state.divider_positions.includes(insertAfter)) {
        state.divider_positions.push(insertAfter);
        state.divider_positions.sort((a, b) => a - b);
        haptic();
        refresh();
      }
    };

    items.forEach(li => {
      let timer;
      li.addEventListener('touchstart', () => {
        timer = setTimeout(() => { addBreak(li); timer = null; }, 500);
      }, { passive: true });
      li.addEventListener('touchend', () => clearTimeout(timer));
      li.addEventListener('touchcancel', () => clearTimeout(timer));

      li.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        timer = setTimeout(() => { addBreak(li); timer = null; }, 500);
      });
      li.addEventListener('mouseup', () => clearTimeout(timer));
      li.addEventListener('mouseleave', () => clearTimeout(timer));
    });
  }

  function haptic() {
    if (navigator.vibrate) navigator.vibrate(10);
  }

  async function doSave(state, container, context, navigate, closeSheets) {
    const btn = container?.querySelector('#save-setlist-btn');
    const origText = btn?.textContent;
    if (btn) btn.textContent = 'Saving…';
    if (btn) btn.disabled = true;
    try {
      const token = typeof AUTH !== 'undefined' ? AUTH.getToken() : null;
      const result = await DATA.saveSetlist(state, token);
      if (typeof DRAFT_STORE !== 'undefined') DRAFT_STORE.clear(context);
      closeSheets();
      navigate(result.id ? `/${result.id}` : '/');
    } catch (err) {
      alert(err.message || 'Save failed');
    } finally {
      if (btn) {
        btn.textContent = origText || 'Save';
        btn.disabled = false;
      }
    }
  }

  return { render };
})();
