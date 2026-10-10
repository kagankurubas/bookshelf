# 09: Takip: ortak görünüm listesi, Kat adı, test sadeleştirme

**What to build:** mobile-nav-clarity code review'undan (Standards 2, 3, 4, 6) bu PR'a alınmayan temizlikler. Davranış değişmez.

- **Ortak görünüm listesi:** görünüm → `nav.*` anahtarı eşlemesi iki yerde: `PageTitle.jsx` (`VIEW_TITLE_KEYS`) ve `AppHeader.jsx` (`TABS`). Yeni bir görünüm iki dosyada değişiklik istiyor. Tek bir `VIEWS` listesi (görünüm, tam ad, kısa ad, simge) iki bileşen tarafından kullanılır.
- **Kat adı kodda:** CONTEXT.md'de terim Kat / row; kodda `shelfCount` (prop, `useShelfDnd`, `useLibraries` eşlemesi) ve `handleAddShelfRow` / `handleRemoveShelfRow`. `rowCount` gibi bir ada geçilir; veritabanı sütunu `shelf_count` aynı kalır, eşleme katmanında çevrilir.
- **Test sadeleştirme** (yalnızca anlamlı akışlar tercihi):
  - `ShelfView.test.jsx`'teki düğme adları testi ve `App.test.jsx`'teki EN etiket testi yalnızca çeviri metnini doğruluyor; birleştirilir ya da kaldırılır.
  - `AppHeader.test.jsx`'in ikinci testi büyük ölçüde ilkini tekrarlıyor.
  - `App.test.jsx` "App page title" `views` tablosunda iki sütun aynı (`['Kitaplar', 'Kitaplar']`); tek sütuna iner.
- **Keşfet düğmesi:** `AppHeader.jsx`'te `TABS` dışında aynı yapıyı tekrarlıyor (devre dışı ve rozetli olduğu için). Ortak listeye bir `disabled` / `soon` alanıyla katılabilir; erişilebilir adı ve `title`'ı (ipucu metni) korunur.

**Priority:** düşük (v1.2)

**Blocked by:** mobile-nav-clarity merge

**Status:** needs-triage

- [ ] Görünüm listesi tek yerde; `PageTitle` ve `AppHeader` onu kullanıyor; mevcut testler değişmeden yeşil
- [ ] Kat için kodda tek ad; `shelf_count` sütunu ve API aynı
- [ ] Gereksiz testler kaldırıldı ya da birleştirildi; kalanların her biri bir davranışı koruyor
- [ ] Keşfet düğmesinin erişilebilir adı ve `title`'ı aynı
