# 04: Çevrimdışı kuyruk: kullanıcıya özel, çıkışta temizlenen, tekrar gönderimde çift kitap üretmeyen kuyruk (PR A)

## Bulgular (2026-10-03, kod incelemesi + yerel Docker Postgres)

1. **Kuyruk paylaşılıyor; hesaplar arası sızıntı mümkün.**
   - Kuyruk tek bir IndexedDB veritabanında (`bookshelf-offline-queue` / `pendingBooks`) tutuluyor, cihazdaki herkes için ortak. Kayıtlar yalnızca kitap alanlarını taşıyor, kullanıcı kimliği yok.
   - Kuyruk ne `SIGNED_OUT`'ta ne hesap silmede temizleniyor:
     - `useAuth` çıkışta yalnızca REST önbelleğini siliyor.
     - `useDeleteAccount` da yalnızca REST önbelleğini silip oturumu kapatıyor.
     - Kuyruğa erişen tek yer `useOfflineBookQueue`.
   - Senkron, mevcut oturumla `useLibrary.addBookWithoutStatsRefresh` → `useBooks.addBook` yolundan çalışıyor; kitap o anki kullanıcının `user_id`'siyle yazılıyor.
   - Senkron iki yerden tetikleniyor: veriler hazır olunca, ve "çevrimiçi oldu" olayında hiçbir koşula bakmadan (oturum yokken bile).
   - **Sonuç: A'nın kuyruğu aynı cihazda B'nin oturumuyla gönderilir.**
     - Bugün: A'nın kaydı `[A_kitaplık]` taşır → `withDefaultLibrary` bunu `[A_kitaplık, B_Ana]` yapar → kitap B adına eklenir → `book_libraries` eklemesini RLS (011) reddeder → 01'deki geri silme kitabı siler → hata `rejected` → senkron ilk hatada durur ve B'nin kendi kayıtları da arkada kilitli kalır.
     - Planlanan "`[null]` → Ana Kitaplık" onarımı bununla birleşseydi: A'nın `[null]` kaydı `[B_Ana]` olur, her adım geçer ve **A'nın kitabı B'nin hesabına, B'nin Ana Kitaplığına kaydedilir.** Kitap B adına yazıldığı için RLS bunu engellemez. Onarım, sahiplik kontrolü olmadan uygulanmamalı.
2. **İdempotency yok.**
   - Kayıtta yalnızca IndexedDB'nin otomatik anahtarı var; kitabın kimliğini veritabanı üretiyor.
   - İstek sunucuya ulaşır ama yanıt kaybolursa hata `network` olur, kayıt kuyrukta kalır ve bir sonraki senkron **ikinci bir kitap** üretir.
   - Ekleme yolundaki geri silme de aynı ağ kesintisinde düşebilir; o zaman yetim kitap da oluşur.
   - Yerel Docker Postgres'te doğrulandı:
     - istemcinin ürettiği `books.id` kabul ediliyor
     - aynı kimlik ikinci kez gönderilince `23505 … "books_pkey"` dönüyor
     - `upsert(…, { onConflict: 'id', ignoreDuplicates: true })` 0 satır döndürüyor
     - sonuçta kitap 1 tane
   - Sütun izni kısıtlaması yok: migration'larda `books`/`notes` için grant ya da revoke yok.
3. **Kitaplık yokken onarım.** "Hazır" koşuluna "en az bir kitaplık var" eklemek yetmez, çünkü çevrimiçi olayı senkronu ayrıca çağırıyor. Koruma senkronun kendi içinde olmalı. Kayıt silinmemeli, deneme sayılmamalı, "bekliyor" kalmalı.
4. **Deneme sayacı bugün yok.** Kayıtta tutulursa (IndexedDB) sayfa yenilemede sıfırlanmaz; bunun için kuyruk modülüne bir kayıt güncelleme fonksiyonu gerekiyor.
5. **Liste penceresi olmadan temizleme.** Liste penceresi (08) gelene kadar "gönderilemedi" kayıtlarını temizlemenin tek yolu çıkış yapmak (ve hesap silme). Bu bilerek seçilmiş davranıştır, aşağıda yazılı.

## What to build

- **Sahiplik:**
  - Her kayda kuyruğa alındığı anda `ownerId` (o anki kullanıcının id'si) yazılır. Oturum yoksa kayıt kuyruğa alınmaz.
  - Senkron yalnızca `ownerId` o anki kullanıcıya eşit olan kayıtları gönderir. Başka kullanıcının kayıtlarına dokunmaz: göndermez, sayaçlarını değiştirmez.
  - Senkron oturum yokken hiç çalışmaz.
- **Çıkışta temizlik:** `SIGNED_OUT` olayında ve hesap silmede (oturum kapanmadan önce) kuyruk tamamen silinir. Bu davranışın bedeli: kullanıcı çevrimdışıyken eklediği ve henüz gönderilmemiş kitaplarla çıkış yaparsa o kitaplar kaybolur (Karar D2).
- **İdempotency:**
  - Kuyruğa alınırken kayda `clientBookId = crypto.randomUUID()` yazılır; notlara da istemci kimlikleri verilir.
  - Senkron kitabı bu kimlikle ekler. `books_pkey` üzerinde `23505` dönerse kitap kimliğe göre okunur:
    - okunabiliyorsa (kullanıcının kendi kitabı) önceki deneme kitabı yazmış demektir. Kitaplık bağlantıları ve notlar `ignoreDuplicates` ile tamamlanır ve kayıt başarılı sayılır.
    - okunamıyorsa (başka birinin kimliği ya da silinmiş) `rejected`.
  - Kapsam: Karar D1.
- **Geçerlilik:** kitaplık listesi geçersiz bir kayıt kuyruğa alınmaz; `no_library` fırlatılır. Kontrol çevrimiçi/çevrimdışı ayrımından önce yapılır.
- **Onarım (yalnızca kendi kayıtlarında):** kitaplık listesindeki `null`/boş değerler ve kullanıcının mevcut kitaplıkları arasında olmayan id'ler (silinmiş kitaplık) atılır, kullanıcının Ana Kitaplığı eklenir.
- **Kitaplık yokken:** senkron içindeki koruma kaydı göndermez; kayıt "bekliyor" kalır, sayaç artmaz, sonraki kayıtlar da bekler.
- **Hata sınıfına göre davranış:**
  - `network` ve `transient`: senkron durur, sayaç artmaz.
  - `rejected`: sayaç artar ve kayda yazılır (`attempts`, `lastErrorClass`, `lastAttemptAt`), sonraki kayda geçilir. 3. reddedilişte kayıt `failed: true` olur, otomatik senkrondan çıkar; veri silinmez.
  - `no_library` (onarımdan sonra beklenmez): kayıt bekliyor kalır, sayaç artmaz.
- **Görünürlük:** çevrimdışı şeridi bugün yalnızca çevrimdışıyken görünüyor. Kullanıcının `failed` kaydı varsa şerit çevrimiçiyken de "N kitap gönderilemedi" der (TR/EN, `role="status"`). Çevrimdışıyken mevcut "N kitap bekliyor" metni sürer.
- **Bilinçli davranış:** liste penceresi (08) gelene kadar `failed` kayıtlar yalnızca çıkışta ya da hesap silmede temizlenir. Şerit metni bunu söyler: "Çıkış yaparsan silinirler."

## Bilinçli davranışlar (2026-10-03, uygulamada)

- **Çıkış düğmesi:**
  - Gönderilmemiş kayıt (gönderilemeyenler ve sahibi bilinmeyen eski kayıtlar dahil) varsa "N kitap silinecek" onayı sorulur. Onaylanırsa kuyruk silinir ve çıkış yapılır; iptalde oturum açık kalır.
  - Onay şimdilik tarayıcının `window.confirm` penceresi; uygulama içi pencere 09'da (v1.2).
- **Çıkış düğmesinde kuyruk silinemezse** (örneğin IndexedDB o anda kullanılamıyor):
  - Çıkış yine yapılır, hata konsola yazılır ve kayıtlar `ownerId`'leriyle cihazda kalır.
  - Aynı kullanıcı tekrar girerse kayıtları ona gönderilir: kullanıcı silmeyi onaylamıştı ama silme gerçekleşemedi.
  - Farklı bir kullanıcı girerse girişteki sahip değişimi temizliği onları siler.
  - Test: App'te "clearing the queue fails" senaryosu.
- **Zorunlu çıkış** (oturum süresi doldu, token yenilenemedi; `SIGNED_OUT` olayı bunları düğmeden ayırt etmez): kuyruğa dokunulmaz. Kayıtlar yalnızca aynı kullanıcı girince gönderilir, farklı kullanıcı girince silinir.
- **Kitaplık yokken (2):**
  - Senkron hiçbir kaydı okumaz ve göndermez; kayıtlar silinmez, hata sayılmaz, hepsi bekler.
  - Kullanıcı ilk kitaplığını oluşturduğu anda yüklemedeki tek seferlik senkron devreye girer; bekleyen kayıtlar o kitaplığa onarılarak gönderilir.
  - Kuyruğa alma da kitaplıksız kaydı reddeder (`NoLibraryError`). Bu toplu taramayı da kapsar: kitaplık yokken toplu tarama kaydedilmez, mevcut genel hata mesajını gösterir.
- **Onarım (2):** yalnızca oturum sahibinin kayıtlarında ve yalnızca onun kitaplıklarıyla yapılır. `null` id'ler ve kullanıcıda olmayan (silinmiş ya da başkasının) kitaplık id'leri atılır, Ana Kitaplık eklenir.
- **Silinmiş kitaplığa giden kayıt Ana Kitaplığa düşer.** Kullanıcı çevrimdışıyken bir kitaplığa kitap ekleyip o kitaplığı başka bir cihazda sildiyse, kayıt gönderilirken silinmiş id atılır ve kitap Ana Kitaplığa eklenir. Kitap kaybolmaz ama seçilen kitaplıkta değil, Ana Kitaplıkta görünür.
- **Hiçbir kitaplık `is_default` değilse** (Ana Kitaplık işareti olmayan eski hesaplar): kayıt beklemez, kullanıcının **ilk** (en eski oluşturulan) kitaplığına bağlanır.
  - Neden: uygulamanın geri kalanı bu durumda zaten ilk kitaplığı Ana Kitaplık sayıyor (`useLibrary`, içe aktarma). Kitap penceresi ve araç çubuğu da onu varsayılan gösteriyor; kuyruk farklı davranırsa kullanıcı aynı kitabın nereye gittiğini tahmin edemez.
  - Kitaplık listesi `created_at`'e göre artan sırada geliyor.
  - Test: "files a library-less record into the first library when none is marked default".
- **Toplu tarama + kitaplık yok:** kayıt `NoLibraryError` ile reddedilir. Toplu tarayıcı kendi `batchScanner.saveError` metnini gösterir: TR "Kitaplar kaydedilirken bir hata oluştu. Bir kısmı zaten kaydedilmiş olabilir.", EN "Something went wrong saving the books. Some may already be saved.". Metin bağlantıdan söz etmiyor; test ile sabitlendi. "Bir kısmı kaydedilmiş olabilir" ifadesi bu durumda gereksiz ama yanlış yönlendirmiyor; ayrı bir "önce kitaplık oluştur" metni takip konusu.
- **Hesap silme:** kuyruk her zaman, oturum kapanmadan önce silinir. Silme hata verirse çıkış yine yapılır.
- **Çok sekme, eski sürüm açık:**
  - Kuyruk veritabanı v2'ye yükseltilirken başka bir sekme v1'i açık tutuyorsa açılış 3 sn bekler, sonra `QueueUnavailableError` ile vazgeçer. Açılış asılı kalmaz ve eski sekme bırakınca kendiliğinden tamamlanır.
  - Bu sırada çevrimiçi kitap ekleme etkilenmez. Çevrimdışı ekleme "geçici bir sorun" mesajı gösterir. Senkron loglar ve birkaç saniye sonra bir kez yeniden dener.
  - Her bağlantı, başka bir sekme yükseltme istediğinde kendini kapatır.

## Açık kararlar

- **D1. İdempotency kapsamı:**
  - (a) yalnızca kuyruk kayıtları
  - (b) **(önerilen)** kitap penceresi de yeni kitap için açılışta bir `clientBookId` üretir; hem doğrudan kaydetme hem kuyruk aynı kimliği kullanır. Böylece "bağlantını kontrol et" sonrası Kaydet'e tekrar basmak da çift kitap üretmez. Ek iş küçük: pencerede kimlik üretimi ve `insertBookWithLinks`'in kimlik kabul etmesi.
- **D2. Çıkışta bekleyen kayıtlar:**
  - (a) **(önerilen)** çıkışta kuyrukta kayıt varsa onay sorulur: "Gönderilmemiş N kitap silinecek."
  - (b) uyarısız silinir
- **D3. Eski kayıtlar (`ownerId`'siz, bu sürümden önce kuyruğa girmiş):**
  - (a) **(önerilen)** gönderilmez, kimseye atanmaz, `failed` sayılır ve şeritte görünür, çıkışta silinir
  - (b) ilk giriş yapan kullanıcıya atanır. Paylaşılan cihazda bulgu 1'deki sızıntıyı yeniden açar.

**Blocked by:** 01

**Status:** needs-info (D1, D2, D3)

## Test planı

**Kuyruk modülü** (`fake-indexeddb`, mevcut desen):
- [ ] kayıt `ownerId` ve `clientBookId` ile saklanır; kullanıcıya göre okuma yalnızca o kullanıcının kayıtlarını döndürür
- [ ] kayıt güncelleme (`attempts`, `failed`) veritabanı kapatılıp yeniden açılınca korunur (sayfa yenileme benzetimi)
- [ ] kuyruğu temizleme tüm kayıtları siler

**`useAddOrQueueBook`:**
- [ ] geçersiz kitaplıkla, çevrimiçi de çevrimdışı da, `no_library` fırlar ve kuyruğa hiçbir şey yazılmaz
- [ ] çevrimdışı geçerli kayıt `ownerId` + `clientBookId` ile kuyruğa girer
- [ ] oturum yoksa kuyruğa alınmaz

**`useOfflineBookQueue`:**
- [ ] **hesaplar arası:** B oturumdayken A'nın kayıtları (`[null]` olan dahil) gönderilmez ve değişmez; B'nin kayıtları gönderilir
- [ ] kendi `[null]` kaydı Ana Kitaplık id'siyle gönderilir; mevcut kitaplıklar arasında olmayan id'ler atılır
- [ ] kitaplık yokken hem "hazır" yolundan hem çevrimiçi olayından tetiklenen senkron hiçbir şey göndermez; kayıtlar ve sayaçlar değişmez
- [ ] oturum yokken çevrimiçi olayı senkron başlatmaz
- [ ] `rejected` → sayaç artar, sonraki kayıt gönderilir; 3. reddedilişte `failed`, sonraki senkronda gönderilmez, sayı dışarı verilir
- [ ] `network` ve `transient` → senkron durur, sayaç artmaz
- [ ] eski `ownerId`'siz kayıt D3'e göre davranır

**`bookWrites` (mock):**
- [ ] `clientBookId` eklemede kimlik olarak gönderilir
- [ ] `books_pkey` `23505` + kitap okunabiliyor → bağlantılar ve notlar `ignoreDuplicates` ile tamamlanır, sonuç başarılı
- [ ] `23505` + kitap okunamıyor → `rejected`

**Oturum ve hesap silme:**
- [ ] `useAuth`'ta `SIGNED_OUT` → kuyruk temizlenir
- [ ] `useDeleteAccount` → kuyruk oturum kapanmadan önce temizlenir
- [ ] D2-a seçilirse: çıkışta kayıt varken onay istenir, iptal edilince çıkış yapılmaz

**Çevrimdışı şeridi RTL:**
- [ ] çevrimiçiyken `failed` > 0 ise "N kitap gönderilemedi" görünür, değilse şerit görünmez
- [ ] çevrimdışı metni değişmez
- [ ] TR/EN

**Entegrasyon** (gerçek RLS, yerel Docker):
- [ ] aynı `clientBookId` ile iki kez ekleme → tek kitap, bağlantılar ve notlar tek kopya
- [ ] başka kullanıcının kitabıyla çakışan `clientBookId` → `rejected`, başka hesaba hiçbir şey yazılmaz

**Diğer:**
- [ ] **Mutasyon kontrolleri:** sahiplik süzgeci, kitaplık-yok koruması ve sayacın kayda yazılması tek tek kaldırılınca ilgili testler düşer
- [ ] **Elle (maintainer yapar):** aynı cihazda A ile çevrimdışı kitap ekle → çıkış → B ile giriş → çevrimiçi ol → A'nın kitabı B'de yok, kuyruk boş
- [ ] Tüm paket `--sequence.shuffle` ile de yeşil
