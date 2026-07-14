// ============================================================================
// Temsilci Kimlik Sistemi (Agent Identity)
// ----------------------------------------------------------------------------
// Neden geleneksel kullanıcı hesabı yok?
//   5-15 kişilik güvenilir bir ofis ekibi için şifre/e-posta doğrulama gibi
//   klasik kullanıcı hesapları gereksiz sürtünme yaratır. Bunun yerine:
//   1. İlk ziyarette cihazda kayıtlı kimlik yoksa "Sen kimsin?" ekranı açılır.
//   2. Seçilen temsilci tarayıcının localStorage'ına kaydedilir ve sonraki
//      ziyaretlerde otomatik olarak hatırlanır — login gerekmez.
//   3. Profil menüsündeki "Temsilci Değiştir" bu kaydı temizler ve seçim
//      ekranını tekrar açar (ortak ofis bilgisayarları için).
//   4. Her veri değişikliği (ekleme/güncelleme) bu modülden okunan temsilci
//      id'sini created_by/updated_by/agent_id olarak damgalar — böylece
//      "her işlemin kim tarafından yapıldığı" tek bir yerden garanti edilir.
// ============================================================================

const AgentIdentity = {
  STORAGE_KEY: 'estatecrm_agent',

  get current() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  set(agent) {
    localStorage.setItem(
      this.STORAGE_KEY,
      JSON.stringify({
        id: agent.id,
        name: agent.name,
        avatar_color: agent.avatar_color,
        avatar_url: agent.avatar_url,
        role: agent.role,
      })
    );
    window.dispatchEvent(new CustomEvent('agent-changed'));
  },

  clear() {
    localStorage.removeItem(this.STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('agent-changed'));
  },

  requireId() {
    const a = this.current;
    if (!a) throw new Error('Temsilci kimliği seçilmedi. Lütfen önce bir temsilci seçin.');
    return a.id;
  },
};
