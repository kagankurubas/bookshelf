import { defineConfig, loadEnv } from 'vite';

// RLS + auth entegrasyon testleri icin ayri Vitest config'i.
//
// Mevcut vite.config.js'teki `test` blogu (jsdom + src/test/setup.js ile
// src/**/*.test.js{,x} mock'lu testlerini calistiran) BU dosyayi hic
// gormez ve bu config de src/** testlerini gormez - ikisi tamamen
// birbirinden bagimsizdir. `npm test` her zaman sadece mock'lu suite'i,
// `npm run test:integration` sadece bunu calistirir.
//
// Testler `.env.test.local` dosyasindan (mode: 'test') SUPABASE_URL,
// SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY okur; bkz. README.md
// "RLS entegrasyon testleri" bolumu.
const env = loadEnv('test', process.cwd(), '');

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.js'],
    globalSetup: './tests/integration/globalSetup.js',
    env,
    // Fixture kullanicilar gercek network/Auth/PostgREST round-trip'leri
    // yapiyor (createUser + signInWithPassword + insert/select) - jsdom
    // testlerinden daha yavas, varsayilan timeout'u biraz genislet.
    testTimeout: 15000,
  },
});
