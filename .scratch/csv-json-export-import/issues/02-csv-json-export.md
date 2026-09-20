# 02: CSV/JSON export (Ayarlar'dan)

**What to build:** Kullanıcı, Ayarlar ekranındaki "Veri" bölümünden tek tıkla tüm kitaplarını CSV veya JSON dosyası olarak indirebilir.

**Blocked by:** 01 (papaparse bağımlılığı)

**Status:** ready-for-agent

- [ ] `SettingsModal`'a bir "Veri" bölümü + "CSV olarak indir" ve "JSON olarak indir" butonları eklendi
- [ ] Export mantığı `src/lib/` altında saf (Supabase/DOM'suz) fonksiyonlar olarak yazıldı; CSV üretimi `papaparse`'ın `unparse`'ı ile yapılıyor (kaçış kuralları elle yazılmıyor)
- [ ] Export edilen alanlar: title, author, publisher, category, status, rating, isbn, pageCount, isFavorite, dateStarted, dateFinished, createdAt, ve kitabın bağlı olduğu kitaplık adları (CSV'de `; ` ile ayrılmış tek sütun). UI-only alanlar (coverImage, coverPosition, shelfId, shelfRow, slotIndex) export'a dahil edilmiyor
- [ ] JSON export'ta yukarıdakilere ek olarak notlar `{ text, date }` dizisi olarak tam yapısıyla korunuyor
- [ ] İndirilen dosya adı `bookshelf-export-YYYY-MM-DD.csv` / `.json` konvansiyonuna uyuyor (indirme anındaki yerel tarih)
- [ ] İndirme mekanizması `ReadingRecap.jsx`'teki `Blob` + `URL.createObjectURL` + `<a download>` + `URL.revokeObjectURL` deseninin aynısını kullanıyor - yeni bir indirme yöntemi icat edilmiyor
- [ ] Saf export fonksiyonları, örnek kitap verisiyle üretilen CSV/JSON çıktısının doğruluğunu (alan eşlemesi, dosya adı, özel karakter/virgül içeren not metninin doğru kaçışlanması) doğrulayan mock'suz birim testleriyle kapsanmış
