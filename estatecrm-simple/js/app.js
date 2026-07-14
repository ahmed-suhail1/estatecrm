// ============================================================================
// Uygulama Başlatıcı
// ============================================================================

const App = {
  async init() {
    Theme.init();
    Toast.init();

    if (!window.SUPABASE_URL || window.SUPABASE_URL.includes('YOUR-PROJECT')) {
      document.getElementById('app').innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px">
          <div class="card card-pad" style="max-width:480px;text-align:center">
            <h2 style="font-size:16px;font-weight:700;margin-bottom:8px">Kurulum tamamlanmadı</h2>
            <p class="text-muted" style="font-size:13px;line-height:1.6">
              <code>js/config.js</code> dosyasını Supabase proje adresiniz ve anon anahtarınızla doldurun.
              Ayrıntılar için <code>README.md</code> dosyasına bakın.
            </p>
          </div>
        </div>
      `;
      return;
    }

    await Shell.render();

    if (!AgentIdentity.current) {
      await AgentPicker.open(true);
    } else {
      this.onAgentReady();
    }

    window.addEventListener('agent-changed', () => {
      Shell.renderTopbarActions();
      if (AgentIdentity.current) Router.handle();
    });
  },

  async onAgentReady() {
    await Shell.renderTopbarActions();
    await Shell.refreshTaskCount();
    RealtimeSync.start();
    CommandPalette.init();
    Router.init();
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
