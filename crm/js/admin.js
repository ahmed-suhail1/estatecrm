import { requireAuth, mountShell } from "./shell.js";
import { db, collection, doc, updateDoc, getDocs, query, orderBy } from "./firebase-config.js";

let currentAgent = null;
let allAgents = [];

requireAuth(async (agent) => {
  currentAgent = agent;
  mountShell("admin", agent);

  // Yalnızca yönetici erişebilir
  if (agent.role !== "admin") {
    document.getElementById("pageContent").innerHTML = `
      <div class="page"><div class="empty-state"><h3>Erişim yok</h3><p>Bu sayfayı yalnızca yöneticiler görebilir.</p></div></div>
    `;
    return;
  }

  const content = document.getElementById("pageContent");
  content.appendChild(document.getElementById("pageTemplate").content.cloneNode(true));

  await loadAgents();
});

async function loadAgents() {
  const snap = await getDocs(query(collection(db, "agents"), orderBy("name")));
  allAgents = [];
  snap.forEach(d => allAgents.push({ id: d.id, ...d.data() }));
  renderPending();
  renderAll();
}

function renderPending() {
  const pending = allAgents.filter(a => a.status === "pending");
  const el = document.getElementById("pendingList");

  if (pending.length === 0) {
    el.innerHTML = `<p style="color:var(--color-ink-soft); margin:0;">Bekleyen hesap yok.</p>`;
    return;
  }

  el.innerHTML = pending.map(a => `
    <div class="agent-row">
      <div class="agent-row-info">
        <div class="agent-row-name">${escapeHtml(a.name)}</div>
        <div class="agent-row-email">${escapeHtml(a.email)}</div>
      </div>
      <div class="agent-row-actions">
        <button class="btn btn-brass btn-sm" data-approve="${a.id}">Onayla</button>
        <button class="btn btn-ghost btn-sm" data-reject="${a.id}">Reddet</button>
      </div>
    </div>
  `).join("");

  el.querySelectorAll("[data-approve]").forEach(btn => {
    btn.addEventListener("click", () => approveAgent(btn.dataset.approve));
  });
  el.querySelectorAll("[data-reject]").forEach(btn => {
    btn.addEventListener("click", () => rejectAgent(btn.dataset.reject));
  });
}

function renderAll() {
  const active = allAgents.filter(a => a.status !== "pending");
  const el = document.getElementById("agentList");

  if (active.length === 0) {
    el.innerHTML = `<p style="color:var(--color-ink-soft); margin:0;">Henüz danışman yok.</p>`;
    return;
  }

  el.innerHTML = active.map(a => `
    <div class="agent-row">
      <div class="agent-row-info">
        <div class="agent-row-name">${escapeHtml(a.name)} ${a.id === currentAgent.id ? "(siz)" : ""}</div>
        <div class="agent-row-email">${escapeHtml(a.email)}</div>
      </div>
      <div class="agent-row-actions">
        <select class="select btn-sm" data-role="${a.id}" ${a.id === currentAgent.id ? "disabled" : ""} style="max-width:120px;">
          <option value="agent" ${a.role === "agent" ? "selected" : ""}>Danışman</option>
          <option value="admin" ${a.role === "admin" ? "selected" : ""}>Yönetici</option>
        </select>
        <button class="btn btn-ghost btn-sm" data-toggle="${a.id}" ${a.id === currentAgent.id ? "disabled" : ""}>
          ${a.status === "disabled" ? "Etkinleştir" : "Devre Dışı Bırak"}
        </button>
      </div>
    </div>
  `).join("");

  el.querySelectorAll("[data-role]").forEach(select => {
    select.addEventListener("change", () => changeRole(select.dataset.role, select.value));
  });
  el.querySelectorAll("[data-toggle]").forEach(btn => {
    btn.addEventListener("click", () => toggleStatus(btn.dataset.toggle));
  });
}

async function approveAgent(agentId) {
  try {
    await updateDoc(doc(db, "agents", agentId), { status: "active" });
    showToast("Hesap onaylandı.");
    await loadAgents();
  } catch (err) { console.error(err); showToast("İşlem başarısız oldu."); }
}

async function rejectAgent(agentId) {
  if (!confirm("Bu hesap isteğini reddetmek istediğinize emin misiniz?")) return;
  try {
    await updateDoc(doc(db, "agents", agentId), { status: "disabled" });
    showToast("Hesap reddedildi.");
    await loadAgents();
  } catch (err) { console.error(err); showToast("İşlem başarısız oldu."); }
}

async function changeRole(agentId, role) {
  try {
    await updateDoc(doc(db, "agents", agentId), { role });
    showToast("Rol güncellendi.");
  } catch (err) { console.error(err); showToast("İşlem başarısız oldu."); }
}

async function toggleStatus(agentId) {
  const agent = allAgents.find(a => a.id === agentId);
  const newStatus = agent.status === "disabled" ? "active" : "disabled";
  try {
    await updateDoc(doc(db, "agents", agentId), { status: newStatus });
    showToast(newStatus === "disabled" ? "Hesap devre dışı bırakıldı." : "Hesap etkinleştirildi.");
    await loadAgents();
  } catch (err) { console.error(err); showToast("İşlem başarısız oldu."); }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function showToast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.getElementById("toastRoot").appendChild(el);
  setTimeout(() => el.remove(), 2600);
}
