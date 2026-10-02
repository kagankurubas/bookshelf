# 04: Okuma Özeti'ne Takvim stili ve paylaşım entegrasyonu

**What to build:** Okuma Özeti ekranına Raf/Takvim stil seçicisi; Takvim seçilince 03'teki modülden beslenen takvim kartı, 01'de seçilen kapak export yöntemi ve mevcut Paylaş (Web Share / indirme) akışı.

**Blocked by:** 01, 02, 03

**Status:** ready-for-agent

- [ ] `ReadingRecap` genişletildi (yeniden yazılmadı): `style` durumu, varsayılan Raf; Raf davranışı birebir korunuyor
- [ ] Takvim'de Ay/Yıl toggle'ı gizli; ay varsayılanı geçerli ay; gelecek aylar seçilemiyor; yıl seçicisi takvim yıl seçeneklerini kullanıyor
- [ ] Takvim kartı: başlık (format kullanıcının açık kararına göre; karar yoksa sor), Pzt–Paz başlık satırı, hücre türleri (`read` tek/ikiye bölünmüş/+N, `empty`, `future`, `outside`) görsel olarak ayırt edilebilir; `future` grisi `empty`'den açıkça farklı
- [ ] Biten kitabın kapağı üzerinde 1–5 yıldız; kapak bulunamazsa kategori renkli başlık karosu
- [ ] Kapak hazırlığı B1'e göre: her kapak CORS'lu `fetch` → data URL (object URL değil); başarısızlar kategori renkli karo; kart uzak URL render etmiyor, böylece tek bozuk kapak export'u düşüremiyor; takvim export'unda `cacheBust` yok; hazırlık bitmeden Paylaş "hazırlanıyor" durumunda; export ekranda görünenle aynı
- [ ] Aynı kapak oturum içinde tekrar fetch edilmiyor (ay değişince önceki data URL/başarısızlık sonucu yeniden kullanılıyor)
- [ ] Merge sonrası, release öncesi HTTPS (Netlify) smoke test'i yapıldı (spec → Testing Decisions): telefonda SW'li export ve gerçek paylaşım menüsü, mümkünse iOS Safari dahil
- [ ] Paylaş akışı iki stil için tek yerde: Web Share, AbortError'da sessiz çıkış, indirme fallback'i, hata mesajı; takvim dosya adı `<prefix>-calendar-YYYY-MM.png`
- [ ] Boş ay → boş-durum mesajı + Paylaş pasif
- [ ] Tarihi eksik/hatalı olduğu için atlanan kitap sayısı > 0 ise, export edilen kartın **dışında**, seçicilerin olduğu alanda kısa bir not gösteriliyor; 0 ise not yok
- [ ] `today`, bileşende kullanıcının yerel saatinden (`getFullYear`/`getMonth`/`getDate`) üretiliyor; `toISOString` kullanılmıyor
- [ ] Tüm metinler `t()` ile; yeni anahtarlar `tr.json` ve `en.json`'a en azından yer tutucu olarak eklendi (son metinler 05'te)
- [ ] RTL testleri spec'in Testing Decisions → Seam 2 listesini kapsıyor (`html-to-image` mock'lu)
- [ ] Kullanıcı gerçek tarayıcıda (masaüstü + mobil, SW aktif production build) geçerli ay, geçmiş ay ve paralel okuma örnekleriyle elle doğruladı
