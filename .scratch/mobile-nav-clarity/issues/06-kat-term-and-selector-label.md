# 06: Kitaplık, Ana Kitaplık ve Kat terimleri; kitaplık seçicideki kat eki

**What to build:**
- **Çoğul hatası (her durumda bu PR'a girer):** sayılı kat metni i18next çoğul anahtarlarıyla (`_one` / `_other`, iki dilde aynı set) yazılır; "1 shelves" hatası giderilir.
- **Seçici:** kitaplık seçicide kat eki gösterilmez.
- **Raf görünümü:** Kat Ekle / Kat Sil düğmelerinin yanında "N kat" (EN "N rows").
- **Adlandırma:** TR'de her yerde "Kat" ("Raf" yalnızca görünümün adı): `shelf.addRow` → "Kat Ekle", `shelf.removeRow` → "Kat Sil", ipuçları buna göre. EN'de "rows": "Add row" / "Remove row".
- **CONTEXT.md:** Kitaplık, Ana Kitaplık ve Kat terimleri eklenir, giriş cümlesi düzeltilir. **Metin, kullanıcı son kararı verdikten sonra yazılır** (taslak spec'te).

**Priority:** çoğul düzeltmesi mutlaka; geri kalanı zaman daralırsa ertelenebilir

**Blocked by:** None

**Status:** ready-for-agent (CONTEXT.md metni kullanıcı onayı bekliyor)

- [ ] Çoğul: `shelfCount` 1 → "1 kat" / "1 row", 3 → "3 kat" / "3 rows" (RTL, TR ve EN)
- [ ] Seçici seçeneklerinde kat eki yok (RTL: `LibraryToolbar` seçenek metinleri yalnızca kitaplık adı)
- [ ] TR arayüzde aynı kavram için "Raf" ve "Kat" karışık kullanılmıyor (sekme ve Raf stili adları hariç)
- [ ] CONTEXT.md'de üç terim, kullanıcının onayladığı metinle
- [ ] Locale eşlik testi yeşil
