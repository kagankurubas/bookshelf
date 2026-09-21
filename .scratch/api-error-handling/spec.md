# API Hata Durumları: Bağlantı Hatası vs "Bulunamadı" Ayrımı + Offline Göstergesi

Status: ready-for-agent

## Problem Statement

Barkod tarama (tekli ve toplu) ile kitap arama akışlarında, `src/lib/openLibrary.js` içindeki `getBookByIsbn()` ve `searchBooks()` fonksiyonları network hatalarını (bağlantı kopması, timeout) ve HTTP hata yanıtlarını (5xx vb.) sessizce yutup `null`/`[]` döndürüyor, hiçbir zaman fırlatmıyor (throw). Bu yüzden gerçek bir "bu ISBN/sorgu için sonuç yok" durumu ile "isteğimiz hiç sunucuya ulaşamadı/başarısız oldu" durumu ayırt edilemiyor - kullanıcı her iki durumda da aynı "bulunamadı" mesajını görüyor, bu da bağlantı sorununu "kitap veritabanında yok" gibi yanıltıcı gösteriyor. Buna bağlı olarak, zaten tanımlı olan `isbnLookup.error` ve `bookSearch.error` çeviri metinleri hiçbir zaman tetiklenemeyen ölü kod durumunda.

Ayrıca uygulama genelinde, cihazın internet bağlantısını tamamen kaybettiğini kullanıcıya bildiren herhangi bir gösterge (banner, ikon vb.) yok - kullanıcı sadece tek tek özelliklerin (barkod, arama) neden çalışmadığını kendi başına çıkarmak zorunda kalıyor.

(AI Kitap Asistanı/Gemini akışı bu sorunlardan etkilenmiyor - `supabase/functions/ai-chat/index.ts` ve `useAiChat.js` zaten network/timeout dahil tüm hataları doğru şekilde yakalayıp kullanıcıya anlaşılır bir mesaj gösteriyor, bu spec'in kapsamı dışında.)

## Solution

`openLibrary.js`'deki iki fonksiyon, "gerçek boş sonuç" (başarılı yanıt ama veri yok) ile "istek başarısız oldu" (network hatası veya HTTP hata kodu) durumlarını ayırt edecek şekilde değiştirilir: ikinci durumda artık sessizce `null`/`[]` dönmek yerine bir `Error` fırlatılır. Bu ayrımı tüketen üç yer (`useAddBookFlow.js`, `BatchScanner.jsx`, `BookSearch.jsx`) kendi `catch` bloklarında bu hatayı yakalayıp kullanıcıya "bulunamadı" yerine "bir hata oluştu, tekrar dene" anlamına gelen bir mesaj gösterir - ikisi için (`isbnLookup`, `bookSearch`) bu metin zaten mevcut ve sadece yeniden bağlanıyor; `BatchScanner` için (mevcut metinlerin hiçbiri bu ayrımı karşılamadığından) iki yeni, dar kapsamlı çeviri anahtarı eklenir.

Buna ek olarak, `navigator.onLine` ve `online`/`offline` event'lerine dayanan basit bir global hook (`useOnlineStatus`) eklenir; `App.jsx` bunu kullanarak, cihaz çevrimdışıyken (giriş ekranı dahil) ekranın üstünde sabit bir "İnternet bağlantın yok" banner'ı gösterir.

## User Stories

1. Kullanıcı olarak, barkod okuttuğumda internet bağlantım koptuysa, "bu ISBN bulunamadı, manuel ekle" yerine "bağlantı sorunu oldu, tekrar dene" gibi doğru bir mesaj görmek istiyorum, ki gerçekten var olmayan bir kitapla bağlantı sorununu karıştırmayayım.
2. Kullanıcı olarak, toplu tarama sırasında okuttuğum bir ISBN'in sorgusu bağlantı sorunu yüzünden başarısız olduysa, bunun "Open Library'de bulunamadı" olan kitaplardan (gerçekten kayıtlı olmayan ISBN'ler) ayrı, "bağlantı hatası" olarak etiketlendiğini görmek istiyorum.
3. Kullanıcı olarak, kitap ararken (Ara & Ekle) internet bağlantım koptuysa, "sonuç bulunamadı" yerine "arama yapılırken bir hata oluştu, tekrar dene" mesajını görmek istiyorum.
4. Kullanıcı olarak, cihazımın interneti tamamen kesildiğinde, herhangi bir özelliği denemeden önce ekranın üstünde "internet bağlantın yok" gibi genel bir uyarı görmek istiyorum, ki tek tek her butonun neden çalışmadığını merak etmeyeyim.
5. Kullanıcı olarak, giriş yapmadan önceki ekranda (henüz oturum açmamışken) bile interneti yoksa bu uyarıyı görmek istiyorum, çünkü giriş de bir ağ isteği.
6. Kullanıcı olarak, internetim geri geldiğinde bu banner'ın otomatik olarak (sayfayı yenilemeden) kaybolmasını istiyorum.
7. Kullanıcı olarak, ISBN gerçekten Open Library'de kayıtlı değilse (bağlantı sorunu yok, sunucu düzgün "yok" dedi), hâlâ mevcut "bulunamadı, manuel ekleyebilirsin" mesajını görmeye devam etmek istiyorum - bu davranış bu değişiklikle bozulmamalı.

## Implementation Decisions

- **Seam - `openLibrary.js`**: `getBookByIsbn()` ve `searchBooks()`'taki `try/catch` blokları ayrıştırılır:
  - `fetch()` çağrısının kendisinin reddetmesi (network hatası, timeout, DNS hatası vb. - `TypeError: Failed to fetch` gibi) artık yakalanıp yutulmuyor; hata olduğu gibi yeniden fırlatılıyor (`throw err`), `console.error` yine loglanabilir ama fonksiyon `null`/`[]` dönmüyor.
  - `!response.ok` durumu (HTTP 4xx/5xx) da aynı şekilde artık `null`/`[]` dönmek yerine bir `Error` fırlatıyor (ör. `throw new Error(\`OpenLibrary HTTP ${response.status}\`)`) - bu da bir "istek başarısız oldu" durumu, "veri yok" değil.
  - **Değişmeyen davranış**: `getBookByIsbn()` için HTTP 200 döndü ama `data[bibkey]` tanımsızsa (Open Library o ISBN için kayıt döndürmedi) - bu hâlâ gerçek bir "bulunamadı" durumu, `normalizeBookData` yine `null` döndürmeye devam eder, throw edilmez. `searchBooks()` için de `data.docs` boş bir dizi ise (gerçekten sonuç yok) hâlâ `[]` döner, throw edilmez.
  - Boş ISBN/sorgu erken çıkışları (`if (!isbn) return null`, `if (!key) return []`) değişmez - bunlar zaten hata değil.
  - Cache'e (`isbnCache`, `searchCache`) sadece başarılı (throw etmeyen) sonuçlar yazılır - bir istek hata fırlattığında cache'e hiçbir şey yazılmaz ki kullanıcı "tekrar dene" dediğinde gerçekten yeniden denesin.

- **`useAddBookFlow.js` (`handleBarcodeScanned`)**: Zaten var olan `try/catch` yapısı korunur, mantık değişmez - artık `getBookByIsbn` gerçekten throw edebildiği için `catch` bloğundaki `alert(t('isbnLookup.error'))` çağrısı ilk kez fiilen tetiklenebilir hale gelir. `bookInfo === null` (başarılı ama veri yok) durumunda `isbnLookup.notFound` mesajı gösterilmeye devam eder. **Yeni çeviri metni gerekmiyor.**

- **`BookSearch.jsx`**: Değişiklik gerekmiyor - `.catch()` bloğu ve `status: 'error'` dalı zaten doğru yazılmış, sadece `searchBooks()`'un artık gerçekten throw edebilmesiyle çalışır hale geliyor. **Yeni çeviri metni gerekmiyor.**

- **`BatchScanner.jsx` (`handleDetected`)**: `entries` state'indeki satır şekli `{ isbn, status: 'pending' | 'found' | 'not_found' | 'error', book }` olacak şekilde genişletilir (yeni `'error'` durumu eklenir). `getBookByIsbn(isbn).then(...)` başarılı döndüğünde davranış aynı kalır (`found`/`not_found`); `.catch(err)` bloğu artık satırı `not_found` yerine `error` olarak işaretler.
  - **Tarama ekranındaki liste (scanning phase)**: `not_found` satırları mevcut `batchScanner.notFoundLabel` ("ISBN: {{isbn}} — bulunamadı") ile gösterilmeye devam eder; yeni `error` satırları için **yeni** bir çeviri anahtarı eklenir: `batchScanner.connectionErrorLabel` → TR: `"ISBN: {{isbn}} — bağlantı hatası"`, EN: `"ISBN: {{isbn}} — connection error"`. Aynı `QuestionIcon` placeholder'ı yeniden kullanılır (yeni ikon eklenmez).
  - **İnceleme ekranındaki liste (review phase)**: `error` satırları, mevcut "Bulunamayanlar" (`notFoundSection`) listesiyle **aynı bölümde** gösterilir (yeni bir bölüm/başlık eklenmez - kapsam dar tutuluyor), ama alt metinleri farklı olur: `not_found` satırları mevcut `batchScanner.openLibraryNotFound` ("Open Library'de bulunamadı") metnini kullanmaya devam eder; `error` satırları için **yeni** bir çeviri anahtarı eklenir: `batchScanner.connectionError` → TR: `"Bağlantı hatası, tekrar dene"`, EN: `"Connection error, try again"`. Bölüm başlığındaki sayaç (`notFoundSection`'ın `{{count}}`'u) her iki durumu da (`not_found` + `error`) kapsayacak şekilde toplanır. Her iki tür satır da mevcut "Manuel Ekle" butonunu (`onManualAddIsbn`) kullanmaya devam eder - ayrı bir "tekrar dene" akışı **eklenmez**, kullanıcı zaten manuel ekleme yoluyla ISBN'i tekrar girebilir.
  - Toplamda bu bileşen için **2 yeni çeviri anahtarı** (TR+EN, yani 4 satır) gerekiyor; bunun dışında hiçbir yerde yeni UI metni eklenmez.

- **Global offline banner - yeni hook `src/hooks/useOnlineStatus.js`**: `useEscapeKey.js` ile aynı sade desende (`useState` + `useEffect` + `addEventListener`/`removeEventListener`) yazılır:
  ```js
  export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    useEffect(() => {
      const goOnline = () => setIsOnline(true);
      const goOffline = () => setIsOnline(false);
      window.addEventListener('online', goOnline);
      window.addEventListener('offline', goOffline);
      return () => {
        window.removeEventListener('online', goOnline);
        window.removeEventListener('offline', goOffline);
      };
    }, []);
    return isOnline;
  }
  ```
  Bu, gerçek bağlantı kalitesini değil, tarayıcının/işletim sisteminin bildirdiği ağ arayüzü durumunu yansıtır (bilinen bir platform sınırlaması - ör. Wi-Fi'ye bağlı ama internete çıkışı olmayan bir ağda `true` dönebilir); bu spec kapsamında bu kabul edilebilir, ek bir "gerçek" bağlantı testi (ör. periyodik ping) **yapılmaz**.

- **`App.jsx` entegrasyonu**: `App` bileşeninde `const isOnline = useOnlineStatus();` eklenir. Şu an `authLoading`, `!user` ve normal durum için üç ayrı `return (...)` bloğu var; banner'ın üçünde de (yükleniyor, giriş ekranı, ana uygulama) görünebilmesi için bu üç blok tek bir `return` içinde iç içe koşullu ifadeye (`authLoading ? (...) : !user ? (...) : (...)`) çevrilir ve banner bunun dışına, en üste eklenir:
  ```jsx
  return (
    <>
      {!isOnline && (
        <div className="offline-banner" role="status">
          {t('app.offlineBanner')}
        </div>
      )}
      {authLoading ? (
        /* mevcut yükleniyor JSX'i */
      ) : !user ? (
        /* mevcut AuthScreen JSX'i */
      ) : (
        /* mevcut ana uygulama JSX'i */
      )}
    </>
  );
  ```
  Bu, davranışı değiştirmeyen saf bir yeniden yapılandırma (refactor) - her üç dalın içeriği aynen korunur, sadece banner'ın ortak bir üst seviyeye taşınabilmesi için sarmalanır.

- **Banner stili (`App.css`)**: Yeni `.offline-banner` sınıfı eklenir - sayfanın en üstünde sabit/sticky, tam genişlikte, ince bir uyarı çubuğu (mevcut `--danger` veya bir uyarı tonu, `app-load-error`'daki renk paletiyle tutarlı), `position: fixed; top: 0; left: 0; right: 0; z-index` yüksek bir değer (mevcut modallerin z-index'lerinin üzerinde, ör. `9999`), kısa dolgu (padding), ortalanmış metin. Sayfa içeriğinin banner'ın altında kalmaması için `body`/`main-container`'a kalıcı bir `padding-top` **eklenmez** - banner zaten nadir görünen geçici bir durum, mevcut layout'u kaymayı önlemek için karmaşıklaştırmaya değmez; banner `position: fixed` ile içeriğin üzerine biner (kısa süreliğine bindirme kabul edilebilir).

- **Yeni çeviri anahtarı - `app.offlineBanner`**: TR: `"İnternet bağlantın yok. Bazı özellikler çalışmayabilir."`, EN: `"You're offline. Some features may not work."` - mevcut `app` bölümüne (`app.loading`, `app.loadError` yanına) eklenir.

## Testing Decisions

- `src/lib/openLibrary.test.js`'e yeni testler eklenir (mevcut `mockFetchOnce` deseni genişletilir, mock'suz):
  - `fetch()` reddettiğinde (`global.fetch = vi.fn().mockRejectedValue(new Error('network fail'))`) `getBookByIsbn()`'in artık `null` dönmek yerine throw ettiği doğrulanır.
  - `response.ok === false` olduğunda da throw ettiği doğrulanır (mevcut "returns null when the HTTP response is not ok" testi throw eden davranışa güncellenir).
  - HTTP 200 ama `data[bibkey]` tanımsızken (gerçek "bulunamadı") **hâlâ `null` döndüğü** (throw etmediği) ayrıca bir testle doğrulanır - regresyonu önlemek için kritik.
  - `searchBooks()` için aynı üç senaryo (network hatası → throw, HTTP not-ok → throw, boş `docs` dizisi → `[]`, throw yok) test edilir.
  - Bir hata fırlatıldığında sonucun cache'e yazılmadığı (aynı ISBN/sorgu ile hemen sonra tekrar çağrıldığında `fetch`'in yine çağrıldığı) bir testle doğrulanır.
- `useAddBookFlow` için mevcut test dosyası yoksa (bileşen `App.jsx` üzerinden dolaylı test ediliyorsa) yeni bir test dosyası **eklenmez** - kapsam dışı; ama `getBookByIsbn` mock'lanarak reddedildiğinde `alert`'in `isbnLookup.error` metniyle çağrıldığını doğrulayan bir test varsa/eklenebilecekse tercih edilir (mevcut test altyapısı incelenip mevcut desene uyulur).
- `BatchScanner.jsx` için component testi varsa, `getBookByIsbn` bir kez `not_found` (null resolve) bir kez network hatasıyla (reject) mock'lanarak iki satırın da doğru status (`not_found` vs `error`) ve doğru metinle (`openLibraryNotFound` vs `connectionError`) render edildiği doğrulanır.
- `BookSearch.jsx` için component testi varsa, `searchBooks` reddedildiğinde `bookSearch.error` metninin göründüğü (boş sonuç mesajının değil) doğrulanır.
- Yeni `useOnlineStatus` hook'u için, `useEscapeKey.test.js` gibi mevcut basit hook testleri varsa aynı desende: `navigator.onLine`'ı mock'layıp başlangıç değerini, sonra `window.dispatchEvent(new Event('offline'))` / `('online')` ile durumun doğru güncellendiğini doğrulayan küçük bir birim testi eklenir.

## Out of Scope

- Offline'ken eklenen kitapları kuyruğa alıp bağlantı geri geldiğinde senkronize etme - bu, service worker gerektiren ayrı bir PWA ticket'ına bırakıldı.
- Sayfa sayısı (`pageCount`) eksikliği - Open Library'nin kendi veri kalitesi sorunu, bu spec'in konusu değil.
- AI Kitap Asistanı (Gemini) hata yönetimi - zaten doğru çalışıyor, dokunulmuyor.
- `navigator.onLine`'ın platform sınırlamalarını aşan "gerçek" bağlantı testi (periyodik ping/health-check endpoint'i) - sadece tarayıcının native online/offline sinyali kullanılıyor.
- Barkod/arama başarısız olduğunda otomatik yeniden deneme (retry with backoff) - kullanıcı elle tekrar dener (barkodu yeniden okutur / aramayı tekrar yazar / manuel ekler).
- `BatchScanner`'a ayrı bir "tekrar dene" butonu eklenmesi - mevcut "Manuel Ekle" akışı yeterli kabul edildi.

## Further Notes

- `navigator.onLine` bazı tarayıcı/işletim sistemi kombinasyonlarında güvenilmez olabilir (bağlı ama internetsiz bir ağda hatalı `true` dönebilir) - bu bilinen bir sınırlama, spec'in kapsamı bunu çözmüyor, sadece "cihaz kendi bildiriyorsa göster" seviyesinde bir gösterge ekliyor.
- `App.jsx`'teki üç early-return'ün tek return'e çevrilmesi bu spec'in zorunlu kıldığı tek yapısal refactor - başka hiçbir dosyada mevcut kontrol akışı yeniden yapılandırılmıyor.
