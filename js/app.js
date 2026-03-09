/**
 * BTDOAGS Set List — Main app & routing
 */

(function() {
  const mainContent = document.getElementById('main-content');
  const mainHeader = document.getElementById('main-header');

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

  function render() {
    const path = getPath();
    const route = parseRoute(path);

    if (route.view === 'read') {
      document.body.classList.add('stage-view');
      mainHeader.style.display = 'none';
      if (typeof READ_VIEW !== 'undefined') {
        READ_VIEW.render(mainContent, route.id, { navigate });
      }
      return;
    }

    document.body.classList.remove('stage-view');
    mainHeader.style.display = '';
    mainHeader.classList.remove('hidden');

    switch (route.view) {
      case 'archive':
        document.body.classList.remove('builder-view');
        if (typeof ARCHIVE !== 'undefined') ARCHIVE.render(mainContent, { navigate });
        break;
      case 'builder':
        document.body.classList.add('builder-view');
        if (typeof BUILDER !== 'undefined') BUILDER.render(mainContent, route.id, { navigate });
        break;
      case 'catalog':
        document.body.classList.remove('builder-view');
        if (typeof CATALOG !== 'undefined') CATALOG.render(mainContent, { navigate });
        break;
      default:
        document.body.classList.remove('builder-view');
        if (typeof ARCHIVE !== 'undefined') ARCHIVE.render(mainContent, { navigate });
    }
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }

  window.APP = { navigate, getPath, parseRoute };
})();
