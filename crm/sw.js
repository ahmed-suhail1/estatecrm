// Basit servis çalışanı — Android'de "Ana Ekrana Ekle" davranışını etkinleştirir.
// Karmaşık önbellekleme yapılmıyor; sadece temel dosyaları önbelleğe alır.

const CACHE_NAME = "emlak-crm-v1";
const CORE_ASSETS = [
  "./index.html",
  "./css/tokens.css",
  "./manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Ağ öncelikli: her zaman güncel veriyi dene, olmazsa önbellekten dön
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
