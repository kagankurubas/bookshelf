# RLS + Auth Entegrasyon Testleri

Status: ready-for-agent

## Problem Statement

BookShelf'te her kitaplık ve kitap bir kullanıcıya (`auth.users`) aittir ve bu izolasyon tamamen Postgres Row Level Security (RLS) politikalarına dayanır (bkz. `supabase/schema.sql`, migration 003-005, 011). Mevcut test paketi (Vitest + RTL, 65 test) `supabase-js` client'ını tamamen mock'layarak çalışır; hiçbir test gerçek bir Postgres örneğine karşı, bir kullanıcının başka bir kullanıcının verisine erişip erişemediğini doğrulamaz.

RLS politikalarındaki bir regresyon (yanlış yazılmış bir `using`/`with check` ifadesi, unutulmuş bir tablo, eksik bir sahiplik kontrolü) mock'lu unit testlerde **görünmez** kalır, çünkü mock'lar zaten "izin verildi" varsayımıyla çalışır. Böyle bir regresyon doğrudan bir kullanıcının başka bir kullanıcının kitaplarını, kitaplıklarını veya AI sohbet geçmişini görebilmesi/değiştirebilmesi anlamına gelir — bu proje için en yüksek öncelikli veri sızıntısı riskidir. Migration 011'in düzelttiği `book_libraries` açığı (sadece `book_id` kontrol edilip `library_id` kontrol edilmemesi) bunun canlı bir örneğidir.

## Solution

Gerçek bir Postgres/Supabase örneğine (Supabase CLI ile ayağa kaldırılan **local** bir örnek) karşı çalışan, mevcut mock'lu unit testlerden tamamen ayrı bir entegrasyon test katmanı eklenir. Bu testler gerçek Supabase Auth oturumları açan iki gerçek kullanıcı (User A, User B) ve bir oturumsuz (anon) client kullanarak, her RLS'li tablo için "kendi verine erişebiliyor musun / başkasınınkine erişemiyor musun" sorusunu doğrudan PostgREST üzerinden sorar. Testler tek bir komutla (`npm run test:integration`) local'de çalıştırılabilir; production/uzak bir Supabase projesine karşı yanlışlıkla çalışmayı engelleyen bir runtime guard içerir.

## User Stories

1. Geliştirici olarak, RLS politikalarında bir regresyon yaptığımda bunu CI/local'de kırmızı bir test olarak görmek istiyorum, ki production'a sızıntı riski taşıyan bir değişikliği merge etmeden önce yakalayabileyim.
2. Geliştirici olarak, User A'nın gerçek bir Supabase session'ıyla User B'nin `books` tablosundaki satırlarını SELECT ettiğinde boş sonuç aldığını görmek istiyorum, ki kitap listesi izolasyonunun gerçekten çalıştığından emin olayım.
3. Geliştirici olarak, User A'nın gerçek bir Supabase session'ıyla User B'nin `libraries` tablosundaki satırlarını SELECT ettiğinde boş sonuç aldığını görmek istiyorum, ki kitaplık listesi izolasyonunun gerçekten çalıştığından emin olayım.
4. Geliştirici olarak, User A'nın User B'ye ait bir `books` satırını UPDATE etmeye çalıştığında satırın değişmediğini (0 satır etkilendi) görmek istiyorum, ki bir kullanıcının başka bir kullanıcının kitabını değiştiremediğinden emin olayım.
5. Geliştirici olarak, User A'nın User B'ye ait bir `books` satırını DELETE etmeye çalıştığında satırın silinmediğini görmek istiyorum, ki bir kullanıcının başka bir kullanıcının kitabını silemediğinden emin olayım.
6. Geliştirici olarak, User A'nın User B'ye ait bir `libraries` satırını UPDATE/DELETE etmeye çalıştığında işlemin etkisiz kaldığını görmek istiyorum, ki kitaplık izolasyonunun yazma tarafında da çalıştığından emin olayım.
7. Geliştirici olarak, User A'nın User B'ye ait bir kitaba bağlı `notes` satırını SELECT/UPDATE/DELETE edemediğini görmek istiyorum, ki notların da kitap sahipliği üzerinden doğru izole edildiğinden emin olayım.
8. Geliştirici olarak, User A'nın **kendi** kitabını User B'nin `library_id`'siyle `book_libraries` tablosuna eklemeye çalıştığında bu INSERT'in reddedildiğini görmek istiyorum (migration 011 regresyon senaryosu), ki hem `book_id` hem `library_id` sahiplik kontrolünün ikisinin de aktif olduğundan emin olayım.
9. Geliştirici olarak, User A'nın **kendi** kitaplığına User B'nin kitabını eklemeye çalıştığında (kendi `library_id`'si + başkasının `book_id`'si) bu INSERT'in reddedildiğini görmek istiyorum, ki `book_libraries` kontrolünün her iki yönde de çalıştığından emin olayım.
10. Geliştirici olarak, User A'nın User B'ye ait `ai_conversations` satırlarını SELECT edemediğini görmek istiyorum, ki Kitap Asistanı sohbet listesinin de izole olduğundan emin olayım.
11. Geliştirici olarak, User A'nın User B'ye ait bir konuşmaya bağlı `ai_messages` satırlarını SELECT/INSERT edemediğini görmek istiyorum, ki sohbet mesajı geçmişinin kullanıcılar arasında sızmadığından emin olayım.
12. Geliştirici olarak, hiç oturum açmamış (anon key, session yok) bir client'ın `libraries`, `books`, `notes`, `book_libraries`, `ai_conversations`, `ai_messages` tablolarından herhangi birinde SELECT/INSERT/UPDATE/DELETE denediğinde her seferinde boş/reddedilen sonuç aldığını görmek istiyorum, ki kimliği doğrulanmamış hiçbir isteğin kullanıcı verisine erişemediğinden emin olayım.
13. Geliştirici olarak, bu entegrasyon testlerini mevcut `npm test` (mock'lu unit testler) komutundan tamamen ayrı, kendi `npm run test:integration` komutuyla çalıştırmak istiyorum, ki günlük geliştirme akışımda local Supabase'i ayağa kaldırmak zorunda kalmayayım.
14. Geliştirici olarak, `test:integration` komutunu yanlışlıkla production `SUPABASE_URL`'ine karşı çalıştırırsam komutun anında ve açık bir hatayla durmasını istiyorum, ki gerçek kullanıcı verisi üzerinde yıkıcı test işlemleri (UPDATE/DELETE denemeleri, fixture kullanıcı silme) çalıştırma riskini almayayım.
15. Geliştirici olarak, entegrasyon testlerinin ihtiyaç duyduğu Supabase service-role key'inin sadece gitignore'lanmış `.env.test.local` dosyasında tutulduğunu, `.env`/`.env.example`'a asla girmediğini bilmek istiyorum, ki bu yüksek yetkili anahtarın yanlışlıkla commit'lenme riskini sıfıra indireyim.
16. Geliştirici olarak, entegrasyon testlerinin kendi oluşturduğu fixture kullanıcıları (User A, User B) ve bunlara ait tüm verileri test sonunda temizlediğini görmek istiyorum, ki local Supabase örneğim testten teste artık veri biriktirmesin.
17. Yeni katılan bir geliştirici olarak, entegrasyon testlerini nasıl çalıştıracağımı (local Supabase CLI kurulumu dahil) test dosyasının başında veya README'de kısa ve net bir şekilde bulmak istiyorum, ki kurulum için başka bir yere bakmak zorunda kalmayayım.

## Implementation Decisions

- **Seam**: Testler React/hook katmanını (useBooks, useLibraries, useAiChat, vb.) devre dışı bırakır; doğrudan `@supabase/supabase-js` client'ları kullanır (`.from(table).select/insert/update/delete()`), tıpkı hook'ların içeride yaptığı gibi. Bu tek seam, RLS'li 6 tablonun tamamını (libraries, books, book_libraries, notes, ai_conversations, ai_messages) kapsar çünkü hepsi aynı PostgREST/RLS sınırından geçer.
- **Local Supabase altyapısı**: Bu repoda Supabase CLI daha önce hiç `init` edilmemiş (`supabase/config.toml` yok). Prefactor adımı olarak `supabase init` çalıştırılıp `supabase/config.toml` eklenir; local auth ayarlarında e-posta onayı kapatılır (`enable_confirmations = false`) ki fixture kullanıcılar e-posta doğrulaması beklemeden giriş yapabilsin.
- **Mevcut migration dosya adları değiştirilmez**: `002_shelf_row.sql` … `012_ai_daily_quota.sql` formatı (`<sayı>_<açıklama>.sql`) Supabase CLI'ın `supabase start`/`db reset` sırasında migration'ları bulup sıralaması için yeterlidir (CLI, dosya adının başındaki rakam dizisini "version" olarak alıp lexical sıraya göre uygular; 14 haneli zaman damgası zorunlu değildir). Gelecekte `supabase migration new` ile eklenecek 14 haneli (`2...` ile başlayan) dosyalar da mevcut 3 haneli (`0...` ile başlayan) dosyalardan lexical olarak sonra geleceği için sıralama bozulmaz. Bu yüzden migration dosyalarını yeniden adlandırma/taşıma **bu ticket'ın kapsamına girmez**.
- **Fixture kullanıcılar**: Her test dosyası/suite başında bir service-role client ile `auth.admin.createUser({ email, password, email_confirm: true })` kullanılarak User A ve User B oluşturulur; ardından her biri için ayrı bir anon-key client'ta `auth.signInWithPassword()` ile gerçek bir oturum (JWT) alınır. Anon (oturumsuz) senaryolar için üçüncü, hiç sign-in yapılmamış bir anon-key client kullanılır.
- **Fixture veri**: Her kullanıcı için en az bir `libraries` satırı ve o kitaplığa bağlı en az bir `books` satırı (ve `book_libraries` ile ilişki, bir `notes` satırı, bir `ai_conversations` + `ai_messages` çifti) test setup'ında oluşturulur. Bu satırlar User A/User B'nin kendi oturumlarıyla (service-role ile değil) INSERT edilir, ki testler gerçek yazma yolunu da (kendi verine yazabilme) dolaylı olarak doğrulasın.
- **Temizlik**: Test suite sonunda service-role client ile `auth.admin.deleteUser()` çağrılır; `libraries`/`books`/`ai_conversations` tablolarındaki `on delete cascade` ilişkileri sayesinde bağlı `book_libraries`, `notes`, `ai_messages` satırları otomatik silinir.
- **Ortam ayrımı**: Yeni bir `.env.test.local` dosyası (gitignore zaten `*.local` deseniyle kapsıyor) local Supabase URL'i, anon key ve **sadece bu test katmanının kullandığı** service-role key'i tutar. `.env` ve `.env.example` değişmez, service-role key hiçbir zaman bu dosyalara girmez.
- **Runtime guard**: Entegrasyon test config'i (Vitest `globalSetup`) çalışmaya başlamadan önce hedef `SUPABASE_URL`'in host'unun `localhost` veya `127.0.0.1` olduğunu doğrular; değilse process'i hemen, açık bir hata mesajıyla sonlandırır (herhangi bir test çalışmadan önce).
- **Test dosyaları mevcut `src/` ağacının dışında**: Yeni testler `tests/integration/rls/` altında yaşar (React component testlerinden ve `src/test/setup.js`'teki jsdom/mock ortamından ayrı), ayrı bir `vitest.integration.config.js` (`environment: 'node'`, kendi `globalSetup`'ı, kendi `include` deseni) ile çalıştırılır. Mevcut `vite.config.js`'teki `test` bloğu (ve dolayısıyla `npm test`) bu yeni testleri hiç görmez.
- **`package.json` script'i**: `"test:integration": "vitest run --config vitest.integration.config.js"`. `npm test` (mevcut mock'lu suite) değişmeden kalır.
- **CI**: Mevcut `.github/workflows/ci.yml`'e local Supabase'i ayağa kaldırıp (Supabase CLI GitHub Action / `supabase start`) `npm run test:integration` çalıştıran **ayrı, opsiyonel bir job** eklenir; mevcut `build` job'ını bloklamaz. CI ortamındaki service-role/anon key'ler GitHub Actions secrets yerine, `supabase start` local instance'ının kendi ürettiği sabit local anahtarlarından (CLI çıktısı) okunur - gerçek bir Supabase projesine bağlanılmaz.
- **Migration 011 regresyonu**: `book_libraries` testleri açıkça iki ayrı INSERT senaryosunu kapsar: (a) kendi `book_id` + başkasının `library_id`'si, (b) başkasının `book_id` + kendi `library_id`'si. İkisi de ayrı ayrı reddedilmelidir; sadece `book_id` kontrol edilip `library_id`'nin unutulduğu önceki (migration 011 öncesi) hataya geri dönüşü yakalamak için.

## Testing Decisions

- Testler tamamen **kara kutu**dır: sadece PostgREST'in döndürdüğü gözlemlenebilir davranışı (dönen satır sayısı/içeriği, hata kodu `PGRST...`/boş `data`) doğrularlar; hiçbir RLS politikasının SQL metnini veya iç implementasyonunu test etmezler. Bir politika farklı yazılıp aynı davranışı üretirse test yeşil kalmalı.
- Her tablo için minimum iki test: "sahibi kendi verisine erişebiliyor" (pozitif kontrol - testin yanlış negatif vermediğini garantiler) ve "başkası erişemiyor" (asıl izolasyon iddiası). Sadece negatif senaryo yazmak, RLS'in tamamen kapalı olduğu (hiç kimsenin erişemediği) bir regresyonu da yanlışlıkla "geçti" gösterebilir.
- Bu katmanda **önceki mock'lu hook testlerinden (`useBooks.test.js`, `useLibraries.test.js`, vb.) prior art yok** - onlar `supabase-js`'i mock'layıp hook'un çağrı şeklini test eder, bu testler ise gerçek network/DB'ye karşı çalışır. En yakın emsal, migration dosyalarındaki (`005`, `011`) politika yorumlarında açıklanan senaryolardır; testler o senaryoları executable hale getirir.
- Test dosyası başına (veya paylaşılan bir yardımcı modülde) local Supabase kurulumunu (`supabase init` + `supabase start`, `.env.test.local` doldurma) ve `npm run test:integration` komutunu anlatan kısa bir kurulum notu eklenir.

## Out of Scope

- `supabase/functions/ai-chat` ve `supabase/functions/delete-account` Edge Function'larının kendisi (bunlar zaten service-role ile RLS'i bypass eder; bu spec sadece client-erişilebilir PostgREST/RLS sınırını kapsar).
- `ai_daily_usage` tablosu: kullanıcıya özel değil, paylaşılan global bir sayaç; kasıtlı olarak hiç RLS policy'si yok ve sadece `try_consume_ai_quota` SECURITY DEFINER fonksiyonu üzerinden erişiliyor. Kullanıcı izolasyonu kavramı bu tabloya uygulanmaz.
- Performans/yük testi (RLS politikalarının sorgu planı/maliyeti).
- Mevcut 65 mock'lu unit testin RLS/gerçek Supabase'e taşınması veya değiştirilmesi.
- RLS ihlali durumunda UI'ın kullanıcıya ne gösterdiği (toast/hata mesajı) - bu, hook seviyesindeki mevcut mock'lu testlerin kapsamı.
- Uzak/hosted bir Supabase test projesi kurulumu - bu spec sadece local Supabase CLI yolunu kapsar.

## Further Notes

- Mevcut migration dosyaları muhtemelen hosted Supabase projesine CLI (`supabase db push`) yerine Dashboard SQL editor'den elle uygulanmış (repoda daha önce `supabase link`/`config.toml` yoktu). Bu, hosted projenin `schema_migrations` takip tablosunda bu migration'lar için kayıt olmayabileceği anlamına gelir. Bu spec sadece **local** `supabase start`'ı kapsadığı için bu durum bir sorun teşkil etmez; ama ileride biri bu repoyu gerçek projeye `supabase link` edip `db push` yapmak isterse, dosyaları yeniden adlandırmak bu sorunu ÇÖZMEZ (asıl araç `supabase migration repair` ile hosted taraftaki versiyonları elle işaretlemektir) - o yüzden bu spec kapsamında migration dosyalarına dokunulmuyor.
- `supabase/config.toml` bu spec ile birlikte ilk kez eklendiği için, aynı zamanda projeye "local Supabase nasıl çalıştırılır" konusunda (mevcut olmayan) ilk resmi giriş noktasını da sağlamış olacak; bu, entegrasyon testlerinin yan faydası.
- İleride bu seam, RLS'i olan yeni bir tablo eklendiğinde (örn. gelecekte eklenebilecek bir "paylaşılan kitaplık" özelliği) kolayca genişletilebilir bir kalıp bırakır: fixture kullanıcı oluşturma + iki client + guard zaten hazır olacak.
