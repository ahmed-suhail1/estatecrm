import { requireAuth, mountShell } from "./shell.js";
import {
  db, collection, doc, addDoc, updateDoc, getDocs, query, orderBy, where,
  serverTimestamp, Timestamp
} from "./firebase-config.js";

let currentAgent = null;
let allCustomers = [];
let allProperties = [];
let allAppointments = [];
let weekStart = startOfWeek(new Date());

const DAY_NAMES = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const STATUS_LABELS = { scheduled: "Planlandı", done: "Tamamlandı", cancelled: "İptal edildi", "no-show": "Gelmedi" };

requireAuth(async (agent) => {
  currentAgent = agent;
  mountShell("calendar", agent);
  const content = document.getElementById("pageContent");
  content.appendChild(document.getElementById("pageTemplate").content.cloneNode(true));

  await Promise.all([loadCustomers(), loadProperties(), loadAppointments()]);
  bindUI();
  renderWeek();
  renderAgenda();
});

async function loadCustomers() {
  const snap = await getDocs(query(collection(db, "customers"), orderBy("name")));
  allCustomers = [];
  snap.forEach(d => allCustomers.push({ id: d.id, ...d.data() }));
}

async function loadProperties() {
  const snap = await getDocs(query(collection(db, "properties"), orderBy("title")));
  allProperties = [];
  snap.forEach(d => allProperties.push({ id: d.id, ...d.data() }));
}

async function loadAppointments() {
  const snap = await getDocs(query(collection(db, "appointments"), orderBy("datetime", "asc")));
  allAppointments = [];
  snap.forEach(d => allAppointments.push({ id: d.id, ...d.data() }));
}

function bindUI() {
  document.getElementById("addApptBtn").addEventListener("click", () => openApptModal());
  document.getElementById("closeApptModal").addEventListener("click", closeApptModal);
  document.getElementById("cancelApptBtn").addEventListener("click", closeApptModal);
  document.getElementById("apptForm").addEventListener("submit", saveAppt);
  document.getElementById("prevWeek").addEventListener("click", () => { weekStart.setDate(weekStart.getDate() - 7); renderWeek(); });
  document.getElementById("nextWeek").addEventListener("click", () => { weekStart.setDate(weekStart.getDate() + 7); renderWeek(); });

  const customerSelect = document.getElementById("apptCustomer");
  customerSelect.innerHTML = allCustomers.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");

  const propertySelect = document.getElementById("apptProperty");
  propertySelect.innerHTML += allProperties.map(p => `<option value="${p.id}">${escapeHtml(p.title)}</option>`).join("");
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Pazartesi başlangıç
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function renderWeek() {
  const label = document.getElementById("weekLabel");
  const grid = document.getElementById("weekGrid");
  const fmt = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" });
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
  label.textContent = `${fmt.format(weekStart)} – ${fmt.format(weekEnd)}`;

  const today = new Date();
  let html = "";
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart); day.setDate(day.getDate() + i);
    const isToday = day.toDateString() === today.toDateString();
    const dayAppts = allAppointments.filter(a => toDate(a.datetime).toDateString() === day.toDateString());

    html += `
      <div class="day-column">
        <div class="day-header ${isToday ? "is-today" : ""}">
          <div class="day-name">${DAY_NAMES[day.getDay()].slice(0, 3)}</div>
          <div class="day-num">${day.getDate()}</div>
        </div>
        <div class="day-body">
          ${dayAppts.map(a => apptChipHtml(a)).join("")}
        </div>
      </div>
    `;
  }
  grid.innerHTML = html;

  grid.querySelectorAll(".appt-chip").forEach(chip => {
    chip.addEventListener("click", () => openApptModal(chip.dataset.id));
  });
}

function apptChipHtml(a) {
  const dt = toDate(a.datetime);
  const time = dt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  const customer = allCustomers.find(c => c.id === a.customerId);
  return `
    <div class="appt-chip status-${a.status}" data-id="${a.id}">
      <span class="appt-chip-time">${time}</span>
      <span class="appt-chip-name">${escapeHtml(customer?.name || "Müşteri")}</span>
    </div>
  `;
}

function renderAgenda() {
  const el = document.getElementById("agendaList");
  const upcoming = allAppointments
    .filter(a => a.status === "scheduled" || toDate(a.datetime) >= startOfToday())
    .sort((x, y) => toDate(x.datetime) - toDate(y.datetime));

  if (upcoming.length === 0) {
    el.innerHTML = `<div class="empty-state"><h3>Randevu yok</h3><p>Yeni bir randevu ekleyin.</p></div>`;
    return;
  }

  const groups = {};
  upcoming.forEach(a => {
    const dt = toDate(a.datetime);
    const key = dt.toDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  });

  const fmt = new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long" });
  let html = "";
  Object.entries(groups).forEach(([key, appts]) => {
    const dt = new Date(key);
    html += `<div class="agenda-day-group">
      <div class="agenda-day-title">${isSameDay(dt, new Date()) ? "Bugün" : fmt.format(dt)}</div>
      ${appts.map(a => {
        const customer = allCustomers.find(c => c.id === a.customerId);
        const time = toDate(a.datetime).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
        return `
          <div class="agenda-item" data-id="${a.id}">
            <div class="agenda-time">${time}</div>
            <div class="agenda-body">
              <div class="agenda-name">${escapeHtml(customer?.name || "Müşteri")}</div>
              <div class="agenda-meta">${escapeHtml(a.location || "")} · ${STATUS_LABELS[a.status]}</div>
            </div>
          </div>
        `;
      }).join("")}
    </div>`;
  });
  el.innerHTML = html;

  el.querySelectorAll(".agenda-item").forEach(item => {
    item.addEventListener("click", () => openApptModal(item.dataset.id));
  });
}

function openApptModal(apptId) {
  const form = document.getElementById("apptForm");
  form.reset();
  document.getElementById("apptId").value = apptId || "";
  document.getElementById("apptModalTitle").textContent = apptId ? "Randevuyu Düzenle" : "Yeni Randevu";

  if (apptId) {
    const a = allAppointments.find(a => a.id === apptId);
    if (a) {
      const dt = toDate(a.datetime);
      document.getElementById("apptCustomer").value = a.customerId || "";
      document.getElementById("apptProperty").value = a.propertyId || "";
      document.getElementById("apptDate").value = dt.toISOString().slice(0, 10);
      document.getElementById("apptTime").value = dt.toTimeString().slice(0, 5);
      document.getElementById("apptLocation").value = a.location || "";
      document.getElementById("apptStatus").value = a.status || "scheduled";
    }
  } else {
    const now = new Date(); now.setMinutes(0, 0, 0); now.setHours(now.getHours() + 1);
    document.getElementById("apptDate").value = now.toISOString().slice(0, 10);
    document.getElementById("apptTime").value = now.toTimeString().slice(0, 5);
  }

  document.getElementById("apptModalOverlay").classList.add("show");
}

function closeApptModal() {
  document.getElementById("apptModalOverlay").classList.remove("show");
}

async function saveAppt(e) {
  e.preventDefault();
  const apptId = document.getElementById("apptId").value;
  const btn = document.getElementById("saveApptBtn");
  btn.disabled = true;
  btn.textContent = "Kaydediliyor...";

  const dateVal = document.getElementById("apptDate").value;
  const timeVal = document.getElementById("apptTime").value;
  const datetime = new Date(`${dateVal}T${timeVal}`);

  const payload = {
    customerId: document.getElementById("apptCustomer").value,
    propertyId: document.getElementById("apptProperty").value || null,
    datetime: Timestamp.fromDate(datetime),
    location: document.getElementById("apptLocation").value.trim(),
    status: document.getElementById("apptStatus").value,
    agentId: currentAgent.id,
  };

  try {
    if (apptId) {
      await updateDoc(doc(db, "appointments", apptId), payload);
      showToast("Randevu güncellendi.");
    } else {
      payload.createdAt = serverTimestamp();
      await addDoc(collection(db, "appointments"), payload);
      const customer = allCustomers.find(c => c.id === payload.customerId);
      await addDoc(collection(db, "activityFeed"), {
        text: `<b>${currentAgent.name}</b> <b>${customer?.name || "bir müşteri"}</b> için randevu oluşturdu`,
        agentId: currentAgent.id, agentName: currentAgent.name, createdAt: serverTimestamp()
      });
      showToast("Randevu eklendi.");
    }
    closeApptModal();
    await loadAppointments();
    renderWeek();
    renderAgenda();
  } catch (err) {
    console.error(err);
    showToast("Bir hata oluştu, tekrar deneyin.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Kaydet";
  }
}

function toDate(ts) { return ts?.toDate ? ts.toDate() : new Date(ts); }
function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function isSameDay(a, b) { return a.toDateString() === b.toDateString(); }

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
