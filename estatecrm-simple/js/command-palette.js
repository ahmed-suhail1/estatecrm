// ============================================================================
// Komut Paleti (⌘K) — Fuse.js ile bulanık arama
// ============================================================================

const CommandPalette = {
  isOpen: false,
  fuse: null,

  init() {
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.isOpen ? this.close() : this.open();
      }
      if (e.key === 'Escape' && this.isOpen) this.close();
    });
  },

  async open() {
    if (this.isOpen) return;
    this.isOpen = true;
    const properties = Store.properties || (await Store.loadProperties());

    this.fuse = new Fuse(properties, {
      keys: [
        { name: 'title', weight: 3 },
        { name: 'address', weight: 2 },
        { name: 'city', weight: 1.5 },
        { name: 'district', weight: 1.5 },
        { name: 'owner.name', weight: 1.5 },
        { name: 'owner.phone', weight: 2 },
        { name: 'assigned_agent.name', weight: 1 },
        { name: 'code', weight: 2 },
      ],
      threshold: 0.35,
      ignoreLocation: true,
    });

    const overlay = el(`
      <div class="cmdk-overlay" id="cmdk-overlay">
        <div class="cmdk-box">
          <div class="cmdk-input-row">
            <i data-lucide="search" style="width:16px;height:16px;color:var(--muted-fg)"></i>
            <input type="text" id="cmdk-input" placeholder="Başlık, adres, telefon, ID ile ara..." autocomplete="off" />
            <kbd style="font-size:10px;border:1px solid var(--border);background:var(--muted);border-radius:6px;padding:2px 6px">ESC</kbd>
          </div>
          <div class="cmdk-list" id="cmdk-list">
            <div class="cmdk-empty">Aramaya başlamak için yazın</div>
          </div>
        </div>
      </div>
    `);
    qs('#modal-root').appendChild(overlay);
    renderIcons(overlay);

    const input = qs('#cmdk-input', overlay);
    input.focus();

    input.addEventListener('input', debounce(() => this.search(input.value), 100));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this.close(); });
  },

  search(query) {
    const list = qs('#cmdk-list');
    if (!list) return;
    if (!query.trim()) {
      list.innerHTML = `<div class="cmdk-empty">Aramaya başlamak için yazın</div>`;
      return;
    }
    const results = this.fuse.search(query).slice(0, 8).map((r) => r.item);
    if (results.length === 0) {
      list.innerHTML = `<div class="cmdk-empty">"${escapeHtml(query)}" ile eşleşen ilan yok</div>`;
      return;
    }
    list.innerHTML = results.map((p) => {
      const meta = STATUS_META[p.status];
      return `
        <div class="cmdk-item" data-goto="/properties/${p.id}" data-cmdk-go>
          <div class="icon-box"><i data-lucide="building-2" style="width:16px;height:16px"></i></div>
          <div class="info">
            <div class="title-row">
              <span class="t">${escapeHtml(p.title)}</span>
              <span class="badge" style="color:${meta.color};background:${meta.bg};flex-shrink:0">${meta.label}</span>
            </div>
            <div class="meta">
              <span>#${p.code}</span>
              ${p.district ? `<span>${escapeHtml(p.district)}, ${escapeHtml(p.city || '')}</span>` : ''}
              ${p.owner?.phone ? `<span>${escapeHtml(p.owner.phone)}</span>` : ''}
            </div>
          </div>
          <span class="price">${formatCurrency(p.price, p.currency)}</span>
        </div>
      `;
    }).join('');
    renderIcons(list);
    qsa('[data-cmdk-go]', list).forEach((node) => {
      node.addEventListener('click', () => {
        navigate(node.dataset.goto);
        this.close();
      });
    });
  },

  close() {
    const overlay = qs('#cmdk-overlay');
    if (overlay) overlay.remove();
    this.isOpen = false;
  },
};
