// ============================================================================
// Yeniden kullanılabilir arayüz parçaları (saf HTML string üreten fonksiyonlar)
// ============================================================================

function avatarHtml(name, color, url, size = 'md') {
  if (url) return `<img class="avatar avatar-${size}" src="${escapeHtml(url)}" alt="${escapeHtml(name)}" />`;
  return `<div class="avatar avatar-${size}" style="background:${color || '#6366f1'}">${escapeHtml(initials(name))}</div>`;
}

function statusBadgeHtml(status) {
  const m = STATUS_META[status] || STATUS_META.available;
  return `<span class="badge" style="color:${m.color};background:${m.bg}">${m.label}</span>`;
}

function tagBadgeHtml(tag) {
  return `<span class="badge" style="color:${tag.color};background:${tag.color}20">${escapeHtml(tag.label)}</span>`;
}

function emptyStateHtml({ icon, title, desc, actionHtml }) {
  return `
    <div class="empty-state">
      <div class="icon-wrap"><i data-lucide="${icon}" style="width:22px;height:22px"></i></div>
      <h3>${escapeHtml(title)}</h3>
      ${desc ? `<p>${escapeHtml(desc)}</p>` : ''}
      ${actionHtml || ''}
    </div>
  `;
}

function skeletonCardHtml() {
  return `
    <div class="card" style="overflow:hidden">
      <div class="skeleton" style="aspect-ratio:4/3;border-radius:0"></div>
      <div style="padding:14px;display:flex;flex-direction:column;gap:10px">
        <div class="skeleton" style="height:16px;width:70%"></div>
        <div class="skeleton" style="height:12px;width:45%"></div>
      </div>
    </div>
  `;
}

function propertyCardHtml(p, isFav) {
  const meta = STATUS_META[p.status] || STATUS_META.available;
  const cover = p.images && p.images[0] ? p.images[0].url : null;
  const tagsHtml = (p.tags || []).slice(0, 3).map(tagBadgeHtml).join('');
  const loc = [p.district, p.city].filter(Boolean).join(', ');

  return `
    <div class="property-card" data-goto="/properties/${p.id}">
      <div class="property-photo">
        ${cover ? `<img src="${escapeHtml(cover)}" alt="" loading="lazy" />` : `<div class="no-photo">Fotoğraf yok</div>`}
        <span class="pill-status" style="color:${meta.color};background:${meta.bg}">${meta.label}</span>
        <button class="fav-btn" data-fav-toggle="${p.id}" data-fav-state="${isFav ? '1' : '0'}">
          <i data-lucide="star" style="width:15px;height:15px;color:${isFav ? '#f59e0b' : '#9ca3af'};${isFav ? 'fill:#f59e0b' : ''}"></i>
        </button>
        <span class="price-tag">${formatCurrency(p.price, p.currency)}${p.listing_type === 'rent' ? '<span style="font-size:11px">/ay</span>' : ''}</span>
      </div>
      <div class="property-body">
        <div class="property-title-row">
          <div class="property-title">${escapeHtml(p.title)}</div>
          <div class="property-code">#${p.code}</div>
        </div>
        ${loc ? `<div class="property-loc"><i data-lucide="map-pin" style="width:12px;height:12px"></i>${escapeHtml(loc)}</div>` : ''}
        <div class="property-specs">
          ${p.bedrooms != null ? `<span><i data-lucide="bed" style="width:13px;height:13px"></i>${p.bedrooms}</span>` : ''}
          ${p.bathrooms != null ? `<span><i data-lucide="bath" style="width:13px;height:13px"></i>${p.bathrooms}</span>` : ''}
          ${p.area_sqm != null ? `<span><i data-lucide="ruler" style="width:13px;height:13px"></i>${formatArea(p.area_sqm)}</span>` : ''}
        </div>
        ${tagsHtml ? `<div class="property-tags">${tagsHtml}</div>` : ''}
        <div class="property-footer">
          <span>${PROPERTY_TYPE_LABELS[p.property_type] || p.property_type} · ${LISTING_TYPE_LABELS[p.listing_type]}</span>
          ${p.assigned_agent ? avatarHtml(p.assigned_agent.name, p.assigned_agent.avatar_color, p.assigned_agent.avatar_url, 'xs') : ''}
        </div>
      </div>
    </div>
  `;
}

function propertyRowHtml(p) {
  const meta = STATUS_META[p.status] || STATUS_META.available;
  const cover = p.images && p.images[0] ? p.images[0].url : null;
  return `
    <div class="property-row" data-goto="/properties/${p.id}">
      <div class="thumb">${cover ? `<img src="${escapeHtml(cover)}" alt=""/>` : `<i data-lucide="building-2" style="width:16px;height:16px"></i>`}</div>
      <div class="info">
        <div class="t">${escapeHtml(p.title)}</div>
        <div class="p">${formatCurrency(p.price, p.currency)}</div>
      </div>
      <span class="badge" style="color:${meta.color};background:${meta.bg};flex-shrink:0">${meta.label}</span>
    </div>
  `;
}

function taskRowHtml(t) {
  const pm = PRIORITY_META[t.priority] || PRIORITY_META.medium;
  const isOverdue = t.due_date && !t.is_completed && new Date(t.due_date) < new Date(new Date().setHours(0, 0, 0, 0));
  return `
    <div class="flex items-center gap-3" style="padding:10px 0;border-bottom:1px solid var(--border)">
      <input type="checkbox" data-task-toggle="${t.id}" data-completed="${t.is_completed ? '1' : '0'}" ${t.is_completed ? 'checked' : ''} style="width:16px;height:16px;flex-shrink:0" />
      <div style="min-width:0;flex:1">
        <div style="font-size:13px;font-weight:600;${t.is_completed ? 'text-decoration:line-through;color:var(--muted-fg)' : ''}">
          ${t.property ? `<a href="#/properties/${t.property.id}" class="link-quiet">${escapeHtml(t.title)}</a>` : escapeHtml(t.title)}
        </div>
        <div class="flex items-center gap-2" style="margin-top:3px">
          ${t.due_date ? `<span style="font-size:11.5px;color:${isOverdue ? 'var(--destructive)' : 'var(--muted-fg)'}"><i data-lucide="calendar" style="width:11px;height:11px;vertical-align:-1px"></i> ${formatDate(t.due_date)}</span>` : ''}
          <span class="badge" style="color:${pm.color};background:${pm.color}18">${pm.label}</span>
        </div>
      </div>
      ${t.assigned_agent ? avatarHtml(t.assigned_agent.name, t.assigned_agent.avatar_color, t.assigned_agent.avatar_url, 'sm') : ''}
    </div>
  `;
}

function activityItemHtml(item) {
  return `
    <div class="activity-item">
      ${avatarHtml(item.agent?.name || '?', item.agent?.avatar_color, item.agent?.avatar_url, 'sm')}
      <div style="min-width:0;flex:1">
        <p>${escapeHtml(item.summary)}</p>
        <div class="t">${formatRelativeTime(item.created_at)}</div>
      </div>
    </div>
  `;
}

function timelineItemHtml(evt) {
  const icon = EVENT_ICONS[evt.event_type] || 'history';
  return `
    <div class="timeline-item">
      <div class="timeline-icon"><i data-lucide="${icon}" style="width:14px;height:14px"></i></div>
      <div class="timeline-content">
        <div class="flex items-center gap-2">
          ${evt.agent ? avatarHtml(evt.agent.name, evt.agent.avatar_color, evt.agent.avatar_url, 'xs') : ''}
          <span><strong>${escapeHtml(evt.agent?.name || 'Sistem')}</strong> <span class="text-muted">${escapeHtml(evt.summary)}</span></span>
        </div>
        <div class="timeline-time">${formatRelativeTime(evt.created_at)}</div>
      </div>
    </div>
  `;
}

function renderIcons(root) {
  if (window.lucide) lucide.createIcons(root ? { nodes: [root] } : undefined);
}
