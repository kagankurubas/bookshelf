# 01: Local Supabase + entegrasyon test harness'i

**What to build:** Geliştirici, tek bir komutla (`npm run test:integration`) gerçek bir **local** Supabase örneğine karşı çalışan bir entegrasyon test suite'i başlatabilir. Komut, hedef `SUPABASE_URL` production/uzak bir projeyi gösteriyorsa hiçbir test çalıştırmadan hemen ve açık bir hatayla durur. Suite, service-role key kullanarak iki fixture kullanıcı (User A, User B) oluşturup gerçek Supabase Auth session'ları açabilir ve test sonunda bu kullanıcıları temizleyebilir. Bu ticket, spec'in tüm diğer test ticket'larının (02-05) üzerine inşa edeceği altyapıdır; kendi başına bir "sahibi kendi verisine erişebiliyor" smoke testiyle doğrulanır.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `supabase init` çalıştırıldı, `supabase/config.toml` repoya eklendi; local auth ayarlarında e-posta onayı kapalı (`enable_confirmations = false`) ki fixture kullanıcılar doğrulama beklemeden giriş yapabilsin
- [ ] `.env.test.local` dosyası eklendi (gitignore zaten `*.local` deseniyle kapsıyor — doğrulanmalı) ve local Supabase URL, anon key, service-role key'i tutuyor; service-role key `.env`/`.env.example`'a hiçbir zaman girmiyor
- [ ] `tests/integration/rls/` dizini ve ayrı bir `vitest.integration.config.js` (`environment: 'node'`, kendi `include` deseni) eklendi; mevcut `vite.config.js`'teki `test` bloğu (ve `npm test`) bu yeni dosyaları görmüyor
- [ ] `package.json`'a `"test:integration"` script'i eklendi; mevcut `"test"` script'i ve davranışı değişmedi
- [ ] Entegrasyon config'inin `globalSetup`'ı, hedef `SUPABASE_URL`'in host'u `localhost`/`127.0.0.1` değilse process'i testler çalışmadan önce açık bir hata mesajıyla sonlandırıyor
- [ ] Paylaşılan bir fixture yardımcı modülü: service-role client ile `auth.admin.createUser({ email, password, email_confirm: true })` kullanarak iki kullanıcı oluşturuyor, her biri için ayrı bir anon-key client'ta `auth.signInWithPassword()` ile gerçek oturum (JWT) alıyor, ve bir de hiç sign-in yapılmamış üçüncü bir anon client sağlıyor
- [ ] Aynı modülde temizlik fonksiyonu: service-role client ile `auth.admin.deleteUser()` çağırıyor (bağlı `libraries`/`books`/`ai_conversations` satırları `on delete cascade` ile otomatik siliniyor)
- [ ] En az bir smoke testi: User A, kendi oturumuyla oluşturduğu bir `books` satırını SELECT ile görebiliyor — harness'ın uçtan uca (fixture user → session → RLS'den geçen gerçek sorgu) çalıştığının kanıtı
- [ ] Kurulumu ve çalıştırmayı anlatan kısa bir not eklendi (README'ye yeni bir bölüm veya `tests/integration/rls/` içinde bir başlık dosyası): `supabase start` önkoşulu (Docker gerektirir), `.env.test.local` doldurma, `npm run test:integration` komutu
