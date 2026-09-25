# Kitap Asistanı: Gemini'nin geçici hatalarında yeniden deneme, kota iadesi ve ertelenmiş kayıt (ai-chat-gemini-retry)

Status: ready-for-agent

Bulgunun kaynağı: `issues/01-gemini-transient-errors.md`.

## Problem Statement

Gemini API zaman zaman kendi tarafındaki yoğunluk yüzünden 503 `UNAVAILABLE` ("This model is currently experiencing high demand") ya da hız sınırı yüzünden 429 `RESOURCE_EXHAUSTED` dönüyor. 25 Eylül 2026'da production'da arka arkaya iki 503 görüldü. Kullanıcı her seferinde genel "Bir şeyler ters gitti, tekrar dener misin?" mesajını gördü; aynı mesajı tekrar gönderince normal yanıt geldi.

`ai-chat` bu durumu kullanıcının suçu olmayan kalıcı bir sunucu hatası gibi ele alıyor. Mevcut akışın üç yan etkisi var:

1. **Kota boşa düşüyor.** Paylaşılan günlük kota (`try_consume_ai_quota`) Gemini'den önce tüketiliyor. Gemini yanıt vermese de o gün herkesin 15'lik hakkından biri gidiyor.
2. **Mesaj yanıtsız kaydediliyor ve tekrar denemede çiftleniyor.** Kullanıcı mesajı Gemini'den önce `ai_messages`'e yazılıyor. Tekrar denemede aynı mesaj ikinci kez yazılıyor ve Gemini'ye giden geçmişte çift görünüyor.
3. **Yeni sohbette yetim sohbetler birikiyor.** Yeni bir sohbetin ilk mesajı başarısız olunca sunucu `ai_conversations`'a bir satır ekliyor, ama hata yanıtında `conversationId` dönmediği için istemci bunu hiç öğrenmiyor. Tekrar denemede yeni bir sohbet daha açılıyor. İlki listede yalnızca kullanıcı mesajıyla, yanıtsız kalıyor.

Ayrıca Gemini'nin kendi dokümanı 503 ve 429 için kısa bir üstel geri çekilmeyle (exponential backoff) yeniden denemeyi öneriyor. Biz hiç denemiyoruz. Oysa bu tür hatalar çoğu zaman birkaç saniye içinde geçiyor.

## Solution

`ai-chat`, Gemini'nin geçici hatalarında isteği birkaç saniye içinde kendisi yeniden dener. Kullanıcı çoğu zaman hatayı hiç görmez, yalnızca "yazıyor…" göstergesi biraz uzun kalır.

Veritabanına yazmak Gemini başarılı olana kadar ertelenir: sohbet, kullanıcı mesajı ve asistan yanıtı ancak bir yanıt alındıktan sonra birlikte kaydedilir. Böylece başarısız denemeler iz bırakmaz ve tekrar denemede hiçbir şey çiftlenmez.

Yeniden denemeler de tükenirse ya da Gemini başka bir sebeple yanıt üretemezse, tüketilen kota hakkı geri verilir. Hata 503/429 kaynaklıysa kullanıcıya genel hata yerine asistanın şu an yoğun olduğunu ve bu denemenin günlük hakkından düşmediğini söyleyen ayrı bir mesaj gösterilir.

## User Stories

1. Kitap Asistanı kullanıcısı olarak, Gemini anlık olarak yoğunken isteğimin kendiliğinden yeniden denenmesini istiyorum, böylece çoğu zaman hata görmeden yanıtımı alayım.
2. Kitap Asistanı kullanıcısı olarak, yeniden denemeler sürerken yalnızca mevcut "yazıyor…" göstergesini görmek istiyorum, ayrı bir ara ekran değil.
3. Kitap Asistanı kullanıcısı olarak, Gemini yoğunluk yüzünden yine de yanıt veremediyse bunu açıkça söyleyen bir mesaj görmek istiyorum, böylece hemen tekrar denemek yerine birkaç dakika bekleyeyim.
4. Kitap Asistanı kullanıcısı olarak, yanıt alamadığım bir denemenin günlük hakkımdan düşmemesini istiyorum.
5. Kitap Asistanı kullanıcısı olarak, bu durumda günlük hakkımın düşmediğinin mesajda söylenmesini istiyorum, böylece tekrar denemekten çekinmeyeyim.
6. Kitap Asistanı kullanıcısı olarak, başarısız bir denemeden sonra mesajımı tekrar gönderdiğimde sohbet geçmişinde iki kez görünmemesini istiyorum.
7. Kitap Asistanı kullanıcısı olarak, yeni bir sohbetin ilk mesajı başarısız olduğunda sohbet listemde yanıtsız, boş bir sohbet oluşmamasını istiyorum.
8. Kitap Asistanı kullanıcısı olarak, başarısız bir denemeden sonra yazdığım metnin kaybolmamasını, tek tıkla tekrar gönderebilmemi istiyorum.
9. Kitap Asistanı kullanıcısı olarak, Gemini'nin günlük sınırı dolduysa (tekrar denemenin anlamsız olduğu 429) boşuna bekletilmemek istiyorum.
10. Kitap Asistanı kullanıcısı olarak, uygulamanın kendi günlük kotası dolduğunda eskisi gibi "bugünkü hakkın doldu" mesajını görmek istiyorum. Bu davranış değişmemeli.
11. Kitap Asistanı kullanıcısı olarak, Gemini başarılı yanıt verdiğinde her şeyin bugünkü gibi çalışmasını istiyorum: yeni sohbet listede görünmeli, mesajlar doğru sırada kaydedilmeli.
12. Uygulama sahibi olarak, yeniden denemenin toplam süresinin kısa ve sınırlı kalmasını istiyorum, böylece Edge Function'ın 150 saniyelik sınırına ve kullanıcının sabrına yaklaşmayalım.
13. Uygulama sahibi olarak, yeniden denemenin yalnızca geçici hatalarda (503 ve tekrar denemeye değer 429) yapılmasını istiyorum; 400 gibi kalıcı hatalar boşuna tekrar denenmemeli.
14. Uygulama sahibi olarak, Gemini'nin 429 yanıtında gönderdiği `retryDelay`'e uyulmasını istiyorum. Bekleme bizim sınırımızdan uzunsa hiç denenmemeli.
15. Uygulama sahibi olarak, kota iadesinin yalnızca `service_role` ile yapılabilmesini istiyorum, böylece hiçbir istemci kotayı kendisi geri alamasın.
16. Uygulama sahibi olarak, kota iadesinin sayacı sıfırın altına düşürememesini istiyorum.
17. Uygulama sahibi olarak, iade çağrısı başarısız olursa bunun loglanmasını ama kullanıcıya dönen asıl hatayı gizlememesini istiyorum.
18. Uygulama sahibi olarak, Gemini yanıt verdikten sonraki bir veritabanı hatasında kotanın iade edilmemesini istiyorum, çünkü Gemini isteği gerçekten kullanıldı.
19. Geliştirici olarak, iade fonksiyonunun kota fonksiyonuyla aynı güvenlik duvarlarından geçmesini istiyorum: `security definer`, sabit `search_path`, parametresiz ve yalnızca `service_role`'e açık.
20. Geliştirici olarak, `ai-chat`'in Gemini'yi çağırmadan önce veritabanına yazmaya geri dönmesinin güvenlik duvarında yakalanmasını istiyorum.
21. Geliştirici olarak, yeni hata kodunun (`AI_BUSY`) Edge Function ile istemci arasında, mevcut `DAILY_LIMIT_REACHED` gibi elle senkron tutulmasını istiyorum.

## Implementation Decisions

- **Yeniden deneme politikası** (`ai-chat` içinde, Gemini çağrısını saran küçük bir döngü):
  - En fazla **3 deneme** (ilk istek + 2 yeniden deneme).
  - Bekleme süreleri **~1 sn, ~2 sn**, her birine ±%20 rastgelelik (jitter) eklenir. Bu, Gemini dokümanının önerdiği 1s→2s→4s dizisinin ilk iki adımı. Toplam ek bekleme en fazla ~3,6 sn; Edge Function'ın 150 sn sınırının çok altında.
  - **503**: her zaman yeniden denenir.
  - **429**: yanıt gövdesinde `google.rpc.QuotaFailure` altındaki bir `quotaId` `PerDay` içeriyorsa (günlük RPD sınırı) **denenmez**, çünkü sınır ancak Pasifik gece yarısı sıfırlanır. `google.rpc.RetryInfo.retryDelay` varsa o süre beklenir. Bu süre 5 sn'den uzunsa denenmez.
  - Gemini 429'da `Retry-After` header'ı göndermiyor. Bekleme süresi yalnızca gövdedeki `RetryInfo.retryDelay`'den okunur.
  - Diğer tüm hata kodları (400, 403, 404, 500 vb.) ve `fetch`'in kendisinin reddedilmesi yeniden denenmez.
- **Ertelenmiş kayıt**:
  - İstek geldiğinde yalnızca okuma yapılır. `conversationId` verilmişse geçmiş mesajlar okunur (RLS altında, bugünkü gibi); kitaplar okunur. Kota tüketilir.
  - Ardından Gemini çağrılır. Gemini'den yanıt alındıktan sonra, sırayla:
    1. Sohbet yoksa `ai_conversations`'a eklenir.
    2. Kullanıcı mesajı eklenir.
    3. Asistan yanıtı eklenir.
  - Mesajlar ayrı insert'lerle eklenir, böylece `created_at` sırası korunur. Tek bir toplu insert'te iki satır aynı `now()` değerini alırdı.
  - Gemini'ye giden içerik bugünkü gibi `geçmiş + yeni mesaj` olur; yeni mesaj henüz kaydedilmemiş olduğu için çift görünmez.
- **Kota iadesi, yeni migration**: `refund_ai_quota() returns void`. Parametresiz, `security definer`, `set search_path = public`. Bugünün (Pasifik) satırında `request_count = greatest(request_count - 1, 0)` yapar. EXECUTE `public`, `anon` ve `authenticated`'dan geri alınır, yalnızca `service_role`'e verilir. `schema.sql` güncellenir.
- **İadenin ne zaman yapılacağı**:
  - Gemini yanıt üretemeden biten her durumda yapılır: tükenen yeniden denemeler, yeniden denenmeyen bir Gemini hata kodu ya da Gemini'ye giden `fetch`'in reddedilmesi. Mevcut `quotaClient` kullanılır.
  - Gemini başarılı olduktan sonraki veritabanı hatalarında yapılmaz.
  - İade çağrısının kendisi hata verirse `console.error` ile loglanır; kullanıcıya dönen yanıt değişmez.
  - Bilinen sınır: Pasifik gece yarısını aşan bir istekte iade yeni günün sayacından düşer. Etkisi en fazla bir istek; kabul edildi.
- **Neden "ya kota iadesi ya ertelenmiş kayıt" değil, ikisi birden**: İki seçenek farklı sorunları çözüyor ve birbirinin yerine geçemiyor.
  - Ertelenmiş kayıt 2. ve 3. sorunu (çift mesaj, yetim sohbet) çözer ama kotaya dokunmaz.
  - Kota iadesi 1. sorunu çözer ama çift mesajı çözmez.
  - Kotayı Gemini başarılı olduktan sonra tüketmek ise iadeye gerek bırakmaz, ama kotanın asıl işini bozar. Eşzamanlı istekler kontrol edilmeden Gemini'ye gider ve ücretsiz katmanın ~20 RPD sınırı aşılabilir. Bu yüzden reddedildi.
- **Hata sözleşmesi**: Yeniden denemeler 503/429 yüzünden tükendiyse ya da 429 denenmeden bırakıldıysa, `ai-chat` 200 ve `{ error: 'AI_BUSY' }` döner. Bu, `DAILY_LIMIT_REACHED` ile aynı yol; supabase-js'in `data.error` dalına düşer. Diğer Gemini hataları bugünkü gibi 500 döner (kota yine iade edilir). `AI_BUSY` sabiti, istemcideki wire-error listesiyle elle senkron tutulur.
- **İstemci**:
  - `AI_BUSY` için yeni bir hata kodu (`busy`) eklenir.
  - Sohbet çekmecesi bu kodda genel hata yerine şu mesajı gösterir:
    - TR: "Kitap Asistanı şu an çok yoğun. Birkaç dakika sonra tekrar dener misin? Bu deneme günlük hakkından düşmedi."
    - EN: "The Book Assistant is very busy right now. Could you try again in a few minutes? This attempt didn't count against today's quota."
  - Yazma alanı açık kalır.
  - "Otomatik tekrar deniyoruz" gibi canlı bir durum göstergesi eklenmez. İstek tek bir HTTP çağrısı ve ara durum istemciye iletilemiyor; mevcut "yazıyor…" göstergesi bu süreyi zaten kapsıyor.
  - Herhangi bir gönderim başarısız olduğunda iyimser eklenen kullanıcı mesajı listeden kaldırılır ve metin yazma alanına geri konur. Sunucu artık bu mesajı kaydetmediği için ekran da onu göstermemeli, ve tekrar gönderim tek tıkla olmalı.
- **security-walls**:
  - Kota duvarının "çağıran taraf yüzeyi" kontrolleri, yani parametresizlik, `security definer`, `search_path` ve yalnızca `service_role`, `refund_ai_quota`'ya da uygulanır.
  - `exceptions.securityDefinerFunctions`'a gerekçesiyle eklenir.
  - `ai-chat` kontrolüne iki kural eklenir:
    - `rpc('refund_ai_quota')` çağrısı bulunmalı ve Gemini `fetch`'inden sonra gelmeli.
    - İlk `.insert(` Gemini `fetch`'inden sonra gelmeli. Bu, ertelenmiş kaydın sessizce geri alınmasını yakalar.
  - Mevcut "kota, ilk insert ve fetch'ten önce tüketilmeli" kuralı olduğu gibi kalır.

## Testing Decisions

- İyi bir test dış davranışı doğrular: rol yetkileri, sayacın değeri, kullanıcının gördüğü mesaj. Fonksiyon gövdeleri ya da iç sıralama metni test edilmez; sıralama duvarın işi.
- **Seam 1: RLS entegrasyon testi (local Supabase).** Mevcut kota erişim testi genişletilir:
  - `authenticated` ve `anon`, `refund_ai_quota`'yı çağıramaz (42501) ve sayaç değişmez.
  - `service_role` iadesi sayacı bir düşürür ve sıfırda durur.
  - Tüketim ve iade birlikte çalışır: limit dolunca bir iade bir hak daha açar.
- **Seam 2: security-walls birim testleri.** Fixture migration ve Edge Function metinleriyle şu durumlar FAIL vermeli: iade fonksiyonu eksik, istemcilere açık ya da parametreli; `refund_ai_quota` çağrısı yok ya da fetch'ten önce; bir insert fetch'ten önce. Doğru yapı PASS vermeli.
- **Seam 3: istemci birim testleri** (jsdom, Supabase mock'lu). Prior art: mevcut `aiChatErrors`, `useAiChat` ve `AiChatDrawer` testleri.
  - `AI_BUSY` → `busy` eşlemesi.
  - Çekmecenin `busy` mesajını gösterdiği ve yazma alanını açık tuttuğu.
  - Başarısız gönderimde iyimser mesajın kaldırılıp metnin geri konduğu.
- **Seam 4: `ai-chat` uçtan uca (karar: sahte Gemini sunucusu).**
  - `ai-chat`, Gemini'nin temel adresini isteğe bağlı bir ortam değişkeninden (`GEMINI_API_BASE_URL`) okur. Tanımlı değilse Google'ın adresi kullanılır. Production'da bu değişken tanımlanmaz.
  - Entegrasyon testi, local Supabase'in `supabase functions serve` ile çalıştırdığı `ai-chat`'e gerçek bir kullanıcı oturumuyla istek atar. Gemini yerine testin kendi açtığı küçük bir HTTP sunucusu yanıt verir; bu sunucu senaryoya göre önce 503, sonra 200 döner.
  - Doğrulanacak davranışlar:
    - 503 sonrası başarı: yanıt gelir, sohbet ve iki mesaj bir kez kaydedilir, sayaç bir artar.
    - Tükenen 503'ler: `AI_BUSY` döner, hiçbir sohbet ya da mesaj kaydedilmez, sayaç değişmez.
    - Günlük (`PerDay`) 429: yeniden denenmez, `AI_BUSY` döner.
    - 400: yeniden denenmez, genel hata döner, sayaç değişmez.
  - Sahte sunucunun kaç istek aldığı da kontrol edilir; böylece deneme sayısı da test edilmiş olur.
  - Edge Function'ın local'de çalışması Docker gerektirir. CI'daki `rls-integration-tests` job'ının bunu destekleyip desteklemediği implementasyonda kontrol edilir.

## Out of Scope

- Gemini dışındaki hatalar: istemcinin ağ kesintisi, Supabase'in kendi hataları. Bunlar `api-error-handling` spec'inde ele alındı.
- Kullanıcı başına rate-limit.
- Gemini modelini değiştirmek ya da yoğunlukta başka bir modele geçmek (fallback model).
- Yanıtı akış (streaming) olarak iletmek ya da canlı "tekrar deneniyor" göstergesi.
- Gemini'nin geçici hatalarda yapılan denemeleri kendi günlük RPD sayacına sayıp saymadığını ölçmek (aşağıdaki nota bakın).
- `ai-chat`'in Dashboard'a yapıştırma yerine CLI ile deploy edilmesi.

## Further Notes

- **Kaynaklar**:
  - [Gemini API troubleshooting](https://ai.google.dev/gemini-api/docs/troubleshooting): 429 ve 503 için üstel geri çekilme önerisi, "1s, sonra 2s, 4s, 8s". Python SDK'sı 4 kez, ~1 sn'den başlayarak yeniden deniyor.
  - [Supabase Edge Function limits](https://supabase.com/docs/guides/functions/limits): ücretsiz planda 150 sn duvar saati ve 150 sn boşta kalma zaman aşımı.
  - 429 gövdesinde `RetryInfo` / `QuotaFailure` bulunması ve `Retry-After` header'ı olmaması: [vercel/ai#18627](https://github.com/vercel/ai/issues/18627), [inspect_ai#5526](https://github.com/UKGovernmentBEIS/inspect_ai/issues/5526). Bu bilgiler resmi dokümanda değil, üçüncü taraf gözlemleri; implementasyonda gerçek bir 429 gövdesiyle doğrulanmalı.
- **Açık risk**: Başarısız 503 denemelerinin Google tarafında günlük RPD sayacından düşüp düşmediği belgelenmemiş. Düşüyorsa, yeniden denemeler Google sayacını bizim 15'lik sayacımızdan hızlı ilerletebilir. 20'lik sınıra yaklaşıldığında Google 429 (`PerDay`) döner; bu spec'le o durum denenmeden `AI_BUSY` olarak ele alınır ve kota iade edilir. Kötü senaryoda kullanıcı "yoğun" mesajı görür, veri bozulmaz.
- Başarısız gönderimden sonra aynı metnin yazma alanına geri konması, sunucu tarafında hiçbir şey kaydedilmediği için güvenli.
- Bağımlılık: `ai-quota-lockdown` (PR #19, `main`e birleşti; migration 014 ve `quotaClient`).
