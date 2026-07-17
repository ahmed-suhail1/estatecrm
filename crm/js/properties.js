import { requireAuth, mountShell } from "./shell.js";
import {
  db, collection, doc, addDoc, updateDoc, getDocs, query, orderBy, serverTimestamp
} from "./firebase-config.js";

let currentAgent = null;
let allProperties = [];

const STATUS_LABELS = { available: "Aktif", reserved: "Rezerve", sold: "Satıldı", rented: "Kiralandı" };
const STATUS_ORDER = ["available", "reserved", "sold", "rented"];

requireAuth(async (agent) => {
  currentAgent = agent;
  mountShell("properties", agent);
  const content = document.getElementById("pageContent");
  content.appendChild(document.getElementById("pageTemplate").content.cloneNode(true));

  await loadProperties();
  bindUI();

  if (new URLSearchParams(window.location.search).get("new") === "1") {
    openPropertyModal();
  }
});

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

  grid.innerHTML = properties.map(p => `
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
    </div>
  `).join("");

  grid.querySelectorAll(".property-card").forEach(card => {
    card.addEventListener("click", () => openPropertyModal(card.dataset.id));
  });
}

function openPropertyModal(propertyId) {
  const form = document.getElementById("propertyForm");
  form.reset();
  document.getElementById("propertyId").value = propertyId || "";
  document.getElementById("propertyModalTitle").textContent = propertyId ? "İlanı Düzenle" : "Yeni İlan";

  if (propertyId) {
    const p = allProperties.find(p => p.id === propertyId);
    if (p) {
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
  }

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
      await updateDoc(doc(db, "properties", propertyId), payload);
      showToast("İlan güncellendi.");
    } else {
      payload.status = "available";
      payload.listedBy = currentAgent.id;
      payload.createdAt = serverTimestamp();
      await addDoc(collection(db, "properties"), payload);
      await logActivity(`<b>${currentAgent.name}</b> yeni bir ilan ekledi: <b>${payload.title}</b>`);
      showToast("İlan eklendi.");
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

async function logActivity(text) {
  try {
    await addDoc(collection(db, "activityFeed"), {
      text, agentId: currentAgent.id, agentName: currentAgent.name, createdAt: serverTimestamp()
    });
  } catch (err) { console.error(err); }
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
