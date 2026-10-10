# 06: Kitaplık, Ana Kitaplık ve Kat terimleri; kitaplık seçicideki kat eki

**What to build:**
- **Çoğul hatası (her durumda bu PR'a girer):** sayılı kat metni i18next çoğul anahtarlarıyla (`_one` / `_other`, iki dilde aynı set) yazılır; "1 shelves" hatası giderilir.
- **Seçici:** kitaplık seçicide kat eki gösterilmez.
- **Raf görünümü:** Kat Ekle / Kat Sil düğmelerinin yanında "N kat" (EN "N rows").
- **Adlandırma:** TR'de her yerde "Kat" ("Raf" yalnızca görünümün adı): `shelf.addRow` → "Kat Ekle", `shelf.removeRow` → "Kat Sil", ipuçları buna göre. EN'de "rows": "Add row" / "Remove row".
- **CONTEXT.md:** Kitaplık, Ana Kitaplık ve Kat terimleri eklenir, giriş cümlesi düzeltilir. **Metin, kullanıcı son kararı verdikten sonra yazılır** (taslak spec'te).

**Priority:** çoğul düzeltmesi mutlaka; geri kalanı zaman daralırsa ertelenebilir

**Blocked by:** None

**Status:** ready-for-human (uygulandı; CONTEXT.md taslağı kullanıcı onayı bekliyor)

- [x] Çoğul: `shelfCount` 1 → "1 kat" / "1 row", 3 → "3 kat" / "3 rows" (RTL, TR ve EN)
- [x] Seçici seçeneklerinde kat eki yok (RTL: `LibraryToolbar` seçenek metinleri yalnızca kitaplık adı)
- [x] TR arayüzde aynı kavram için "Raf" ve "Kat" karışık kullanılmıyor (sekme ve Raf stili adları hariç)
- [ ] CONTEXT.md'de üç terim, kullanıcının onayladığı metinle (taslak dosyada, onay bekliyor)
- [x] Locale eşlik testi yeşil

## Uygulama notları (2026-10-10)

- Seçici yalnızca kitaplık adını gösterir; `toolbar.shelfCountSuffix` silindi ("1 shelves" hatası onunla gitti).
- Raf görünümünde düğmelerin yanında `shelf.rowCount` (`_one` / `_other`): TR "1 kat" / "3 kat", EN "1 row" / "3 rows". Düğmeler TR "Kat Ekle" / "Kat Sil", EN "Add row" / "Remove row"; ipuçları da "kat" / "row".
- **Ölçüm** (gerçek App, sahte veri, Supabase istekleri tarayıcıda yanıtlandı): 360/1280 px'te seçici ve seçenekleri yalnızca ad (TR ve EN); önce TR "Kitaplığım (1 Kat)", EN "Kitaplığım (1 shelves)". Sayaç 360/390/430 px'te TR/EN, 1 ve 3 katla doğru.
- TR arayüzde "Raf" kalan yerler: sekme adı ("Kitaplık Rafı" / "Raf"), Okuma Özeti'nin "Raf stili" ve giriş ekranındaki "raflarını düzenle" (genel anlamda; değiştirilmedi, karar kullanıcıda).
- **CONTEXT.md:** taslak dosyada, "TASLAK" yorumuyla. "Ana Kitaplık: her kitap ayrıca orada bulunur" kanıtlanamadığı için çıkarıldı; yerine kodda kanıtlanan "uygulama eklediği ve düzenlediği her kitabı Ana Kitaplığa da bağlar" yazıldı. "Tam olarak bir tane" de PR B'nin benzersiz indeksine kadar çıkarıldı. Gerekçeler CONTEXT.md'deki taslak notlarında.
