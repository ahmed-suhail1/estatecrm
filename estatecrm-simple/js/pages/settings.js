// ============================================================================
// Ayarlar Sayfası
// ============================================================================

Pages.Settings = {
  async render(root) {
    const agent = AgentIdentity.current;
    const agents = await API.getAgents(false);

    root.innerHTML = `
      <div class="page page-narrow">
        <div class="page-header"><div><div class="page-title">Ayarlar</div><div class="page-subtitle">Çalışma alanını ve kimliğini yönet</div></div></div>

        <div class="card card-pad" style="margin-bottom:16px">
          <div class="section-title">Kimliğin</div>
          <div class="flex items-center gap-3">
            ${avatarHtml(agent.name, agent.avatar_color, agent.avatar_url, 'lg')}
            <div style="flex:1">
              <div style="font-weight:600;font-size:13px">${escapeHtml(agent.name)}</div>
              <div class="text-muted" style="font-size:11.5px">${agent.role === 'manager' ? 'Müdür' : agent.role === 'admin' ? 'Yönetici' : 'Temsilci'}</div>
            </div>
            <button class="btn btn-secondary btn-sm" id="switch-btn"><i data-lucide="repeat" style="width:13px;height:13px"></i>Değiştir</button>
          </div>
        </div>

        <div class="card card-pad" style="margin-bottom:16px">
          <div class="section-title">Görünüm</div>
          <div class="flex gap-2" id="theme-options">
            <button class="btn btn-secondary" data-theme-opt="light" style="flex:1;flex-direction:column;height:auto;padding:12px"><i data-lucide="sun" style="width:16px;height:16px"></i><span style="font-size:11px;margin-top:4px">Açık</span></button>
            <button class="btn btn-secondary" data-theme-opt="dark" style="flex:1;flex-direction:column;height:auto;padding:12px"><i data-lucide="moon" style="width:16px;height:16px"></i><span style="font-size:11px;margin-top:4px">Koyu</span></button>
            <button class="btn btn-secondary" data-theme-opt="system" style="flex:1;flex-direction:column;height:auto;padding:12px"><i data-lucide="monitor" style="width:16px;height:16px"></i><span style="font-size:11px;margin-top:4px">Sistem</span></button>
          </div>
        </div>

        <div class="card card-pad">
          <div class="section-title">Ofis Kadrosu</div>
          <div id="roster-list" style="margin-bottom:14px">
            ${agents.map((a) => `
              <div class="flex items-center gap-3" style="padding:8px 0">
                ${avatarHtml(a.name, a.avatar_color, a.avatar_url, 'sm')}
                <span style="flex:1;font-size:13px;font-weight:600">${escapeHtml(a.name)}</span>
                <span class="text-muted" style="font-size:11px">${a.role === 'manager' ? 'Müdür' : a.role === 'admin' ? 'Yönetici' : 'Temsilci'}</span>
                <label style="display:flex;align-items:center;gap:6px;font-size:11px">
                  <input type="checkbox" data-agent-active="${a.id}" ${a.is_active ? 'checked' : ''} data-current="${a.is_active ? '1' : '0'}" />
                </label>
              </div>
            `).join('')}
          </div>
          <div class="flex gap-2" style="padding-top:12px;border-top:1px solid var(--border)">
            <input class="input" id="new-agent-name" placeholder="Yeni temsilci adı" />
            <button class="btn btn-primary" id="add-agent-btn"><i data-lucide="plus" style="width:14px;height:14px"></i>Ekle</button>
          </div>
        </div>
      </div>
    `;
    renderIcons(root);

    qs('#switch-btn').addEventListener('click', () => AgentPicker.open(false));

    qsa('[data-theme-opt]', root).forEach((btn) => {
      if (btn.dataset.themeOpt === Theme.current) {
        btn.style.borderColor = 'var(--primary)';
        btn.style.color = 'var(--primary)';
      }
      btn.addEventListener('click', () => { Theme.set(btn.dataset.themeOpt); this.render(root); });
    });

    qsa('[data-agent-active]', root).forEach((cb) => {
      cb.addEventListener('change', async () => {
        try {
          await API.setAgentActive(cb.dataset.agentActive, cb.checked);
          Store.agents = null;
          Toast.success('Güncellendi');
        } catch { Toast.error('Güncellenemedi'); cb.checked = cb.dataset.current === '1'; }
      });
    });

    qs('#add-agent-btn').addEventListener('click', async () => {
      const input = qs('#new-agent-name');
      const name = input.value.trim();
      if (!name) return;
      try {
        await API.addAgent(name);
        Store.agents = null;
        Toast.success('Temsilci eklendi');
        input.value = '';
        this.render(root);
      } catch { Toast.error('Eklenemedi'); }
    });
  },
};
