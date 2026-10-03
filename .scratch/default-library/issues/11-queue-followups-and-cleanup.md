# 11: (Takip) Kuyruk ve kaydetme hatalarında kalan sınırlar ve kod temizliği

PR A'nın kod incelemesinden (2026-10-03) kalan, bu PR'a alınmayan bulgular ve koku notları. Davranış değişikliği gerektirenler ayrı tutuldu.

## Davranış bulguları

- **(Bulgu 5) HTTP durum kodu taşınmıyor.**
  - supabase-js'in hata nesnesi HTTP durumunu taşımıyor; `bookWrites` yalnızca bu nesneyi fırlatıyor. Bu yüzden 401 ile 5xx ayrımı yapılamıyor.
  - Kuyruk bugün kodu boş her yanıtı (5xx dahil) "bekler" sayıyor (ticket 04, b).
  - İş: ekleme yolu, PostgREST yanıtının `status`'unu hatayla birlikte taşısın (örneğin `{ ...error, status }`). Kuyruk ve kitap penceresi 401/5xx'i buna göre ele alsın.
- **(Bulgu 6) Sahibi bilinmeyen eski kayıtlar herkese görünüyor.**
  - v1'den kalan `ownerId: null` kayıtlar, cihazda giriş yapan her kullanıcının şeridinde "N kitap gönderilemedi" olarak sayılıyor. Çıkış düğmesi onları siliyor.
  - İçerik görünmüyor, yalnızca sayı; ama B'ye "çıkış yaparak silebilirsin" denen kitaplar A'nın olabilir.
  - Seçenekler: sayıyı yalnızca "eski kayıtlar" diye ayrı göstermek; ilk girişte bir kez sorup silmek; bir süre (örneğin 30 gün) sonra kendiliğinden silmek. Karar kullanıcıda.
- **(Bulgu 7) Oturumsuz kuyruğa alma düz `Error` fırlatıyor.**
  - `enqueueBook` sahipsiz çağrılırsa düz `Error` atıyor; kitap penceresi bunu "sunucu kabul etmedi" olarak gösterirdi. Arayüzden bugün ulaşılamıyor.
  - İş: tipli bir hata (ör. `NotSignedInError`) ve uygun sınıf/mesaj.
- **(ticket 04, b) Kalıcı bilinmeyen hata kuyruğu bekletiyor.** Aynı kayıtta art arda N kez aynı bilinmeyen kod gelince kaydı saymak ya da atlamak.
- **(ticket 04, a) Kalıcı JWT/oturum hatası.** Art arda N senkronda aynı oturum hatası sürerse "oturumunu yenile" şeridi.

## PR A'da bilinçli olarak kabul edilen tavizler

- **Ham `TypeError` her zaman ağ hatası sayılıyor** (`3201e49`).
  - Spec'teki biçim kuralı gereği koddaki gerçek bir `TypeError` (bir hata) da ağ hatası sayılıyor. Kitap penceresinde "bağlantını kontrol et" yazar; kuyrukta kayıt sayılmadan bekler ve senkronu durdurduğu için arkasındaki kayıtları da bekletir.
  - İş: `bookWrites`'in ve kuyruğun fırlatabileceği gerçek fetch hatalarını (supabase-js'in sardığı biçim) ham `TypeError`'dan ayırmanın yolu: örneğin fetch hatalarını kaynağında tipli bir `NetworkError`'a sarmak ve ham `TypeError`'ı `rejected` ya da ayrı bir "beklenmeyen hata" sınıfına almak.
- **IndexedDB yeniden denemesi art arda 3 kezle sınırlı** (`e4aaa87`).
  - Kuyruk kalıcı olarak açılamazsa (örneğin başka bir sekmede daha yeni bir sürüm açık: `VersionError`), 3 denemeden sonra bir sonraki tetikleyiciye kadar denenmiyor. Kullanıcıya ayrı bir bildirim yok; sayfa yenilenince yeniden deneniyor.
  - İş: kalıcı durumda "Uygulamanın yeni bir sürümü başka bir sekmede açık; bu sekmeyi yenile" gibi bir bildirim.

## Kod temizliği (Standards ekseni, hepsi değerlendirme notu)

- **Tekrarlanan `23505` kontrolü:** `useLibraries` (`DEFAULT_LIBRARY_INDEX`) ve `queueFailures` (`'books_pkey'`) aynı "adı verilen kısıtta unique ihlali" kontrolünü ayrı yazıyor; `'books_pkey'` çıplak string. `isUniqueViolation(err, constraintName)` yardımcısı ve adlandırılmış sabitler.
- **`QueueUnavailableError` / `StorageFullError`'ın yeri:** ikisi de kuyruğun depolama katmanına ait ama `saveErrors.js`'te duruyor. Kuyruk modülüne taşınması; `saveErrors` yalnızca içe aktarsın.
- **Tekrar eden okuma desenleri:** `countUnsentBooks` ve `countUnownedBooks` (ve sayım için `getQueuedBooks` + filtre) tüm kayıtları okuyup süzüyor. Tek bir "kayıtları sahibe göre grupla" okuması.
- **Kayıt şekli dağınık:** kuyruk kaydının yan alanları (`id`, `ownerId`, `attempts`, `lastErrorCode`, `lastAttemptAt`, `failed`) senkronda elle ayıklanıyor (eslint-disable ile), `recordRejectedAttempt` aynı alanları yazıyor. Kuyruk modülünde `toBookFields(record)`.
- **Uzun yorumlar:** `useLibraries.createLibrary` üstündeki yorum `useExisting`/`createRegular` davranışını kodla tekrar ediyor; `queueFailures.js` ve `queuedBookRepair.js` başlık yorumları "minimal" kuralına göre uzun. Kısaltılması.

(Not: "varsayılan kitaplık, yoksa ilki" tekrarı PR A'da giderildi: `lib/defaultLibrary.js`.)

**Blocked by:** 04 (PR A merge edildikten sonra)

**Status:** needs-triage

- [ ] Bulgu 5: ekleme hatası HTTP durumunu taşıyor; 401 ve 5xx ayrı ele alınıyor, testli
- [ ] Bulgu 6: eski kayıtlar için seçilen davranış uygulanmış, testli
- [ ] Bulgu 7: oturumsuz kuyruğa alma tipli hata ve uygun mesaj veriyor
- [ ] Kalıcı bilinmeyen hata ve kalıcı oturum hatası önerileri karara bağlandı
- [ ] İki taviz (ham `TypeError`, IndexedDB 3 deneme sınırı) için karar verildi
- [ ] Temizlik maddeleri davranış değiştirmeden yapıldı; mevcut testler değişmeden yeşil
