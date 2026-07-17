import { requireAuth, mountShell } from "./shell.js";
import { db, collection, getDocs, query, where } from "./firebase-config.js";

requireAuth(async (agent) => {
  mountShell("reports", agent);
  const content = document.getElementById("pageContent");
  content.appendChild(document.getElementById("pageTemplate").content.cloneNode(true));

  await loadReports();
});

async function loadReports() {
  const [agentsSnap, customersSnap, propertiesSnap] = await Promise.all([
    getDocs(query(collection(db, "agents"), where("status", "==", "active"))),
    getDocs(collection(db, "customers")),
    getDocs(collection(db, "properties")),
  ]);

  const agents = [];
  agentsSnap.forEach(d => agents.push({ id: d.id, ...d.data() }));

  const customers = [];
  customersSnap.forEach(d => customers.push({ id: d.id, ...d.data() }));

  const properties = [];
  propertiesSnap.forEach(d => properties.push({ id: d.id, ...d.data() }));

  // KPI'lar
  const totalClosed = customers.filter(c => c.status === "closed").length;
  const totalActive = properties.filter(p => p.status === "available").length;
  const totalLeads = customers.length;
  const conversion = totalLeads ? Math.round((totalClosed / totalLeads) * 100) : 0;

  document.getElementById("kpiRow").innerHTML = `
    <div class="card kpi-card"><div class="kpi-value">${totalLeads}</div><div class="kpi-label">Toplam Müşteri</div></div>
    <div class="card kpi-card"><div class="kpi-value">${totalClosed}</div><div class="kpi-label">Kapanan Anlaşma</div></div>
    <div class="card kpi-card"><div class="kpi-value">%${conversion}</div><div class="kpi-label">Dönüşüm Oranı</div></div>
    <div class="card kpi-card"><div class="kpi-value">${totalActive}</div><div class="kpi-label">Aktif İlan</div></div>
  `;

  // Danışman bazlı tablo
  const maxLeads = Math.max(1, ...agents.map(a => customers.filter(c => c.assignedAgentId === a.id).length));

  const rows = agents.map(a => {
    const myLeads = customers.filter(c => c.assignedAgentId === a.id);
    const myClosed = myLeads.filter(c => c.status === "closed").length;
    const myConversion = myLeads.length ? Math.round((myClosed / myLeads.length) * 100) : 0;
    const myListings = properties.filter(p => p.listedBy === a.id && p.status === "available").length;
    const barWidth = Math.round((myLeads.length / maxLeads) * 100);

    return `
      <tr>
        <td class="report-name">${escapeHtml(a.name)}</td>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <span>${myLeads.length}</span>
            <div class="bar-track" style="max-width:80px;"><div class="bar-fill" style="width:${barWidth}%;"></div></div>
          </div>
        </td>
        <td>${myClosed}</td>
        <td>%${myConversion}</td>
        <td>${myListings}</td>
      </tr>
    `;
  }).join("");

  document.getElementById("agentTableBody").innerHTML = rows || `<tr><td colspan="5">Henüz veri yok.</td></tr>`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}
