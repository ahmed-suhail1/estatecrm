import { auth, db, onAuthStateChanged, doc, getDoc, signOut } from "./firebase-config.js";

const NAV_ITEMS = [
  { key: "dashboard", label: "Panel", href: "dashboard.html", icon: iconHome() },
  { key: "leads", label: "Müşteriler", href: "leads.html", icon: iconUsers() },
  { key: "properties", label: "İlanlar", href: "properties.html", icon: iconHome2() },
  { key: "calendar", label: "Randevular", href: "calendar.html", icon: iconCalendar() },
  { key: "sales", label: "Satışlar", href: "sales.html", icon: iconSales() },
  { key: "reports", label: "Raporlar", href: "reports.html", icon: iconChart() },
];

const ADMIN_NAV_ITEMS = [
  { key: "admin", label: "Yönetim", href: "admin.html", icon: iconShield() },
];

function iconHome() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>`; }
function iconUsers() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.2"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6"/><path d="M16 5.5c1.8.4 3 1.9 3 3.5 0 1.7-1.3 3.1-3 3.5"/><path d="M22 20c0-2.8-2-5-5-5.6"/></svg>`; }
function iconHome2() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 9h18"/><path d="M9 21V13h6v8"/></svg>`; }
function iconCalendar() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4M16 3v4"/></svg>`; }
function iconChart() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20V10M12 20V4M20 20v-7"/></svg>`; }
function iconSales() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 6h7v7"/></svg>`; }
function iconShield() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z"/></svg>`; }
function iconMenu() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`; }
function iconLogout() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>`; }

function initials(name) {
  if (!name) return "?";
  return name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
}

export function mountShell(activeKey, agent) {
  const isAdmin = agent.role === "admin";
  const items = isAdmin ? [...NAV_ITEMS, ...ADMIN_NAV_ITEMS] : NAV_ITEMS;

  const navHtml = () => items.map(item => `
    <a href="${item.href}" class="nav-item ${item.key === activeKey ? 'active' : ''}">
      ${item.icon}
      <span>${item.label}</span>
    </a>
  `).join("");

  const shellHtml = `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">E</div>
        <div class="brand-name">Emlak CRM</div>
      </div>
      <div class="nav-group">
        ${navHtml()}
      </div>
      <div class="sidebar-footer">
        <div class="user-chip">
          <div class="user-avatar">${initials(agent.name)}</div>
          <div class="user-info">
            <div class="user-name">${agent.name}</div>
            <div class="user-role">${isAdmin ? "Yönetici" : "Danışman"}</div>
          </div>
          <button class="btn btn-ghost btn-icon" id="logoutBtn" title="Çıkış yap" aria-label="Çıkış yap">${iconLogout()}</button>
        </div>
      </div>
    </aside>

    <div class="main">
      <div class="topbar">
        <div class="brand">
          <div class="brand-mark" style="width:30px;height:30px;font-size:14px;">E</div>
          <div class="brand-name" style="font-size:1.05rem;">Emlak CRM</div>
        </div>
        <button class="menu-btn" id="mobileMenuBtn" aria-label="Menü">${iconMenu()}</button>
      </div>

      <div id="pageContent"></div>
    </div>

    <div class="mobile-menu-overlay" id="mobileMenuOverlay">
      <nav class="mobile-menu-panel" id="mobileMenuPanel">
        <div class="mobile-menu-header">
          <div class="brand-name" style="font-size:1.1rem;">Menü</div>
          <button class="btn btn-ghost btn-icon" id="closeMobileMenu" aria-label="Kapat">✕</button>
        </div>
        <div class="nav-group">
          ${navHtml()}
        </div>
        <div class="mobile-menu-footer">
          <div class="user-chip">
            <div class="user-avatar">${initials(agent.name)}</div>
            <div class="user-info">
              <div class="user-name">${agent.name}</div>
              <div class="user-role">${isAdmin ? "Yönetici" : "Danışman"}</div>
            </div>
            <button class="btn btn-ghost btn-icon" id="logoutBtnMobile" aria-label="Çıkış yap">${iconLogout()}</button>
          </div>
        </div>
      </nav>
    </div>
  `;

  document.getElementById("shellRoot").innerHTML = shellHtml;

  const logout = async () => {
    await signOut(auth);
    window.location.href = "../index.html";
  };
  document.getElementById("logoutBtn")?.addEventListener("click", logout);
  document.getElementById("logoutBtnMobile")?.addEventListener("click", logout);

  // Mobil menüyü aç/kapat
  const overlay = document.getElementById("mobileMenuOverlay");
  const openMenu = () => overlay.classList.add("show");
  const closeMenu = () => overlay.classList.remove("show");

  document.getElementById("mobileMenuBtn")?.addEventListener("click", openMenu);
  document.getElementById("closeMobileMenu")?.addEventListener("click", closeMenu);

  // Panelin dışına (karartılmış alana) tıklanınca kapat
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeMenu();
  });
}

// Tüm sayfalarda ortak kimlik doğrulama koruması — giriş yapılmamışsa veya
// onaylanmamışsa login sayfasına yönlendirir.
export function requireAuth(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "../index.html";
      return;
    }
    const agentDoc = await getDoc(doc(db, "agents", user.uid));
    if (!agentDoc.exists() || agentDoc.data().status !== "active") {
      await signOut(auth);
      window.location.href = "../index.html";
      return;
    }
    callback({ id: user.uid, ...agentDoc.data() });
  });
}
