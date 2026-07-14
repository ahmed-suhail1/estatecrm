// ============================================================================
// Toast bildirimleri
// ============================================================================

const Toast = {
  root: null,

  init() {
    this.root = document.getElementById('toast-root');
  },

  show(message, type = 'info') {
    if (!this.root) this.init();
    const icons = { success: 'check-circle', error: 'x-circle', info: 'info' };
    const node = el(`
      <div class="toast ${type}">
        <i data-lucide="${icons[type]}" style="width:16px;height:16px;flex-shrink:0"></i>
        <span>${escapeHtml(message)}</span>
      </div>
    `);
    this.root.appendChild(node);
    if (window.lucide) lucide.createIcons({ nodes: [node] });
    setTimeout(() => {
      node.style.opacity = '0';
      node.style.transition = 'opacity .2s';
      setTimeout(() => node.remove(), 200);
    }, 3200);
  },

  success(msg) { this.show(msg, 'success'); },
  error(msg) { this.show(msg, 'error'); },
  info(msg) { this.show(msg, 'info'); },
};
