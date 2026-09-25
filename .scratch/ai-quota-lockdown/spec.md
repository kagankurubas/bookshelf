# Kitap Asistanı kotasının kilitlenmesi (ai-quota-lockdown)

Status: ready-for-agent

## Problem Statement

Kitap Asistanı'nın tüm kullanıcılar arasında paylaşılan tek bir günlük kotası var. Bu kotayı `try_consume_ai_quota` fonksiyonu tüketiyor. Fonksiyon `authenticated` rolüne açık ve iki parametresini de çağıran taraf veriyor: günü (`p_usage_date`) ve limiti (`p_max_requests`). Giriş yapmış herhangi bir kullanıcı `ai-chat` Edge Function'ını atlayıp fonksiyonu PostgREST üzerinden doğrudan, büyük bir `p_max_requests` ile tekrar tekrar çağırabilir. Böylece o günün sayacını dilediği kadar şişirir ve asistanı o gün herkes için kapatır. Aynı yolla sayacı gelecekteki günler için de önceden doldurabilir, çünkü günü de çağıran taraf seçiyor.

Buna ek olarak 15'lik günlük limitin mevcut Google Cloud kredileri ışığında yükseltilip yükseltilemeyeceği değerlendirildi. Sonuç: yükseltilmiyor (bkz. Further Notes).

## Solution

Kota fonksiyonu, istemcinin hiçbir girdisine güvenmez hale gelir. Günlük limit fonksiyonun içinde sabit durur. Gün de fonksiyonun içinde, Google'ın kota sıfırlama saat dilimine (Pasifik) göre hesaplanır. Fonksiyonun EXECUTE yetkisi `public`, `anon` ve `authenticated`'dan geri alınır ve yalnızca `service_role`'e verilir. `ai-chat` Edge Function'ı kotayı ayrı bir service-role client ile tüketir. Diğer tüm sorgular kullanıcının kendi oturumuyla, RLS'e tabi olarak çalışmaya devam eder. Günlük limit 15'te kalır; kullanıcı açısından görünür bir fark yoktur.

## User Stories

1. Kitap Asistanı kullanıcısı olarak, başka bir kullanıcının asistanı herkes için kapatamamasını istiyorum, böylece günlük kota gerçekten dolmadıkça asistanı kullanabileyim.
2. Kitap Asistanı kullanıcısı olarak, günlük kota dolduğunda eskisi gibi nazik ve çevrilmiş bir mesaj görmek istiyorum, böylece ne olduğunu anlayayım.
3. Kitap Asistanı kullanıcısı olarak, günlük limitin Gemini'nin gerçek sınırının altında kalmasını istiyorum, böylece kota dolmadan Google'dan beklenmedik bir hata almayayım.
4. Uygulama sahibi olarak, hiçbir istemcinin kota fonksiyonunu doğrudan çağıramamasını istiyorum, böylece kotayı yalnızca `ai-chat` tüketebilsin.
5. Uygulama sahibi olarak, limitin çağıran tarafça belirlenememesini istiyorum, böylece service-role anahtarı dışında hiçbir yoldan limit değiştirilemesin.
6. Uygulama sahibi olarak, günün de çağıran tarafça seçilememesini istiyorum, böylece sayaç gelecekteki günler için önceden doldurulamasın.
7. Uygulama sahibi olarak, eski iki parametreli fonksiyon imzasının veritabanından tamamen kalkmasını istiyorum, böylece eski imza üzerinden açık kalmasın.
8. Uygulama sahibi olarak, `anon` rolünün de fonksiyonu çağıramamasını istiyorum, çünkü Postgres ve Supabase yeni fonksiyonlara varsayılan olarak geniş EXECUTE yetkisi verir.
9. Uygulama sahibi olarak, `ai-chat`'in kitap, sohbet ve mesaj sorgularını kullanıcının kendi oturumuyla yapmaya devam etmesini istiyorum, böylece service-role yalnızca kota çağrısıyla sınırlı kalsın ve RLS atlanmasın.
10. Uygulama sahibi olarak, kotanın hâlâ Gemini çağrısından ve herhangi bir veritabanı yazımından önce tüketilmesini istiyorum, böylece kota dolduğunda yarım kayıt oluşmasın.
11. Uygulama sahibi olarak, sayacın eşzamanlı isteklerde aşılamamasını istiyorum (mevcut tek-UPDATE atomikliği korunmalı).
12. Uygulama sahibi olarak, limiti değiştirmenin yeni bir migration gerektirmesini istiyorum, böylece her değişiklik incelenip versiyonlansın.
13. Uygulama sahibi olarak, limitin Gemini projesinin ücretsiz katmanıyla uyumlu kalmasını istiyorum, çünkü proje hiçbir faturalandırma hesabına bağlı değil.
14. Geliştirici olarak, `check:security`'nin bu değişiklikten sonra PASS vermesini istiyorum.
15. Geliştirici olarak, kota duvarının fonksiyonun yeniden istemcilere açılmasını veya limit parametresinin geri gelmesini FAIL olarak yakalamasını istiyorum, böylece bu açık bir refactor'da sessizce geri dönmesin.
16. Geliştirici olarak, bir entegrasyon testinin gerçek local Supabase'de `authenticated` ve `anon` rollerinin fonksiyonu çağıramadığını, `service_role`'ün çağırabildiğini ve limitte durduğunu kanıtlamasını istiyorum.
17. Geliştirici olarak, `schema.sql`'in yeni hedef durumu yansıtmasını istiyorum, böylece sıfırdan kurulan bir proje açıkla başlamasın.
18. Geliştirici olarak, production'a geçişte eski Edge Function ile yeni migration arasındaki kesintinin kısa ve öngörülebilir olmasını istiyorum.
19. Geliştirici olarak, Edge Function'daki kota yorumunun ve `DAILY_QUOTA_LIMIT` sabitinin yeni duruma göre güncellenmesini istiyorum, böylece limitin nerede tanımlandığı konusunda yanıltıcı bir açıklama kalmasın.

## Implementation Decisions

- **Yeni migration (014)**: Eski `try_consume_ai_quota(date, integer)` imzası `drop function` ile kaldırılır. Postgres fonksiyonları imzaya göre ayırt ettiği için, `create or replace` ile tanımlanan parametresiz yeni sürüm eskisinin yerine geçmez, onun yanına eklenir. Eski imza düşürülmezse açık olduğu gibi kalır.
- **Yeni imza parametresiz**: `try_consume_ai_quota() returns boolean`, `security definer`, `set search_path = public`. Limit gövdede sabittir. Gün `(now() at time zone 'America/Los_Angeles')::date` ile hesaplanır. Mevcut insert-on-conflict + koşullu tek UPDATE deseni aynen korunur.
- **Yetkiler**: `revoke execute ... from public, anon, authenticated` ve `grant execute ... to service_role`. Yalnızca `authenticated`'dan geri almak yetmez: Postgres yeni fonksiyonlarda EXECUTE yetkisini `PUBLIC`'e verir, Supabase'in varsayılan yetkileri de `anon` ve `authenticated`'a verir.
- **`ai-chat` Edge Function**: Ticket'ta varsayıldığı gibi `service_role` ile çalışmıyor. Anon anahtarı ve kullanıcının JWT'siyle, yani `authenticated` rolüyle çalışıyor. Bu yüzden yalnızca kota çağrısı için Supabase'in Edge Function'lara otomatik sağladığı `SUPABASE_SERVICE_ROLE_KEY` ile ikinci, oturumsuz bir client oluşturulur. RPC argümansız çağrılır. Kullanıcı doğrulama, sohbet, mesaj ve kitap sorguları mevcut kullanıcı client'ında kalır. `DAILY_QUOTA_LIMIT` sabiti ve Pasifik tarih hesabı Edge Function'dan kaldırılır. `quotaError` durumunda throw ve `!quotaOk` durumunda erken `DAILY_LIMIT_REACHED` dönüşü aynen kalır.
- **Günlük limit: 15** (değişmiyor). Gerekçe aşağıda, Further Notes'ta.
- **`schema.sql`**: Kota bölümü yeni fonksiyonu ve yetkileri gösterecek şekilde güncellenir. Yorum, limitin artık Edge Function'da değil fonksiyon içinde sabit olduğunu anlatacak şekilde düzeltilir. Uygulanmış eski migration'lara (001, 012) dokunulmaz.
- **security-walls, mevcut kontroller**: Fonksiyon `security definer` ve `set search_path` ile kaldığı için RLS duvarı ile kota duvarının migration kontrolü değişmeden PASS vermelidir. Migration ayrıştırıcısı fonksiyonları ada göre tutar ve son `create function`'ı esas alır. `drop function` + yeni `create`, son tanımı yeni sürüm yapar. Edge Function kontrolü `.rpc('try_consume_ai_quota'` düzenine baktığı için çağrının hangi client üzerinden yapıldığından etkilenmez. `exceptions.js`'teki `securityDefinerFunctions` ve `policylessTables` girdileri geçerliliğini korur. Yalnızca `ai_daily_usage` gerekçesindeki metin "yalnızca service_role, ai-chat üzerinden" diye netleştirilir.
- **security-walls, yeni kontroller**: Kota duvarına iki kontrol eklenir. (a) Fonksiyonun son tanımında `p_max_requests` parametresi varsa FAIL. (b) Migration'lar sırayla okunduğunda fonksiyonun son hali `public`, `anon` veya `authenticated`'a EXECUTE yetkisi veriyorsa FAIL. Son hal şu şekilde bulunur: son `create`'ten sonraki grant/revoke ifadeleri takip edilir. Hiç revoke yoksa varsayılan yetkiler açık kabul edilir. Yetkinin geri alındığını kaynakta kanıtlayamayan bir durum da sessiz SKIP değil, FAIL verir. Ayrıştırıcıya bu fonksiyon için grant/revoke izlemesi eklenir.
- **Production'a geçiş sırası**: Edge Function Dashboard'a elle yapıştırılıyor ve migration eski imzayı düşürüyor. Bu yüzden iki adım arasında asistan kısa bir süre hata verir. Sıra şöyledir: önce migration (`--linked` kontrolü ve `docs/agents/supabase-migrations.md` akışıyla), hemen ardından yeni Edge Function yapıştırılır. Tek kullanıcılı, küçük bir uygulama için birkaç dakikalık kesinti kabul edilir. İki fazlı bir geçiş (önce yeni fonksiyon, sonra eskiyi düşürme) gereksiz karmaşıklık olarak reddedildi.

## Testing Decisions

- İyi bir test dış davranışı doğrular: hangi rolün fonksiyonu çağırabildiği ve sayacın limitte durup durmadığı. Fonksiyon gövdesinin metni test edilmez.
- **Seam 1: RLS entegrasyon testleri (local Supabase, gerçek PostgREST sınırı).** Yeni bir test dosyası eklenir ve mevcut fixture deseni kullanılır. Test şunları doğrular:
  - Oturum açmış `authenticated` client'ın `rpc('try_consume_ai_quota')` çağrısı yetki hatası alır. Eski iki parametreli imzayla yapılan çağrı da başarısız olur.
  - Oturumsuz `anon` client da yetki hatası alır.
  - Service-role client ilk çağrıda `true` döner. Limit kadar çağrıdan sonra `false` döner ve sayaç limiti aşmaz.
  - Sayaç tüm testlerin paylaştığı bir durumdur. Bu yüzden test, bugünün Pasifik tarihli `ai_daily_usage` satırını service-role ile önce ve sonra siler.
  - Prior art: mevcut RLS izolasyon testleri ve fixture yardımcıları (`createServiceRoleClient`, `createAnonClient`, `setupRlsFixture`).
- **Seam 2: security-walls birim testleri (fixture migration metinleriyle).** Kota duvarı testlerine şu durumlar eklenir: parametresiz ve service_role'e kısıtlı tanım PASS; `p_max_requests` içeren son tanım FAIL; `authenticated`'a grant bırakan tanım FAIL; revoke'suz tanım FAIL. Mevcut fixture'lar yeni imzaya göre güncellenir. Prior art: mevcut quotaGuard ve rls check testleri.
- `check:security`'nin gerçek repo üzerinde PASS verdiği çalıştırılarak doğrulanır.
- `ai-chat` Edge Function'ı için otomatik test yazılmaz. Bugün de yok ve Deno/Dashboard'a elle yapıştırılan bir fonksiyon. Kota sırası duvar tarafından, rol davranışı entegrasyon testiyle korunur. Uçtan uca davranış (mesaj gönderme, limit dolunca nazik mesaj) elle, gerçek tarayıcıda doğrulanır.

## Out of Scope

- Kullanıcı başına rate-limit (backlog'da ayrı bir görev).
- Gemini modelini değiştirmek (`gemini-3.6-flash` kalıyor).
- Limiti config tablosu veya ortam değişkeni ile çalışma zamanında ayarlanabilir yapmak. Limit bilerek migration'da sabit tutuluyor.
- Gönderilen bağlamı (200 kitaplık liste, tüm sohbet geçmişi) kısaltarak istek başına maliyeti düşürmek.
- Uygulanmış eski migration'ları (001, 012) düzenlemek.

## Further Notes

### Günlük limit hesabı

- **Model**: `ai-chat`, `gemini-3.6-flash` çağırıyor (Flash, Pro değil). Paid tier fiyatı: girdi $0.75 / 1M token, çıktı $3.75 / 1M token. Bu fiyat **31 Aralık 2026'ya kadar geçerli; 1 Ocak 2027'de iki katına çıkıyor.** Ücretsiz katman bu model için günde yaklaşık 20 istek veriyor. Google bu sayıyı artık dokümanda yayınlamıyor ve garanti etmiyor. RPD proje başına sayılır ve Pasifik gece yarısı sıfırlanır.
- **İstek başına tahmini maliyet**: Her istek sistem prompt'unu (200 kitaba kadar liste), tüm sohbet geçmişini ve yeni mesajı gönderiyor. Tipik bir istekte yaklaşık 8k girdi ve düşünme token'ları dahil yaklaşık 1,5k çıktı token'ı var. Bu da bugün yaklaşık $0,012, 2027'de yaklaşık $0,024 eder. Uzun bir sohbette (yaklaşık 30k girdi, 3k çıktı) bugün yaklaşık $0,034, 2027'de yaklaşık $0,07 eder.
- **Faturalandırma durumu (kullanıcı tarafından doğrulandı)**: Gemini anahtarının bağlı olduğu `bookshelf-ai` projesi ücretsiz katmanda ve hiçbir faturalandırma hesabına bağlı değil. Free Trial kredisi ve $30'lık AI Studio kredisi bu projeye uygulanmıyor. Google'ın billing dokümanı da Free Trial / Welcome kredisinin Gemini API'ye uygulanamadığını söylüyor.
- **Karar: limit 15'te kalır.** Ücretsiz katmanın gerçek sınırı yaklaşık 20/gün ve Google bunu garanti etmiyor. 20 ve üzeri bir değer, nazik mesaj yerine Google'dan 429 hatası, yani 500 yanıtı üretebilir. 15, bu sınırın altında bir pay bırakıyor.
- **İleride paid tier'a geçilirse**: Tipik istek bugün yaklaşık $0,012, 1 Ocak 2027'den sonra yaklaşık $0,024 tutuyor. ₺500/ay (≈ $10,2, yaklaşık 48,9 ₺/$) bütçeyle limit her gün dolsa bile 2027 fiyatlarıyla ancak yaklaşık 14/gün karşılanabiliyor. Limit o zaman yeni bir migration ile ve bu hesap güncellenerek değiştirilmeli.

### Diğer notlar

- Kaynaklar: [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing), [Gemini API billing](https://ai.google.dev/gemini-api/docs/billing), [Gemini API rate limits](https://ai.google.dev/gemini-api/docs/rate-limits), [Ücretsiz katman ölçümü (20 RPD)](https://dev.to/romeroyang/geminis-free-tier-measured-20-requests-a-day-and-google-no-longer-publishes-the-number-4gf2), [USD/TRY](https://tradingeconomics.com/turkey/currency).
- security-walls spec'i bu açığı bilerek kapsam dışı bırakmış ve ayrı bir `/to-spec` ile ele alınmasını not etmişti. Bu spec o notun devamı.
