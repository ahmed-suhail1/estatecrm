// ============================================================================
// Yönlendirici (Router) — hash tabanlı tek sayfa uygulama yönlendirmesi
// ============================================================================

const Router = {
  currentPath: null,

  routes: [
    { pattern: /^\/$/, page: () => Pages.Dashboard },
    { pattern: /^\/properties$/, page: () => Pages.PropertiesList },
    { pattern: /^\/properties\/new$/, page: () => Pages.PropertyForm },
    { pattern: /^\/properties\/([^/]+)\/edit$/, page: () => Pages.PropertyForm },
    { pattern: /^\/properties\/([^/]+)$/, page: () => Pages.PropertyDetail },
    { pattern: /^\/owners$/, page: () => Pages.OwnersList },
    { pattern: /^\/owners\/([^/]+)$/, page: () => Pages.OwnerDetail },
    { pattern: /^\/tasks$/, page: () => Pages.Tasks },
    { pattern: /^\/favorites$/, page: () => Pages.Favorites },
    { pattern: /^\/activity$/, page: () => Pages.Activity },
    { pattern: /^\/map$/, page: () => Pages.Map },
    { pattern: /^\/settings$/, page: () => Pages.Settings },
  ],

  init() {
    window.addEventListener('hashchange', () => this.handle());
    document.addEventListener('click', (e) => {
      const gotoEl = e.target.closest('[data-goto]');
      if (gotoEl && !e.target.closest('button, a, input, [data-fav-toggle]')) {
        navigate(gotoEl.dataset.goto);
      }
    });
    this.handle();
  },

  async handle() {
    if (!AgentIdentity.current) return; // App.js gates rendering until agent is set
    const { path, params } = getRoute();
    this.currentPath = path;
    Shell.updateActiveNav();

    const root = qs('#page-root');
    if (!root) return;

    const match = this.routes.find((r) => r.pattern.test(path));
    if (!match) {
      root.innerHTML = emptyStateHtml({ icon: 'compass', title: 'Sayfa bulunamadı', desc: 'Bu adres mevcut değil.' });
      return;
    }

    const idMatch = path.match(match.pattern);
    const id = idMatch && idMatch[1] ? idMatch[1] : null;

    root.innerHTML = `<div class="loading-page"><span class="spinner"></span></div>`;
    try {
      await match.page().render(root, { id, params, path });
    } catch (err) {
      console.error(err);
      root.innerHTML = emptyStateHtml({ icon: 'alert-triangle', title: 'Bir şeyler ters gitti', desc: err.message || 'Sayfa yüklenemedi.' });
      renderIcons(root);
    }
    window.scrollTo(0, 0);
  },

  rerenderIfPath(paths) {
    if (paths.some((p) => (p === '/' ? this.currentPath === '/' : this.currentPath?.startsWith(p)))) {
      this.handle();
    }
  },
};
