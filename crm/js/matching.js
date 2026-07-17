// Müşteri – İlan eşleştirme
// Not: Basit puanlama kuralları burada çalışır (bütçe, bölge, ilgi türü uyumu).
// İsteğe bağlı olarak bir dil modeli API'si ile daha akıllı sıralama/gerekçe eklenebilir.

import { db, collection, getDocs, query, where } from "./firebase-config.js";

export async function matchPropertiesToCustomer(customer) {
  const snap = await getDocs(query(collection(db, "properties"), where("status", "==", "available")));
  const properties = [];
  snap.forEach(d => properties.push({ id: d.id, ...d.data() }));

  const scored = properties.map(p => ({ ...p, score: scoreMatch(customer, p) }))
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return scored;
}

function scoreMatch(customer, property) {
  let score = 0;
  let maxScore = 0;

  // Bütçe uyumu (ağırlık: 45)
  maxScore += 45;
  if (customer.budgetMin || customer.budgetMax) {
    const min = customer.budgetMin || 0;
    const max = customer.budgetMax || Infinity;
    if (property.price >= min && property.price <= max) {
      score += 45;
    } else {
      const target = max === Infinity ? min : (min + max) / 2;
      const diff = Math.abs(property.price - target) / target;
      if (diff < 0.15) score += 30;
      else if (diff < 0.3) score += 15;
    }
  } else {
    score += 20; // bütçe belirtilmemişse nötr puan
  }

  // Bölge uyumu (ağırlık: 35)
  maxScore += 35;
  if (customer.preferredAreas && customer.preferredAreas.length > 0) {
    const areas = customer.preferredAreas.map(a => a.toLowerCase().trim());
    const propertyArea = `${property.city || ""} ${property.area || ""}`.toLowerCase();
    if (areas.some(a => propertyArea.includes(a))) score += 35;
  } else {
    score += 15;
  }

  // İlgi türü uyumu (ağırlık: 20)
  maxScore += 20;
  if (customer.interestedIn === "buy" && property.type === "sale") score += 20;
  else if (customer.interestedIn === "rent" && property.type === "rent") score += 20;

  return Math.round((score / maxScore) * 100);
}
