/**
 * BTDOAGS Set List — Google Sign-In (Identity Services)
 * Auth required only for: Save setlist, Edit catalog display titles
 * Uses ID token (credential) for Apps Script verification
 */

const AUTH = (function() {
  let credential = null;
  let listeners = [];

  function notify() {
    listeners.forEach(fn => fn(isSignedIn()));
  }

  function isSignedIn() {
    return !!credential;
  }

  function getToken() {
    if (credential && isTokenExpired(credential)) {
      credential = null;
      notify();
      return null;
    }
    return credential;
  }

  function isTokenExpired(token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp;
      if (!exp) return false;
      return Date.now() >= (exp * 1000) - 60000;
    } catch (e) {
      return true;
    }
  }

  function getEmail() {
    if (!credential) return null;
    try {
      const payload = JSON.parse(atob(credential.split('.')[1]));
      return payload.email || null;
    } catch (e) {
      return null;
    }
  }

  function onAuthChange(callback) {
    listeners.push(callback);
    return () => {
      listeners = listeners.filter(fn => fn !== callback);
    };
  }

  function handleCredentialResponse(response) {
    if (response.credential) {
      credential = response.credential;
      notify();
    }
  }

  function init() {
    if (!CONFIG.GOOGLE_CLIENT_ID) return Promise.resolve(false);

    return new Promise((resolve) => {
      if (window.google?.accounts?.id) {
        google.accounts.id.initialize({
          client_id: CONFIG.GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false
        });
        resolve(true);
      } else {
        resolve(false);
      }
    });
  }

  function renderButton(element, opts = {}) {
    if (!CONFIG.GOOGLE_CLIENT_ID || !window.google?.accounts?.id) {
      if (element) element.innerHTML = '<span>Sign-in unavailable</span>';
      return;
    }
    google.accounts.id.renderButton(element, {
      type: 'standard',
      theme: 'outline',
      size: 'medium',
      text: 'signin_with',
      ...opts
    });
  }

  function prompt() {
    if (!CONFIG.GOOGLE_CLIENT_ID) return;
    init().then(ok => {
      if (ok && window.google?.accounts?.id) google.accounts.id.prompt();
    });
  }

  function signOut() {
    credential = null;
    notify();
  }

  return {
    init,
    signIn: null,
    renderButton,
    prompt,
    signOut,
    isSignedIn,
    getToken,
    getEmail,
    onAuthChange
  };
})();
