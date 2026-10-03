# 01: Geliştirme bağımlılıklarındaki 3 `npm audit` açığı (v1.1 sonrası)

**Status:** needs-triage

## Gözlem (2026-10-03, `monthly-reading-calendar-share` üzerinde `npm audit`)

`npm audit --omit=dev`: 0 açık (production bağımlılıkları temiz). Tüm rapor 3 açık (2 high, 1 low), hepsi dev zincirinde; takvim PR'ı `package.json`'a dokunmadı, `main`'de de var.

| Paket | Sürüm | Önem | Zincir | Not |
|---|---|---|---|---|
| `brace-expansion` | 5.0.9 / 2.1.7 | high | eslint → minimatch; vite-plugin-pwa → workbox-build → … → minimatch | DoS (karmaşık glob desenleri) |
| `undici` | 8.10.0 | high | jsdom | Yalnızca test ortamı (jsdom) |
| `serialize-javascript` | 7.1.1 | low | vite-plugin-pwa → workbox-build → @rollup/plugin-terser | Build sırasında `sw.js` üretiminde; serileştirilen girdi bizim config'imiz |

`npm audit fix` hepsi için düzeltme öneriyor; çalıştırılmadı.

## Yapılacak

- [ ] v1.1 yayınından sonra `npm audit fix` (gerekirse `overrides`) ile güncelle
- [ ] `npm run build`, `npm test`, `npm run lint`, `npm run check:security` ve `vite preview` ile SW üretiminin (precache, `importScripts`) değişmediği doğrulandı
