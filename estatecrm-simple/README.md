# EstateCRM (Basit Sürüm)

Küçük bir emlak ofisi için hazırlanmış, tamamen **düz HTML/CSS/JS** ile yazılmış,
Supabase üzerinde çalışan hızlı ve modern bir CRM. Build aracı, Node.js sunucusu
veya karmaşık bir kurulum **gerektirmez** — GitHub Pages gibi herhangi bir statik
barındırma hizmetine yükleyip linki ofis ekibinle paylaşabilirsin.

Arayüz tamamen **Türkçe**dir.

---

## 1. Kurulum (yaklaşık 10 dakika)

### Adım 1 — Supabase projesi oluştur (veritabanı)
1. [supabase.com](https://supabase.com) adresine git, ücretsiz hesap oluştur.
2. **New Project** ile yeni bir proje oluştur (ücretsiz plan yeterli).
3. Proje hazır olduğunda sol menüden **SQL Editor**'ü aç.
4. `supabase/` klasöründeki 3 dosyayı **sırasıyla** çalıştır:
   - Önce `0001_core_schema.sql` içeriğini kopyala, SQL Editor'e yapıştır, **Run**'a bas.
   - Sonra `0002_audit_triggers.sql` ile aynısını yap.
   - Son olarak `0003_seed_and_rls.sql` ile aynısını yap.
5. Sol menüden **Project Settings → API**'ye git. **Project URL** ve **anon public**
   anahtarını kopyala — bir sonraki adımda lazım olacak.

### Adım 2 — Bağlantı bilgilerini gir
1. Bu klasördeki `js/config.js` dosyasını aç.
2. İçindeki iki satırı Supabase'den kopyaladığın bilgilerle değiştir:
   ```js
   window.SUPABASE_URL = "https://xxxxx.supabase.co";
   window.SUPABASE_ANON_KEY = "eyJhbGc...";
   ```
3. Kaydet.

### Adım 3 — Ekibini tanıt (opsiyonel ama önerilir)
`supabase/0003_seed_and_rls.sql` dosyasında örnek 5 temsilci var (Ahmet, Sara, Can,
Elif, Mert). Bunları gerçek ekip isimleriyle değiştirebilirsin — ya SQL dosyasını
düzenleyip tekrar çalıştırarak, ya da uygulamayı açtıktan sonra **Ayarlar → Ofis
Kadrosu** bölümünden ekleyip/kapatarak.

---

## 2. Yerel olarak deneme (isteğe bağlı)

Sadece `index.html` dosyasını çift tıklayarak açman **çalışmayabilir** (tarayıcılar
`file://` üzerinden bazı isteklere izin vermez). Basit bir yerel sunucu ile dene:

```bash
# Bu klasörün içindeyken:
python3 -m http.server 8080
# veya
npx serve .
```
Sonra tarayıcıda `http://localhost:8080` adresini aç.

---

## 3. GitHub Pages ile yayınlama (ofise link paylaşmak için)

1. [github.com](https://github.com) üzerinde yeni bir **repository** oluştur (private
   veya public — ikisi de olur, bkz. §5 Güvenlik).
2. Bu klasördeki tüm dosyaları (config.js dahil, gerçek Supabase bilgilerinle)
   o repository'ye yükle. En kolay yol:
   - GitHub'da repo sayfasında **"Add file" → "Upload files"** ile bu klasördeki
     her şeyi sürükle-bırak yap, commit et.
3. Repo **Settings → Pages** sayfasına git.
4. **Source** olarak `Deploy from a branch` seç, branch olarak `main`, klasör
   olarak `/ (root)` seç, **Save**.
5. Birkaç dakika sonra sayfanın üstünde bir link belirecek — genelde şu formatta:
   `https://kullanici-adin.github.io/repo-adi/`
6. Bu linki ofis ekibinle paylaş. Herkes bu linke girip kendi ismini seçerek
   kullanmaya başlayabilir.

> Not: Supabase anon anahtarı tarayıcıya gönderilen kodun bir parçasıdır — bu
> normaldir ve Supabase'in tasarımı böyledir (gerçek güvenlik veritabanındaki
> RLS kurallarından gelir). Yine de bkz. §5.

---

## 4. Neden bu mimari?

### 4.1 Neden geleneksel kullanıcı hesabı yok?
5-15 kişilik güvenilir bir ofis ekibi için şifreli giriş sistemi gereksiz
sürtünme yaratır. Bunun yerine, tarayıcı **localStorage**'a temsilci kimliğini
kaydeden hafif bir sistem var:
- İlk ziyarette "Kim kullanıyor?" ekranı açılır, bir isim seçilir.
- O cihaz/tarayıcı bir daha soru sormaz — otomatik hatırlar.
- Profil menüsündeki **"Temsilci Değiştir"** ile ortak bilgisayarlarda kişi
  değiştirilebilir.
- Her ekleme/güncelleme işlemi bu kimliği otomatik olarak damgalar
  (`js/api.js` → `AgentIdentity.requireId()`), böylece "kim ne yaptı" hep
  bellidir.

Bu, gerçek bir kimlik doğrulama (authentication) **değildir** — sadece rahat
bir kimlik hatırlama sistemidir. Bkz. §5.

### 4.2 Neden düz HTML/CSS/JS (React/Next.js değil)?
Bu, hızlı yayınlama ve basit bakım için bilinçli bir tercih: derleme adımı
yok, `npm install` yok, Node.js sunucusu yok. Dosyaları düzenleyip
kaydettiğinde değişiklik hemen görünür. GitHub Pages gibi ücretsiz statik
barındırma ile çalışır. Kod, özelliklere göre klasörlere ayrılmıştır
(`js/pages/`, `js/api.js`, `css/styles.css`) — büyümesi gerekirse okunabilir
kalır.

### 4.3 Veritabanı: Postgres tetikleyicileri (trigger) ile değişmez geçmiş
"Hiçbir şey sessizce üzerine yazılmasın" kuralı, veritabanı seviyesinde
tetikleyicilerle sağlanır (`0002_audit_triggers.sql`). Bir ilan her
güncellendiğinde otomatik olarak:
- `property_events` tablosuna okunabilir bir geçmiş kaydı ("Fiyat 250.000'den
  265.000'e değişti") eklenir,
- `property_versions` tablosuna tam bir anlık görüntü (snapshot) kaydedilir
  (geri yükleme özelliği için).

Bu, uygulama kodunda unutulabilecek bir işlem değil, veritabanının garanti
ettiği bir kuraldır.

### 4.4 Arama: Fuse.js ile bulanık (fuzzy) arama
Tüm ilanlar bir kere yüklenir ve tarayıcıda **Fuse.js** ile aranır — yazı
yazarken network beklemeden anında sonuç gelir, yazım hatalarına toleranslıdır
(başlık, adres, telefon, temsilci adı, etiketler dahil çoklu alan araması).

### 4.5 Gerçek zamanlı (realtime) güncellemeler
Supabase Realtime ile tek bir kanal (`js/store.js` → `RealtimeSync`) tüm
önemli tabloları dinler. Bir kullanıcı bir ilanı güncellediğinde, o an
uygulamayı açık tutan **tüm diğer kullanıcılar** sayfayı yenilemeden anında
güncellemeyi görür.

### 4.6 Mükerrer kayıt uyarısı (Duplicate Detection)
Postgres'in `pg_trgm` benzerlik fonksiyonları, yeni bir ilan veya mülk sahibi
eklerken telefon/isim/adres benzerliğine göre olası mükerrer kayıtları
canlı olarak uyarır.

### 4.7 Harita
Google Maps API anahtarı gerektirmeyen, ücretsiz **MapLibre GL + CARTO**
harita katmanları kullanılır. İlan kaydı yine de enlem/boylam saklar ve
Google Haritalar'da açma linki sunar.

---

## 5. Güvenlik notu

Bu uygulamanın **giriş ekranı (login) yoktur**. Linki bilen ve Supabase anon
anahtarına erişen (tarayıcı kodunda görünür, bu normaldir) herkes okuma/yazma
yapabilir — bu, `0003_seed_and_rls.sql` içindeki izinli RLS kurallarıyla
sınırlıdır. Bu, günlük kullanım kolaylığını önceliklendiren bilinçli bir
tercihtir, ama link herkese açık bir adreste barınacağı için önüne bir şeyler
koymanı öneririz:

- **En kolay:** GitHub repository'sini **private** yap ve Pages'i sadece
  organizasyon üyelerine aç (GitHub Pro/Team gerektirebilir), veya
- Ofis VPN'i / Tailscale arkasına koy, veya
- Basit bir tarayıcı şifre ekranı ekle (index.html'e küçük bir JS ile paylaşılan
  bir ofis şifresi sorulabilir — istersen bunu ekleyebilirim).

Temsilci seçim ekranını bir güvenlik sınırı olarak **düşünme** — bu sadece
kimlik hatırlama kolaylığıdır, kimlik doğrulama değildir.

---

## 6. Klasör yapısı

```
index.html              Tek giriş noktası — tüm CDN ve yerel scriptleri yükler
css/styles.css           Tüm stiller (açık/koyu tema dahil)
js/
  config.js               Supabase bağlantı bilgileri (SEN DOLDURACAKSIN)
  supabase-client.js       Supabase istemcisi
  utils.js                 Yardımcı fonksiyonlar (tarih, para birimi, vb.)
  constants.js              Türkçe etiketler, durum renkleri
  theme.js                  Açık/koyu tema yönetimi
  toast.js                  Bildirim balonları
  agent-identity.js          Temsilci kimlik sistemi (localStorage)
  agent-picker.js             "Kim kullanıyor?" ekranı + profil menüsü
  notifications.js            Bildirim çanı
  command-palette.js          ⌘K arama paleti
  components.js                Yeniden kullanılabilir HTML parçaları
  api.js                       TÜM Supabase sorgu/yazma işlemleri burada
  store.js                     Bellek içi önbellek + realtime senkronizasyon
  shell.js                     Kenar çubuğu, üst bar, mobil menü
  router.js                    Sayfa yönlendirme (hash tabanlı)
  app.js                       Başlatıcı
  pages/                       Her sayfa kendi dosyasında (dashboard, properties, vb.)
supabase/                 Veritabanı şeması (3 sıralı SQL dosyası)
```

---

## 7. Neler tam olarak çalışıyor

Temsilci kimlik sistemi, ilan ekleme/düzenleme (doğrulamalı), fotoğraf
yükleme/galeri, değişmez zaman çizelgesi, sürüm geçmişi + geri yükleme,
@bahsetme'li notlar, favoriler, son görüntülenenler, görevler, mülk sahipleri
(ara/whatsapp/telefon kısayolları), bulanık çoklu alan arama + filtreler,
mükerrer kayıt uyarısı, harita görünümü, tüm kullanıcılar arası gerçek zamanlı
senkronizasyon, canlı bildirimler, panel (dashboard), koyu tema, mobil uyumlu
tasarım, komut paleti (⌘K) — hepsi Türkçe arayüzle.
