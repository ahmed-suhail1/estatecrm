import { requireAuth, mountShell } from "./shell.js";
import {
  db, collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where, orderBy,
  serverTimestamp, Timestamp
} from "./firebase-config.js";

let currentAgent = null;
let isAdmin = false;
let allAgents = [];
let allSales = [];
let activeSaleId = null;

const PAYMENT_LABELS = { bekliyor: "Bekliyor", kismi: "Kısmi Ödendi", tamamlandi: "Tamamlandı" };
const CITIZEN_LABELS = { evet: "Evet", hayir: "Hayır", belirsiz: "Belirsiz" };

requireAuth(async (agent) => {
  currentAgent = agent;
  isAdmin = agent.role === "admin";
  mountShell("sales", agent);

  const content = document.getElementById("pageContent");
  content.appendChild(document.getElementById("pageTemplate").content.cloneNode(true));

  if (isAdmin) {
    document.getElementById("pageSubtitle").textContent = "Tüm danışmanların satış kayıtları.";
    document.getElementById("adminSection").style.display = "block";
    await loadAgents();
  } else {
    document.getElementById("pageSubtitle").textContent = "Yalnızca kendi satış kayıtlarınızı görürsünüz.";
  }

  renderTableHead();
  await loadSales();
  bindUI();
});

async function loadAgents() {
  const snap = await getDocs(query(collection(db, "agents"), orderBy("name")));
  allAgents = [];
  snap.forEach(d => {
    const data = d.data();
    if (data.status === "active") allAgents.push({ id: d.id, ...data });
  });
  const agentFilter = document.getElementById("agentFilter");
  agentFilter.innerHTML = `<option value="">Tüm danışmanlar</option>` +
    allAgents.map(a => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join("");
}

// Danışmanlar yalnızca kendi kayıtlarını görür; yönetici hepsini görür.
// Bu ayrım hem sorgu seviyesinde hem arayüzde uygulanıyor.
async function loadSales() {
  let snap;
  if (isAdmin) {
    snap = await getDocs(query(collection(db, "sales"), orderBy("saleDate", "desc")));
  } else {
    snap = await getDocs(query(collection(db, "sales"), where("agentId", "==", currentAgent.id)));
  }
  allSales = [];
  snap.forEach(d => allSales.push({ id: d.id, ...d.data() }));
  if (!isAdmin) allSales.sort((a, b) => (b.saleDate || "").localeCompare(a.saleDate || ""));
  renderKpis();
  renderSales();
}

function bindUI() {
  document.getElementById("addSaleBtn").addEventListener("click", () => openSaleModal());
  document.getElementById("closeSaleModal").addEventListener("click", closeSaleModal);
  document.getElementById("cancelSaleBtn").addEventListener("click", closeSaleModal);
  document.getElementById("saleForm").addEventListener("submit", saveSale);
  document.getElementById("deleteSaleBtn").addEventListener("click", deleteSale);
  document.getElementById("saleModalOverlay").addEventListener("click", (e) => {
    if (e.target.id === "saleModalOverlay") closeSaleModal();
  });

  document.getElementById("currencyTL").addEventListener("change", onCurrencyChange);
  document.getElementById("currencyUSD").addEventListener("change", onCurrencyChange);
  ["saleAmount", "exchangeRate", "commissionRate"].forEach(id => {
    document.getElementById(id).addEventListener("input", recalculate);
  });

  if (isAdmin) {
    document.getElementById("agentFilter").addEventListener("change", renderSales);
    document.getElementById("dateFromFilter").addEventListener("change", renderSales);
    document.getElementById("dateToFilter").addEventListener("change", renderSales);
  }
}

function onCurrencyChange() {
  const isUsd = document.getElementById("currencyUSD").checked;
  document.getElementById("exchangeRateField").style.display = isUsd ? "block" : "none";
  recalculate();
}

function recalculate() {
  const isUsd = document.getElementById("currencyUSD").checked;
  const amount = parseFloat(document.getElementById("saleAmount").value) || 0;
  const rate = parseFloat(document.getElementById("exchangeRate").value) || 0;
  const commissionRate = parseFloat(document.getElementById("commissionRate").value) || 0;

  const tl = isUsd ? amount * rate : amount;
  document.getElementById("tlEquivalent").value = tl ? tl.toFixed(2) : "";
  document.getElementById("commissionAmount").value = tl ? ((tl * commissionRate) / 100).toFixed(2) : "";
}

// ---------- Yetki ----------

function canManage(sale) {
  if (isAdmin) return true;
  return sale.agentId === currentAgent.id;
}

// ---------- Tablo başlığı (yöneticide "Danışman" sütunu ekli) ----------

function renderTableHead() {
  const head = document.getElementById("salesTableHead");
  head.innerHTML = `
    <tr>
      <th>Tarih</th>
      <th>Müşteri</th>
      <th>Proje / Daire</th>
      ${isAdmin ? "<th>Danışman</th>" : ""}
      <th>Tutar</th>
      <th>Komisyon</th>
      <th>Ödeme</th>
      <th>Vatandaşlık</th>
    </tr>
  `;
}

function renderKpis() {
  if (!isAdmin) return;
  const filtered = getFilteredSales();
  const totalCommission = filtered.reduce((sum, s) => sum + (Number(s.commissionAmount) || 0), 0);
  const totalVolume = filtered.reduce((sum, s) => sum + (Number(s.tlEquivalent) || 0), 0);

  document.getElementById("salesKpiRow").innerHTML = `
    <div class="card sales-kpi-card"><div class="sales-kpi-value">${filtered.length}</div><div class="sales-kpi-label">Toplam Satış</div></div>
    <div class="card sales-kpi-card"><div class="sales-kpi-value">₺${formatNum(totalVolume)}</div><div class="sales-kpi-label">Toplam Hacim (TL)</div></div>
    <div class="card sales-kpi-card"><div class="sales-kpi-value">₺${formatNum(totalCommission)}</div><div class="sales-kpi-label">Toplam Komisyon</div></div>
  `;
}

function getFilteredSales() {
  if (!isAdmin) return allSales;

  const agentId = document.getElementById("agentFilter").value;
  const dateFrom = document.getElementById("dateFromFilter").value;
  const dateTo = document.getElementById("dateToFilter").value;

  return allSales.filter(s => {
    if (agentId && s.agentId !== agentId) return false;
    if (dateFrom && s.saleDate < dateFrom) return false;
    if (dateTo && s.saleDate > dateTo) return false;
    return true;
  });
}

function renderSales() {
  const sales = getFilteredSales();
  if (isAdmin) renderKpis();

  const emptyState = document.getElementById("emptyState");
  const tableBody = document.getElementById("salesTableBody");
  const cardList = document.getElementById("salesCardList");

  if (sales.length === 0) {
    emptyState.style.display = "block";
    tableBody.innerHTML = "";
    cardList.innerHTML = "";
    return;
  }
  emptyState.style.display = "none";

  tableBody.innerHTML = sales.map(s => {
    const agentName = getAgentName(s.agentId);
    return `
      <tr data-id="${s.id}">
        <td>${formatDateStr(s.saleDate)}</td>
        <td>
          <div class="sales-primary">${escapeHtml(s.customerName)}</div>
          ${s.fxBringer || s.fxSeller ? `<div class="sales-sub">Döviz: ${escapeHtml(s.fxBringer || "—")} / ${escapeHtml(s.fxSeller || "—")}</div>` : ""}
        </td>
        <td>
          <div>${escapeHtml(s.projectName || "—")}</div>
          <div class="sales-sub">${escapeHtml(s.unitInfo || "")}</div>
        </td>
        ${isAdmin ? `<td>${escapeHtml(agentName || "—")}</td>` : ""}
        <td>
          <div class="sales-primary">${s.currency === "USD" ? "$" : "₺"}${formatNum(s.saleAmount)}</div>
          <div class="sales-sub">≈ ₺${formatNum(s.tlEquivalent)}</div>
        </td>
        <td>₺${formatNum(s.commissionAmount)}<div class="sales-sub">%${s.commissionRate || 0}</div></td>
        <td><span class="badge">${PAYMENT_LABELS[s.paymentStatus] || "—"}</span></td>
        <td>${CITIZEN_LABELS[s.citizenshipEligibility] || "—"}</td>
      </tr>
    `;
  }).join("");

  tableBody.querySelectorAll("tr").forEach(row => {
    row.addEventListener("click", () => openSaleModal(row.dataset.id));
  });

  cardList.innerHTML = sales.map(s => {
    const agentName = getAgentName(s.agentId);
    return `
      <div class="sale-card" data-id="${s.id}">
        <div class="sale-card-top">
          <div>
            <div class="sale-card-name">${escapeHtml(s.customerName)}</div>
            <div class="sale-card-meta">${escapeHtml(s.projectName || "")} ${s.unitInfo ? "· " + escapeHtml(s.unitInfo) : ""}</div>
          </div>
          <span class="badge">${PAYMENT_LABELS[s.paymentStatus] || "—"}</span>
        </div>
        <div class="sale-card-amount">${s.currency === "USD" ? "$" : "₺"}${formatNum(s.saleAmount)} <span style="font-size:var(--text-xs); color:var(--color-ink-soft); font-family:var(--font-body);">≈ ₺${formatNum(s.tlEquivalent)}</span></div>
        <div class="sale-card-footer">
          <span>${formatDateStr(s.saleDate)}${isAdmin && agentName ? " · " + escapeHtml(agentName) : ""}</span>
          <span>Komisyon: ₺${formatNum(s.commissionAmount)}</span>
        </div>
      </div>
    `;
  }).join("");

  cardList.querySelectorAll(".sale-card").forEach(card => {
    card.addEventListener("click", () => openSaleModal(card.dataset.id));
  });
}

// ---------- Ekle / Düzenle ----------

function openSaleModal(saleId) {
  const form = document.getElementById("saleForm");
  form.reset();
  document.getElementById("saleId").value = saleId || "";
  document.getElementById("exchangeRateField").style.display = "none";
  document.getElementById("deleteSaleBtn").style.display = "none";

  if (saleId) {
    const sale = allSales.find(s => s.id === saleId);
    if (!sale || !canManage(sale)) {
      showToast("Bu kaydı düzenleme yetkiniz yok.");
      return;
    }
    document.getElementById("saleModalTitle").textContent = "Satışı Düzenle";
    document.getElementById("saleDate").value = sale.saleDate || "";
    document.getElementById("saleCustomerName").value = sale.customerName || "";
    document.getElementById("saleProjectName").value = sale.projectName || "";
    document.getElementById("saleUnitInfo").value = sale.unitInfo || "";
    document.getElementById("saleFxBringer").value = sale.fxBringer || "";
    document.getElementById("saleFxSeller").value = sale.fxSeller || "";
    document.getElementById("saleIntermediary").value = sale.intermediary || "";
    document.getElementById("currencyTL").checked = sale.currency !== "USD";
    document.getElementById("currencyUSD").checked = sale.currency === "USD";
    document.getElementById("exchangeRateField").style.display = sale.currency === "USD" ? "block" : "none";
    document.getElementById("saleAmount").value = sale.saleAmount ?? "";
    document.getElementById("exchangeRate").value = sale.exchangeRate ?? "";
    document.getElementById("tlEquivalent").value = sale.tlEquivalent ?? "";
    document.getElementById("commissionRate").value = sale.commissionRate ?? "";
    document.getElementById("commissionAmount").value = sale.commissionAmount ?? "";
    document.getElementById("saleDeposit").value = sale.deposit ?? "";
    document.getElementById("paymentStatus").value = sale.paymentStatus || "bekliyor";
    document.getElementById("deedDate").value = sale.deedDate || "";
    document.getElementById("citizenshipEligibility").value = sale.citizenshipEligibility || "belirsiz";
    document.getElementById("saleNotes").value = sale.notes || "";
    document.getElementById("deleteSaleBtn").style.display = "inline-flex";
  } else {
    document.getElementById("saleModalTitle").textContent = "Yeni Satış";
    document.getElementById("saleDate").value = new Date().toISOString().slice(0, 10);
  }

  document.getElementById("saleModalOverlay").classList.add("show");
}

function closeSaleModal() {
  document.getElementById("saleModalOverlay").classList.remove("show");
  activeSaleId = null;
}

async function saveSale(e) {
  e.preventDefault();
  const saleId = document.getElementById("saleId").value;
  const btn = document.getElementById("saveSaleBtn");
  btn.disabled = true;
  btn.textContent = "Kaydediliyor...";

  const payload = {
    saleDate: document.getElementById("saleDate").value,
    customerName: document.getElementById("saleCustomerName").value.trim(),
    projectName: document.getElementById("saleProjectName").value.trim(),
    unitInfo: document.getElementById("saleUnitInfo").value.trim(),
    fxBringer: document.getElementById("saleFxBringer").value.trim(),
    fxSeller: document.getElementById("saleFxSeller").value.trim(),
    intermediary: document.getElementById("saleIntermediary").value.trim(),
    currency: document.getElementById("currencyUSD").checked ? "USD" : "TL",
    saleAmount: parseFloat(document.getElementById("saleAmount").value) || 0,
    exchangeRate: parseFloat(document.getElementById("exchangeRate").value) || null,
    tlEquivalent: parseFloat(document.getElementById("tlEquivalent").value) || 0,
    commissionRate: parseFloat(document.getElementById("commissionRate").value) || 0,
    commissionAmount: parseFloat(document.getElementById("commissionAmount").value) || 0,
    deposit: parseFloat(document.getElementById("saleDeposit").value) || 0,
    paymentStatus: document.getElementById("paymentStatus").value,
    deedDate: document.getElementById("deedDate").value || null,
    citizenshipEligibility: document.getElementById("citizenshipEligibility").value,
    notes: document.getElementById("saleNotes").value.trim(),
  };

  try {
    if (saleId) {
      const existing = allSales.find(s => s.id === saleId);
      if (!existing || !canManage(existing)) {
        showToast("Bu kaydı düzenleme yetkiniz yok.");
        return;
      }
      await updateDoc(doc(db, "sales", saleId), payload);
      showToast("Satış güncellendi.");
    } else {
      payload.agentId = currentAgent.id;
      payload.agentName = currentAgent.name;
      payload.createdAt = serverTimestamp();
      await addDoc(collection(db, "sales"), payload);
      await logActivity(`<b>${currentAgent.name}</b> yeni bir satış kaydetti: <b>${payload.customerName}</b>`);
      showToast("Satış eklendi.");
    }
    closeSaleModal();
    await loadSales();
  } catch (err) {
    console.error(err);
    showToast("Bir hata oluştu, tekrar deneyin.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Kaydet";
  }
}

async function deleteSale() {
  const saleId = document.getElementById("saleId").value;
  if (!saleId) return;
  const existing = allSales.find(s => s.id === saleId);
  if (!existing || !canManage(existing)) {
    showToast("Bu kaydı silme yetkiniz yok.");
    return;
  }
  if (!confirm("Bu satış kaydını silmek istediğinize emin misiniz?")) return;

  try {
    await deleteDoc(doc(db, "sales", saleId));
    showToast("Satış kaydı silindi.");
    closeSaleModal();
    await loadSales();
  } catch (err) {
    console.error(err);
    showToast("Silinemedi.");
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
  if (agentId === currentAgent.id) return currentAgent.name;
  const a = allAgents.find(a => a.id === agentId);
  return a ? a.name : null;
}

function formatNum(n) {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(Number(n) || 0);
}

function formatDateStr(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d)) return dateStr;
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric" }).format(d);
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
