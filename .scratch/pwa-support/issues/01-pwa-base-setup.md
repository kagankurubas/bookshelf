# 01: vite-plugin-pwa temel kurulumu (installable)

**What to build:** `vite-plugin-pwa` projeye eklenir ve `generateSW` stratejisiyle çalışacak şekilde konfigüre edilir; uygulama Chrome/Android'in installability kriterini karşılayan minimal bir `manifest.webmanifest` ve otomatik güncellenen bir service worker'a kavuşur. Bu ticket ikon üretimini (02) ve runtime caching kurallarını (03) kapsamaz - sadece "yükle" seçeneğinin çıktığı, uygulama kabuğunun (JS/CSS/HTML) precache'lendiği en küçük çalışan hali hedefler.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `vite-plugin-pwa` (`^1.3.0`, `peerDependencies.vite` projenin `^8.1.1`'ini kapsıyor) devDependency olarak eklendi
- [ ] `vite.config.js`'e `VitePWA({...})` plugin'i eklendi: `registerType: 'autoUpdate'`, `strategies: 'generateSW'` (varsayılan, açıkça belirtilmesi şart değil ama netlik için yazılabilir)
- [ ] `manifest` alanı en azından şunları içeriyor: `name: 'BookShelf'`, `short_name: 'BookShelf'`, `start_url: '/'`, `display: 'standalone'`, `theme_color`, `background_color` (mevcut `App.css`'teki marka renkleriyle tutarlı) - `icons` dizisi bu ticket'ta placeholder/eksik olabilir, 02'de tamamlanacak
- [ ] `npm run build` sonrası `dist/` içinde `sw.js` ve `manifest.webmanifest` üretiliyor
- [ ] `npm run build && npm run preview` ile açılan uygulamada Chrome DevTools → Application → Service Workers sekmesinde SW'nin kayıtlı/aktif olduğu doğrulandı
- [ ] Mevcut `npm test` ve `npm run lint` değişmeden geçmeye devam ediyor (vite-plugin-pwa dev sunucusunu/testleri bozmuyor - `npm run dev` de sorunsuz açılıyor)
- [ ] `dist/` klasörü (build çıktısı, `sw.js`/`manifest.webmanifest` dahil) `.gitignore`'da zaten hariç tutuluyor mu kontrol edildi (değilse eklendi) - üretilen dosyalar repoya commit edilmemeli
