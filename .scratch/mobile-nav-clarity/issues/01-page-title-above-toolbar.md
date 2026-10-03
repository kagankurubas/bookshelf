# 01: Her görünümde araç çubuğunun üstünde ortalı sayfa başlığı

**What to build:** Kartlar, Tablo, Raf ve İstatistikler'de üst çubukla araç çubuğu arasında, aktif görünümün tam adını (sekmeyle aynı `nav.*` anahtarı) gösteren tek bir ortalı `h1`. İstatistikler'in kendi `h1`'i ve kitaplık adı alt başlığı ile Tablo'nun `h2`'si kaldırılır; yıl seçici, Paylaş ve filtreler yerinde kalır. EN'de İstatistikler adı "Statistics" olarak birleşir. Aktif sekme `aria-current="page"` taşır. İsteğe bağlı (küçük): sekme değişince `document.title` "<tam ad> · BookShelf" olur.

**Priority:** mutlaka

**Blocked by:** None within this spec (uygulama, Varsayılan Kitaplık PR A'dan sonra başlar)

**Status:** ready-for-agent

- [ ] App RTL testi: dört görünümün her birinde sayfada tam olarak bir `h1` var, adı görünümün tam adı (TR)
- [ ] App RTL testi: EN'e geçince İstatistikler başlığı "Statistics"
- [ ] App RTL testi: yalnızca aktif sekmede `aria-current="page"`
- [ ] Mevcut İstatistikler/Ayarlar açılış testi tek-`h1` kuralıyla güncellenmiş ve yeşil
- [ ] Kullanılmayan `dashboard.title` ve `table.heading` iki dilden birlikte silinmiş; locale eşlik testi yeşil
- [ ] (İsteğe bağlı) RTL: görünüm değişince `document.title` tam adı içerir
- [ ] Masaüstünde (1280 px) İstatistikler üst satırı (yıl seçici + Paylaş) ve Tablo filtreleri düzgün hizalı
