import { requireAuth, mountShell } from "./shell.js";
import {
  db, collection, query, where, orderBy, getDocs, Timestamp
} from "./firebase-config.js";

requireAuth(async (agent) => {
  mountShell("dashboard", agent);
  const content = document.getElementById("pageContent");
  content.appendChild(document.getElementById("pageTemplate").content.cloneNode(true));

  document.getElementById("greeting").textContent = `Merhaba, ${agent.name.split(" ")[0]}`;

  loadStats(agent);
  loadTasks(agent);
  loadFeed();
});

async function loadStats(agent) {
  try {
    const customersRef = collection(db, "customers");

    const unclaimedQ = query(customersRef, where("assignedAgentId", "==", null));
    const myLeadsQ = query(customersRef, where("assignedAgentId", "==", agent.id));
    const listingsQ = query(collection(db, "properties"), where("status", "==", "available"));

    const [unclaimedSnap, myLeadsSnap, listingsSnap] = await Promise.all([
      getDocs(unclaimedQ), getDocs(myLeadsQ), getDocs(listingsQ)
    ]);

    document.getElementById("statUnclaimed").textContent = unclaimedSnap.size;
    document.getElementById("statMyLeads").textContent = myLeadsSnap.size;
    document.getElementById("statActiveListings").textContent = listingsSnap.size;

    // Bugünkü randevular
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
    const apptQ = query(
      collection(db, "appointments"),
      where("datetime", ">=", Timestamp.fromDate(startOfDay)),
      where("datetime", "<=", Timestamp.fromDate(endOfDay))
    );
    const apptSnap = await getDocs(apptQ);
    document.getElementById("statViewingsToday").textContent = apptSnap.size;
  } catch (err) {
    console.error("İstatistik yüklenirken hata:", err);
  }
}

async function loadTasks(agent) {
  const el = document.getElementById("tasksList");
  try {
    const tasksQ = query(
      collection(db, "tasks"),
      where("agentId", "==", agent.id),
      where("done", "==", false),
      orderBy("dueDate", "asc")
    );
    const snap = await getDocs(tasksQ);

    if (snap.empty) {
      el.innerHTML = `<div class="empty-state"><h3>Bugün için görev yok</h3><p>Yeni takip görevleri burada görünecek.</p></div>`;
      return;
    }

    const now = new Date();
    const rows = [];
    snap.forEach(docSnap => {
      const t = docSnap.data();
      const due = t.dueDate?.toDate ? t.dueDate.toDate() : new Date(t.dueDate);
      const isToday = due.toDateString() === now.toDateString();
      const isPast = due < now && !isToday;
      const dueClass = isPast || isToday ? "due-today" : "due-soon";
      rows.push(`
        <div class="task-row">
          <div>
            <div class="task-name">${escapeHtml(t.title)}</div>
            <div class="task-meta">${escapeHtml(t.customerName || "")}</div>
          </div>
          <div class="task-due ${dueClass}">${formatRelativeDate(due)}</div>
        </div>
      `);
    });
    el.innerHTML = rows.join("");
  } catch (err) {
    console.error("Görevler yüklenirken hata:", err);
    el.innerHTML = `<div class="empty-state"><p>Görevler yüklenemedi.</p></div>`;
  }
}

async function loadFeed() {
  const el = document.getElementById("feedList");
  try {
    const feedQ = query(collection(db, "activityFeed"), orderBy("createdAt", "desc"));
    const snap = await getDocs(feedQ);

    if (snap.empty) {
      el.innerHTML = `<div class="empty-state"><h3>Henüz hareket yok</h3><p>Ekibin yaptığı işlemler burada görünecek.</p></div>`;
      return;
    }

    const rows = [];
    let count = 0;
    snap.forEach(docSnap => {
      if (count >= 10) return;
      count++;
      const f = docSnap.data();
      const time = f.createdAt?.toDate ? f.createdAt.toDate() : new Date();
      rows.push(`
  <div class="feed-item">
    <div class="feed-avatar">${initials(f.agentName)}</div>
    <div>
      <div class="feed-text">${f.text}</div>
      <div class="feed-time">${formatRelativeDate(time)}</div>
    </div>
  </div>
`);
    });
    el.innerHTML = rows.join("");
  } catch (err) {
    console.error("Akış yüklenirken hata:", err);
    el.innerHTML = `<div class="empty-state"><p>Akış yüklenemedi.</p></div>`;
  }
}

function initials(name) {
  if (!name) return "?";
  return name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function formatRelativeDate(date) {
  const now = new Date();
  const diffMs = date - now;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const isPast = diffMs < 0;

  const fmt = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" });

  if (Math.abs(diffMs) < 1000 * 60 * 60 * 24 && date.toDateString() === now.toDateString()) {
    return "Bugün";
  }
  if (diffDays === 1) return "Yarın";
  if (diffDays === -1) return "Dün";
  if (isPast) return `${fmt.format(date)} (gecikti)`;
  return fmt.format(date);
}
