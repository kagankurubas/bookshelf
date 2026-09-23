import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // vite.config.js kendi Node modul baglaminda calisiyor - buradaki
  // import.meta.env, uygulama kaynak kodununkinden farkli olarak .env
  // dosyasindan otomatik doldurulmuyor (deger 'undefined' kalir, ve
  // asagidaki runtimeCaching fonksiyonu service worker'a oyle gomulur).
  // Gercek degeri build zamaninda okumak icin loadEnv kullaniliyor -
  // process.env'de zaten set edilmis olan (ör. Netlify'in kendi ortam
  // degiskenleri) degerler otomatik oncelikli sayilir.
  const env = loadEnv(mode, process.cwd(), '')

  // vite-plugin-pwa/workbox, runtimeCaching.urlPattern fonksiyonlarini
  // (Node tarafinda tanimlanan) kaynak metnine (toString()) donusturup
  // OLDUGU GIBI service worker dosyasina yaziyor - bu yuzden fonksiyon
  // govdesindeki herhangi bir serbest degisken (ör. yukaridaki 'env')
  // tarayicida COZULEMEZ, sadece regex'ler kendi kaynaklarini tasidigi
  // icin (RegExp.toString()) closure sorunu yasamadan dogru serialize
  // olur. Bu yuzden URL, bir fonksiyon yerine gercek degeri icine gomulu
  // bir RegExp olarak insa ediliyor.
  const supabaseRestPattern = env.VITE_SUPABASE_URL
    ? new RegExp(`^${env.VITE_SUPABASE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/rest/v1/`)
    : /(?!)/ // VITE_SUPABASE_URL yoksa (ör. .env'siz bir CI build'i) hicbir seyle eslesmeyen guvenli varsayilan

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        strategies: 'generateSW',
        workbox: {
          // Varsayilan globPatterns 'wasm' uzantisini icermiyor - barkod
          // okuyucunun (zxing-wasm) motoru bu olmadan hic precache'e girmez
          // ve ilk kez offline bir ortamda acilan biri icin tarama calismaz.
          globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}'],
          runtimeCaching: [
            {
              // Supabase REST okumalari (.select() -> GET). Proje ref'i
              // deploy'a gore degisebildigi icin, build zamaninda okunan
              // gercek VITE_SUPABASE_URL'den insa edilen bir regex'e
              // (yukarida) gore eslenir. /auth/v1/* ve /functions/v1/*
              // bu pattern'e hic girmiyor.
              urlPattern: supabaseRestPattern,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-rest-cache',
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
                cacheableResponse: { statuses: [0, 200] },
                networkTimeoutSeconds: 5,
              },
            },
            {
              // Open Library ISBN/arama JSON'u + kapak gorselleri - pratikte
              // hic degismeyen veri, agresifce (CacheFirst) cache'lenir.
              urlPattern: /^https:\/\/(covers\.)?openlibrary\.org\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'openlibrary-cache',
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        manifest: {
          name: 'BookShelf',
          short_name: 'BookShelf',
          start_url: '/',
          display: 'standalone',
          // App.css'teki --bg / --accent marka renkleriyle tutarli (oklch -> hex).
          theme_color: '#008a5d',
          background_color: '#f7f5f1',
          // @vite-pwa/assets-generator (pwa-assets.config.ts) ile public/favicon.svg
          // kaynagindan uretildi - bkz. 02-pwa-icons ticket'i.
          icons: [
            {
              src: '/pwa-64x64.png',
              sizes: '64x64',
              type: 'image/png',
            },
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/maskable-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
      }),
    ],
    build: {
      rolldownOptions: {
        output: {
          // Stable vendor chunks: an app-only deploy then invalidates just the
          // app chunk, not React/Supabase, in the browser and SW precache.
          codeSplitting: {
            groups: [
              { name: 'react-vendor', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
              { name: 'supabase-vendor', test: /node_modules[\\/](@supabase[\\/]|iceberg-js[\\/])/ },
            ],
          },
        },
      },
    },
    server: {
      // Varsayılan olarak sadece IPv6 loopback'te (::1) dinliyordu. 0.0.0.0'a
      // bağlanarak hem 127.0.0.1'i hem de LAN IP'sini dinler - telefondan
      // aynı ağ üzerinden erişip kamerayı test edebilmek için gerekli.
      host: true,
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
      // RLS entegrasyon testleri (tests/integration/**, kendi
      // vitest.integration.config.js'iyle "npm run test:integration"
      // uzerinden calisir) bu suite'in disinda kalsin diye include'i
      // src/ agaciyla sinirliyoruz - aksi halde Vitest'in varsayilan
      // include deseni ikisini de tek komutta calistirmaya calisirdi.
      include: ['src/**/*.{test,spec}.{js,jsx}'],
    },
  }
})
