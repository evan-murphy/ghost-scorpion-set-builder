/**
 * BTDOAGS Set List — Add song (editors only)
 * One job: add a live song by stage name.
 */

const ADD_SONG = (function() {
  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function render(container, { navigate }) {
    const canEdit = typeof ACCESS === 'undefined' || ACCESS.canEdit();
    if (!canEdit) {
      navigate('/');
      return;
    }

    const signedIn = typeof AUTH !== 'undefined' && AUTH.isSignedIn();
    const canSave = !!(CONFIG.APPS_SCRIPT_URL || CONFIG.APPS_SCRIPT_PROXY_URL);

    container.innerHTML = `
      <div class="add-song-page">
        <h1 class="add-song-title">Add song</h1>
        <p class="add-song-lede">Type the stage name — the shorthand that shows on the setlist. Everything else can wait.</p>

        ${!signedIn ? `
          <div class="add-song-banner">
            <p>Sign in with Google to save to the sheet.</p>
            <div id="add-song-signin"></div>
          </div>
        ` : ''}

        <form class="add-song-form" id="add-song-form" autocomplete="off">
          <label class="add-song-label" for="add-song-name">Stage name</label>
          <input type="text" id="add-song-name" class="add-song-input" placeholder="e.g. DESMO" maxlength="80" required autofocus>
          <button type="submit" class="add-song-submit" id="add-song-submit"${!signedIn || !canSave ? ' disabled' : ''}>
            Add to catalog
          </button>
        </form>
        <p class="add-song-status" id="add-song-status" aria-live="polite"></p>

        <p class="add-song-advanced">
          <a href="/catalog" data-route="/catalog">Advanced catalog</a>
          <span> — metadata, inactive songs, Bandcamp import</span>
        </p>
      </div>
    `;

    if (!signedIn && canSave && typeof AUTH !== 'undefined' && AUTH.renderButton) {
      AUTH.renderButton(container.querySelector('#add-song-signin'));
      const unsub = AUTH.onAuthChange && AUTH.onAuthChange(() => {
        if (AUTH.isSignedIn()) {
          unsub && unsub();
          render(container, { navigate });
        }
      });
    }

    const form = container.querySelector('#add-song-form');
    const input = container.querySelector('#add-song-name');
    const status = container.querySelector('#add-song-status');
    const submit = container.querySelector('#add-song-submit');

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = input?.value?.trim();
      if (!name) {
        input?.focus();
        return;
      }
      if (typeof AUTH === 'undefined' || !AUTH.isSignedIn()) {
        if (status) status.textContent = 'Sign in to save.';
        return;
      }
      if (!canSave) {
        if (status) status.textContent = 'Save is not configured.';
        return;
      }

      if (submit) submit.disabled = true;
      if (status) status.textContent = 'Saving…';
      try {
        await DATA.saveNewSong(
          { title: name, display_title: name, album: '', year: null, active: true },
          AUTH.getToken()
        );
        if (input) input.value = '';
        if (status) {
          status.innerHTML = `Added <strong>${escapeHtml(name)}</strong> — it’s live in the set builder.`;
        }
        input?.focus();
      } catch (err) {
        if (status) status.textContent = err.message || 'Save failed';
      } finally {
        if (submit) submit.disabled = false;
      }
    });
  }

  return { render };
})();
