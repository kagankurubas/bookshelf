# 03: Runtime caching (offline'da kendi kitap listeni görebilme)

**What to build:** `01`'deki `VitePWA` konfigürasyonuna `workbox.runtimeCaching` kuralları eklenir: Supabase REST okumaları ağ-öncelikli (NetworkFirst) cache'lenir (kullanıcı offline'ken reload'da son bilinen kitap listesini görebilsin diye), Open Library (JSON + kapak görselleri) agresifçe (CacheFirst) cache'lenir, ve barkod tarayıcının WASM motoru precache'e dahil edilir (offline'da kamera/tarama ekranı yine açılabilsin diye). Netlify'da `sw.js`'in CDN'de bayatlamaması için bir header eklenir.

**Blocked by:** 01 (VitePWA plugin kurulu olmalı)

**Status:** ready-for-agent

- [ ] `runtimeCaching`'e Supabase REST kuralı eklendi: `urlPattern: ({ url }) => url.href.startsWith(\`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/\`)`, `handler: 'NetworkFirst'`, `options: { cacheName: 'supabase-rest-cache', expiration: { maxEntries: 50, maxAgeSeconds: 86400 }, cacheableResponse: { statuses: [0, 200] }, networkTimeoutSeconds: 5 }`
- [ ] `/auth/v1/*` ve `/functions/v1/ai-chat` isteklerinin bu kurala hiç girmediği doğrulandı (path'leri `/rest/v1/` değil) - AI Kitap Asistanı ve login her zaman canlı ağa gidiyor
- [ ] Yazma istekleri (`.insert()`/`.update()`/`.delete()` → POST/PATCH/DELETE) hiçbir ek "hariç tut" kuralı yazılmadan cache'e girmiyor (Workbox route'ları varsayılan olarak sadece GET dinliyor) - bu, offline'ken bir ekleme/düzenleme denemesinin asla "sahte bir başarı" gibi cache'ten yanıtlanmadığını doğrulayan bir testle/manuel kontrolle teyit edildi
- [ ] `runtimeCaching`'e Open Library kuralı eklendi: `urlPattern: /^https:\/\/(covers\.)?openlibrary\.org\/.*/i`, `handler: 'CacheFirst'`, `options: { cacheName: 'openlibrary-cache', expiration: { maxEntries: 200, maxAgeSeconds: 2592000 }, cacheableResponse: { statuses: [0, 200] } }`
- [ ] `generateSW.globPatterns`'e barkod WASM dosyasını da kapsayacak şekilde `wasm` uzantısı eklendi; build sonrası `dist/sw.js`'in precache manifestinde `zxing_reader-*.wasm` dosyasının listelendiği doğrulandı
- [ ] Manuel doğrulama: `npm run build && npm run preview`, uygulamayı aç, giriş yap, kitap listesinin yüklenmesini bekle; Chrome DevTools → Network → "Offline" işaretlenip sayfa yenilendiğinde (a) uygulama kabuğu açılıyor (boş/hata ekranı değil), (b) en son yüklenmiş kitap listesi (muhtemelen bayat olabileceği bilinerek) görünüyor
- [ ] Manuel doğrulama: aynı offline modda barkod tarama ekranı açılabiliyor, kamera görüntüsü geliyor (Open Library sorgusu başarısız olacak ama tarama arayüzünün kendisi çalışıyor - bu davranış `04`'teki manuel-fallback ile tamamlanacak)
- [ ] `netlify.toml`'a `/sw.js` için `Cache-Control: must-revalidate` header'ı eklendi
- [ ] Mevcut `npm test` ve `npm run lint` değişmeden geçmeye devam ediyor
