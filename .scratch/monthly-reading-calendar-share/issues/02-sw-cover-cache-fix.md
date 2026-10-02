# 02: Service worker kapak cache düzeltmesi

**What to build:** Open Library kapaklarının service worker cache'inde, export'un CORS'lu isteğini bozacak şekilde opak yanıt olarak saklanmasının önlenmesi. 01'in bulgusuna göre kapsamı netleşir; 01 sorunun olmadığını gösterirse bu ticket `wontfix` olarak kapanır.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Değişiklik kendi commit'inde; takvim UI'ı veya util'iyle aynı commit'te değil
- [ ] 01'de seçilen yöntem uygulandı (örn. Open Library kapak `<img>`'lerinin CORS modunda, `crossOrigin="anonymous"`, yüklenmesi — yalnızca Open Library host'u için, rastgele URL'lerde değil — ve/veya kapak cache'inin opak yanıt saklamaması)
- [ ] Önceden cache'e girmiş opak kayıtların durumu ele alındı (cache adı/sürümü veya eşleşme kuralı ile)
- [ ] Regresyon kontrolü: normal kapak görünümleri (Kartlar, Raf, BookModal önizlemesi, arama sonuçları) online ve offline'da önceki gibi çalışıyor; CORS vermeyen kullanıcı URL'leri görünmeye devam ediyor
- [ ] Kullanıcı, `vite build` + `vite preview --host` ile SW aktifken, masaüstünde ve telefonda elle doğruladı
