/**
 * BTDOAGS Set List — Pending song (1 at a time in memory)
 * Add a new song locally; it stays here until you save to the sheet
 */

const PENDING_SONG = (function() {
  let song = null;

  function get() {
    return song ? { ...song } : null;
  }

  function set(s) {
    song = s && (s.title || s.display_title) ? {
      title: String(s.title || '').trim(),
      display_title: String(s.display_title || s.title || '').trim(),
      album: String(s.album || '').trim(),
      year: s.year != null && s.year !== '' ? parseInt(s.year, 10) : null,
      notes: String(s.notes || '').trim(),
      active: s.active !== false
    } : null;
  }

  function clear() {
    song = null;
  }

  function has() {
    return !!song && (!!song.title || !!song.display_title);
  }

  return { get, set, clear, has };
})();
