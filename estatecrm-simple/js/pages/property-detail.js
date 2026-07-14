// ============================================================================
// İlan Detay Sayfası
// ============================================================================

Pages.PropertyDetail = {
  propertyId: null,
  activeTab: 'notes',
  galleryIndex: 0,

  async render(root, { id }) {
    this.propertyId = id;
    this.activeTab = 'notes';
    this.galleryIndex = 0;

    root.innerHTML = `<div class="loading-page"><span class="spinner"></span></div>`;

    const property = await API.getProperty(id);
    API.recordView(id);
    const favIds = await Store.loadFavoriteIds();
    const isFav = favIds.includes(id);

    const meta = STATUS_META[property.status];
    const loc = [property.address, property.district, property.city].filter(Boolean).join(', ');

    root.innerHTML = `
      <div class="page page-medium">
        <div class="flex items-center justify-between" style="margin-bottom:16px">
          <button class="btn btn-ghost btn-sm" id="back-btn"><i data-lucide="arrow-left" style="width:14px;height:14px"></i>Geri</button>
          <div class="flex gap-2">
            <button class="btn btn-secondary btn-icon" id="fav-btn"><i data-lucide="star" style="width:16px;height:16px;${isFav ? 'color:#f59e0b;fill:#f59e0b' : ''}"></i></button>
            <a href="#/properties/${id}/edit" class="btn btn-secondary"><i data-lucide="pencil" style="width:14px;height:14px"></i>Düzenle</a>
          </div>
        </div>

        <div id="gallery-container"></div>

        <div style="display:grid;grid-template-columns:2fr 1fr;gap:24px;margin-top:24px" id="detail-columns">
          <div style="min-width:0">
            <div class="flex items-start justify-between gap-3" style="flex-wrap:wrap">
              <div>
                <div class="flex items-center gap-2" style="flex-wrap:wrap">
                  <h1 style="font-size:22px;font-weight:700">${escapeHtml(property.title)}</h1>
                  <span class="text-muted" style="font-size:13px">#${property.code}</span>
                </div>
                ${loc ? `<p class="text-muted flex items-center gap-1 mt-1" style="font-size:13px"><i data-lucide="map-pin" style="width:13px;height:13px"></i>${escapeHtml(loc)}</p>` : ''}
              </div>
              <div class="dropdown" id="status-dropdown">
                <button class="btn btn-sm" id="status-trigger" style="border-radius:999px;color:${meta.color};background:${meta.bg}">
                  <span class="status-dot" style="background:${meta.color}"></span>${meta.label}<i data-lucide="chevron-down" style="width:13px;height:13px"></i>
                </button>
              </div>
            </div>

            <div class="flex items-center gap-2 mt-3" style="flex-wrap:wrap">
              <span style="font-size:26px;font-weight:800">${formatCurrency(property.price, property.currency)}</span>
              ${property.listing_type === 'rent' ? '<span class="text-muted">/ay</span>' : ''}
              <span class="badge badge-outline">${LISTING_TYPE_LABELS[property.listing_type]}</span>
              <span class="badge badge-outline">${PROPERTY_TYPE_LABELS[property.property_type]}</span>
            </div>

            ${property.tags.length ? `<div class="property-tags mt-2">${property.tags.map(tagBadgeHtml).join('')}</div>` : ''}

            <div class="card card-pad mt-3">
              <div class="grid-5" style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px">
                ${specItem('bed', property.bedrooms ?? '—', 'Yatak Odası')}
                ${specItem('bath', property.bathrooms ?? '—', 'Banyo')}
                ${specItem('ruler', formatArea(property.area_sqm), 'Alan')}
                ${specItem('building', property.floor ?? '—', 'Kat')}
                ${specItem('calendar', property.building_age != null ? `${property.building_age} yıl` : '—', 'Bina Yaşı')}
              </div>
            </div>

            ${property.description ? `
              <div class="mt-3">
                <div class="section-title">Açıklama</div>
                <p style="font-size:13.5px;line-height:1.6;white-space:pre-wrap;color:var(--fg)">${escapeHtml(property.description)}</p>
              </div>` : ''}

            ${property.lat && property.lng ? `
              <div class="mt-3">
                <div class="section-title">Konum</div>
                <a href="https://www.google.com/maps?q=${property.lat},${property.lng}" target="_blank" rel="noreferrer" class="card" style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;font-size:13px">
                  <span class="flex items-center gap-2"><i data-lucide="map-pin" style="width:15px;height:15px;color:var(--muted-fg)"></i>Google Haritalar'da Aç</span>
                  <i data-lucide="external-link" style="width:14px;height:14px;color:var(--muted-fg)"></i>
                </a>
              </div>` : ''}

            <div class="mt-3">
              <div class="tabs-list">
                <button class="tab-btn ${this.activeTab === 'notes' ? 'active' : ''}" data-tab="notes">Notlar</button>
                <button class="tab-btn ${this.activeTab === 'timeline' ? 'active' : ''}" data-tab="timeline">Zaman Çizelgesi</button>
                <button class="tab-btn ${this.activeTab === 'history' ? 'active' : ''}" data-tab="history">Sürüm Geçmişi</button>
              </div>
              <div class="tab-panel" id="tab-panel"></div>
            </div>
          </div>

          <div style="display:flex;flex-direction:column;gap:14px">
            ${property.assigned_agent ? `
              <div class="card card-pad">
                <div class="section-title">Sorumlu Temsilci</div>
                <div class="flex items-center gap-3">
                  ${avatarHtml(property.assigned_agent.name, property.assigned_agent.avatar_color, property.assigned_agent.avatar_url, 'lg')}
                  <div>
                    <div style="font-weight:600;font-size:13px">${escapeHtml(property.assigned_agent.name)}</div>
                    <div class="text-muted" style="font-size:11.5px">${property.assigned_agent.role === 'manager' ? 'Müdür' : 'Temsilci'}</div>
                  </div>
                </div>
              </div>` : ''}

            ${property.owner ? `
              <div class="card card-pad">
                <div class="section-title">Mülk Sahibi</div>
                <div style="font-weight:600;font-size:13px">${escapeHtml(property.owner.name)}</div>
                ${property.owner.phone ? `<div class="text-muted mt-1" style="font-size:12px">${escapeHtml(property.owner.phone)}</div>` : ''}
                <div class="flex gap-2 mt-2">
                  ${property.owner.phone ? `<a href="${phoneToCall(property.owner.phone)}" class="btn btn-secondary btn-sm" style="flex:1;justify-content:center"><i data-lucide="phone" style="width:13px;height:13px"></i>Ara</a>` : ''}
                  ${(property.owner.whatsapp || property.owner.phone) ? `<a href="${phoneToWhatsApp(property.owner.whatsapp || property.owner.phone)}" target="_blank" class="btn btn-secondary btn-sm" style="flex:1;justify-content:center"><i data-lucide="message-circle" style="width:13px;height:13px"></i>WhatsApp</a>` : ''}
                </div>
                <a href="#/owners/${property.owner.id}" class="btn btn-ghost btn-sm btn-block mt-2">Mülk sahibi profilini gör</a>
              </div>` : ''}

            <div class="card card-pad">
              <div class="section-title">Detaylar</div>
              <div class="flex justify-between mt-1" style="font-size:12.5px"><span class="text-muted">Oluşturulma</span><span>${formatDate(property.created_at)}</span></div>
              <div class="flex justify-between mt-1" style="font-size:12.5px"><span class="text-muted">Son güncelleme</span><span>${formatDate(property.updated_at)}</span></div>
            </div>
          </div>
        </div>
      </div>
    `;

    if (window.innerWidth < 860) qs('#detail-columns').style.gridTemplateColumns = '1fr';
    renderIcons(root);

    this.renderGallery(property);
    this.renderTab(property);

    qs('#back-btn').addEventListener('click', () => window.history.back());
    qs('#fav-btn').addEventListener('click', async () => {
      try {
        await API.toggleFavorite(id, isFav);
        Store.invalidateFavorites();
        this.render(root, { id });
      } catch { Toast.error('Favori güncellenemedi'); }
    });
    qs('#status-trigger').addEventListener('click', (e) => { e.stopPropagation(); this.openStatusMenu(property); });
    qsa('[data-tab]', root).forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.dataset.tab;
        qsa('[data-tab]', root).forEach((b) => b.classList.toggle('active', b === btn));
        this.renderTab(property);
      });
    });
  },

  renderGallery(property) {
    const container = qs('#gallery-container');
    const images = property.images || [];
    if (images.length === 0) {
      container.innerHTML = `
        <div class="upload-empty">
          <i data-lucide="image-plus" style="width:28px;height:28px"></i>
          <p style="font-size:12.5px">Henüz fotoğraf yok</p>
          <button class="btn btn-secondary btn-sm" id="upload-trigger">Fotoğraf Yükle</button>
          <input type="file" id="upload-input" accept="image/*" multiple class="hidden" />
        </div>
      `;
    } else {
      const idx = Math.min(this.galleryIndex, images.length - 1);
      container.innerHTML = `
        <div class="gallery-main">
          <img src="${escapeHtml(images[idx].url)}" alt="" />
          ${images.length > 1 ? `
            <button class="gallery-nav prev" id="gal-prev"><i data-lucide="chevron-left" style="width:18px;height:18px"></i></button>
            <button class="gallery-nav next" id="gal-next"><i data-lucide="chevron-right" style="width:18px;height:18px"></i></button>
          ` : ''}
          <button class="gallery-del" id="gal-del"><i data-lucide="x" style="width:15px;height:15px"></i></button>
          <span class="gallery-count">${idx + 1} / ${images.length}</span>
        </div>
        <div class="gallery-thumbs">
          ${images.map((img, i) => `<button class="thumb-btn ${i === idx ? 'active' : ''}" data-thumb="${i}"><img src="${escapeHtml(img.url)}" alt=""/></button>`).join('')}
          <button class="thumb-btn thumb-upload" id="upload-trigger"><i data-lucide="plus" style="width:16px;height:16px"></i></button>
          <input type="file" id="upload-input" accept="image/*" multiple class="hidden" />
        </div>
      `;
    }
    renderIcons(container);

    qs('#upload-trigger', container)?.addEventListener('click', () => qs('#upload-input', container).click());
    qs('#upload-input', container)?.addEventListener('change', async (e) => {
      const files = e.target.files;
      if (!files.length) return;
      try {
        await Promise.all(Array.from(files).map((f, i) => API.uploadImage(this.propertyId, f, images.length + i)));
        Toast.success('Fotoğraflar yüklendi');
        Store.invalidateProperties();
        this.render(qs('#page-root'), { id: this.propertyId });
      } catch { Toast.error('Yükleme başarısız'); }
    });
    qs('#gal-prev', container)?.addEventListener('click', () => { this.galleryIndex = (this.galleryIndex - 1 + images.length) % images.length; this.renderGallery(property); });
    qs('#gal-next', container)?.addEventListener('click', () => { this.galleryIndex = (this.galleryIndex + 1) % images.length; this.renderGallery(property); });
    qs('#gal-del', container)?.addEventListener('click', async () => {
      const img = images[Math.min(this.galleryIndex, images.length - 1)];
      try {
        await API.deleteImage(img.id, img.storage_path);
        Store.invalidateProperties();
        this.galleryIndex = 0;
        this.render(qs('#page-root'), { id: this.propertyId });
      } catch { Toast.error('Silinemedi'); }
    });
    qsa('[data-thumb]', container).forEach((btn) => {
      btn.addEventListener('click', () => { this.galleryIndex = Number(btn.dataset.thumb); this.renderGallery(property); });
    });
  },

  async renderTab(property) {
    const panel = qs('#tab-panel');
    if (this.activeTab === 'notes') {
      panel.innerHTML = `<div class="skeleton" style="height:80px"></div>`;
      await NotesPanel.render(panel, property.id);
    } else if (this.activeTab === 'timeline') {
      panel.innerHTML = `<div class="skeleton" style="height:80px"></div>`;
      const events = await API.getPropertyEvents(property.id);
      panel.innerHTML = events.length === 0
        ? emptyStateHtml({ icon: 'history', title: 'Henüz aktivite yok' })
        : `<div class="timeline">${events.map(timelineItemHtml).join('')}</div>`;
      renderIcons(panel);
    } else if (this.activeTab === 'history') {
      panel.innerHTML = `<div class="skeleton" style="height:80px"></div>`;
      await VersionHistoryPanel.render(panel, property.id);
    }
  },

  openStatusMenu(property) {
    const trigger = qs('#status-dropdown');
    qsa('.dropdown-menu', trigger).forEach((m) => m.remove());
    const menu = el(`
      <div class="dropdown-menu" style="top:38px;left:0">
        ${Object.entries(STATUS_META).map(([key, m]) => `
          <button class="dropdown-item" data-status="${key}"><span class="status-dot" style="background:${m.color}"></span>${m.label}</button>
        `).join('')}
      </div>
    `);
    trigger.style.position = 'relative';
    trigger.appendChild(menu);
    qsa('[data-status]', menu).forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await API.changeStatus(property.id, btn.dataset.status);
          Toast.success('Durum güncellendi');
          Store.invalidateProperties();
          this.render(qs('#page-root'), { id: property.id });
        } catch { Toast.error('Durum güncellenemedi'); }
      });
    });
    setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 0);
  },
};

function specItem(icon, value, label) {
  return `
    <div style="display:flex;flex-direction:column;gap:4px">
      <i data-lucide="${icon}" style="width:15px;height:15px;color:var(--muted-fg)"></i>
      <span style="font-size:13.5px;font-weight:700">${value}</span>
      <span style="font-size:10.5px;color:var(--muted-fg)">${label}</span>
    </div>
  `;
}
