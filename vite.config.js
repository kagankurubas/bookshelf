import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW',
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
})
