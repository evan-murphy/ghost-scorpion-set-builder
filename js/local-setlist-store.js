/**
 * BTDOAGS Set List — Local setlist persistence (localStorage)
 * Stores setlists for archive + stage mode when Google Sheets is unavailable.
 * Data is lost on browser clear/refresh of storage.
 */

const LOCAL_SETLIST_STORE = (function() {
  const STORAGE_KEY = 'btdoags_local_setlists';

  function getAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function getById(id) {
    return getAll().find(s => String(s.id) === String(id));
  }

  function save(setlist) {
    const list = getAll();
    const payload = {
      id: setlist.id || 'sl' + Date.now(),
      date: setlist.date || '',
      venue: setlist.venue || '',
      mode: setlist.mode || 'medium',
      song_ids: setlist.song_ids || [],
      divider_positions: setlist.divider_positions || [],
      show_date: setlist.show_date !== false,
      show_venue: setlist.show_venue === true,
      logo_variant: setlist.logo_variant || 'black',
      notes: setlist.notes || '',
      created_at: setlist.created_at || new Date().toISOString()
    };
    const idx = list.findIndex(s => String(s.id) === String(payload.id));
    if (idx >= 0) {
      list[idx] = payload;
    } else {
      list.push(payload);
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return { ok: true, id: payload.id };
    } catch (e) {
      throw new Error('Failed to save to device storage');
    }
  }

  function remove(id) {
    const list = getAll().filter(s => String(s.id) !== String(id));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  return { getAll, getById, save, remove };
})();
