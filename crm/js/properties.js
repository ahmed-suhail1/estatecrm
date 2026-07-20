import { requireAuth, mountShell } from "./shell.js";
import {
  db, collection, doc, addDoc, updateDoc, getDocs, query, orderBy, serverTimestamp
} from "./firebase-config.js";

let currentAgent = null;
let allAgents = [];
let allProperties = [];
let activePropertyId = null;

const STATUS_LABELS = { available: "Aktif", reserved: "Rezerve", sold: "Satıldı", rented: "Kiralandı" };

requireAuth(async (agent) => {
  currentAgent = agent;
  mountShell("properties", agent);
  const content = document.getElementById("pageContent");
  content.appendChild(document.getElementById("pageTemplate").content.cloneNode(true));

  await loadAgents();
  await loadProperties();
  bindUI();

  if (new URLSearchParams(window.location.search).get("new") === "1") {
    openPropertyModal();
  }
});

async function loadAgents() {
  const snap = await getDocs(query(collection(db, "agents"), orderBy("name")));
  allAgents = [];
  snap.forEach(d => {
    const data = d.data();
    if (data.status === "active") allAgents.push({ id: d.id, ...data });
  });
}

async function loadProperties() {
  const snap = await getDocs(query(collection(db, "properties"), orderBy("createdAt", "desc")));
  allProperties = [];
  snap.forEach(d => allProperties.push({ id: d.id, ...d.data() }));
  renderProperties();
}

function bindUI() {
  document.getElementById("addPropertyBtn").addEventListener("click", () => openPropertyModal());
  document.getElementById("searchInput").addEventListener("input", renderProperties);
  document.getElementById("typeFilter").addEventListener("change", renderProperties);
  document.getElementById("statusFilter").addEventListener("change", renderProperties);

  document.getElementById("closePropertyModal").addEventListener("click", closePropertyModal);
  document.getElementById("cancelPropertyBtn").addEventListener("click", closePropertyModal);
  document.getElementById("propertyForm").addEventListener("submit", saveProperty);
  document.getElementById("propertyModalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "propertyModalOverlay") closePropertyModal();
  });

  document.getElementById("closePropertyDetail").addEventListener("click", closePropertyDetail);
  document.getElementById("propertyDetailOverlay").addEventListener("click", (e) => {
    if (e.target.id === "propertyDetailOverlay") closePropertyDetail();
  });
  document.getElementById("pdClaimBtn").addEventListener("click", claimProperty);
  document.getElementById("pdReleaseBtn").addEventListener("click", releaseProperty);
  document.getElementById("pdStatusSelect").addEventListener("change", changePropertyStatus);
  document.getElementById("pdEditBtn").addEventListener("click", () => openPropertyModal(activePropertyId));
  document.getElementById("commentForm").addEventListener("submit", addComment);
}

function canEdit(property) {
  if (currentAgent.role === "admin") return true;
  return property.ownerAgentId === currentAgent.id;
}

function getFiltered() {
  const search = document.getElementById("searchInput").value.trim().toLowerCase();
  const type = document.getElementById("typeFilter").value;
  const status = document.getElementById("statusFilter").value;

  return allProperties.filter(p => {
    if (search && !(`${p.title} ${p.area} ${p.city}`.toLowerCase().includes(search))) return false;
    if (type && p.type !== type) return false;
    if (status && p.status !== status) return false;
    return true;
  });
}

function renderProperties() {
  const properties = getFiltered();
  const grid = document.getElementById("propertyGrid");
  const emptyState = document.getElementById("emptyState");

  if (properties.length === 0) {
    grid.innerHTML = "";
    emptyState.style.display = "block";
    return;
  }
  emptyState.style.display = "none";

  grid.innerHTML = properties.map(p => {
    const ownerName = getAgentName(p.ownerAgentId);
    return `
    <div class="property-card" data-id="${p.id}">
      <div class="property-card-top">
        <span class="property-type-tag">${p.type === "sale" ? "Satılık" : "Kiralık"}</span>
        <div class="property-price">₺${new Intl.NumberFormat("tr-TR").format(p.price)}</div>
        <div class="property-title">${escapeHtml(p.title)}</div>
        <div class="property-location">${escapeHtml([p.area, p.city].filter(Boolean).join(", ")) || "—"}</div>
      </div>
      <div class="property-card-bottom">
        <div class="property-specs">
          <span>${escapeHtml(p.bedrooms || "—")}</span>
          <span>${p.size ? p.size + " m²" : ""}</span>
        </div>
        <span class="badge">${STATUS_LABELS[p.status] || p.status}</span>
      </div>
      <div class="property-card-bottom" style="border-top: 1px solid var(--color-line-soft);">
        <span class="property-owner-tag ${ownerName ? "" : "is-pool"}">${ownerName ? "👤 " + escapeHtml(ownerName) : "🔓 Havuzda — sahipsiz"}</span>
      </div>
    </div>
  `;
  }).join("");

  grid.querySelectorAll(".property-card").forEach(card => {
    card.addEventListener("click", () => openPropertyDetail(card.dataset.id));
  });
}

// ---------- Detay / görüntüleme modalı ----------

function openPropertyDetail(propertyId) {
  const p = allProperties.find(p => p.id === propertyId);
  if (!p) return;
  activePropertyId = propertyId;

  document.getElementById("pdTitle").textContent = p.title;
  document.getElementById("pdStatusBadge").textContent = STATUS_LABELS[p.status] || p.status;
  document.getElementById("pdPrice").textContent = `₺${new Intl.NumberFormat("tr-TR").format(p.price)} · ${p.type === "sale" ? "Satılık" : "Kiralık"}`;
  document.getElementById("pdLocation").textContent = [p.address, p.area, p.city].filter(Boolean).join(", ") || "—";
  document.getElementById("pdSpecs").textContent = [p.bedrooms, p.size ? p.size + " m²" : null].filter(Boolean).join(" · ") || "—";
  document.getElementById("pdDescription").textContent = p.description || "";

  const ownerName = getAgentName(p.ownerAgentId);
  document.getElementById("pdOwner").textContent = ownerName || "Sahipsiz — Havuzda";

  const editable = canEdit(p);
  const claimBtn = document.getElementById("pdClaimBtn");
  const releaseBtn = document.getElementById("pdReleaseBtn");
  const statusSelect = document.getElementById("pdStatusSelect");
  const editBtn = document.getElementById("pdEditBtn");
  const permNote = document.getElementById("pdPermissionNote");

  claimBtn.style.display = !p.ownerAgentId ? "inline-flex" : "none";
  releaseBtn.style.display = (editable && p.ownerAgentId) ? "inline-flex" : "none";
  statusSelect.style.display = editable ? "inline-block" : "none";
  editBtn.style.display = editable ? "inline-flex" : "none";
  permNote.style.display = (!editable && p.ownerAgentId) ? "block" : "none";

  if (editable) statusSelect.value = p.status;

  loadComments(propertyId);
  document.getElementById("propertyDetailOverlay").classList.add("show");
}

function closePropertyDetail() {
  document.getElementById("propertyDetailOverlay").classList.remove("show");
  activePropertyId = null;
}

async function claimProperty() {
  if (!activePropertyId) return;
  try {
    await updateDoc(doc(db, "properties", activePropertyId), { ownerAgentId: currentAgent.id });
    const p = allProperties.find(p => p.id === activePropertyId);
    await logActivity(`<b>${currentAgent.name}</b> <b>${p.title}</b> ilanını sahiplendi`);
    showToast("İlan sahiplenildi.");
    await loadProperties();
    openPropertyDetail(activePropertyId);
  } catch (err) {
    console.error(err);
    showToast("İşlem başarısız oldu.");
  }
}

async function releaseProperty() {
  if (!activePropertyId) return;
  if (!confirm("Bu ilanı havuza bırakmak istediğinize emin misiniz? Diğer danışmanlar sahiplenebilir.")) return;
  try {
    await updateDoc(doc(db, "properties", activePropertyId), { ownerAgentId: null });
    const p = allProperties.find(p => p.id === activePropertyId);
    await logActivity(`<b>${currentAgent.name}</b> <b>${p.title}</b> ilanını havuza bıraktı`);
    showToast("İlan havuza bırakıldı.");
    await loadProperties();
    openPropertyDetail(activePropertyId);
  } catch (err) {
    console.error(err);
    showToast("İşlem başarısız oldu.");
  }
}

async function changePropertyStatus(e) {
  if (!activePropertyId) return;
  const newStatus = e.target.value;
  try {
    await updateDoc(doc(db, "properties", activePropertyId), { status: newStatus });
    document.getElementById("pdStatusBadge").textContent = STATUS_LABELS[newStatus];
    await loadProperties();
    showToast("Durum güncellendi.");
  } catch (err) {
    console.error(err);
    showToast("İşlem başarısız oldu.");
  }
}

// ---------- Yorumlar / sorular (herkes ekleyebilir) ----------

async function loadComments(propertyId) {
  const el = document.getElementById("commentsList");
  el.innerHTML = `<div class="spinner" style="margin:16px auto;"></div>`;
  try {
    const snap = await getDocs(query(collection(db, "properties", propertyId, "comments"), orderBy("createdAt", "desc")));
    if (snap.empty) {
      el.innerHTML = `<div class="empty-state"><p>Henüz yorum yok. İlk soruyu siz sorun.</p></div>`;
      return;
    }
    const rows = [];
    snap.forEach(d => {
      const c = d.data();
      const time = c.createdAt?.toDate ? c.createdAt.toDate() : new Date();
      rows.push(`
        <div class="interaction-item">
          <div class="interaction-icon">💬</div>
          <div class="interaction-body">
            <div>${escapeHtml(c.text)}</div>
            <div class="interaction-meta">${escapeHtml(c.agentName)} · ${formatDate(time)}</div>
          </div>
        </div>
      `);
    });
    el.innerHTML = rows.join("");
  } catch (err) {
    console.error(err);
    el.innerHTML = `<div class="empty-state"><p>Yüklenemedi.</p></div>`;
  }
}

async function addComment(e) {
  e.preventDefault();
  if (!activePropertyId) return;
  const text = document.getElementById("commentText").value.trim();
  if (!text) return;

  try {
    await addDoc(collection(db, "properties", activePropertyId, "comments"), {
      text, agentId: currentAgent.id, agentName: currentAgent.name, createdAt: serverTimestamp()
    });
    document.getElementById("commentForm").reset();
    await loadComments(activePropertyId);
  } catch (err) {
    console.error(err);
    showToast("Gönderilemedi.");
  }
}

// ---------- Ekle / Düzenle modalı ----------

function openPropertyModal(propertyId) {
  const form = document.getElementById("propertyForm");
  form.reset();
  document.getElementById("propertyId").value = propertyId || "";
  document.getElementById("propertyModalTitle").textContent = propertyId ? "İlanı Düzenle" : "Yeni İlan";

  if (propertyId) {
    const p = allProperties.find(p => p.id === propertyId);
    // Güvenlik: düzenleme yetkisi yoksa formu açma
    if (!p || !canEdit(p)) {
      showToast("Bu ilanı düzenleme yetkiniz yok.");
      return;
    }
    document.getElementById("propertyTitle").value = p.title || "";
    document.getElementById("propertyType").value = p.type || "sale";
    document.getElementById("propertyPrice").value = p.price || "";
    document.getElementById("propertyCity").value = p.city || "";
    document.getElementById("propertyArea").value = p.area || "";
    document.getElementById("propertyAddress").value = p.address || "";
    document.getElementById("propertyBedrooms").value = p.bedrooms || "";
    document.getElementById("propertySize").value = p.size || "";
    document.getElementById("propertyDescription").value = p.description || "";
    document.getElementById("propertyOwnerContact").value = p.ownerContact || "";
  }

  closePropertyDetail();
  document.getElementById("propertyModalOverlay").classList.add("show");
}

function closePropertyModal() {
  document.getElementById("propertyModalOverlay").classList.remove("show");
  history.replaceState(null, "", window.location.pathname);
}

async function saveProperty(e) {
  e.preventDefault();
  const propertyId = document.getElementById("propertyId").value;
  const btn = document.getElementById("savePropertyBtn");
  btn.disabled = true;
  btn.textContent = "Kaydediliyor...";

  const payload = {
    title: document.getElementById("propertyTitle").value.trim(),
    type: document.getElementById("propertyType").value,
    price: Number(document.getElementById("propertyPrice").value) || 0,
    city: document.getElementById("propertyCity").value.trim(),
    area: document.getElementById("propertyArea").value.trim(),
    address: document.getElementById("propertyAddress").value.trim(),
    bedrooms: document.getElementById("propertyBedrooms").value.trim(),
    size: Number(document.getElementById("propertySize").value) || null,
    description: document.getElementById("propertyDescription").value.trim(),
    ownerContact: document.getElementById("propertyOwnerContact").value.trim(),
  };

  try {
    if (propertyId) {
      const existing = allProperties.find(p => p.id === propertyId);
      if (!existing || !canEdit(existing)) {
        showToast("Bu ilanı düzenleme yetkiniz yok.");
        return;
      }
      await updateDoc(doc(db, "properties", propertyId), payload);
      showToast("İlan güncellendi.");
    } else {
      payload.status = "available";
      payload.listedBy = currentAgent.id;
      payload.ownerAgentId = currentAgent.id; // varsayılan: ekleyen danışman sahibi olur
      payload.createdAt = serverTimestamp();
      await addDoc(collection(db, "properties"), payload);
      await logActivity(`<b>${currentAgent.name}</b> yeni bir ilan ekledi: <b>${payload.title}</b>`);
      showToast("İlan eklendi — sizin ilanınız olarak kaydedildi. İsterseniz havuza bırakabilirsiniz.");
    }
    closePropertyModal();
    await loadProperties();
  } catch (err) {
    console.error(err);
    showToast("Bir hata oluştu, tekrar deneyin.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Kaydet";
  }
}

// ---------- Yardımcılar ----------

async function logActivity(text) {
  try {
    await addDoc(collection(db, "activityFeed"), {
      text, agentId: currentAgent.id, agentName: currentAgent.name, createdAt: serverTimestamp()
    });
  } catch (err) { console.error(err); }
}

function getAgentName(agentId) {
  if (!agentId) return null;
  const a = allAgents.find(a => a.id === agentId);
  return a ? a.name : "Bilinmeyen";
}

function formatDate(date) {
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
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
