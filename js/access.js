/**
 * Sheet ACL — access to the app = access to ACCESS_SHEET_ID.
 * viewer = read only; editor = write setlists + catalog; commenter treated as viewer.
 */
const ACCESS = (function() {
  const SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/drive.metadata.readonly'
  ].join(' ');

  let role = null; // null | 'none' | 'viewer' | 'editor'
  let checking = null;
  let listeners = [];

  function notify() {
    listeners.forEach(fn => fn(getState()));
  }

  function onChange(fn) {
    listeners.push(fn);
    return () => {
      listeners = listeners.filter(f => f !== fn);
    };
  }

  function bypass() {
    return typeof CONFIG !== 'undefined' && (
      CONFIG.USE_MOCK ||
      (typeof window !== 'undefined' && window.location.search.includes('mock=1'))
    );
  }

  function sheetId() {
    return (CONFIG && (CONFIG.ACCESS_SHEET_ID || CONFIG.SETLISTS_SHEET_ID)) || '';
  }

  function requestAccessUrl() {
    if (CONFIG && CONFIG.REQUEST_ACCESS_URL) return CONFIG.REQUEST_ACCESS_URL;
    const id = sheetId();
    return id ? `https://docs.google.com/spreadsheets/d/${id}/edit` : '#';
  }

  function getState() {
    if (bypass()) {
      return { ready: true, role: 'editor', canView: true, canEdit: true, bypass: true };
    }
    return {
      ready: role !== null,
      role: role || 'none',
      canView: role === 'viewer' || role === 'editor',
      canEdit: role === 'editor',
      bypass: false
    };
  }

  function canView() {
    return getState().canView;
  }

  function canEdit() {
    return getState().canEdit;
  }

  async function fetchRoleWithToken(accessToken) {
    const id = sheetId();
    if (!id || !accessToken) return 'none';

    async function probe(fileId) {
      const url =
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}` +
        `?fields=id,capabilities(canEdit)`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        return null;
      }
      if (!res.ok) {
        throw new Error(`Drive check failed (${res.status})`);
      }
      return res.json();
    }

    const primary = await probe(id);
    if (!primary) return 'none';

    const songsId = CONFIG.SONGS_SHEET_ID;
    if (songsId && songsId !== id) {
      const songs = await probe(songsId);
      if (!songs) return 'none';
    }

    if (primary.capabilities && primary.capabilities.canEdit) return 'editor';
    return 'viewer';
  }

  async function refresh() {
    if (bypass()) {
      role = 'editor';
      notify();
      return getState();
    }
    if (checking) return checking;

    checking = (async () => {
      role = null;
      notify();
      try {
        if (typeof AUTH === 'undefined' || !AUTH.isSignedIn()) {
          role = 'none';
          return getState();
        }
        const accessToken = await AUTH.getAccessToken(SCOPES);
        if (!accessToken) {
          role = 'none';
          return getState();
        }
        role = await fetchRoleWithToken(accessToken);
        return getState();
      } catch (e) {
        console.warn('ACCESS.refresh', e);
        role = 'none';
        return getState();
      } finally {
        checking = null;
        notify();
      }
    })();

    return checking;
  }

  function clear() {
    role = null;
    notify();
  }

  return {
    SCOPES,
    refresh,
    clear,
    getState,
    canView,
    canEdit,
    onChange,
    requestAccessUrl,
    sheetId,
    bypass
  };
})();
