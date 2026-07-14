// ============================================================================
// İlan Formu — Yeni İlan / Düzenle
// ============================================================================

Pages.PropertyForm = {
  isEdit: false,
  propertyId: null,
  ownerMode: 'existing',
  selectedTagIds: [],
  duplicateCheckTimer: null,

  async render(root, { id, path }) {
    this.isEdit = path.endsWith('/edit');
    this.propertyId = this.isEdit ? id : null;
    this.ownerMode = 'existing';

    root.innerHTML = `<div class="loading-page"><span class="spinner"></span></div>`;

    let property = null;
    if (this.isEdit) property = await API.getProperty(this.propertyId);

    const [agents, owners, tags] = await Promise.all([
      Store.loadAgents(),
      API.getOwners(),
      Store.loadTags(),
    ]);

    this.selectedTagIds = property ? property.tags.map((t) => t.id) : [];

    root.innerHTML = `
      <div class="page page-narrow">
        <button class="btn btn-ghost btn-sm" id="back-btn" style="margin-bottom:14px"><i data-lucide="arrow-left" style="width:14px;height:14px"></i>Geri</button>
        <div class="page-title" style="margin-bottom:20px">${this.isEdit ? 'İlanı Düzenle' : 'Yeni İlan'}</div>

        <form id="property-form">
          <div class="form-section">
            <div class="section-title">Temel Bilgiler</div>
            <div class="field"><label>Başlık *</label><input class="input" name="title" required placeholder="Örn: Levent'te Modern 2+1 Daire" value="${escapeHtml(property?.title || '')}" /></div>
            <div class="field"><label>Açıklama</label><textarea class="input" name="description" rows="4" placeholder="İlanı tanımlayın...">${escapeHtml(property?.description || '')}</textarea></div>
            <div class="field-row grid-2">
              <div class="field"><label>Satılık/Kiralık *</label>
                <select class="select" name="listing_type">
                  <option value="sale" ${property?.listing_type === 'sale' || !property ? 'selected' : ''}>Satılık</option>
                  <option value="rent" ${property?.listing_type === 'rent' ? 'selected' : ''}>Kiralık</option>
                </select>
              </div>
              <div class="field"><label>Mülk Türü *</label>
                <select class="select" name="property_type">
                  ${Object.entries(PROPERTY_TYPE_LABELS).map(([k, v]) => `<option value="${k}" ${property?.property_type === k ? 'selected' : ''}>${v}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="field"><label>Durum</label>
              <select class="select" name="status">
                ${Object.entries(STATUS_META).map(([k, v]) => `<option value="${k}" ${(property?.status || 'available') === k ? 'selected' : ''}>${v.label}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="form-section">
            <div class="section-title">Fiyatlandırma</div>
            <div class="field-row grid-2" style="grid-template-columns:2fr 1fr">
              <div class="field"><label>Fiyat *</label><input class="input" type="number" step="0.01" name="price" required placeholder="250000" value="${property?.price ?? ''}" /></div>
              <div class="field"><label>Para Birimi</label>
                <select class="select" name="currency">
                  ${CURRENCIES.map((c) => `<option value="${c}" ${(property?.currency || 'USD') === c ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>

          <div class="form-section">
            <div class="section-title">Özellikler</div>
            <div class="field-row grid-5">
              <div class="field"><label>Yatak Odası</label><input class="input" type="number" name="bedrooms" value="${property?.bedrooms ?? ''}" /></div>
              <div class="field"><label>Banyo</label><input class="input" type="number" name="bathrooms" value="${property?.bathrooms ?? ''}" /></div>
              <div class="field"><label>Alan (m²)</label><input class="input" type="number" step="0.1" name="area_sqm" value="${property?.area_sqm ?? ''}" /></div>
              <div class="field"><label>Kat</label><input class="input" name="floor" value="${escapeHtml(property?.floor || '')}" /></div>
              <div class="field"><label>Bina Yaşı</label><input class="input" type="number" name="building_age" value="${property?.building_age ?? ''}" /></div>
            </div>
          </div>

          <div class="form-section">
            <div class="section-title">Konum</div>
            <div class="field"><label>Adres</label><input class="input" name="address" value="${escapeHtml(property?.address || '')}" /></div>
            <div class="field-row grid-2">
              <div class="field"><label>Şehir</label><input class="input" name="city" value="${escapeHtml(property?.city || '')}" /></div>
              <div class="field"><label>İlçe</label><input class="input" name="district" value="${escapeHtml(property?.district || '')}" /></div>
            </div>
            <div class="field-row grid-2">
              <div class="field"><label>Enlem (lat)</label><input class="input" type="number" step="any" name="lat" placeholder="41.0082" value="${property?.lat ?? ''}" /></div>
              <div class="field"><label>Boylam (lng)</label><input class="input" type="number" step="any" name="lng" placeholder="28.9784" value="${property?.lng ?? ''}" /></div>
            </div>
            <div id="dup-property-warning"></div>
          </div>

          <div class="form-section">
            <div class="flex items-center justify-between" style="margin-bottom:12px">
              <div class="section-title" style="margin:0">Mülk Sahibi</div>
              <div class="flex gap-1" style="font-size:11.5px">
                <button type="button" class="btn btn-ghost btn-sm" id="owner-mode-existing">Mevcut</button>
                <button type="button" class="btn btn-ghost btn-sm" id="owner-mode-new">+ Yeni</button>
              </div>
            </div>
            <div id="owner-existing-block">
              <select class="select" name="owner_id" id="owner-select">
                <option value="">Mülk sahibi seçin</option>
                ${owners.map((o) => `<option value="${o.id}" ${property?.owner_id === o.id ? 'selected' : ''}>${escapeHtml(o.name)}${o.phone ? ' · ' + escapeHtml(o.phone) : ''}</option>`).join('')}
              </select>
            </div>
            <div id="owner-new-block" class="hidden card card-pad">
              <div class="field"><label>Ad Soyad</label><input class="input" id="new-owner-name" placeholder="Ad Soyad" /></div>
              <div class="field-row grid-2">
                <div class="field"><label>Telefon</label><input class="input" id="new-owner-phone" placeholder="05xx xxx xx xx" /></div>
                <div class="field"><label>WhatsApp</label><input class="input" id="new-owner-whatsapp" placeholder="(boşsa telefon kullanılır)" /></div>
              </div>
              <div id="dup-owner-warning"></div>
              <p class="text-muted" style="font-size:11.5px">Bu mülk sahibi, ilan kaydedildiğinde oluşturulacaktır.</p>
            </div>
          </div>

          <div class="form-section">
            <div class="section-title">Atama ve Etiketler</div>
            <div class="field"><label>Sorumlu Temsilci</label>
              <select class="select" name="assigned_agent_id">
                <option value="">Temsilci seçin</option>
                ${agents.map((a) => `<option value="${a.id}" ${property?.assigned_agent_id === a.id ? 'selected' : ''}>${escapeHtml(a.name)}</option>`).join('')}
              </select>
            </div>
            <div class="field"><label>Etiketler</label>
              <div class="flex gap-2" style="flex-wrap:wrap" id="tags-picker">
                ${tags.map((t) => tagPickerChip(t, this.selectedTagIds.includes(t.id))).join('')}
              </div>
            </div>
          </div>

          <div class="flex justify-between" style="position:sticky;bottom:0;background:var(--bg);padding:14px 0;border-top:1px solid var(--border)">
            <span></span>
            <button type="submit" class="btn btn-primary" id="submit-btn"><i data-lucide="check" style="width:15px;height:15px"></i>${this.isEdit ? 'Değişiklikleri Kaydet' : 'İlanı Oluştur'}</button>
          </div>
        </form>
      </div>
    `;
    renderIcons(root);

    qs('#back-btn').addEventListener('click', () => window.history.back());
    this.setOwnerMode('existing');
    qs('#owner-mode-existing').addEventListener('click', () => this.setOwnerMode('existing'));
    qs('#owner-mode-new').addEventListener('click', () => this.setOwnerMode('new'));

    qsa('[data-tag-chip]', root).forEach((chip) => {
      chip.addEventListener('click', () => {
        const tagId = chip.dataset.tagChip;
        if (this.selectedTagIds.includes(tagId)) {
          this.selectedTagIds = this.selectedTagIds.filter((t) => t !== tagId);
        } else {
          this.selectedTagIds.push(tagId);
        }
        chip.outerHTML = tagPickerChip(tags.find((t) => t.id === tagId), this.selectedTagIds.includes(tagId));
        this.rebindTagChip(tagId, tags);
      });
    });

    // Duplicate detection: address
    const addressInput = qs('[name="address"]', root);
    const cityInput = qs('[name="city"]', root);
    const checkPropDup = debounce(async () => {
      const address = addressInput.value.trim();
      if (address.length < 6) { qs('#dup-property-warning').innerHTML = ''; return; }
      const similar = await API.findSimilarProperties(address, cityInput.value.trim());
      qs('#dup-property-warning').innerHTML = similar.length
        ? `<div class="dup-warning"><strong>Benzer adresli ilan zaten var</strong>${similar.map((p) => `<div><a href="#/properties/${p.id}" target="_blank">#${p.code} — ${escapeHtml(p.title)} (${escapeHtml(p.address || '')})</a></div>`).join('')}</div>`
        : '';
    }, 500);
    addressInput.addEventListener('input', checkPropDup);

    // Duplicate detection: new owner
    const newOwnerName = qs('#new-owner-name', root);
    const newOwnerPhone = qs('#new-owner-phone', root);
    const checkOwnerDup = debounce(async () => {
      const name = newOwnerName.value.trim();
      const phone = newOwnerPhone.value.trim();
      if (name.length < 3 && phone.length < 4) { qs('#dup-owner-warning').innerHTML = ''; return; }
      const similar = await API.findSimilarOwners(phone, name);
      qs('#dup-owner-warning').innerHTML = similar.length
        ? `<div class="dup-warning"><strong>Olası mevcut mülk sahibi eşleşmesi</strong>${similar.map((o) => `<div><a href="#/owners/${o.id}" target="_blank">${escapeHtml(o.name)}${o.phone ? ' · ' + escapeHtml(o.phone) : ''}</a></div>`).join('')}</div>`
        : '';
    }, 500);
    newOwnerName.addEventListener('input', checkOwnerDup);
    newOwnerPhone.addEventListener('input', checkOwnerDup);

    qs('#property-form').addEventListener('submit', (e) => this.handleSubmit(e));
  },

  rebindTagChip(tagId) {
    const chip = qs(`[data-tag-chip="${tagId}"]`);
    if (!chip) return;
    chip.addEventListener('click', () => {
      if (this.selectedTagIds.includes(tagId)) this.selectedTagIds = this.selectedTagIds.filter((t) => t !== tagId);
      else this.selectedTagIds.push(tagId);
      Pages.PropertyForm.render(qs('#page-root'), { id: this.propertyId, path: this.isEdit ? `/properties/${this.propertyId}/edit` : '/properties/new' });
    });
  },

  setOwnerMode(mode) {
    this.ownerMode = mode;
    qs('#owner-existing-block').classList.toggle('hidden', mode !== 'existing');
    qs('#owner-new-block').classList.toggle('hidden', mode !== 'new');
    qs('#owner-mode-existing').style.background = mode === 'existing' ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : '';
    qs('#owner-mode-existing').style.color = mode === 'existing' ? 'var(--primary)' : '';
    qs('#owner-mode-new').style.background = mode === 'new' ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : '';
    qs('#owner-mode-new').style.color = mode === 'new' ? 'var(--primary)' : '';
  },

  async handleSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = qs('#submit-btn', form);
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span>';

    try {
      const fd = new FormData(form);
      const num = (v) => (v === '' || v == null ? undefined : Number(v));

      let owner_id = fd.get('owner_id') || undefined;
      if (this.ownerMode === 'new') {
        const name = qs('#new-owner-name').value.trim();
        if (name) {
          const owner = await API.createOwner({
            name,
            phone: qs('#new-owner-phone').value.trim() || null,
            whatsapp: qs('#new-owner-whatsapp').value.trim() || null,
          });
          owner_id = owner.id;
        }
      }

      const payload = {
        title: fd.get('title'),
        description: fd.get('description') || null,
        price: num(fd.get('price')),
        currency: fd.get('currency'),
        listing_type: fd.get('listing_type'),
        property_type: fd.get('property_type'),
        status: fd.get('status'),
        bedrooms: num(fd.get('bedrooms')),
        bathrooms: num(fd.get('bathrooms')),
        area_sqm: num(fd.get('area_sqm')),
        floor: fd.get('floor') || null,
        building_age: num(fd.get('building_age')),
        address: fd.get('address') || null,
        city: fd.get('city') || null,
        district: fd.get('district') || null,
        lat: num(fd.get('lat')),
        lng: num(fd.get('lng')),
        owner_id: owner_id || null,
        assigned_agent_id: fd.get('assigned_agent_id') || null,
        tag_ids: this.selectedTagIds,
      };

      let result;
      if (this.isEdit) {
        result = await API.updateProperty(this.propertyId, payload);
      } else {
        result = await API.createProperty(payload);
      }

      Store.invalidateProperties();
      Toast.success(this.isEdit ? 'İlan güncellendi' : 'İlan oluşturuldu');
      navigate(`/properties/${result.id}`);
    } catch (err) {
      console.error(err);
      Toast.error(err.message || 'Bir hata oluştu');
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i data-lucide="check" style="width:15px;height:15px"></i>${this.isEdit ? 'Değişiklikleri Kaydet' : 'İlanı Oluştur'}`;
      renderIcons(submitBtn);
    }
  },
};

function tagPickerChip(tag, active) {
  return `
    <button type="button" class="tag-btn tag-chip" data-tag-chip="${tag.id}">
      <span class="badge" style="color:${active ? '#fff' : tag.color};background:${active ? tag.color : tag.color + '20'}">${escapeHtml(tag.label)}</span>
    </button>
  `;
}
