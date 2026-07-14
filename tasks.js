// ============================================================================
// Görevler (Tasks) Sayfası
// ============================================================================

Pages.Tasks = {
  tab: 'active',

  async render(root) {
    root.innerHTML = `
      <div class="page page-narrow">
        <div class="page-header">
          <div>
            <div class="page-title">Görevler</div>
            <div class="page-subtitle">Takip aramaları ve hatırlatmalar</div>
          </div>
          <button class="btn btn-primary" id="new-task-btn"><i data-lucide="plus" style="width:15px;height:15px"></i>Yeni Görev</button>
        </div>

        <div class="tabs-list" style="margin-bottom:16px">
          <button class="tab-btn ${this.tab === 'active' ? 'active' : ''}" data-tab="active">Aktif</button>
          <button class="tab-btn ${this.tab === 'completed' ? 'active' : ''}" data-tab="completed">Tamamlanan</button>
        </div>

        <div class="card card-pad" id="tasks-list"></div>
      </div>
    `;
    renderIcons(root);

    qsa('[data-tab]', root).forEach((btn) => {
      btn.addEventListener('click', () => {
        this.tab = btn.dataset.tab;
        qsa('[data-tab]', root).forEach((b) => b.classList.toggle('active', b === btn));
        this.loadTasks();
      });
    });

    qs('#new-task-btn').addEventListener('click', () => this.openNewTaskModal());
    await this.loadTasks();
  },

  async loadTasks() {
    const container = qs('#tasks-list');
    container.innerHTML = `<div class="skeleton" style="height:60px"></div>`;
    const tasks = await API.getTasks();
    const filtered = this.tab === 'completed' ? tasks.filter((t) => t.is_completed) : tasks.filter((t) => !t.is_completed);
    container.innerHTML = filtered.length === 0
      ? emptyStateHtml({ icon: 'check-square', title: 'Burada görev yok', desc: 'Bir ilanı veya müşteri adayını takip etmek için görev oluştur.' })
      : filtered.map(taskRowHtml).join('');
    renderIcons(container);
    bindTaskToggles(container);
  },

  openNewTaskModal() {
    (async () => {
      const agents = await Store.loadAgents();
      const overlay = el(`
        <div class="overlay">
          <div class="modal" style="position:relative">
            <button class="modal-close"><i data-lucide="x" style="width:16px;height:16px"></i></button>
            <div class="modal-header"><div class="modal-title">Yeni Görev</div></div>
            <div class="field"><label>Başlık *</label><input class="input" id="t-title" placeholder="Mülk sahibiyle görüş..." /></div>
            <div class="field"><label>Açıklama</label><textarea class="input" id="t-desc" rows="3"></textarea></div>
            <div class="field-row grid-2">
              <div class="field"><label>Son tarih</label><input class="input" type="date" id="t-due" /></div>
              <div class="field"><label>Öncelik</label>
                <select class="select" id="t-priority">
                  ${Object.entries(PRIORITY_META).map(([k, v]) => `<option value="${k}" ${k === 'medium' ? 'selected' : ''}>${v.label}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="field"><label>Kime atansın</label>
              <select class="select" id="t-agent">
                <option value="">Temsilci seçin</option>
                ${agents.map((a) => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('')}
              </select>
            </div>
            <button class="btn btn-primary btn-block mt-2" id="t-save">Görev Oluştur</button>
          </div>
        </div>
      `);
      qs('#modal-root').appendChild(overlay);
      renderIcons(overlay);
      const close = () => overlay.remove();
      qs('.modal-close', overlay).addEventListener('click', close);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

      qs('#t-save', overlay).addEventListener('click', async () => {
        const title = qs('#t-title', overlay).value.trim();
        if (!title) return Toast.error('Başlık gerekli');
        try {
          const due = qs('#t-due', overlay).value;
          await API.createTask({
            title,
            description: qs('#t-desc', overlay).value.trim() || null,
            due_date: due ? new Date(due).toISOString() : null,
            priority: qs('#t-priority', overlay).value,
            assigned_agent_id: qs('#t-agent', overlay).value || null,
          });
          Toast.success('Görev oluşturuldu');
          await Shell.refreshTaskCount();
          close();
          Pages.Tasks.loadTasks();
        } catch { Toast.error('Görev oluşturulamadı'); }
      });
    })();
  },
};
