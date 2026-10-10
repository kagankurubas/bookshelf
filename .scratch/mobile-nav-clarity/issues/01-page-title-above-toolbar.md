# 01: Her görünümde araç çubuğunun üstünde ortalı sayfa başlığı

**What to build:** Kartlar, Tablo, Raf ve İstatistikler'de üst çubukla araç çubuğu arasında, aktif görünümün tam adını (sekmeyle aynı `nav.*` anahtarı) gösteren tek bir ortalı `h1`. İstatistikler'in kendi `h1`'i ve kitaplık adı alt başlığı ile Tablo'nun `h2`'si kaldırılır; yıl seçici, Paylaş ve filtreler yerinde kalır. EN'de İstatistikler adı "Statistics" olarak birleşir. Aktif sekme `aria-current="page"` taşır. İsteğe bağlı (küçük): sekme değişince `document.title` "<tam ad> · BookShelf" olur.

**Priority:** mutlaka

**Blocked by:** None within this spec (uygulama, Varsayılan Kitaplık PR A'dan sonra başlar)

**Status:** ready-for-human (uygulandı; masaüstü hizası elle, ticket 08)

- [x] App RTL testi: dört görünümün her birinde sayfada tam olarak bir `h1` var, adı görünümün tam adı (TR)
- [x] App RTL testi: EN'e geçince İstatistikler başlığı "Statistics"
- [x] App RTL testi: yalnızca aktif sekmede `aria-current="page"`
- [x] Mevcut İstatistikler/Ayarlar açılış testi tek-`h1` kuralıyla güncellenmiş ve yeşil
- [x] Kullanılmayan `dashboard.title` ve `table.heading` iki dilden birlikte silinmiş; locale eşlik testi yeşil
- [x] (İsteğe bağlı) RTL: görünüm değişince `document.title` tam adı içerir
- [ ] Masaüstünde (1280 px) İstatistikler üst satırı (yıl seçici + Paylaş) ve Tablo filtreleri düzgün hizalı

## Uygulama notları (2026-10-10)

- `PageTitle` tek `h1` basar ve `document.title`'ı "<tam ad> · BookShelf" yapar; kapanınca eski başlığı geri koyar.
- **Sapma (kullanıcı kararı, 34acb34):** İstatistikler'in başlık bloğu kalkınca yıl seçici sola, Paylaş sağa alındı (`dashboard-header-actions`: `flex: 1; justify-content: space-between`). Spec "yerinde kalır" diyordu. 1280 px görünümü ticket 08'de elle bakılacak; son madde o yüzden açık.
- **Lazy test:** başlık artık `PageTitle`'dan hemen geldiği için İstatistikler açılış testi lazy sayfa hiç yüklenmese de geçiyordu (code review, Spec 1). Test artık yıl seçiciyi, tek-`h1` testi de görünümün kendi `<main>`'ini bekliyor. Lazy import askıda bırakılınca iki test düşüyor; önce geçiyordu.
- Kaldırılan `dashboard.title`, `table.heading` repo genelinde hiçbir yerde kullanılmıyor (code review).
