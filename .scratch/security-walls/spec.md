# Güvenlik Duvarları Kontrolü (security-walls)

Status: ready-for-agent

## Problem Statement

BookShelf'in güvenliği bugüne kadar tek tek inşa edilmiş birkaç "duvara" dayanıyor: kullanıcı verisi tutan her tablodaki RLS policy'leri, RLS entegrasyon testlerinin sadece local Supabase'e karşı çalışmasını sağlayan localhost guard'ı, Kitap Asistanı'nın paylaşılan Gemini kotasını koruyan `try_consume_ai_quota` guard'ı, repoya hiçbir production ref'i/anahtarı sızmamış olması ve tüm veritabanı erişiminin query builder üzerinden geçmesi. Bu duvarların hiçbiri şu an düzenli olarak doğrulanmıyor. Bir migration'ın policy'yi yanlışlıkla gevşetmesi, yeni bir tablonun RLS'siz eklenmesi, guard'ın bir refactor'da silinmesi ya da bir filtre dizesine kullanıcı girdisinin gömülmesi ancak biri fark ederse ortaya çıkıyor.

Dinamik pentest (Strix vb.) ücretli, yavaş ve ayrı bir iş. Geliştiricinin istediği şey, bu duvarların hâlâ yerinde olduğunu **ücretsiz, deterministik ve saniyeler içinde** söyleyen mekanik bir kontrol listesi.

## Solution

Projeye özgü bir `security-walls` skill'i ve onun çalıştırdığı deterministik bir Node script'i (`npm run check:security`). Kontrol mantığının tamamı script'te yaşar; skill ince bir katmandır: script'i çalıştırır, sonuçları yorumlar, FAIL'ler için nereye bakılacağını gösterir ve yeni bir duvarın nasıl ekleneceğini anlatır. Hiçbir kontrol LLM çağrısı yapmaz, dinamik saldırı denemez. Script CI'daki `build` job'ında bloklayıcı bir adım olarak da çalışır, böylece duvarlar skill çağrılmasa bile her PR'da doğrulanır.

Her kontrol PASS / FAIL / SKIP ve FAIL'lerde `dosya:satır` + kısa açıklama döner; herhangi bir FAIL process'i sıfırdan farklı bir kodla bitirir. Production'a (salt-okunur) dokunan tek kontrol, açıkça `--linked` bayrağıyla istenmedikçe SKIP olur.

## User Stories

1. Geliştirici olarak, tek bir komutla (`npm run check:security`) bütün güvenlik duvarlarının hâlâ yerinde olduğunu görmek istiyorum, ki bir değişikliğin güvenlik varsayımlarını kırıp kırmadığını merge'den önce bileyim.
2. Geliştirici olarak, `/security-walls` skill'ini çağırdığımda ajanın script'i çalıştırıp sonuçları sade bir özetle açıklamasını istiyorum, ki çıktıyı kendim yorumlamak zorunda kalmayayım.
3. Geliştirici olarak, kontrolün hiçbir LLM API çağrısı yapmadığını ve ücretsiz olduğunu bilmek istiyorum, ki istediğim sıklıkta çalıştırabileyim.
4. Geliştirici olarak, migration'larda oluşturulan her tabloda RLS'in açık olduğunun doğrulanmasını istiyorum, ki gelecekte eklenecek bir tablo RLS'siz kalırsa yakalansın.
5. Geliştirici olarak, `books`, `libraries` ve `ai_conversations` policy'lerinin `auth.uid()` ile sahiplik kontrolü yaptığının doğrulanmasını istiyorum, ki bir kullanıcı başkasının verisine erişemesin.
6. Geliştirici olarak, `notes`, `ai_messages` gibi dolaylı sahiplikli tabloların policy'lerinin üst tabloya (sırasıyla `books`, `ai_conversations`) ve `auth.uid()`'e dayandığının doğrulanmasını istiyorum, ki sahiplik zinciri kopmasın.
7. Geliştirici olarak, `book_libraries` policy'sinin hem `books` hem `libraries` sahipliğini kontrol ettiğinin doğrulanmasını istiyorum, ki migration 011'in kapattığı açık geri gelmesin.
8. Geliştirici olarak, policy durumunun migration'lar sırayla uygulandıktan sonraki **son hali** üzerinden değerlendirilmesini istiyorum, ki sonradan `drop policy` ile silinen ya da yeniden yazılan policy'ler doğru hesaba katılsın.
9. Geliştirici olarak, her `security definer` fonksiyonun `set search_path` içerdiğinin ve açıkça izin verilenler listesinde olduğunun doğrulanmasını istiyorum, ki RLS'i atlayan yeni bir fonksiyon fark edilmeden eklenmesin.
10. Geliştirici olarak, git'te takip edilen hiçbir dosyada `*.supabase.co` adresi, Supabase secret key'i, Gemini (`AIza…`) ya da Anthropic (`sk-ant-`) anahtarı olmadığının doğrulanmasını istiyorum, ki gizli bilgiler repoya sızmasın.
11. Geliştirici olarak, bulunan her JWT'nin çözülüp `service_role` rolünde olanların — build çıktısı dahil — her yerde FAIL sayılmasını istiyorum, ki en yetkili anahtar hiçbir zaman commit'lenmesin ya da bundle'a girmesin.
12. Geliştirici olarak, Supabase CLI'ın local demo anahtarlarının sızıntı sayılmamasını istiyorum, ki gereksiz alarm almayayım.
13. Geliştirici olarak, production proje ref'inin kontrol koduna gömülmeden (varsa gitignore'daki local link bilgisinden okunarak) takip edilen dosyalarda aranmasını istiyorum, ki kontrolün kendisi sızıntı kaynağı olmasın.
14. Geliştirici olarak, `.env`, `.env.test.local` ve Supabase CLI'ın local link klasörünün gitignore'da olduğunun ve takip edilmediğinin, `.env.example`'daki değerlerin boş olduğunun doğrulanmasını istiyorum.
15. Geliştirici olarak, RLS entegrasyon testlerinin localhost guard'ının gerçekten çalıştığının davranışsal olarak doğrulanmasını istiyorum (remote bir URL ile process'in `exit 1` ile durması, `127.0.0.1` ile geçmesi), ki guard sadece var olmakla kalmayıp işini yapsın.
16. Geliştirici olarak, integration test config'inin hâlâ bu guard'ı `globalSetup` olarak kullandığının doğrulanmasını istiyorum, ki guard dosyası yerinde durup devre dışı kalmasın.
17. Geliştirici olarak, istersem `--linked` bayrağıyla production'ın migration bookkeeping'inin (`schema_migrations`) local migration dosyalarıyla tutarlı olduğunu salt-okunur şekilde kontrol edebilmek istiyorum, ki `docs/agents/supabase-migrations.md`'de anlatılan sessiz uyumsuzluğu erken göreyim.
18. Geliştirici olarak, `--linked` modunda production'daki `pg_policies`'in RLS kontrolünün beklediği policy'lerle karşılaştırılmasını istiyorum, ki bookkeeping doğru görünse bile canlı şemanın farklı olduğu durumu yakalayayım.
19. Geliştirici olarak, `--linked` modunun hiçbir koşulda `migration repair`, `db push` ya da yazma yapan bir sorgu çalıştırmamasını istiyorum, ki kontrol production'ı asla değiştirmesin.
20. Geliştirici olarak, `--linked` verilmediğinde (ve CI'da) bu kontrolün SKIP olmasını istiyorum, ki varsayılan çalıştırma production kimlik bilgisi gerektirmesin.
21. Geliştirici olarak, `try_consume_ai_quota`'nın `security definer` + `set search_path` ile tanımlı olduğunun ve `ai_daily_usage`'ın RLS'i açık, policy'siz kaldığının doğrulanmasını istiyorum.
22. Geliştirici olarak, `ai-chat` Edge Function'ında kota çağrısının ilk veritabanı yazmasından ve Gemini `fetch`'inden önce geldiğinin, `quotaError`'da hata fırlatıp `!quotaOk`'ta erken döndüğünün doğrulanmasını istiyorum, ki kota guard'ı bir refactor'da atlanmasın.
23. Geliştirici olarak, `src/` ve Edge Function kodunda ham SQL çalıştırma yolu (`.query(`, `` sql` `` şablonu, `pg`/`postgres` import'u) olmadığının doğrulanmasını istiyorum, ki tüm erişim query builder'dan geçsin.
24. Geliştirici olarak, her `.rpc()` çağrısının parametrelerini obje olarak (string birleştirme/template literal olmadan) geçtiğinin doğrulanmasını istiyorum.
25. Geliştirici olarak, PostgREST filtre dizesi alan metotlara (`.or`, `.filter`, `.not`, `.textSearch`) dinamik dize (template literal veya birleştirme) geçilmesinin FAIL sayılmasını istiyorum, ki supabase-js'teki asıl injection yüzeyi olan filtre enjeksiyonu yakalansın.
26. Geliştirici olarak, bu kod kontrollerinin metin aramasıyla değil JS ayrıştırmasıyla yapılmasını istiyorum, ki `Array.prototype.filter` gibi alakasız çağrılar yanlış alarm üretmesin.
27. Geliştirici olarak, migration'lardaki plpgsql `execute` ifadelerinin `||` birleştirmesi ya da `format('%s', …)` ile kurulan dizeler kullanmadığının doğrulanmasını istiyorum, ki veritabanı tarafında dinamik SQL enjeksiyonu açılmasın.
28. Geliştirici olarak, bilerek yapılmış istisnaların (ör. `ai_daily_usage`'ın policy'siz olması, kota fonksiyonunun `security definer` olması) gerekçeleriyle birlikte tek bir listede durmasını istiyorum, ki bir istisnanın neden var olduğu tek yerden okunabilsin.
29. Geliştirici olarak, yeni bir güvenlik önlemi eklendiğinde (ör. OAuth login) bunu kontroller klasörüne tek bir dosya ve kayıt listesine tek bir satır ekleyerek duvarlara katabilmek istiyorum.
30. Geliştirici olarak, skill'in "yeni duvar ekleme" bölümünü okuyarak bir kontrolün hangi şekle uyması gerektiğini ve testinin nasıl yazılacağını görmek istiyorum.
31. Geliştirici olarak, CI'daki `build` job'ının herhangi bir duvar FAIL verdiğinde kırmızıya dönmesini istiyorum, ki kırık bir duvar main'e merge edilemesin.
32. Geliştirici olarak, her kontrolün bozulduğunda sessizce PASS vermediğini kanıtlayan testler olmasını istiyorum, ki kontrolün kendisine güvenebileyim.
33. Yeni bir clone yapan geliştirici olarak, proje skill'inin `.agents/skills` restore prosedüründen sonra da yerinde olmasını ve `.claude/skills` altından erişilebilmesini istiyorum.

## Implementation Decisions

- **Mantık script'te, skill ince**: Kontrollerin tamamı deterministik bir Node script'inde yaşar ve `package.json`'a `check:security` script'i olarak eklenir. Skill, script'i çalıştırıp sonucu yorumlayan, FAIL'lerin nasıl ele alınacağını ve yeni duvarın nasıl ekleneceğini anlatan bir `SKILL.md`'dir. Skill kontrol mantığını tekrar etmez (single source of truth script'tir).
- **Kontrol modülü şekli**: Her duvar ayrı bir modüldür ve `{ id, title, run(ctx) }` nesnesi export eder. `run` bir sonuç listesi döner: her sonuç `status` (`pass` / `fail` / `skip`), `message` ve varsa `file`/`line` içerir. Kontroller bir kayıt listesinde (registry) sırayla tanımlanır; yeni duvar = yeni modül + registry'de bir satır.
- **Tek giriş noktası (seam)**: `runChecks({ root, linked })` fonksiyonu verilen repo kökü üzerinde tüm kontrolleri çalıştırıp sonuçları döner. CLI bu fonksiyonun ince bir sarmalayıcısıdır: sonuçları basar, herhangi bir `fail` varsa sıfırdan farklı kodla çıkar. `ctx`, kontrollerin paylaştığı ortak bilgileri (repo kökü, takip edilen dosya listesi, migration'lardan çıkarılan policy son durumu, `linked` bayrağı) taşır, ki her kontrol aynı işi yeniden yapmasın.
- **Bilinçli istisnalar tek listede**: `ai_daily_usage`'ın policy'siz olması, `try_consume_ai_quota`'nın `security definer` olması, izin verilen local demo anahtarları ve tablo başına beklenen sahiplik zinciri gibi beklentiler, her birinin gerekçesiyle tek bir config modülünde tutulur. Kontroller bu listeyi okur; istisna eklemek kod değil config değişikliğidir.
- **Duvar 1 — RLS**: Migration dosyaları numara sırasıyla okunur; `create table`, `enable row level security`, `create policy` ve `drop policy [if exists]` ifadeleri sırayla uygulanarak tablo ve policy'lerin son durumu çıkarılır. Kurallar:
  - Oluşturulan her tabloda RLS açık olmalı.
  - İstisna listesinde olmayan, RLS'i açık her tablonun en az bir policy'si olmalı ve policy'nin `using` / `with check` ifadelerinden en az biri `auth.uid()` içermeli.
  - Beklenen sahiplik zinciri config'teki tablo başına beklentilere göre doğrulanır: `notes` → `books`, `ai_messages` → `ai_conversations`, `book_libraries` → hem `books` hem `libraries`.
  - Her `security definer` fonksiyon `set search_path` içermeli ve istisna listesinde olmalı.
  - Kaynak migration dosyalarıdır; `schema.sql` bu kontrolün kaynağı değildir.
- **Duvar 2 — Sızıntı**: Taranan küme `git ls-files` ile takip edilen dosyalardır; ayrıca varsa build çıktısı yalnızca `service_role` JWT'si için taranır. Kurallar:
  - `*.supabase.co` adresi, `sb_secret_` önekli anahtar, `AIza…` Gemini anahtarı veya `sk-ant-` anahtarı bulunursa FAIL.
  - Bulunan her JWT'nin payload'ı çözülür; `role: service_role` her yerde FAIL, `role: anon` takip edilen dosyalarda FAIL. Local demo anahtarları (Supabase CLI'ın ürettiği, config'te tanımlı `iss` değeriyle tanınan) izinlidir.
  - Production ref'i script'e gömülmez: varsa gitignore'daki Supabase CLI link bilgisinden okunur ve takip edilen dosyalarda aranır; yoksa bu alt kontrol SKIP olur.
  - `.env`, `.env.test.local` ve Supabase CLI'ın local link klasörü `git check-ignore` ile ignore edilmiş ve takip edilmiyor olmalı; `.env.example`'daki her anahtarın değeri boş olmalı.
  - README'deki canlı demo (Netlify) linki gizli bilgi değildir, taranmaz.
- **Duvar 3 — localhost guard**: Davranışsal doğrulama. Guard modülü boş bir geçici dizinde (ki repodaki `.env.test.local` yüklenmesin) ayrı bir Node process'inde iki kez çalıştırılır: remote bir `SUPABASE_URL` ile `exit 1` beklenir, `http://127.0.0.1:54321` ile başarılı dönüş beklenir. Ayrıca integration Vitest config'inin `globalSetup` olarak bu modülü referans verdiği doğrulanır.
- **Duvar 4 — Migration geçmişi (`--linked`, opt-in)**: Yalnızca `--linked` verildiğinde çalışır; aksi halde SKIP. Salt-okunur Supabase CLI komutlarıyla (`supabase migration list --linked`, `supabase db query --linked`) production'ın `schema_migrations` versiyonları ile local migration dosya versiyonları karşılaştırılır (eksik ya da sadece remote'ta olan versiyon = FAIL), ve production `pg_policies` içeriği Duvar 1'in beklediği policy kümesiyle karşılaştırılır. Script hiçbir koşulda `migration repair`, `db push` veya yazma sorgusu çalıştırmaz; CLI login/link yoksa SKIP ve nasıl bağlanılacağına dair kısa bir mesaj. CI'da çalıştırılmaz.
- **Duvar 5 — Kota guard'ı**: Migration'lardan `try_consume_ai_quota`'nın son tanımının `security definer` ve `set search_path` içerdiği; `ai_daily_usage`'da RLS'in açık ve policy'siz olduğu doğrulanır. `ai-chat` Edge Function kaynağı ayrıştırılarak `rpc('try_consume_ai_quota', …)` çağrısının ilk `.insert(` çağrısından ve Gemini'ye giden `fetch(`ten önce geldiği, `quotaError` durumunda `throw`, `!quotaOk` durumunda erken `return` olduğu doğrulanır. (Fonksiyonun `p_max_requests`'i client'tan alması ayrı bir güvenlik açığıdır ve ayrı bir spec'te ele alınacak; bu duvar sadece guard'ın yerinde olduğunu doğrular.)
- **Duvar 6 — SQL injection (statik)**: `src/` ve `supabase/functions/` altındaki JS/TS dosyaları espree ile AST'ye ayrıştırılır (test dosyaları hariç). Kurallar:
  - `.query(` çağrısı, `sql` tag'li template literal, `pg` / `postgres` / `postgresjs` import'u = FAIL.
  - `.rpc(name, args)` çağrısında `args` bir obje ifadesi ya da identifier olmalı; template literal veya `+` birleştirmesi = FAIL.
  - `.or`, `.not`, `.textSearch` ve 3 argümanlı `.filter` çağrılarının argümanlarından biri template literal ya da birleştirme ise FAIL (PostgREST filtre enjeksiyonu). Tek argümanlı callback alan `.filter` (Array) kapsam dışıdır.
  - Migration'lardaki plpgsql `execute` ifadesinde `||` birleştirmesi ya da `format(` içinde `%s` kullanımı = FAIL; `%I` / `%L` izinlidir.
  - TypeScript Edge Function dosyaları espree'nin ayrıştıramadığı söz dizimi içerirse, o dosya için sonuç SKIP değil FAIL ("ayrıştırılamadı") olur, ki kontrol sessizce kör kalmasın.
- **Skill konumu ve takibi**: Skill `.agents/skills/security-walls/` altında yaşar. `.gitignore`'daki `.agents/skills/` kuralı `.agents/skills/*` + `!.agents/skills/security-walls/` olarak değiştirilir, ki bu tek klasör takip edilsin ve upstream skill'ler yine ignore kalsın. `skills-lock.json`'a eklenmez (upstream kaynağı yok). `docs/agents/`'taki restore prosedürüne bu skill için `.claude/skills` bağlantısının nasıl oluşturulacağı bir adım olarak eklenir.
- **Invocation**: Skill user-invoked'dir (`disable-model-invocation: true`); description insan için tek satırlık özettir. Düzenli doğrulamayı CI yapar; skill elle derinlemesine bakmak içindir.
- **SKILL.md içeriği**: (1) script'i çalıştır, (2) her FAIL'i duvar adıyla, dosya:satırla ve olası nedeniyle raporla, (3) `--linked` modunun ne zaman ve nasıl kullanılacağı (salt-okunur olduğu, production kimlik bilgisi gerektirdiği), (4) "Yeni duvar ekleme" bölümü: modül şekli, registry satırı, istisna config'i ve zorunlu "kötü örnek" testi. Bulguları otomatik düzeltmez; FAIL'ler için ayrı ticket/spec önerir.
- **CI**: `.github/workflows/ci.yml`'deki `build` job'ına `npm run check:security` bloklayıcı bir adım olarak eklenir (`--linked` olmadan). Yeni bir job açılmaz.
- **Bağımlılık**: espree, eslint üzerinden zaten dolaylı olarak kurulu; doğrudan import edildiği için `devDependencies`'e açıkça eklenir. Başka yeni bağımlılık eklenmez.

## Testing Decisions

- İyi bir test sadece dış davranışı doğrular: `runChecks`'e bir repo kökü verilir, dönen sonuçlarda beklenen kontrolün beklenen durumu (`fail` / `pass`) ve mümkünse dosya bilgisi doğrulanır. Kontrollerin iç ayrıştırma adımları test edilmez.
- Tek seam `runChecks({ root })`'tur. Her duvar için küçük, amaca özel bir "kötü örnek" fixture dizini hazırlanır (ör. RLS'siz tablo oluşturan bir migration; `book_libraries` policy'si `libraries`'i referans vermeyen bir migration; `service_role` JWT'si içeren bir dosya; kota çağrısı Gemini `fetch`'inden sonra gelen bir `ai-chat`; `.or()`'a template literal geçen bir hook; localhost kontrolü silinmiş bir guard) ve ilgili duvarın FAIL verdiği doğrulanır. Asıl amaç, bir kontrolün bozulduğunda sessizce PASS vermesini yakalamaktır.
- Buna ek olarak tek bir pozitif test: gerçek repo kökü üzerinde `runChecks` çalıştırıldığında hiçbir `fail` dönmemesi (Duvar 4 SKIP). Bu, bugünkü kod tabanının temiz olduğunu ve kontrollerin yanlış alarm üretmediğini doğrular.
- Proje kuralına uygun olarak sadece bu kritik akış test edilir; yardımcı fonksiyonlar için ayrıca birim testi yazılmaz.
- Testler Node ortamında çalışır ve mevcut `npm test` suite'ine dahil olur (local Supabase gerektirmez). En yakın emsal, RLS entegrasyon testlerindeki Node ortamlı Vitest kurulumu ve localhost guard'ının kendisidir.
- Duvar 4 (`--linked`) otomatik testlerle production'a karşı çalıştırılmaz; CLI çıktısının ayrıştırılması, sabit bir örnek CLI çıktısıyla test edilir.

## Out of Scope

- Dinamik test, gerçek exploit ya da payload gönderme (Strix gibi araçların işi).
- LLM API çağrısı gerektiren herhangi bir kontrol.
- `try_consume_ai_quota`'nın `p_max_requests`'i client'tan alması açığının düzeltilmesi — bu skill'in implementasyonundan sonra ayrı bir `/to-spec` ile ele alınacak.
- Bulunan FAIL'leri otomatik düzeltme.
- `schema.sql` ile migration'lar arasındaki farkların uzlaştırılması.
- Production'a yazma yapan herhangi bir işlem (`migration repair`, `db push`).
- Bağımlılık açığı taraması (`npm audit` vb.) ve HTTP güvenlik başlıkları kontrolü — ileride yeni bir duvar olarak eklenebilir.

## Further Notes

- Araştırma sırasında bugünkü kod tabanının Duvar 6 açısından temiz olduğu görüldü: tüm `.rpc` çağrıları obje alıyor, hiçbir yerde PostgREST filtre dizesi (`.or` vb.) kullanılmıyor, migration'larda dinamik `execute` yok. İstatistik RPC'lerinin hepsi `security invoker`; tek `security definer` fonksiyon `try_consume_ai_quota`.
- `git archive` ile çıkarılan temiz ağaçta production ref'i ya da JWT bulunmadı; ref'in diskteki kopyaları (`.env`, build çıktısı, Supabase CLI link klasörü) gitignore'da. Duvar 2 bu durumun korunmasını garanti eder.
- `supabase db query --linked` Docker gerektirmez; `docs/agents/supabase-migrations.md`'de production şemasını doğrulamak için önerilen yöntemdir. Duvar 4 bu belgedeki manuel adımın otomatik, salt-okunur halidir.
- OAuth login geldiğinde beklenen yeni duvarlar örnek olarak: izinli redirect URL listesinin yalnızca bilinen domainleri içermesi, provider secret'larının takip edilen dosyalarda olmaması.
