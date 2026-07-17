# Emlak CRM

6 danışmanlı bir emlak ofisi için basit, paylaşımlı bir CRM. Müşteri havuzu, ilan yönetimi, randevu takvimi ve müşteri–ilan eşleştirmesi içerir.

## Özellikler

- **Müşteriler**: Sahipsiz müşteri havuzu, danışmanlar kendi üstlenir, yönetici yeniden atayabilir
- **Görüşme geçmişi**: Her müşteri için telefon/WhatsApp/e-posta/gezi kayıtları ve sonraki takip tarihi
- **İlanlar**: Ekibin ortak ilan havuzu, satılık/kiralık, durum takibi
- **Randevular**: Masaüstünde haftalık takvim, mobilde ajanda görünümü
- **Panel**: Günlük görevler, ekip aktivite akışı, özet istatistikler
- **Raporlar**: Danışman bazlı performans ve dönüşüm oranları
- **Yönetim**: Yeni hesapları onaylama, rol değiştirme, hesap devre dışı bırakma
- **AI eşleştirme**: Müşteri profiline göre uygun ilanları puanlayarak öneriyor

## Kurulum

1. **Firebase projesi**: `js/firebase-config.js` içinde zaten proje bilgileri var (estatecrm-357b2). Kendi projenizi kullanacaksanız bu dosyadaki `firebaseConfig` değerlerini değiştirin.

2. **Firebase Console'da etkinleştirin**:
   - **Authentication** → Sign-in method → **Email/Password**'ü açın
   - **Firestore Database** → veritabanı oluşturun (production mode yeterli)
   - Firestore kurallarını `firestore.rules` dosyasındaki içerikle güncelleyin (Firestore → Rules sekmesi)

3. **İlk yönetici hesabını oluşturma**:
   - Siteyi açın, "Kayıt olun" ile bir hesap oluşturun (bu hesap `pending` durumunda kayıt olur)
   - Firebase Console → Firestore Database → `agents` koleksiyonuna gidin
   - Kendi kullanıcı belgenizi bulun (uid ile eşleşir) ve şu alanları elle düzenleyin:
     - `status`: `"active"`
     - `role`: `"admin"`
   - Bundan sonra diğer danışmanlar kayıt olduğunda, siz Yönetim sayfasından onaylayabilirsiniz.

4. **Yayınlama (GitHub Pages)**:
   - Bu projeyi bir GitHub reposuna push edin
   - Repo Settings → Pages → Source: `main` branch, `/ (root)`
   - Birkaç dakika içinde `https://kullaniciadi.github.io/repo-adi/` adresinden erişilebilir olur
   - Firebase Console → Authentication → Settings → Authorized domains kısmına GitHub Pages adresinizi eklemeyi unutmayın

## Klasör yapısı

```
crm/
├── index.html              # Giriş / kayıt sayfası
├── firestore.rules         # Firestore güvenlik kuralları
├── css/
│   ├── tokens.css          # Renk, tipografi, temel bileşenler
│   ├── layout.css          # Kenar çubuğu, üst bar, alt gezinme
│   ├── leads.css           # Müşteri sayfası ve modallar
│   ├── properties.css      # İlan kartları
│   └── calendar.css        # Takvim gridi ve ajanda
├── js/
│   ├── firebase-config.js  # Firebase bağlantısı
│   ├── shell.js            # Ortak kenar çubuğu / kimlik doğrulama koruması
│   ├── auth.js             # Giriş / kayıt mantığı
│   ├── dashboard.js
│   ├── leads.js
│   ├── properties.js
│   ├── calendar.js
│   ├── reports.js
│   ├── admin.js
│   └── matching.js         # AI ilan eşleştirme mantığı
└── pages/
    ├── dashboard.html
    ├── leads.html
    ├── properties.html
    ├── calendar.html
    ├── reports.html
    └── admin.html
```

## Veri modeli (Firestore koleksiyonları)

- `agents` — danışman hesapları (name, email, role, status)
- `customers` — müşteriler (name, phone, status, assignedAgentId, budgetMin/Max, preferredAreas, ...)
  - `customers/{id}/interactions` — alt koleksiyon, görüşme geçmişi
- `properties` — ilanlar (title, type, price, city, area, status, ownerAgentId, listedBy, ...)
  - `properties/{id}/comments` — alt koleksiyon, soru/yorumlar (herkes ekleyebilir)
- `appointments` — randevular (customerId, propertyId, datetime, status)
- `tasks` — takip görevleri (agentId, customerId, dueDate, done)
- `activityFeed` — ekip aktivite akışı

## Sahiplik ve yetki kuralları

- Yeni eklenen bir müşteri **sahipsiz** başlar (havuzda); herhangi bir danışman "üstlenebilir".
- Yeni eklenen bir **ilan**, ekleyen danışmana ait olarak kaydedilir (`ownerAgentId`); danışman isterse "Havuza bırak" ile sahipliği bırakabilir, başka biri sahiplenebilir.
- Yalnızca bir müşteri/ilanın **sahibi olan danışman** veya **yönetici** düzenleyebilir, durumunu değiştirebilir veya yeniden atayabilir.
- Sahip olmayan danışmanlar kayıtları görüntüleyebilir, müşterilerde görüşme kaydı ekleyebilir, ilanlarda soru/yorum bırakabilir — ancak düzenleyemez.
- Bu kurallar arayüz seviyesinde uygulanıyor (Firestore kuralları basit tutuldu); tamamen kilitlemek isterseniz Firestore Rules içinde `ownerAgentId`/`assignedAgentId` kontrolü eklenebilir.

## Notlar

- Güvenlik kuralları basit tutuldu (giriş yapan herkes okuyup yazabilir) — küçük, güvenilir bir ekip için yeterli.
- AI eşleştirme şu an kural tabanlı puanlama ile çalışıyor (bütçe/bölge/ilgi türü uyumu). İsterseniz `js/matching.js` içine bir dil modeli API çağrısı ekleyerek daha akıllı hale getirebilirsiniz.
