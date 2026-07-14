// ============================================================================
// Harita Sayfası — MapLibre GL (ücretsiz, API anahtarı gerektirmez)
// ============================================================================

Pages.Map = {
  map: null,
  markers: [],

  async render(root) {
    root.innerHTML = `
      <div style="position:relative;height:calc(100vh - 64px)">
        <div id="map-container"></div>
        <div class="map-legend" id="map-legend"></div>
      </div>
    `;

    qs('#map-legend').innerHTML = Object.entries(STATUS_META).map(([k, m]) => `
      <div class="row"><span class="status-dot" style="background:${m.color}"></span>${m.label}</div>
    `).join('');

    const properties = await Store.loadProperties();
    const geoProps = properties.filter((p) => p.lat != null && p.lng != null);

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const styleUrl = isDark
      ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
      : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

    this.map = new maplibregl.Map({
      container: 'map-container',
      style: styleUrl,
      center: [28.9784, 41.0082],
      zoom: 11,
    });
    this.map.addControl(new maplibregl.NavigationControl(), 'top-right');

    this.map.on('load', () => {
      if (geoProps.length === 0) {
        const root2 = qs('#page-root');
        root2.insertAdjacentHTML('beforeend', `
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb, var(--bg) 80%, transparent);pointer-events:none">
            <div style="pointer-events:auto">${emptyStateHtml({ icon: 'map', title: 'Haritalanmış ilan yok', desc: 'Enlem/boylam eklediğiniz ilanlar burada görünecek.' })}</div>
          </div>
        `);
        renderIcons(root2);
        return;
      }

      const bounds = new maplibregl.LngLatBounds();
      geoProps.forEach((p) => {
        const meta = STATUS_META[p.status];
        const elMarker = document.createElement('button');
        elMarker.style.cssText = `width:14px;height:14px;border-radius:50%;background:${meta.color};border:2.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3);cursor:pointer`;

        const popup = new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(`
          <div style="font-family:system-ui;padding:2px">
            <div style="font-weight:600;font-size:13px;margin-bottom:2px">${escapeHtml(p.title)}</div>
            <div style="font-size:13px;color:#6366f1;font-weight:600">${formatCurrency(p.price, p.currency)}</div>
          </div>
        `);

        elMarker.addEventListener('click', () => navigate(`/properties/${p.id}`));
        const marker = new maplibregl.Marker({ element: elMarker }).setLngLat([p.lng, p.lat]).setPopup(popup).addTo(this.map);
        elMarker.addEventListener('mouseenter', () => marker.togglePopup());
        elMarker.addEventListener('mouseleave', () => marker.togglePopup());
        this.markers.push(marker);
        bounds.extend([p.lng, p.lat]);
      });
      this.map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 400 });
    });
  },
};
