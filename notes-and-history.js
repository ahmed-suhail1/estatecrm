// ============================================================================
// Notlar Paneli — @bahsetme (mention) destekli
// ============================================================================

const NotesPanel = {
  async render(container, propertyId) {
    const [notes, agents] = await Promise.all([API.getPropertyNotes(propertyId), Store.loadAgents()]);
    const agentMap = new Map(agents.map((a) => [a.id, a]));

    container.innerHTML = `
      <div class="scroll-thin" id="notes-list" style="max-height:360px;overflow-y:auto;padding-right:4px"></div>
      <div class="note-compose">
        ${avatarHtml(AgentIdentity.current.name, AgentIdentity.current.avatar_color, AgentIdentity.current.avatar_url, 'sm')}
        <div style="flex:1;position:relative">
          <textarea class="input" id="note-input" placeholder="Not ekle... bir meslektaşını etiketlemek için @ kullan"></textarea>
          <button class="btn btn-primary btn-icon-sm note-send-btn" id="note-send"><i data-lucide="send" style="width:14px;height:14px"></i></button>
          <div id="mention-popup" class="hidden"></div>
        </div>
      </div>
    `;
    renderIcons(container);

    const list = qs('#notes-list', container);
    list.innerHTML = notes.length === 0
      ? emptyStateHtml({ icon: 'message-square', title: 'Henüz not yok', desc: 'İlk notu sen ekle.' })
      : notes.map((n) => noteItemHtml(n)).join('');
    renderIcons(list);

    const input = qs('#note-input', container);
    const popup = qs('#mention-popup', container);
    const sendBtn = qs('#note-send', container);

    input.addEventListener('input', () => {
      const cursor = input.selectionStart;
      const upToCursor = input.value.slice(0, cursor);
      const match = upToCursor.match(/@(\S*)$/);
      if (match) {
        const q = match[1].toLowerCase();
        const filtered = agents.filter((a) => a.name.toLowerCase().includes(q));
        if (filtered.length) {
          popup.classList.remove('hidden');
          popup.className = 'mention-popup';
          popup.innerHTML = filtered.map((a) => `
            <button data-mention="${escapeHtml(a.name)}">${avatarHtml(a.name, a.avatar_color, a.avatar_url, 'xs')}${escapeHtml(a.name)}</button>
          `).join('');
          renderIcons(popup);
          qsa('[data-mention]', popup).forEach((btn) => {
            btn.addEventListener('click', () => {
              const name = btn.dataset.mention;
              const newVal = input.value.slice(0, cursor).replace(/@(\S*)$/, `@${name} `) + input.value.slice(cursor);
              input.value = newVal;
              popup.classList.add('hidden');
              input.focus();
            });
          });
        } else {
          popup.classList.add('hidden');
        }
      } else {
        popup.classList.add('hidden');
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && popup.classList.contains('hidden')) {
        e.preventDefault();
        submitNote();
      }
    });
    sendBtn.addEventListener('click', submitNote);

    async function submitNote() {
      const body = input.value.trim();
      if (!body) return;
      const mentioned = agents.filter((a) => body.includes(`@${a.name}`)).map((a) => a.id);
      sendBtn.disabled = true;
      try {
        await API.addNote(propertyId, body, mentioned);
        input.value = '';
        await NotesPanel.render(container, propertyId);
      } catch {
        Toast.error('Not eklenemedi');
      } finally {
        sendBtn.disabled = false;
      }
    }
  },
};

function noteItemHtml(note) {
  const bodyHtml = escapeHtml(note.body).replace(/(@[\wÇçĞğİıÖöŞşÜü]+(?:\s[\wÇçĞğİıÖöŞşÜü]+)?)/g, '<span class="mention">$1</span>');
  return `
    <div class="note-item">
      ${avatarHtml(note.agent?.name || '?', note.agent?.avatar_color, note.agent?.avatar_url, 'sm')}
      <div style="min-width:0;flex:1">
        <div class="note-bubble">
          <div class="note-header">
            <span class="note-author">${escapeHtml(note.agent?.name || 'Bilinmiyor')}</span>
            <span class="note-time">${formatRelativeTime(note.created_at)}</span>
          </div>
          <div class="note-body">${bodyHtml}</div>
        </div>
      </div>
    </div>
  `;
}

// ============================================================================
// Sürüm Geçmişi Paneli
// ============================================================================

const VersionHistoryPanel = {
  async render(container, propertyId) {
    const versions = await API.getPropertyVersions(propertyId);
    if (versions.length === 0) {
      container.innerHTML = emptyStateHtml({ icon: 'history', title: 'Sürüm geçmişi yok' });
      renderIcons(container);
      return;
    }
    container.innerHTML = `<div class="scroll-thin" style="max-height:380px;overflow-y:auto">${versions.map((v, i) => versionRowHtml(v, i)).join('')}</div>`;
    renderIcons(container);

    qsa('[data-restore]', container).forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Bu sürümü geri yüklemek istediğine emin misin?')) return;
        try {
          await API.restoreVersion(propertyId, btn.dataset.restore);
          Toast.success('Sürüm geri yüklendi');
          Store.invalidateProperties();
          Pages.PropertyDetail.render(qs('#page-root'), { id: propertyId });
        } catch { Toast.error('Geri yükleme başarısız'); }
      });
    });
  },
};

function versionRowHtml(v, index) {
  const snap = v.snapshot;
  return `
    <div class="flex items-center justify-between gap-3" style="padding:10px 0;border-bottom:1px solid var(--border)">
      <div class="flex items-center gap-3" style="min-width:0">
        ${avatarHtml(v.agent?.name || 'Sistem', v.agent?.avatar_color, v.agent?.avatar_url, 'sm')}
        <div style="min-width:0">
          <div style="font-size:12.5px;font-weight:600">${formatCurrency(snap.price, snap.currency)} · ${STATUS_META[snap.status]?.label || snap.status}</div>
          <div class="text-muted" style="font-size:11px">${escapeHtml(v.agent?.name || 'Sistem')} · ${formatRelativeTime(v.created_at)}</div>
        </div>
      </div>
      ${index === 0
        ? `<span class="text-muted" style="font-size:11px;flex-shrink:0">Güncel</span>`
        : `<button class="btn btn-ghost btn-sm" data-restore="${v.id}"><i data-lucide="rotate-ccw" style="width:13px;height:13px"></i>Geri Yükle</button>`
      }
    </div>
  `;
}
