/**
 * BTDOAGS Set List — Main app & routing
 * Gate: must sign in + have access to ACCESS_SHEET_ID (Drive ACL).
 */

(function() {
  const mainContent = document.getElementById('main-content');
  const mainHeader = document.getElementById('main-header');
  let gateUnsubAuth = null;
  let gateUnsubAccess = null;
  let bootstrapped = false;

  function getBasePath() {
    if (CONFIG.BASE_PATH) return CONFIG.BASE_PATH;
    if (window.location.hostname.includes('github.io') && window.location.pathname.startsWith('/ghost-scorpion-set-builder')) {
      return '/ghost-scorpion-set-builder';
    }
    return '';
  }

  if (!CONFIG.BASE_PATH && window.location.hostname.includes('github.io')) {
    CONFIG.BASE_PATH = '/ghost-scorpion-set-builder';
  }

  function getPath() {
    const base = getBasePath();
    const path = window.location.pathname.replace(new RegExp('^' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '').replace(/\/$/, '') || '/';
    return path;
  }

  function parseRoute(path) {
    if (path === '/' || path === '') return { view: 'archive' };
    if (path === '/new') return { view: 'builder', id: null };
    if (path === '/catalog') return { view: 'catalog' };

    const editMatch = path.match(/^\/([^/]+)\/edit$/);
    if (editMatch) return { view: 'builder', id: editMatch[1] };

    const idMatch = path.match(/^\/([^/]+)$/);
    if (idMatch) return { view: 'read', id: idMatch[1] };

    return { view: 'archive' };
  }

  function navigate(path) {
    const base = getBasePath();
    const fullPath = base + (path.startsWith('/') ? path : '/' + path);
    window.history.pushState({}, '', fullPath);
    render();
  }

  function waitForGsi(ms = 10000) {
    return new Promise((resolve) => {
      if (window.google?.accounts?.id) {
        resolve(true);
        return;
      }
      const start = Date.now();
      const t = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(t);
          resolve(true);
        } else if (Date.now() - start > ms) {
          clearInterval(t);
          resolve(false);
        }
      }, 50);
    });
  }

  function applyRoleChrome() {
    const canEdit = typeof ACCESS !== 'undefined' && ACCESS.canEdit();
    document.body.classList.toggle('role-viewer', !canEdit);
    document.body.classList.toggle('role-editor', canEdit);
    const btnNew = document.getElementById('btn-new-setlist');
    if (btnNew) btnNew.style.display = canEdit ? '' : 'none';
  }

  function renderGate({ mode, message }) {
    document.body.classList.add('access-gate');
    document.body.classList.remove('stage-view', 'builder-view', 'archive-view', 'catalog-view', 'role-viewer', 'role-editor');
    if (mainHeader) mainHeader.style.display = 'none';
    const base = getBasePath();
    const logo = base + '/assets/scorpion-white.png';
    const requestUrl = typeof ACCESS !== 'undefined' ? ACCESS.requestAccessUrl() : '#';

    if (mode === 'loading') {
      mainContent.innerHTML = `
        <div class="access-gate-screen">
          <img src="${logo}" alt="" class="access-gate-logo" height="96">
          <p class="access-gate-msg">Checking access…</p>
        </div>`;
      return;
    }

    if (mode === 'signin') {
      const err = window.__AUTH_REDIRECT_ERROR;
      window.__AUTH_REDIRECT_ERROR = null;
      mainContent.innerHTML = `
        <div class="access-gate-screen">
          <img src="${logo}" alt="" class="access-gate-logo" height="96">
          <h1 class="access-gate-title">BTDOAGS Set List</h1>
          <p class="access-gate-msg">Sign in with Google to continue.</p>
          ${err ? `<p class="access-gate-msg" style="color:#f88;">${err}</p>` : ''}
          <div id="access-gate-signin"></div>
        </div>`;
      const mount = mainContent.querySelector('#access-gate-signin');
      if (typeof AUTH !== 'undefined' && AUTH.renderButton) AUTH.renderButton(mount);
      return;
    }

    // denied
    mainContent.innerHTML = `
      <div class="access-gate-screen">
        <img src="${logo}" alt="" class="access-gate-logo" height="96">
        <h1 class="access-gate-title">No access</h1>
        <p class="access-gate-msg">${message || "You don't have access to this set list tool."}</p>
        <p class="access-gate-msg access-gate-msg--secondary">Request access to the band spreadsheet (same as requesting access in Google Sheets). An editor will approve you.</p>
        <a class="access-gate-btn access-gate-btn--primary" href="${requestUrl}" target="_blank" rel="noopener">Request access</a>
        <button type="button" class="access-gate-link" id="access-gate-signout">Use a different Google account</button>
      </div>`;
    mainContent.querySelector('#access-gate-signout')?.addEventListener('click', () => {
      AUTH.signOut && AUTH.signOut();
      bootstrap();
    });
  }

  async function bootstrap() {
    if (typeof ACCESS !== 'undefined' && ACCESS.bypass()) {
      document.body.classList.remove('access-gate');
      if (mainHeader) mainHeader.style.display = '';
      applyRoleChrome();
      renderApp();
      return;
    }

    renderGate({ mode: 'loading' });

    const gsiReady = await waitForGsi();
    if (typeof AUTH !== 'undefined') {
      await AUTH.init();
    }

    if (!gsiReady || typeof AUTH === 'undefined' || !AUTH.isSignedIn()) {
      renderGate({ mode: 'signin' });
      if (!gateUnsubAuth && AUTH?.onAuthChange) {
        gateUnsubAuth = AUTH.onAuthChange(() => {
          if (AUTH.isSignedIn()) bootstrap();
        });
      }
      return;
    }

    const state = await ACCESS.refresh();
    if (!state.canView) {
      renderGate({
        mode: 'denied',
        message: "You're signed in, but you don't have access to the setlists spreadsheet."
      });
      return;
    }

    document.body.classList.remove('access-gate');
    if (mainHeader) mainHeader.style.display = '';
    applyRoleChrome();
    renderApp();
  }

  function renderApp() {
    const path = getPath();
    const route = parseRoute(path);
    const canEdit = typeof ACCESS === 'undefined' || ACCESS.canEdit();

    if ((route.view === 'builder') && !canEdit) {
      navigate('/');
      return;
    }

    if (route.view === 'read') {
      document.body.classList.add('stage-view');
      document.body.classList.remove('builder-view', 'archive-view', 'catalog-view');
      mainHeader.style.display = 'none';
      const btnNew = document.getElementById('btn-new-setlist');
      if (btnNew) btnNew.style.display = 'none';
      if (typeof READ_VIEW !== 'undefined') {
        READ_VIEW.render(mainContent, route.id, { navigate });
      }
      return;
    }

    if (typeof READ_VIEW !== 'undefined' && typeof READ_VIEW.abort === 'function') {
      READ_VIEW.abort();
    }
    document.body.classList.remove('stage-view');
    mainHeader.style.display = '';
    mainHeader.classList.remove('hidden');

    const headerTitle = document.getElementById('header-title');
    const btnNew = document.getElementById('btn-new-setlist');
    const logo = mainHeader?.querySelector('.logo');
    const basePath = (typeof CONFIG !== 'undefined' && CONFIG.BASE_PATH) || '';
    if (logo) {
      logo.src = basePath + (route.view === 'archive' ? '/assets/scorpion-black.png' : '/assets/scorpion-white.png');
    }

    const navLinks = mainHeader?.querySelectorAll('.nav-tabs a');

    navLinks?.forEach(a => {
      const href = a.getAttribute('href');
      a.classList.toggle('active', ((path === '/' || path === '') && href === '/') || (path === '/catalog' && href === '/catalog'));
    });

    if (headerTitle) {
      headerTitle.textContent = route.view === 'catalog' ? 'Catalog' : 'Setlists';
    }
    if (btnNew) {
      btnNew.style.display = route.view === 'archive' && canEdit ? '' : 'none';
    }

    switch (route.view) {
      case 'archive':
        document.body.classList.add('archive-view');
        document.body.classList.remove('builder-view', 'catalog-view');
        if (typeof ARCHIVE !== 'undefined') ARCHIVE.render(mainContent, { navigate });
        break;
      case 'builder':
        document.body.classList.remove('archive-view');
        document.body.classList.add('builder-view');
        document.body.classList.remove('catalog-view');
        if (typeof BUILDER !== 'undefined') BUILDER.render(mainContent, route.id, { navigate });
        break;
      case 'catalog':
        document.body.classList.remove('archive-view');
        document.body.classList.add('catalog-view');
        document.body.classList.remove('builder-view');
        if (typeof CATALOG !== 'undefined') CATALOG.render(mainContent, { navigate });
        break;
      default:
        document.body.classList.remove('archive-view', 'builder-view', 'catalog-view');
        if (typeof ARCHIVE !== 'undefined') ARCHIVE.render(mainContent, { navigate });
    }
  }

  function render() {
    if (typeof ACCESS !== 'undefined' && ACCESS.bypass()) {
      renderApp();
      return;
    }
    if (!ACCESS.getState().canView) {
      bootstrap();
      return;
    }
    renderApp();
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-route]');
    if (a && a.getAttribute('href').startsWith('/')) {
      e.preventDefault();
      navigate(a.getAttribute('href'));
    }

    const link = e.target.closest('a[href^="/"]');
    if (link && !link.hasAttribute('data-route') && link.getAttribute('href').startsWith('/') && !link.target) {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('//')) {
        e.preventDefault();
        navigate(href);
      }
    }
  });

  window.addEventListener('popstate', render);

  function start() {
    if (bootstrapped) return;
    bootstrapped = true;
    if (gateUnsubAccess) gateUnsubAccess();
    if (typeof ACCESS !== 'undefined' && ACCESS.onChange) {
      gateUnsubAccess = ACCESS.onChange(() => {
        if (ACCESS.getState().canView) {
          document.body.classList.remove('access-gate');
          if (mainHeader) mainHeader.style.display = '';
          applyRoleChrome();
        }
      });
    }
    bootstrap();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  window.APP = { navigate, getPath, parseRoute, bootstrap };
})();
