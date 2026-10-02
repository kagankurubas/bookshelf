# 02: Service worker kapak cache düzeltmesi (seçenek C)

**What to build:** Open Library kapaklarının CORS modunda yüklenmesi ve service worker cache'inde yalnızca `cors`/200 yanıt olarak saklanması; böylece takvim export'unun CORS'lu kapak isteğine SW'nin opak yanıt dönmesi (prototipte doğrulandı, bkz. spec → Further Notes → Prototip sonucu) ortadan kalkar.

**Blocked by:** 01 (resolved)

**Status:** ready-for-agent

## Uygulama

- [ ] Değişiklik kendi commit'inde; takvim UI'ı veya util'iyle aynı commit'te değil
- [ ] `crossOrigin="anonymous"` **yalnızca Open Library kapak host'u** (`covers.openlibrary.org`) için ekleniyor; kullanıcının yapıştırdığı diğer host'lardaki `<img>`'lere eklenmiyor (CORS vermeyen bir host'ta normal görünümü kırdığı prototipte görüldü). Kapak görüntüleyen tüm yerler (ortak kapak bileşeni + BookModal önizlemesi) kapsanıyor
- [ ] Kapaklar için Open Library JSON API'sinden (ISBN/arama) ayrı, yeni adlı bir runtime cache; `cacheableResponse` yalnızca `statuses: [200]` (opak/0 ve 404 saklanmaz)
- [ ] Eski opak kayıtları içeren eski kapak cache'i SW `activate` olayında siliniyor. Not: `generateSW` runtime cache'leri kendiliğinden temizlemiyor (`cleanupOutdatedCaches` yalnızca precache içindir); `importScripts` ile küçük bir ek script mi yoksa `injectManifest`'e geçiş mi gerektiği uygulamada seçilir, yeni dependency eklenmez

## Testler / doğrulama

- [ ] **Yalnızca 200/cors cache'lenir:** SW aktifken kapaklı bir görünüm açıldıktan sonra Cache Storage'daki kapak cache'i incelenip her kaydın `type: cors`, `status: 200` olduğu doğrulandı; 404 dönen bir ISBN kapağı ve CORS'suz bir URL cache'e girmedi
- [ ] **Eski cache activate'te silinir:** eski build'le opak kayıtlar oluşturulup yeni build'e geçildiğinde eski cache'in Cache Storage'dan kalktığı doğrulandı
- [ ] **crossOrigin yalnızca Open Library için:** DOM'da Open Library kapak `<img>`'lerinde `crossorigin="anonymous"` var, başka host'larda yok; CORS'suz bir kullanıcı URL'si normal görünümde eskisi gibi görünüyor. Bu ayrım için (host'a göre `crossOrigin` kararı) birim/bileşen testi eklendi; mevcut `CoverImage` testi önceki örnek
- [ ] **Kapağı olmayan / 404 kitapta eski placeholder davranışı:** `cover_image` boş kitapta ve `default=false` ile 404 dönen kapakta, Kartlar/Raf/BookModal/arama sonuçları/BatchScanner'da önceki fallback/placeholder aynen görünüyor; bağlantı geri gelince yeniden deneme davranışı korunuyor
- [ ] **Çevrimdışı kapak görünümü regresyonu:** online iken kapaklar bir kez yüklenip ağ kesildiğinde (DevTools Offline), daha önce görülen kapaklar yeni cache'ten görünmeye devam ediyor
- [ ] **Aynı kapak export'ta tekrar fetch edilmez:** normal görünümde yüklenmiş bir kapak için takvim export hazırlığının yaptığı CORS'lu `fetch` SW cache'inden karşılanıyor (Network panelinde ağa çıkmadan, "from ServiceWorker"); aynı oturumda ikinci export veya ay değişimi aynı kapak için yeni istek üretmiyor (ikincisi 04'teki bellek içi sonucun kapsamında)
- [ ] Kullanıcı, `vite build` + `vite preview --host` ile SW aktifken masaüstünde elle doğruladı; telefonda SW'li doğrulama release öncesi HTTPS smoke test'ine bırakıldı (spec → Testing Decisions)
