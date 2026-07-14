// ============================================================================
// Aktivite Sayfası — Tüm ofis akışı
// ============================================================================

Pages.Activity = {
  async render(root) {
    root.innerHTML = `
      <div class="page page-narrow">
        <div class="page-header">
          <div>
            <div class="page-title">Ofis Aktivitesi</div>
            <div class="page-subtitle">Ekipte olan her şey, canlı olarak</div>
          </div>
        </div>
        <div class="card card-pad" id="activity-list"><div class="skeleton" style="height:80px"></div></div>
      </div>
    `;
    renderIcons(root);

    const activity = await API.getActivityFeed(100);
    const container = qs('#activity-list');
    container.innerHTML = activity.length === 0
      ? emptyStateHtml({ icon: 'activity', title: 'Henüz aktivite yok' })
      : activity.map(activityItemHtml).join('');
    renderIcons(container);
  },
};
