// ============================================================================
// Panel (Dashboard) sayfası
// ============================================================================

Pages.Dashboard = {
  async render(root) {
    const agent = AgentIdentity.current;

    root.innerHTML = `
      <div class="page">
        <div class="page-header">
          <div>
            <div class="page-title">Tekrar hoş geldin, ${escapeHtml(agent.name.split(' ')[0])}</div>
            <div class="page-subtitle">Ofiste neler oluyor, hemen bakalım.</div>
          </div>
          <a href="#/properties/new" class="btn btn-primary"><i data-lucide="plus" style="width:15px;height:15px"></i>Yeni İlan</a>
        </div>

        <div class="stats-grid" id="stats-grid">
          ${Array.from({ length: 5 }).map(() => `<div class="card stat-card"><div class="skeleton" style="width:40px;height:40px;border-radius:11px"></div><div style="flex:1"><div class="skeleton" style="height:18px;width:40px;margin-bottom:6px"></div><div class="skeleton" style="height:10px;width:70px"></div></div></div>`).join('')}
        </div>

        <div style="display:grid;grid-template-columns:2fr 1fr;gap:24px" id="dashboard-columns">
          <div style="display:flex;flex-direction:column;gap:24px;min-width:0">
            <div class="card card-pad">
              <div class="flex items-center justify-between mt-0" style="margin-bottom:14px">
                <h2 style="font-size:13px;font-weight:700;display:flex;align-items:center;gap:8px"><i data-lucide="check-square" style="width:15px;height:15px;color:var(--muted-fg)"></i>Bugün son tarihli görevlerin</h2>
                <a href="#/tasks" class="link-quiet" style="font-size:12px">Tümünü gör</a>
              </div>
              <div id="dash-tasks"><div class="skeleton" style="height:60px"></div></div>
            </div>
            <div class="card card-pad">
              <h2 style="font-size:13px;font-weight:700;display:flex;align-items:center;gap:8px;margin-bottom:14px"><i data-lucide="star" style="width:15px;height:15px;color:var(--muted-fg)"></i>Favori ilanlar</h2>
              <div id="dash-favorites"><div class="skeleton" style="height:60px"></div></div>
            </div>
            <div class="card card-pad">
              <h2 style="font-size:13px;font-weight:700;display:flex;align-items:center;gap:8px;margin-bottom:14px"><i data-lucide="clock" style="width:15px;height:15px;color:var(--muted-fg)"></i>Son görüntülenenler</h2>
              <div id="dash-recent"><div class="skeleton" style="height:60px"></div></div>
            </div>
          </div>
          <div>
            <div class="card card-pad">
              <h2 style="font-size:13px;font-weight:700;margin-bottom:14px">Ofis Aktivitesi</h2>
              <div id="dash-activity" class="scroll-thin" style="max-height:640px;overflow-y:auto"><div class="skeleton" style="height:60px"></div></div>
            </div>
          </div>
        </div>
      </div>
    `;
    renderIcons(root);

    if (window.innerWidth < 860) {
      qs('#dashboard-columns').style.gridTemplateColumns = '1fr';
    }

    const [stats, tasks, favIds, properties, recent, activity] = await Promise.all([
      API.getDashboardStats(),
      API.getTasks({ onlyMine: true }),
      Store.loadFavoriteIds(),
      Store.loadProperties(),
      API.getRecentlyViewed(5),
      API.getActivityFeed(20),
    ]);

    // Stats
    const statDefs = [
      { label: 'Toplam İlan', value: stats.totalListings, icon: 'building-2', color: '#6366f1' },
      { label: 'Bugün Eklenen', value: stats.newToday, icon: 'sparkles', color: '#8b5cf6' },
      { label: 'Satıldı', value: stats.sold, icon: 'circle-dollar-sign', color: '#10b981' },
      { label: 'Kiralık', value: stats.rentals, icon: 'key-round', color: '#06b6d4' },
      { label: 'Bugün Son Tarihli', value: stats.tasksDueToday, icon: 'check-square', color: '#f59e0b' },
    ];
    qs('#stats-grid').innerHTML = statDefs.map((s) => `
      <div class="card stat-card">
        <div class="icon-box" style="background:${s.color}18"><i data-lucide="${s.icon}" style="width:19px;height:19px;color:${s.color}"></i></div>
        <div><div class="value">${s.value}</div><div class="label">${s.label}</div></div>
      </div>
    `).join('');
    renderIcons(qs('#stats-grid'));

    // Tasks due today
    const end = new Date(); end.setHours(23, 59, 59, 999);
    const dueToday = tasks.filter((t) => !t.is_completed && t.due_date && new Date(t.due_date) <= end).slice(0, 5);
    const taskContainer = qs('#dash-tasks');
    taskContainer.innerHTML = dueToday.length === 0
      ? emptyStateHtml({ icon: 'check-square', title: 'Bugün için görev yok', desc: 'Her şey tamam görünüyor.' })
      : dueToday.map(taskRowHtml).join('');
    renderIcons(taskContainer);
    bindTaskToggles(taskContainer);

    // Favorites
    const favSet = new Set(favIds);
    const favProps = properties.filter((p) => favSet.has(p.id)).slice(0, 5);
    const favContainer = qs('#dash-favorites');
    favContainer.innerHTML = favProps.length === 0
      ? emptyStateHtml({ icon: 'star', title: 'Henüz favori yok', desc: 'İlanları yıldızlayarak burada listeleyebilirsin.' })
      : favProps.map(propertyRowHtml).join('');
    renderIcons(favContainer);

    // Recently viewed
    const recentContainer = qs('#dash-recent');
    recentContainer.innerHTML = recent.length === 0
      ? emptyStateHtml({ icon: 'clock', title: 'Henüz görüntülenen ilan yok' })
      : recent.map(propertyRowHtml).join('');
    renderIcons(recentContainer);

    // Activity
    const activityContainer = qs('#dash-activity');
    activityContainer.innerHTML = activity.length === 0
      ? emptyStateHtml({ icon: 'activity', title: 'Henüz aktivite yok' })
      : activity.map(activityItemHtml).join('');
    renderIcons(activityContainer);
  },
};

function bindTaskToggles(root) {
  qsa('[data-task-toggle]', root).forEach((input) => {
    input.addEventListener('change', async () => {
      const id = input.dataset.taskToggle;
      const completed = input.dataset.completed === '1';
      try {
        await API.toggleTaskComplete(id, completed);
        await Shell.refreshTaskCount();
        Router.handle();
      } catch (err) {
        Toast.error('Görev güncellenemedi');
      }
    });
  });
}
