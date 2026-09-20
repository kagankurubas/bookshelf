import { loadEnv } from 'vite';

// Vitest globalSetup: herhangi bir test dosyasi import edilmeden/calismadan
// ONCE, tek seferlik olarak calisir. Amaci tek bir sey: hedef Supabase
// projesinin GERCEKTEN local oldugunu dogrulamak. Bu katmandaki testler
// service-role key ile kullanici olusturup/silen ve baska kullanicinin
// satirlarini UPDATE/DELETE etmeye CALISAN (RLS onlemesini bekleyen)
// yikici islemler icerir - yanlislikla hosted/production bir projeye
// karsi calismasi kabul edilemez.
//
// globalSetup ayri bir modul olarak calistigi icin (worker'lardan once,
// kendi process.env'iyle) `.env.test.local`'i burada da bagimsiz olarak
// yukluyoruz - vitest.integration.config.js'teki `test.env` sadece test
// worker'lari icin gecerli.
export default function globalSetup() {
  const env = loadEnv('test', process.cwd(), '');
  const supabaseUrl = env.SUPABASE_URL || process.env.SUPABASE_URL;

  if (!supabaseUrl) {
    console.error(
      '\n[rls-integration] SUPABASE_URL tanimli degil. .env.test.local dosyasini olustur ' +
        '(bkz. README.md "RLS entegrasyon testleri" bolumu) ve tekrar dene.\n',
    );
    process.exit(1);
  }

  let host;
  try {
    host = new URL(supabaseUrl).hostname;
  } catch {
    console.error(`\n[rls-integration] SUPABASE_URL gecerli bir URL degil: "${supabaseUrl}"\n`);
    process.exit(1);
  }

  const allowedHosts = new Set(['localhost', '127.0.0.1']);
  if (!allowedHosts.has(host)) {
    console.error(
      `\n[rls-integration] SUPABASE_URL ("${supabaseUrl}") localhost/127.0.0.1 disinda bir hosta (${host}) ` +
        'isaret ediyor. Bu test suite\'i fixture kullanici olusturma/silme ve RLS\'i kirmayi DENEYEN ' +
        'yazma islemleri icerdigi icin sadece "supabase start" ile ayaga kaldirilan LOCAL bir ornege ' +
        'karsi calistirilabilir. Islem iptal edildi.\n',
    );
    process.exit(1);
  }
}
