import { requireAuth, mountShell } from "./shell.js";
import {
  db, collection, doc, addDoc, updateDoc, getDoc, getDocs, query, orderBy,
  serverTimestamp, Timestamp
} from "./firebase-config.js";

let currentAgent = null;
let allAgents = [];
let allLeads = [];
let activeLeadId = null;

const STATUS_LABELS = {
  new: "Yeni", contacted: "İletişime geçildi", viewing: "Görüşme/Gezi",
  negotiating: "Pazarlık", closed: "Kapandı", lost: "Kaybedildi"
};
const INTERACTION_LABELS = {
  call: "📞 Telefon", whatsapp: "💬 WhatsApp", email: "✉️ E-posta",
  viewing: "🏠 Gezi", meeting: "🤝 Görüşme"
};

requireAuth(async (agent) => {
  currentAgent = agent;
  mountShell("leads", agent);
  const content = document.getElementById("pageContent");
  content.appendChild(document.getElementById("pageTemplate").content.cloneNode(true));

  await loadAgents();
  await loadLeads();
  bindUI();

  // URL'den ?new=1 gelirse formu direkt aç
  if (new URLSearchParams(window.location.search).get("new") === "1") {
    openLeadModal();
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

async function loadLeads() {
  const snap = await getDocs(query(collection(db, "customers"), orderBy("createdAt", "desc")));
  allLeads = [];
  snap.forEach(d => allLeads.push({ id: d.id, ...d.data() }));
  renderLeads();
}

function bindUI() {
  document.getElementById("addLeadBtn").addEventListener("click", () => openLeadModal());
  document.getElementById("searchInput").addEventListener("input", renderLeads);
  document.getElementById("statusFilter").addEventListener("change", renderLeads);
  document.getElementById("ownerFilter").addEventListener("change", renderLeads);

  document.getElementById("closeLeadModal").addEventListener("click", closeLeadModal);
  document.getElementById("cancelLeadBtn").addEventListener("click", closeLeadModal);
  document.getElementById("leadForm").addEventListener("submit", saveLead);

  document.getElementById("closeDetailModal").addEventListener("click", closeDetailModal);
  document.getElementById("claimBtn").addEventListener("click", claimLead);
  document.getElementById("statusSelect").addEventListener("change", changeStatus);
  document.getElementById("reassignSelect").addEventListener("change", reassignLead);
  document.getElementById("editLeadBtn").addEventListener("click", () => openLeadModal(activeLeadId));
  document.getElementById("interactionForm").addEventListener("submit", addInteraction);
  document.getElementById("matchBtn").addEventListener("click", findMatches);

  // Karartılmış alana (modal kutusunun dışına) tıklanınca kapat
  document.getElementById("leadModalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "leadModalOverlay") closeLeadModal();
  });
  document.getElementById("detailModalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "detailModalOverlay") closeDetailModal();
  });

  const statusSelect = document.getElementById("statusSelect");
  statusSelect.innerHTML = Object.entries(STATUS_LABELS)
    .map(([val, label]) => `<option value="${val}">${label}</option>`).join("");
}

function canEdit(lead) {
  if (currentAgent.role === "admin") return true;
  return lead.assignedAgentId === currentAgent.id;
}

function getFilteredLeads() {
  const search = document.getElementById("searchInput").value.trim().toLowerCase();
  const status = document.getElementById("statusFilter").value;
  const owner = document.getElementById("ownerFilter").value;

  return allLeads.filter(l => {
    if (search && !(`${l.name} ${l.phone}`.toLowerCase().includes(search))) return false;
    if (status && l.status !== status) return false;
    if (owner === "unclaimed" && l.assignedAgentId) return false;
    if (owner === "mine" && l.assignedAgentId !== currentAgent.id) return false;
    return true;
  });
}

function renderLeads() {
  const leads = getFilteredLeads();
  const emptyState = document.getElementById("emptyState");
  const tableBody = document.getElementById("leadsTableBody");
  const cardList = document.getElementById("leadsCardList");

  if (leads.length === 0) {
    emptyState.style.display = "block";
    tableBody.innerHTML = "";
    cardList.innerHTML = "";
    return;
  }
  emptyState.style.display = "none";

  // --- Masaüstü tablo ---
  tableBody.innerHTML = leads.map(l => {
    const agentName = getAgentName(l.assignedAgentId);
    const budget = formatBudget(l.budgetMin, l.budgetMax);
    const nextAction = l.nextActionDate ? formatDate(toDate(l.nextActionDate)) : "—";
    return `
      <tr data-id="${l.id}">
        <td>
          <div class="lead-name">${escapeHtml(l.name)}</div>
          <div class="lead-name-sub">${escapeHtml(interestLabel(l.interestedIn))}</div>
        </td>
        <td>${escapeHtml(l.phone)}</td>
        <td>${escapeHtml((l.preferredAreas || []).join(", ")) || "—"}</td>
        <td>${budget}</td>
        <td><span class="pill pill-${l.status}">${STATUS_LABELS[l.status] || l.status}</span></td>
        <td>${agentName ? escapeHtml(agentName) : '<span class="unclaimed-text">Sahipsiz</span>'}</td>
        <td>${nextAction}</td>
        <td><button class="btn btn-ghost btn-sm open-lead">Aç</button></td>
      </tr>
    `;
  }).join("");

  tableBody.querySelectorAll("tr").forEach(row => {
    row.addEventListener("click", () => openDetailModal(row.dataset.id));
  });

  // --- Mobil kartlar ---
  cardList.innerHTML = leads.map(l => {
    const agentName = getAgentName(l.assignedAgentId);
    const nextAction = l.nextActionDate ? formatDate(toDate(l.nextActionDate)) : null;
    return `
      <div class="lead-card" data-id="${l.id}">
        <div class="lead-card-top">
          <div>
            <div class="lead-card-name">${escapeHtml(l.name)}</div>
            <div class="lead-card-phone">${escapeHtml(l.phone)}</div>
          </div>
          <span class="pill pill-${l.status}">${STATUS_LABELS[l.status] || l.status}</span>
        </div>
        <div class="lead-card-meta">
          <span>${escapeHtml(interestLabel(l.interestedIn))}</span>
          <span>•</span>
          <span>${formatBudget(l.budgetMin, l.budgetMax)}</span>
        </div>
        <div class="lead-card-footer">
          <span>${agentName ? escapeHtml(agentName) : '<span class="unclaimed-text">Sahipsiz</span>'}</span>
          ${nextAction ? `<span class="lead-card-next">${nextAction}</span>` : ""}
        </div>
      </div>
    `;
  }).join("");

  cardList.querySelectorAll(".lead-card").forEach(card => {
    card.addEventListener("click", () => openDetailModal(card.dataset.id));
  });
}

// ---------- Ekle / Düzenle modalı ----------

function openLeadModal(leadId) {
  const form = document.getElementById("leadForm");
  form.reset();
  document.getElementById("leadId").value = leadId || "";
  document.getElementById("leadModalTitle").textContent = leadId ? "Müşteriyi Düzenle" : "Yeni Müşteri";

  if (leadId) {
    const lead = allLeads.find(l => l.id === leadId);
    if (!lead || !canEdit(lead)) {
      showToast("Bu müşteriyi düzenleme yetkiniz yok.");
      return;
    }
    document.getElementById("leadName").value = lead.name || "";
      document.getElementById("leadPhone").value = lead.phone || "";
      document.getElementById("leadEmail").value = lead.email || "";
      document.getElementById("leadInterest").value = lead.interestedIn || "buy";
      document.getElementById("leadSource").value = lead.source || "walkin";
      document.getElementById("leadBudgetMin").value = lead.budgetMin || "";
      document.getElementById("leadBudgetMax").value = lead.budgetMax || "";
    document.getElementById("leadAreas").value = (lead.preferredAreas || []).join(", ");
    document.getElementById("leadNote").value = lead.note || "";
  }

  document.getElementById("leadModalOverlay").classList.add("show");
}

function closeLeadModal() {
  document.getElementById("leadModalOverlay").classList.remove("show");
  history.replaceState(null, "", window.location.pathname);
}

async function saveLead(e) {
  e.preventDefault();
  const leadId = document.getElementById("leadId").value;
  const btn = document.getElementById("saveLeadBtn");
  btn.disabled = true;
  btn.textContent = "Kaydediliyor...";

  const payload = {
    name: document.getElementById("leadName").value.trim(),
    phone: document.getElementById("leadPhone").value.trim(),
    email: document.getElementById("leadEmail").value.trim(),
    interestedIn: document.getElementById("leadInterest").value,
    source: document.getElementById("leadSource").value,
    budgetMin: Number(document.getElementById("leadBudgetMin").value) || null,
    budgetMax: Number(document.getElementById("leadBudgetMax").value) || null,
    preferredAreas: document.getElementById("leadAreas").value.split(",").map(s => s.trim()).filter(Boolean),
    note: document.getElementById("leadNote").value.trim(),
  };

  try {
    if (leadId) {
      const existing = allLeads.find(l => l.id === leadId);
      if (!existing || !canEdit(existing)) {
        showToast("Bu müşteriyi düzenleme yetkiniz yok.");
        return;
      }
      await updateDoc(doc(db, "customers", leadId), payload);
      showToast("Müşteri güncellendi.");
    } else {
      payload.status = "new";
      payload.assignedAgentId = null;
      payload.createdAt = serverTimestamp();
      payload.createdBy = currentAgent.id;
      await addDoc(collection(db, "customers"), payload);
      await logActivity(`<b>${currentAgent.name}</b> yeni bir müşteri ekledi: <b>${payload.name}</b>`);
      showToast("Müşteri eklendi.");
    }
    closeLeadModal();
    await loadLeads();
  } catch (err) {
    console.error(err);
    showToast("Bir hata oluştu, tekrar deneyin.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Kaydet";
  }
}

// ---------- Detay modalı ----------

async function openDetailModal(leadId) {
  activeLeadId = leadId;
  const lead = allLeads.find(l => l.id === leadId);
  if (!lead) return;

  document.getElementById("detailName").textContent = lead.name;
  document.getElementById("detailStatusPill").textContent = STATUS_LABELS[lead.status] || lead.status;
  document.getElementById("detailStatusPill").className = `pill pill-${lead.status}`;
  document.getElementById("detailPhone").textContent = lead.phone || "—";
  document.getElementById("detailBudget").textContent = formatBudget(lead.budgetMin, lead.budgetMax);
  document.getElementById("detailAreas").textContent = (lead.preferredAreas || []).join(", ") || "—";
  document.getElementById("detailAgent").textContent = getAgentName(lead.assignedAgentId) || "Sahipsiz";
  document.getElementById("statusSelect").value = lead.status;
  document.getElementById("matchResults").style.display = "none";
  document.getElementById("matchResults").innerHTML = "";

  const claimBtn = document.getElementById("claimBtn");
  const reassignSelect = document.getElementById("reassignSelect");
  const editable = canEdit(lead);

  if (!lead.assignedAgentId) {
    claimBtn.style.display = "inline-flex";
    reassignSelect.style.display = "none";
  } else {
    claimBtn.style.display = "none";
  }

  document.getElementById("statusSelect").style.display = editable ? "inline-block" : "none";
  document.getElementById("editLeadBtn").style.display = editable ? "inline-flex" : "none";
  document.getElementById("detailPermissionNote").style.display = (!editable && lead.assignedAgentId) ? "block" : "none";

  if (currentAgent.role === "admin") {
    reassignSelect.style.display = "inline-block";
    reassignSelect.innerHTML = `<option value="">Yeniden ata...</option>` +
      allAgents.map(a => `<option value="${a.id}" ${a.id === lead.assignedAgentId ? "selected" : ""}>${escapeHtml(a.name)}</option>`).join("");
  }

  await loadInteractions(leadId);
  document.getElementById("detailModalOverlay").classList.add("show");
}

function closeDetailModal() {
  document.getElementById("detailModalOverlay").classList.remove("show");
  activeLeadId = null;
}

async function claimLead() {
  if (!activeLeadId) return;
  try {
    await updateDoc(doc(db, "customers", activeLeadId), { assignedAgentId: currentAgent.id });
    const lead = allLeads.find(l => l.id === activeLeadId);
    await logActivity(`<b>${currentAgent.name}</b> <b>${lead.name}</b> müşterisini üstlendi`);
    showToast("Müşteri üstlenildi.");
    await loadLeads();
    openDetailModal(activeLeadId);
  } catch (err) {
    console.error(err);
    showToast("İşlem başarısız oldu.");
  }
}

async function reassignLead(e) {
  const newAgentId = e.target.value;
  if (!newAgentId || !activeLeadId) return;
  try {
    await updateDoc(doc(db, "customers", activeLeadId), { assignedAgentId: newAgentId });
    const newAgent = allAgents.find(a => a.id === newAgentId);
    const lead = allLeads.find(l => l.id === activeLeadId);
    await logActivity(`<b>${currentAgent.name}</b> <b>${lead.name}</b> müşterisini <b>${newAgent.name}</b>'e atadı`);
    showToast("Yeniden atandı.");
    await loadLeads();
    openDetailModal(activeLeadId);
  } catch (err) {
    console.error(err);
    showToast("İşlem başarısız oldu.");
  }
}

async function changeStatus(e) {
  if (!activeLeadId) return;
  const newStatus = e.target.value;
  try {
    await updateDoc(doc(db, "customers", activeLeadId), { status: newStatus });
    document.getElementById("detailStatusPill").textContent = STATUS_LABELS[newStatus];
    document.getElementById("detailStatusPill").className = `pill pill-${newStatus}`;
    await loadLeads();
    showToast("Durum güncellendi.");
  } catch (err) {
    console.error(err);
    showToast("İşlem başarısız oldu.");
  }
}

// ---------- Görüşme geçmişi ----------

async function loadInteractions(leadId) {
  const el = document.getElementById("interactionsList");
  el.innerHTML = `<div class="spinner" style="margin:16px auto;"></div>`;
  try {
    const snap = await getDocs(query(collection(db, "customers", leadId, "interactions"), orderBy("createdAt", "desc")));
    if (snap.empty) {
      el.innerHTML = `<div class="empty-state"><p>Henüz görüşme kaydı yok.</p></div>`;
      return;
    }
    const rows = [];
    snap.forEach(d => {
      const i = d.data();
      const time = i.createdAt?.toDate ? i.createdAt.toDate() : new Date();
      rows.push(`
        <div class="interaction-item">
          <div class="interaction-icon">${(INTERACTION_LABELS[i.type] || "").slice(0, 2)}</div>
          <div class="interaction-body">
            <div>${escapeHtml(i.note)}</div>
            <div class="interaction-meta">${escapeHtml(i.agentName)} · ${formatDate(time)}${i.nextActionDate ? ` · Sonraki: ${formatDate(toDate(i.nextActionDate))}` : ""}</div>
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

async function addInteraction(e) {
  e.preventDefault();
  if (!activeLeadId) return;
  const type = document.getElementById("interactionType").value;
  const note = document.getElementById("interactionNote").value.trim();
  const nextDate = document.getElementById("interactionNextDate").value;
  if (!note) return;

  try {
    await addDoc(collection(db, "customers", activeLeadId, "interactions"), {
      type, note,
      nextActionDate: nextDate ? Timestamp.fromDate(new Date(nextDate)) : null,
      agentId: currentAgent.id,
      agentName: currentAgent.name,
      createdAt: serverTimestamp()
    });

    const updatePayload = {};
    if (nextDate) {
      updatePayload.nextActionDate = Timestamp.fromDate(new Date(nextDate));
      // Ayrıca panelde görünmesi için bir görev de oluştur
      const lead = allLeads.find(l => l.id === activeLeadId);
      await addDoc(collection(db, "tasks"), {
        agentId: currentAgent.id,
        customerId: activeLeadId,
        customerName: lead?.name || "",
        title: `${lead?.name || "Müşteri"} ile takip et`,
        dueDate: Timestamp.fromDate(new Date(nextDate)),
        done: false,
        createdAt: serverTimestamp()
      });
    }
    if (Object.keys(updatePayload).length) {
      await updateDoc(doc(db, "customers", activeLeadId), updatePayload);
    }

    document.getElementById("interactionForm").reset();
    await loadInteractions(activeLeadId);
    await loadLeads();
    showToast("Görüşme kaydedildi.");
  } catch (err) {
    console.error(err);
    showToast("Kaydedilemedi.");
  }
}

// ---------- İlan eşleştirme (AI için ayrılmış yer tutucu — bkz. matching.js) ----------

async function findMatches() {
  const lead = allLeads.find(l => l.id === activeLeadId);
  const resultsEl = document.getElementById("matchResults");
  resultsEl.style.display = "block";
  resultsEl.innerHTML = `<div class="spinner" style="margin:8px auto;"></div>`;

  try {
    const { matchPropertiesToCustomer } = await import("./matching.js");
    const matches = await matchPropertiesToCustomer(lead);
    if (matches.length === 0) {
      resultsEl.innerHTML = `<p style="margin:0;">Uygun ilan bulunamadı.</p>`;
      return;
    }
    resultsEl.innerHTML = matches.map(m => `
      <div class="match-item">
        <span>${escapeHtml(m.title)} — ${formatBudget(m.price, null)}</span>
        <span class="match-score">${m.score}% uyum</span>
      </div>
    `).join("");
  } catch (err) {
    console.error(err);
    resultsEl.innerHTML = `<p style="margin:0;">Eşleştirme yapılamadı.</p>`;
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

function interestLabel(val) {
  return { buy: "Satın alma", rent: "Kiralama", sell: "Satış" }[val] || val || "—";
}

function formatBudget(min, max) {
  if (!min && !max) return "—";
  const fmt = (n) => new Intl.NumberFormat("tr-TR").format(n);
  if (min && max) return `₺${fmt(min)} - ₺${fmt(max)}`;
  return `₺${fmt(min || max)}`;
}

function toDate(ts) {
  return ts?.toDate ? ts.toDate() : new Date(ts);
}

function formatDate(date) {
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" }).format(date);
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
