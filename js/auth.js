/**
 * BTDOAGS Set List — Google Sign-In (PKCE redirect)
 * Full-page Google redirect — avoids blank gsi/transform / OAuth popups.
 */

const AUTH = (function() {
  const STORAGE_TOKEN = 'btdoags_access_token';
  const STORAGE_EXPIRES = 'btdoags_access_expires';
  const STORAGE_EMAIL = 'btdoags_email';
  const PKCE_VERIFIER = 'btdoags_pkce_verifier';
  const PKCE_STATE = 'btdoags_pkce_state';

  let accessToken = null;
  let accessTokenExpiresAt = 0;
  let email = null;
  let listeners = [];
  let initPromise = null;
  let redirectHandled = false;

  const SIGN_IN_SCOPES = [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/drive.metadata.readonly'
  ].join(' ');

  function notify() {
    listeners.forEach(fn => fn(isSignedIn()));
  }

  function redirectUri() {
    // Must match Authorized redirect URI exactly (with trailing slash).
    return window.location.origin + '/';
  }

  function loadSession() {
    try {
      const t = sessionStorage.getItem(STORAGE_TOKEN);
      const exp = parseInt(sessionStorage.getItem(STORAGE_EXPIRES) || '0', 10);
      const em = sessionStorage.getItem(STORAGE_EMAIL);
      if (t && exp > Date.now() + 5000 && em) {
        accessToken = t;
        accessTokenExpiresAt = exp;
        email = em;
        return true;
      }
    } catch (e) {}
    return false;
  }

  function saveSession() {
    try {
      if (accessToken && email) {
        sessionStorage.setItem(STORAGE_TOKEN, accessToken);
        sessionStorage.setItem(STORAGE_EXPIRES, String(accessTokenExpiresAt));
        sessionStorage.setItem(STORAGE_EMAIL, email);
      }
    } catch (e) {}
  }

  function clearSession() {
    accessToken = null;
    accessTokenExpiresAt = 0;
    email = null;
    try {
      sessionStorage.removeItem(STORAGE_TOKEN);
      sessionStorage.removeItem(STORAGE_EXPIRES);
      sessionStorage.removeItem(STORAGE_EMAIL);
      sessionStorage.removeItem(PKCE_VERIFIER);
      sessionStorage.removeItem(PKCE_STATE);
    } catch (e) {}
  }

  function isSignedIn() {
    if (!accessToken || !email) return false;
    if (Date.now() >= accessTokenExpiresAt) {
      clearSession();
      return false;
    }
    return true;
  }

  function getToken() {
    return isSignedIn() ? accessToken : null;
  }

  function getEmail() {
    return isSignedIn() ? email : null;
  }

  function onAuthChange(callback) {
    listeners.push(callback);
    return () => {
      listeners = listeners.filter(fn => fn !== callback);
    };
  }

  function randomString(len) {
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    return Array.from(arr, b => ('0' + b.toString(16)).slice(-2)).join('');
  }

  function base64Url(bytes) {
    let str = '';
    bytes.forEach(b => { str += String.fromCharCode(b); });
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  async function pkceChallenge(verifier) {
    const data = new TextEncoder().encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return base64Url(new Uint8Array(hash));
  }

  async function fetchEmail(token) {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Could not load Google profile');
    const data = await res.json();
    return (data.email || '').toLowerCase() || null;
  }

  async function signIn() {
    if (!CONFIG.GOOGLE_CLIENT_ID) throw new Error('Missing GOOGLE_CLIENT_ID');
    const verifier = randomString(32);
    const state = randomString(16);
    sessionStorage.setItem(PKCE_VERIFIER, verifier);
    sessionStorage.setItem(PKCE_STATE, state);
    const challenge = await pkceChallenge(verifier);
    const params = new URLSearchParams({
      client_id: CONFIG.GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri(),
      response_type: 'code',
      scope: SIGN_IN_SCOPES,
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      prompt: 'select_account',
      access_type: 'online',
      include_granted_scopes: 'true'
    });
    window.location.assign('https://accounts.google.com/o/oauth2/v2/auth?' + params.toString());
  }

  async function completeRedirectIfPresent() {
    if (redirectHandled) return false;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const err = params.get('error');
    if (!code && !err) return false;

    redirectHandled = true;

    const cleanPath = (window.location.pathname || '/').replace(/\/$/, '') || '/';
    const base = (typeof CONFIG !== 'undefined' && CONFIG.BASE_PATH) || '';
    history.replaceState({}, '', (base || '') + (cleanPath === '/' ? '/' : cleanPath));

    if (err) {
      throw new Error(err === 'access_denied' ? 'Access denied by Google' : err);
    }

    const savedState = sessionStorage.getItem(PKCE_STATE);
    const verifier = sessionStorage.getItem(PKCE_VERIFIER);
    sessionStorage.removeItem(PKCE_STATE);
    sessionStorage.removeItem(PKCE_VERIFIER);

    if (!verifier || !state || state !== savedState) {
      throw new Error('Sign-in state mismatch — try again');
    }

    const body = new URLSearchParams({
      client_id: CONFIG.GOOGLE_CLIENT_ID,
      code,
      code_verifier: verifier,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri()
    });

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.error_description || data.error || 'Token exchange failed';
      throw new Error(msg);
    }

    accessToken = data.access_token;
    const expiresIn = Number(data.expires_in) || 3600;
    accessTokenExpiresAt = Date.now() + expiresIn * 1000 - 60000;
    email = await fetchEmail(accessToken);
    if (!email) throw new Error('No email on Google account');
    saveSession();
    notify();
    return true;
  }

  function getAccessToken() {
    if (!isSignedIn()) return Promise.resolve(null);
    return Promise.resolve(accessToken);
  }

  /**
   * Idempotent. Safe to call from multiple places — only one redirect exchange runs.
   */
  function init() {
    if (initPromise) return initPromise;

    initPromise = (async () => {
      loadSession();
      try {
        await completeRedirectIfPresent();
      } catch (e) {
        console.warn('OAuth redirect', e);
        // Only clear if we never got a session — don't wipe a parallel success.
        if (!isSignedIn()) {
          clearSession();
          window.__AUTH_REDIRECT_ERROR = e?.message || String(e);
        }
        notify();
      }
      return !!CONFIG.GOOGLE_CLIENT_ID;
    })();

    return initPromise;
  }

  function renderButton(element) {
    if (!element) return;
    element.innerHTML = '';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'access-gate-btn access-gate-btn--primary';
    btn.textContent = 'Sign in with Google';
    btn.addEventListener('click', () => {
      btn.disabled = true;
      btn.textContent = 'Redirecting to Google…';
      signIn().catch((e) => {
        btn.disabled = false;
        btn.textContent = 'Sign in with Google';
        alert(e?.message || 'Sign-in failed');
      });
    });
    element.appendChild(btn);
  }

  function prompt() {
    signIn().catch((e) => console.warn(e));
  }

  function signOut() {
    const toRevoke = accessToken;
    clearSession();
    redirectHandled = false;
    initPromise = null;
    if (toRevoke && window.google?.accounts?.oauth2) {
      try { google.accounts.oauth2.revoke(toRevoke); } catch (e) {}
    }
    if (typeof ACCESS !== 'undefined') ACCESS.clear();
    notify();
  }

  return {
    init,
    signIn,
    renderButton,
    prompt,
    signOut,
    isSignedIn,
    getToken,
    getAccessToken,
    getEmail,
    onAuthChange,
    completeRedirectIfPresent,
    SIGN_IN_SCOPES
  };
})();
