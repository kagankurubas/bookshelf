# 02: Saf takvim gün eşleme modülü + testleri

**What to build:** Kitaplar, ay ve bugünün tarihinden (parametre) Pazartesi-başlangıçlı ay ızgarası ve her günün hücre durumunu (`read` / `empty` / `future` / `outside`) üreten, UI'dan bağımsız saf modül; yanında kapak çözümleme ve takvim yıl seçenekleri fonksiyonları.

**Blocked by:** —

**Status:** ready-for-agent

- [ ] `buildReadingCalendar({ books, year, month, today })` spec'teki kurallara uyuyor; `today` `'YYYY-MM-DD'` string'i, modülde argümansız `new Date()` yok, tarihler string olarak parçalanıyor
- [ ] Dahil etme kuralları: Tamamlandı (iki tarih dolu ve `start ≤ finish`), Okunuyor (`dateStarted` dolu ve bugünden sonra değil; geçerli ayda bugüne, geçmiş ayda ay sonuna kadar); Başlanmadı ve Yarıda Bırakıldı atlanıyor; aralık ay sınırına kırpılıyor
- [ ] Kural 1: X'te biten kitap varken X'te başlayan kitap X+1'den başlıyor; aynı gün başlayıp biten kitap kaydırılmıyor
- [ ] Paralel okuma: hücre tüm kitapları listeliyor; sıralama "o gün biten önce, sonra başlangıç tarihi, sonra id"
- [ ] Biten kitap için puan hücrede taşınıyor; `rating 0` → yıldız yok
- [ ] `future` yalnızca geçerli ayda ve bugünden sonra; bugün `future` değil
- [ ] Kapak çözümleme: `coverImage` (Open Library ise `-M` + `default=false`) → ISBN'den türetilen Open Library URL'si → `null`
- [ ] Takvim yıl seçenekleri: geçerli yıl + bitiş yılları + Okunuyor/Tamamlandı başlangıç yılları, yeniden eskiye
- [ ] Mock'suz birim testleri spec'in Testing Decisions → Seam 1 listesini kapsıyor (ızgara şekli dahil: ay başı Pazar olan ay, artık yıl Şubat)
