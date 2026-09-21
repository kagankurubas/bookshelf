# 02: PWA ikon seti üretimi

**What to build:** Mevcut `public/favicon.svg`'den (tek kaynak) `@vite-pwa/assets-generator` ile installability için gereken tam PNG ikon setini (192/512 "any" + 512 maskable + iOS apple-touch-icon) üretip `01`'deki manifest'e ve `index.html`'e bağlar.

**Blocked by:** 01 (manifest ve VitePWA plugin kurulumu bu ticket'ın üstüne yazılacak)

**Status:** ready-for-agent

- [ ] `@vite-pwa/assets-generator` devDependency olarak eklendi
- [ ] `pwa-assets.config.ts` (veya `.js`) eklendi: `minimal2023Preset` kullanılıyor, kaynak `public/favicon.svg`
- [ ] `npx pwa-assets-generator` çalıştırıldı, üretilen dosyalar `public/`'e yazıldı: `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png` (`purpose` yok/`"any"`), `maskable-icon-512x512.png` (`purpose: "maskable"`), `apple-touch-icon-180x180.png`
- [ ] `vite.config.js`'teki `VitePWA({ manifest: { icons: [...] } })` dizisi yukarıdaki 4 ikonu (64/192/512-any/512-maskable) doğru `sizes`/`type`/`purpose` alanlarıyla içeriyor
- [ ] `index.html`'e `<link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png">` eklendi (manifest'teki ikonlar iOS Safari'nin "Ana Ekrana Ekle"si için kullanılmıyor, ayrı bir link gerekiyor)
- [ ] Üretilen maskable ikon, Android adaptive-icon safe-zone'unda (Chrome DevTools → Application → Manifest → ikon önizlemesi, ya da maskable.app benzeri bir araçla) görsel olarak kontrol edildi - logo kırpılmıyor
- [ ] `npm run build && npm run preview` sonrası Chrome DevTools → Application → Manifest sekmesinde "Installability" bölümünde hata/uyarı görünmüyor (192+512 "any" ikonlar algılanıyor)
- [ ] Mevcut `npm test` ve `npm run lint` değişmeden geçmeye devam ediyor
