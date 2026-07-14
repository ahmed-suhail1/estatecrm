// ============================================================================
// Bildirimler
// ============================================================================

const Notifications = {
  isOpen: false,

  async refreshDot() {
    const agent = AgentIdentity.current;
    if (!agent) return;
    const notifs = await API.getNotifications(agent.id, 30);
    const unread = notifs.filter((n) => !n.is_read).length;
    const dot = qs('#notif-dot');
    if (dot) dot.classList.toggle('hidden', unread === 0);
  },

  async toggle() {
    this.isOpen ? this.close() : await this.openMenu();
  },

  async openMenu() {
    this.close();
    const agent = AgentIdentity.current;
    if (!agent) return;
    const trigger = qs('#notif-dropdown');
    const notifs = await API.getNotifications(agent.id, 30);

    const menu = el(`
      <div class="dropdown-menu align-end scroll-thin" style="top:44px;right:0;width:320px;padding:0;max-height:420px;overflow-y:auto">
        <div style="padding:12px 14px;border-bottom:1px solid var(--border);font-weight:700;font-size:13px">Bildirimler</div>
        <div id="notif-list"></div>
      </div>
    `);
    trigger.style.position = 'relative';
    trigger.appendChild(menu);

    const list = qs('#notif-list', menu);
    if (notifs.length === 0) {
      list.innerHTML = emptyStateHtml({ icon: 'bell', title: 'Henüz bildirim yok' });
    } else {
      list.innerHTML = notifs.map((n) => {
        const icon = NOTIF_ICONS[n.type] || 'bell';
        const href = n.entity_type === 'property' ? `#/properties/${n.entity_id}` : n.entity_type === 'task' ? '#/tasks' : '#';
        return `
          <a href="${href}" class="flex gap-3" style="padding:12px 14px;border-bottom:1px solid var(--border);${!n.is_read ? 'background:color-mix(in srgb, var(--primary) 5%, transparent)' : ''}">
            <div style="width:32px;height:32px;border-radius:999px;background:var(--muted);display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <i data-lucide="${icon}" style="width:15px;height:15px;color:var(--muted-fg)"></i>
            </div>
            <div style="min-width:0;flex:1">
              <p style="font-size:12.5px;font-weight:600;line-height:1.3">${escapeHtml(n.title)}</p>
              ${n.body ? `<p style="font-size:11.5px;color:var(--muted-fg);margin-top:2px">${escapeHtml(n.body)}</p>` : ''}
              <p style="font-size:10.5px;color:var(--muted-fg);margin-top:4px">${formatRelativeTime(n.created_at)}</p>
            </div>
          </a>
        `;
      }).join('');
    }
    renderIcons(menu);
    this.isOpen = true;

    if (notifs.some((n) => !n.is_read)) {
      await API.markAllNotificationsRead(agent.id);
      qs('#notif-dot')?.classList.add('hidden');
    }

    setTimeout(() => document.addEventListener('click', () => this.close(), { once: true }), 0);
  },

  close() {
    const trigger = qs('#notif-dropdown');
    if (trigger) qsa('.dropdown-menu', trigger).forEach((m) => m.remove());
    this.isOpen = false;
  },
};
