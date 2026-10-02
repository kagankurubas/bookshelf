# 05: Takvim stili i18n (TR/EN)

**What to build:** Takvim stilinin tüm metinlerinin Türkçe ve İngilizce son halleri ve iki dil arasında anahtar eşitliği.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] Stil seçici etiketleri (Raf/Takvim — Shelf/Calendar) ve aria etiketleri
- [ ] Takvim başlığı `Intl.DateTimeFormat` ile aktif dilde (`Eylül 2026` / `September 2026`) doğru çıkıyor; dil değişince başlık da değişiyor; ay adları için yeni i18n anahtarı eklenmedi
- [ ] Pazartesi-başlangıçlı kısa gün adları (TR: Pzt Sal Çar Per Cum Cmt Paz; EN: Mon…Sun)
- [ ] Atlanan kitap notu (çoğul kurallarıyla), boş-durum mesajı, `+N` rozeti, hücre aria-label'ı (tarih + kitap başlıkları + puan)
- [ ] Paylaşım metni ay ve sayıyla, i18next çoğul kurallarıyla (EN `_one`/`_other`)
- [ ] Dosya adı soneki iki dilde tutarlı
- [ ] Uygulama TR ve EN'de açılıp takvim kartı ve export'u elle kontrol edildi; ham anahtar görünmüyor
