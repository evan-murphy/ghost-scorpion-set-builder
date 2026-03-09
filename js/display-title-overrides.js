/**
 * BTDOAGS Set List — Display title overrides (localStorage)
 * Catalog edits persist here until Sheets write is available
 */

const DISPLAY_TITLE_OVERRIDES = (function() {
  const KEY = 'btdoags_display_title_overrides';

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function save(overrides) {
    try {
      localStorage.setItem(KEY, JSON.stringify(overrides));
    } catch (e) {
      console.warn('Display title save failed:', e);
    }
  }

  function set(songId, displayTitle) {
    const o = load();
    if (displayTitle && displayTitle.trim()) {
      o[songId] = displayTitle.trim();
    } else {
      delete o[songId];
    }
    save(o);
  }

  function remove(songId) {
    const o = load();
    delete o[songId];
    save(o);
  }

  function get(songId) {
    return load()[songId];
  }

  return { load, set, get, remove };
})();
