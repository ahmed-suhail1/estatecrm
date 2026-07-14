// ============================================================================
// Favoriler Sayfası
// ============================================================================

Pages.Favorites = {
  async render(root) {
    root.innerHTML = `
      <div class="page">
        <div class="page-header">
          <div>
            <div class="page-title flex items-center gap-2"><i data-lucide="star" style="width:19px;height:19px;color:#f59e0b;fill:#f59e0b"></i>Favoriler</div>
            <div class="page-subtitle">Yıldızladığın ilanlar</div>
          </div>
        </div>
        <div id="fav-grid" class="grid-properties">${Array.from({ length: 4 }).map(skeletonCardHtml).join('')}</div>
      </div>
    `;
    renderIcons(root);

    const [properties, favIds] = await Promise.all([Store.loadProperties(), Store.loadFavoriteIds()]);
    const favSet = new Set(favIds);
    const favorites = properties.filter((p) => favSet.has(p.id));

    const grid = qs('#fav-grid');
    grid.innerHTML = favorites.length === 0
      ? emptyStateHtml({ icon: 'star', title: 'Henüz favori yok', desc: 'Herhangi bir ilandan yıldızlayarak buraya kaydedebilirsin.' })
      : favorites.map((p) => propertyCardHtml(p, true)).join('');
    renderIcons(grid);

    grid.addEventListener('click', async (e) => {
      const favBtn = e.target.closest('[data-fav-toggle]');
      if (!favBtn) return;
      e.stopPropagation();
      try {
        await API.toggleFavorite(favBtn.dataset.favToggle, true);
        Store.invalidateFavorites();
        this.render(root);
      } catch { Toast.error('Favori güncellenemedi'); }
    });
  },
};
