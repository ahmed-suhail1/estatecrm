// ============================================================================
// Uygulama iskeleti — kenar çubuğu, üst bar, mobil menü
// ============================================================================

const NAV_ITEMS = [
  { path: '/', label: 'Panel', icon: 'layout-dashboard' },
  { path: '/properties', label: 'İlanlar', icon: 'building-2' },
  { path: '/map', label: 'Harita', icon: 'map' },
  { path: '/owners', label: 'Mülk Sahipleri', icon: 'users' },
  { path: '/tasks', label: 'Görevler', icon: 'check-square' },
  { path: '/favorites', label: 'Favoriler', icon: 'star' },
  { path: '/activity', label: 'Aktivite', icon: 'activity' },
];

const MOBILE_NAV_ITEMS = [
  { path: '/', label: 'Panel', icon: 'layout-dashboard' },
  { path: '/properties', label: 'İlanlar', icon: 'building-2' },
  { path: '/map', label: 'Harita', icon: 'map' },
  { path: '/tasks', label: 'Görevler', icon: 'check-square' },
  { path: '/settings', label: 'Diğer', icon: 'menu' },
];

const Shell = {
  taskCount: 0,

  async render() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <aside class="sidebar">
        <div class="sidebar-logo">
          <div class="mark">E</div>
          <span>EstateCRM</span>
        </div>
        <nav class="nav" id="sidebar-nav"></nav>
        <div class="sidebar-footer">
          <a href="#/settings" class="nav-item" id="settings-nav-item">
            <span class="nav-item-label"><i data-lucide="settings" class="icon"></i>Ayarlar</span>
          </a>
        </div>
      </aside>
      <div class="main">
        <header class="topbar">
          <button class="search-trigger" id="open-search">
            <i data-lucide="search" style="width:15px;height:15px"></i>
            <span>İlan, mülk sahibi, telefon ara...</span>
            <kbd>⌘K</kbd>
          </button>
          <div class="topbar-actions" id="topbar-actions"></div>
        </header>
        <main id="page-root"></main>
      </div>
      <nav class="mobile-nav" id="mobile-nav"></nav>
      <div id="modal-root"></div>
      <div id="toast-root"></div>
    `;

    this.renderSidebarNav();
    this.renderMobileNav();
    await this.renderTopbarActions();
    renderIcons();

    qs('#open-search').addEventListener('click', () => CommandPalette.open());
  },

  renderSidebarNav() {
    const nav = qs('#sidebar-nav');
    const { path } = getRoute();
    nav.innerHTML = NAV_ITEMS.map((item) => {
      const active = item.path === '/' ? path === '/' : path.startsWith(item.path);
      const badge = item.path === '/tasks' && this.taskCount > 0
        ? `<span class="nav-badge">${this.taskCount}</span>` : '';
      return `
        <a href="#${item.path}" class="nav-item ${active ? 'active' : ''}">
          <span class="nav-item-label"><i data-lucide="${item.icon}" class="icon"></i>${item.label}</span>
          ${badge}
        </a>
      `;
    }).join('');
    const settingsItem = qs('#settings-nav-item');
    if (settingsItem) settingsItem.classList.toggle('active', path === '/settings');
    renderIcons(nav);
  },

  renderMobileNav() {
    const nav = qs('#mobile-nav');
    const { path } = getRoute();
    nav.innerHTML = MOBILE_NAV_ITEMS.map((item) => {
      const active = item.path === '/' ? path === '/' : path.startsWith(item.path);
      return `
        <a href="#${item.path}" class="mobile-nav-item ${active ? 'active' : ''}">
          <i data-lucide="${item.icon}" style="width:19px;height:19px"></i>
          <span>${item.label}</span>
        </a>
      `;
    }).join('');
    renderIcons(nav);
  },

  async renderTopbarActions() {
    const container = qs('#topbar-actions');
    const agent = AgentIdentity.current;
    if (!agent) { container.innerHTML = ''; return; }

    container.innerHTML = `
      <div class="dropdown" id="notif-dropdown">
        <button class="icon-btn" id="notif-btn">
          <i data-lucide="bell" style="width:17px;height:17px"></i>
          <span class="dot hidden" id="notif-dot"></span>
        </button>
      </div>
      <div class="dropdown" id="profile-dropdown">
        <button id="profile-btn" style="border:none;background:none;padding:0;border-radius:999px">
          ${avatarHtml(agent.name, agent.avatar_color, agent.avatar_url, 'md')}
        </button>
      </div>
    `;
    renderIcons(container);

    qs('#notif-btn').addEventListener('click', (e) => { e.stopPropagation(); Notifications.toggle(); });
    qs('#profile-btn').addEventListener('click', (e) => { e.stopPropagation(); ProfileMenu.toggle(); });

    Notifications.refreshDot();
  },

  async refreshTaskCount() {
    this.taskCount = await API.countTasksDueToday();
    this.renderSidebarNav();
  },

  updateActiveNav() {
    this.renderSidebarNav();
    this.renderMobileNav();
  },
};
