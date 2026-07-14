// ============================================================================
// İlanlar (Properties) Listesi
// ============================================================================

Pages.PropertiesList = {
  filters: { query: '', listingType: 'all', propertyType: 'all', status: 'all', agentId: 'all', sort: 'newest', tagIds: [] },
  fuse: null,

  async render(root) {
    root.innerHTML = `
      <div class="page">
        <div class="page-header">
          <div>
            <div class="page-title">İlanlar</div>
            <div class="page-subtitle" id="properties-count">Yükleniyor…</div>
          </div>
          <a href="#/properties/new" class="btn btn-primary"><i data-lucide="plus" style="width:15px;height:15px"></i>Yeni İlan</a>
        </div>

        <div class="field" style="position:relative;margin-bottom:12px">
          <i data-lucide="search" style="width:15px;height:15px;position:absolute;top:11px;left:12px;color:var(--muted-fg)"></i>
          <input type="text" id="prop-search" class="input" style="padding-inline-start:34px" placeholder="Başlık, adres, telefon, ID, fiyat ile ara..." />
        </div>

        <div class="filters-bar mt-2" id="filters-bar" style="margin-bottom:20px"></div>

        <div id="properties-grid" class="grid-properties">
          ${Array.from({ length: 8 }).map(skeletonCardHtml).join('')}
        </div>
      </div>
    `;
    renderIcons(root);

    const [properties, agents, tags, favIds] = await Promise.all([
      Store.loadProperties(),
      Store.loadAgents(),
      Store.loadTags(),
      Store.loadFavoriteIds(),
    ]);

    this.fuse = new Fuse(properties, {
      keys: [
        { name: 'title', weight: 3 }, { name: 'address', weight: 2 }, { name: 'city', weight: 1.5 },
        { name: 'district', weight: 1.5 }, { name: 'owner.name', weight: 1.5 }, { name: 'owner.phone', weight: 2 },
        { name: 'assigned_agent.name', weight: 1 }, { name: 'code', weight: 2 }, { name: 'description', weight: 0.5 },
        { name: 'tags.label', weight: 1 },
      ],
      threshold: 0.32, ignoreLocation: true, minMatchCharLength: 2,
    });

    this.renderFiltersBar(agents, tags);
    this.applyFilters(properties, favIds);

    qs('#prop-search').addEventListener('input', debounce((e) => {
      this.filters.query = e.target.value;
      this.applyFilters(Store.properties, Store.favoriteIds);
    }, 150));

    qs('#properties-grid').addEventListener('click', (e) => {
      const favBtn = e.target.closest('[data-fav-toggle]');
      if (favBtn) {
        e.stopPropagation();
        this.handleFavToggle(favBtn);
      }
    });
  },

  renderFiltersBar(agents, tags) {
    const bar = qs('#filters-bar');
    bar.innerHTML = `
      <select class="select select-sm" id="f-listing">
        <option value="all">Satılık/Kiralık</option>
        <option value="sale">Satılık</option>
        <option value="rent">Kiralık</option>
      </select>
      <select class="select select-sm" id="f-type">
        <option value="all">Tüm Türler</option>
        ${Object.entries(PROPERTY_TYPE_LABELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
      </select>
      <select class="select select-sm" id="f-status">
        <option value="all">Tüm Durumlar</option>
        ${Object.entries(STATUS_META).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}
      </select>
      <select class="select select-sm" id="f-agent">
        <option value="all">Tüm Temsilciler</option>
        ${agents.map((a) => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('')}
      </select>
      <select class="select select-sm" id="f-sort">
        <option value="newest">En Yeni</option>
        <option value="oldest">En Eski</option>
        <option value="price_asc">Fiyat ↑</option>
        <option value="price_desc">Fiyat ↓</option>
      </select>
    `;
    ['listing', 'type', 'status', 'agent', 'sort'].forEach((key) => {
      qs(`#f-${key}`, bar).addEventListener('change', (e) => {
        const map = { listing: 'listingType', type: 'propertyType', status: 'status', agent: 'agentId', sort: 'sort' };
        this.filters[map[key]] = e.target.value;
        this.applyFilters(Store.properties, Store.favoriteIds);
      });
    });
  },

  applyFilters(properties, favIds) {
    const f = this.filters;
    let base = properties;

    if (f.query.trim()) {
      const q = f.query.trim();
      const asNum = Number(q.replace(/[^0-9.]/g, ''));
      const exact = !isNaN(asNum) && q.replace(/[^0-9.]/g, '') ? base.filter((p) => p.code === asNum || p.price === asNum) : [];
      const fuzzy = this.fuse.search(q).map((r) => r.item);
      const seen = new Set();
      base = [...exact, ...fuzzy].filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
    }

    base = base.filter((p) => {
      if (f.listingType !== 'all' && p.listing_type !== f.listingType) return false;
      if (f.propertyType !== 'all' && p.property_type !== f.propertyType) return false;
      if (f.status !== 'all' && p.status !== f.status) return false;
      if (f.agentId !== 'all' && p.assigned_agent_id !== f.agentId) return false;
      return true;
    });

    if (!f.query.trim()) {
      const sorters = {
        newest: (a, b) => b.created_at.localeCompare(a.created_at),
        oldest: (a, b) => a.created_at.localeCompare(b.created_at),
        price_asc: (a, b) => a.price - b.price,
        price_desc: (a, b) => b.price - a.price,
      };
      base = [...base].sort(sorters[f.sort]);
    }

    const favSet = new Set(favIds || []);
    qs('#properties-count').textContent = `${base.length} / ${properties.length} ilan`;
    const grid = qs('#properties-grid');
    grid.innerHTML = base.length === 0
      ? emptyStateHtml({ icon: 'building-2', title: 'İlan bulunamadı', desc: 'Arama veya filtreleri değiştirmeyi deneyin.' })
      : base.map((p) => propertyCardHtml(p, favSet.has(p.id))).join('');
    renderIcons(grid);
  },

  async handleFavToggle(btn) {
    const propertyId = btn.dataset.favToggle;
    const isFav = btn.dataset.favState === '1';
    try {
      await API.toggleFavorite(propertyId, isFav);
      Store.invalidateFavorites();
      const favIds = await Store.loadFavoriteIds(true);
      this.applyFilters(Store.properties, favIds);
    } catch {
      Toast.error('Favori güncellenemedi');
    }
  },
};
