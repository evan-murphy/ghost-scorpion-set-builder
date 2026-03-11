/**
 * Catalog preferences — localStorage persistence for columns, mode, filters
 */

const CATALOG_PREFS = (function() {
  const STORAGE_KEY = 'catalog_prefs';

  const DEFAULTS = {
    advancedMode: false,
    columnPreset: 'simple',
    columns: null,
    sortKey: 'display_title',
    sortAsc: true,
    activeFilter: null,
    savedFilters: []
  };

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULTS };
      const parsed = JSON.parse(raw);
      return { ...DEFAULTS, ...parsed };
    } catch (e) {
      return { ...DEFAULTS };
    }
  }

  function save(prefs) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (e) {
      console.warn('Catalog prefs save failed:', e);
    }
  }

  function get(key) {
    const p = load();
    return p[key];
  }

  function set(key, value) {
    const p = load();
    p[key] = value;
    save(p);
    return p;
  }

  function getColumns() {
    const p = load();
    if (p.columns && Array.isArray(p.columns) && p.columns.length > 0) {
      return p.columns;
    }
    return typeof CATALOG_METADATA !== 'undefined'
      ? CATALOG_METADATA.getColumnsForPreset(p.columnPreset || 'simple')
      : ['display_title', 'title', 'primary_artist', 'album', 'year'];
  }

  function setColumns(columns) {
    return set('columns', columns);
  }

  function setColumnPreset(presetId) {
    return set('columnPreset', presetId);
  }

  return {
    load,
    save,
    get,
    set,
    getColumns,
    setColumns,
    setColumnPreset,
    DEFAULTS
  };
})();
