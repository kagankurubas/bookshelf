# 03: Okuma Özeti'ne Takvim stili ve paylaşım entegrasyonu

**What to build:** Okuma Özeti ekranına Raf/Takvim stil seçicisi; Takvim seçilince 02'deki modülden beslenen takvim kartı, 01'de seçilen kapak export yöntemi ve mevcut Paylaş (Web Share / indirme) akışı.

**Blocked by:** 01, 02

**Status:** ready-for-agent

- [ ] `ReadingRecap` genişletildi (yeniden yazılmadı): `style` durumu, varsayılan Raf; Raf davranışı birebir korunuyor
- [ ] Takvim'de Ay/Yıl toggle'ı gizli; ay varsayılanı geçerli ay; gelecek aylar seçilemiyor; yıl seçicisi takvim yıl seçeneklerini kullanıyor
- [ ] Takvim kartı: `M/YYYY` başlık, Pzt–Paz başlık satırı, hücre türleri (`read` tek/ikiye bölünmüş/+N, `empty`, `future`, `outside`) görsel olarak ayırt edilebilir; `future` grisi `empty`'den açıkça farklı
- [ ] Biten kitabın kapağı üzerinde 1–5 yıldız; kapak bulunamazsa kategori renkli başlık karosu
- [ ] Kapak hazırlığı 01'deki karara göre yapılıyor; hazırlık bitmeden Paylaş "hazırlanıyor" durumunda; export ekranda görünenle aynı (sessizce boş kapak yok)
- [ ] Paylaş akışı iki stil için tek yerde: Web Share, AbortError'da sessiz çıkış, indirme fallback'i, hata mesajı; takvim dosya adı `<prefix>-calendar-YYYY-MM.png`
- [ ] Boş ay → boş-durum mesajı + Paylaş pasif
- [ ] Tüm metinler `t()` ile; yeni anahtarlar `tr.json` ve `en.json`'a en azından yer tutucu olarak eklendi (son metinler 04'te)
- [ ] RTL testleri spec'in Testing Decisions → Seam 2 listesini kapsıyor (`html-to-image` mock'lu)
- [ ] Kullanıcı gerçek tarayıcıda (masaüstü + mobil, SW aktif production build) geçerli ay, geçmiş ay ve paralel okuma örnekleriyle elle doğruladı
