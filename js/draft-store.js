/**
 * BTDOAGS Set List — Draft persistence (localStorage)
 * Saves builder state so edits survive navigation and page refresh
 */

const DRAFT_STORE = (function() {
  const KEY_PREFIX = 'btdoags_draft_';

  function getDraftKey(context) {
    return KEY_PREFIX + (context || 'new');
  }

  function save(state, context) {
    const key = getDraftKey(context);
    const payload = {
      date: state.date,
      venue: state.venue,
      mode: state.mode,
      song_ids: state.song_ids,
      divider_positions: state.divider_positions || [],
      show_date: state.show_date,
      show_venue: state.show_venue,
      logo_variant: state.logo_variant,
      notes: state.notes,
      id: state.id,
      savedAt: Date.now()
    };
    try {
      localStorage.setItem(key, JSON.stringify(payload));
    } catch (e) {
      console.warn('Draft save failed:', e);
    }
  }

  function load(context) {
    const key = getDraftKey(context);
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function clear(context) {
    try {
      localStorage.removeItem(getDraftKey(context));
    } catch (e) {}
  }

  function clearAll() {
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith(KEY_PREFIX))
        .forEach(k => localStorage.removeItem(k));
    } catch (e) {}
  }

  return { save, load, clear, clearAll, getDraftKey };
})();
