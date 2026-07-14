// ============================================================================
// Temsilci Seçim Ekranı — "Sen kimsin?"
// ============================================================================

const AgentPicker = {
  async open(forced = false) {
    const agents = await API.getAgents(true);
    const modalRoot = qs('#modal-root');

    const overlay = el(`
      <div class="overlay" id="agent-picker-overlay">
        <div class="modal" style="text-align:center;position:relative">
          ${!forced ? `<button class="modal-close" id="agent-picker-close"><i data-lucide="x" style="width:16px;height:16px"></i></button>` : ''}
          <div style="display:flex;flex-direction:column;align-items:center">
            <div style="width:48px;height:48px;border-radius:16px;background:color-mix(in srgb, var(--primary) 12%, transparent);display:flex;align-items:center;justify-content:center;margin-bottom:12px">
              <i data-lucide="building-2" style="width:22px;height:22px;color:var(--primary)"></i>
            </div>
            <h2 style="font-size:16px;font-weight:700">EstateCRM'i kim kullanıyor?</h2>
            <p class="text-muted mt-1" style="font-size:12.5px">Bu cihaz sizi hatırlayacak. İstediğiniz zaman profil menüsünden değiştirebilirsiniz.</p>
          </div>
          <div class="agent-picker-grid">
            ${agents.map((a) => `
              <button class="agent-picker-btn" data-agent-id="${a.id}">
                ${avatarHtml(a.name, a.avatar_color, a.avatar_url, 'xl')}
                <span class="name">${escapeHtml(a.name)}</span>
                ${a.role !== 'agent' ? `<span class="role">${a.role === 'manager' ? 'Müdür' : 'Yönetici'}</span>` : ''}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `);

    modalRoot.appendChild(overlay);
    renderIcons(overlay);

    qsa('[data-agent-id]', overlay).forEach((btn) => {
      btn.addEventListener('click', () => {
        const agent = agents.find((a) => a.id === btn.dataset.agentId);
        AgentIdentity.set(agent);
        Toast.success(`Tekrar hoş geldin, ${agent.name.split(' ')[0]}`);
        overlay.remove();
        App.onAgentReady();
      });
    });

    const closeBtn = qs('#agent-picker-close', overlay);
    if (closeBtn) closeBtn.addEventListener('click', () => overlay.remove());
    if (!forced) {
      overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    }
  },
};

// ============================================================================
// Profil Menüsü — Temsilci Değiştir, Tema
// ============================================================================

const ProfileMenu = {
  isOpen: false,

  toggle() {
    this.isOpen ? this.close() : this.openMenu();
  },

  openMenu() {
    this.close();
    const agent = AgentIdentity.current;
    if (!agent) return;
    const trigger = qs('#profile-dropdown');
    const menu = el(`
      <div class="dropdown-menu align-end" style="top:44px; right: 0;">
        <div class="dropdown-label" style="display:flex;align-items:center;gap:8px;padding:8px 10px">
          ${avatarHtml(agent.name, agent.avatar_color, agent.avatar_url, 'sm')}
          <div>
            <div style="color:var(--fg);font-size:12.5px;font-weight:600">${escapeHtml(agent.name)}</div>
            <div style="font-size:10.5px">${agent.role === 'manager' ? 'Müdür' : agent.role === 'admin' ? 'Yönetici' : 'Temsilci'}</div>
          </div>
        </div>
        <div class="dropdown-sep"></div>
        <button class="dropdown-item" id="switch-agent-btn"><i data-lucide="repeat" style="width:14px;height:14px"></i>Temsilci Değiştir</button>
        <div class="dropdown-sep"></div>
        <div class="dropdown-label">Görünüm</div>
        <button class="dropdown-item" data-theme-set="light"><i data-lucide="sun" style="width:14px;height:14px"></i>Açık ${Theme.current === 'light' ? '✓' : ''}</button>
        <button class="dropdown-item" data-theme-set="dark"><i data-lucide="moon" style="width:14px;height:14px"></i>Koyu ${Theme.current === 'dark' ? '✓' : ''}</button>
        <button class="dropdown-item" data-theme-set="system"><i data-lucide="monitor" style="width:14px;height:14px"></i>Sistem ${Theme.current === 'system' ? '✓' : ''}</button>
      </div>
    `);
    trigger.style.position = 'relative';
    trigger.appendChild(menu);
    renderIcons(menu);
    this.isOpen = true;

    qs('#switch-agent-btn', menu).addEventListener('click', () => {
      this.close();
      AgentPicker.open(false);
    });
    qsa('[data-theme-set]', menu).forEach((btn) => {
      btn.addEventListener('click', () => {
        Theme.set(btn.dataset.themeSet);
        this.close();
        this.openMenu();
      });
    });

    setTimeout(() => document.addEventListener('click', this._outsideHandler = () => this.close(), { once: true }), 0);
  },

  close() {
    const trigger = qs('#profile-dropdown');
    if (trigger) qsa('.dropdown-menu', trigger).forEach((m) => m.remove());
    this.isOpen = false;
  },
};
