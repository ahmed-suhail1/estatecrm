// ============================================================================
// Tema yönetimi (Açık / Koyu / Sistem)
// ============================================================================

const Theme = {
  current: 'system',

  init() {
    this.current = localStorage.getItem('estatecrm_theme') || 'system';
    this.apply();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.current === 'system') this.apply();
    });
  },

  set(value) {
    this.current = value;
    localStorage.setItem('estatecrm_theme', value);
    this.apply();
  },

  apply() {
    const isDark = this.current === 'dark' || (this.current === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  },
};
