// ============================================================================
// Mülk Sahipleri — Liste
// ============================================================================

Pages.OwnersList = {
  async render(root) {
    root.innerHTML = `
      <div class="page page-medium">
        <div class="page-header">
          <div>
            <div class="page-title">Mülk Sahipleri</div>
            <div class="page-subtitle" id="owners-count">Yükleniyor…</div>
          </div>
          <button class="btn btn-primary" id="new-owner-btn"><i data-lucide="plus" style="width:15px;height:15px"></i>Yeni Mülk Sahibi</button>
        </div>
        <div class="field" style="position:relative;margin-bottom:16px">
          <i data-lucide="search" style="width:15px;height:15px;position:absolute;top:11px;left:12px;color:var(--muted-fg)"></i>
          <input type="text" id="owner-search" class="input" style="padding-inline-start:34px" placeholder="Ad, telefon, e-posta ile ara..." />
        </div>
        <div id="owners-list" style="display:flex;flex-direction:column;gap:8px"></div>
      </div>
    `;
    renderIcons(root);

    const load = async (q) => {
      const owners = await API.getOwners(q);
      qs('#owners-count').textContent = `${owners.length} mülk sahibi`;
      const list = qs('#owners-list');
      list.innerHTML = owners.length === 0
        ? emptyStateHtml({ icon: 'users', title: 'Mülk sahibi bulunamadı', desc: 'İlk mülk sahibini ekleyerek başlayın.' })
        : owners.map((o) => `
          <div class="card card-pad flex items-center gap-3">
            <div class="avatar avatar-lg" style="background:var(--primary);opacity:.15;color:var(--primary)">${initials(o.name)}</div>
            <a href="#/owners/${o.id}" style="min-width:0;flex:1">
              <div style="font-weight:600;font-size:13px">${escapeHtml(o.name)}</div>
              <div class="text-muted" style="font-size:12px">${[o.phone, o.email].filter(Boolean).map(escapeHtml).join(' · ') || 'İletişim bilgisi yok'}</div>
            </a>
            <div class="flex gap-1">
              ${o.phone ? `<a href="${phoneToCall(o.phone)}" class="btn btn-secondary btn-icon-sm"><i data-lucide="phone" style="width:13px;height:13px"></i></a>` : ''}
              ${(o.whatsapp || o.phone) ? `<a href="${phoneToWhatsApp(o.whatsapp || o.phone)}" target="_blank" class="btn btn-secondary btn-icon-sm"><i data-lucide="message-circle" style="width:13px;height:13px"></i></a>` : ''}
            </div>
          </div>
        `).join('');
      renderIcons(list);
    };

    await load('');
    qs('#owner-search').addEventListener('input', debounce((e) => load(e.target.value), 250));
    qs('#new-owner-btn').addEventListener('click', () => this.openNewOwnerModal(load));
  },

  openNewOwnerModal(onSaved) {
    const overlay = el(`
      <div class="overlay">
        <div class="modal" style="position:relative">
          <button class="modal-close"><i data-lucide="x" style="width:16px;height:16px"></i></button>
          <div class="modal-header"><div class="modal-title">Yeni Mülk Sahibi</div></div>
          <div class="field"><label>Ad Soyad *</label><input class="input" id="m-name" placeholder="Ad Soyad" /></div>
          <div class="field-row grid-2">
            <div class="field"><label>Telefon</label><input class="input" id="m-phone" placeholder="05xx xxx xx xx" /></div>
            <div class="field"><label>WhatsApp</label><input class="input" id="m-whatsapp" placeholder="Boşsa telefon kullanılır" /></div>
          </div>
          <div class="field"><label>E-posta</label><input class="input" type="email" id="m-email" /></div>
          <div class="field"><label>Notlar</label><textarea class="input" id="m-notes" rows="3"></textarea></div>
          <div id="m-dup-warning"></div>
          <button class="btn btn-primary btn-block mt-2" id="m-save">Mülk Sahibi Ekle</button>
        </div>
      </div>
    `);
    qs('#modal-root').appendChild(overlay);
    renderIcons(overlay);

    const close = () => overlay.remove();
    qs('.modal-close', overlay).addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    const nameInput = qs('#m-name', overlay);
    const phoneInput = qs('#m-phone', overlay);
    const checkDup = debounce(async () => {
      const name = nameInput.value.trim();
      const phone = phoneInput.value.trim();
      if (name.length < 3 && phone.length < 4) { qs('#m-dup-warning', overlay).innerHTML = ''; return; }
      const similar = await API.findSimilarOwners(phone, name);
      qs('#m-dup-warning', overlay).innerHTML = similar.length
        ? `<div class="dup-warning"><strong>Olası eşleşme</strong>${similar.map((o) => `<div>${escapeHtml(o.name)}${o.phone ? ' · ' + escapeHtml(o.phone) : ''}</div>`).join('')}</div>`
        : '';
    }, 450);
    nameInput.addEventListener('input', checkDup);
    phoneInput.addEventListener('input', checkDup);

    qs('#m-save', overlay).addEventListener('click', async () => {
      const name = nameInput.value.trim();
      if (!name) return Toast.error('Ad gerekli');
      try {
        const owner = await API.createOwner({
          name,
          phone: phoneInput.value.trim() || null,
          whatsapp: qs('#m-whatsapp', overlay).value.trim() || null,
          email: qs('#m-email', overlay).value.trim() || null,
          notes: qs('#m-notes', overlay).value.trim() || null,
        });
        Toast.success('Mülk sahibi eklendi');
        close();
        navigate(`/owners/${owner.id}`);
      } catch { Toast.error('Eklenemedi'); }
    });
  },
};

// ============================================================================
// Mülk Sahibi — Detay
// ============================================================================

Pages.OwnerDetail = {
  async render(root, { id }) {
    root.innerHTML = `<div class="loading-page"><span class="spinner"></span></div>`;
    const [owner, properties] = await Promise.all([API.getOwner(id), API.getOwnerProperties(id)]);

    root.innerHTML = `
      <div class="page page-narrow">
        <button class="btn btn-ghost btn-sm" id="back-btn" style="margin-bottom:14px"><i data-lucide="arrow-left" style="width:14px;height:14px"></i>Geri</button>

        <div class="card card-pad" style="margin-bottom:16px">
          <div class="flex items-start gap-4">
            <div class="avatar avatar-xl" style="background:var(--primary);opacity:.15;color:var(--primary)">${initials(owner.name)}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:19px;font-weight:700">${escapeHtml(owner.name)}</div>
              <div class="flex gap-3 mt-1 text-muted" style="font-size:12.5px;flex-wrap:wrap">
                ${owner.phone ? `<span>${escapeHtml(owner.phone)}</span>` : ''}
                ${owner.email ? `<span><i data-lucide="mail" style="width:12px;height:12px;vertical-align:-1px"></i> ${escapeHtml(owner.email)}</span>` : ''}
              </div>
              <div class="flex gap-2 mt-3">
                ${owner.phone ? `<a href="${phoneToCall(owner.phone)}" class="btn btn-secondary btn-sm"><i data-lucide="phone" style="width:13px;height:13px"></i>Ara</a>` : ''}
                ${(owner.whatsapp || owner.phone) ? `<a href="${phoneToWhatsApp(owner.whatsapp || owner.phone)}" target="_blank" class="btn btn-secondary btn-sm"><i data-lucide="message-circle" style="width:13px;height:13px"></i>WhatsApp</a>` : ''}
              </div>
            </div>
          </div>
        </div>

        <div class="card card-pad" style="margin-bottom:16px">
          <div class="section-title">Notlar</div>
          <textarea class="input" id="owner-notes" rows="4" placeholder="Bu mülk sahibi hakkında özel notlar...">${escapeHtml(owner.notes || '')}</textarea>
          <button class="btn btn-secondary btn-sm mt-2" id="save-notes-btn" disabled>Notları Kaydet</button>
        </div>

        <div class="card card-pad">
          <div class="section-title">İlanlar (${properties.length})</div>
          <div id="owner-properties">
            ${properties.length === 0 ? emptyStateHtml({ icon: 'building-2', title: 'Henüz ilan yok' }) : properties.map(propertyRowHtml).join('')}
          </div>
        </div>
      </div>
    `;
    renderIcons(root);

    qs('#back-btn').addEventListener('click', () => window.history.back());

    const notesArea = qs('#owner-notes');
    const saveBtn = qs('#save-notes-btn');
    notesArea.addEventListener('input', () => { saveBtn.disabled = notesArea.value === (owner.notes || ''); });
    saveBtn.addEventListener('click', async () => {
      try {
        await API.updateOwner(id, { notes: notesArea.value });
        Toast.success('Notlar kaydedildi');
        saveBtn.disabled = true;
      } catch { Toast.error('Kaydedilemedi'); }
    });
  },
};
