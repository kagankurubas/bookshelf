# App.jsx Component Testi + Böl

Status: ready-for-agent

## Problem Statement

`App.jsx`'i doğrudan render eden hiçbir test dosyası yok. Auth durumları (yükleniyor / giriş yapılmamış / giriş yapılmış), genel yükleniyor ekranı ve offline banner davranışı (bkz. `api-error-handling` spec'i - zaten implemente edilmiş ve çalışıyor) bugüne kadar sadece elle, tarayıcıdan doğrulanabildi; bu üçü için hiçbir regresyon koruması yok.

Ayrıca `App.jsx` zamanla (auth, yükleniyor, offline banner, kitap/kitaplık verisi, görünüm seçimi, tüm modal orkestrasyon) çok sayıda sorumluluğu tek dosyada toplayan, ~400 satırlık bir "tanrı bileşeni" haline geldi. Bu hem test yazmayı zorlaştırıyor (bir şeyi test etmek için neredeyse tüm alt bileşen ağacının mock'lanması gerekiyor), hem de gelecekteki değişiklikleri (ör. auth ekranına yeni bir durum eklemek) riskli hale getiriyor çünkü izole değil.

## Solution

Üç durumu (auth yükleniyor / kullanıcı yok / kullanıcı var) ve bunların üstüne binen offline banner'ı yöneten üst seviye JSX, `App.jsx`'in en üstünden iki küçük, saf sunum bileşenine çıkarılır: `OfflineBanner` (sadece `isOnline`/`queuedCount` prop'larına göre banner'ı gösterir/gizler) ve `AuthGate` (auth yükleniyor / kullanıcı yok / kullanıcı var üçlüsünü yönetip, kullanıcı varken `children`'ı render eder). `App.jsx`'in geri kalanı (kitap/kitaplık verisi, görünüm seçimi, tüm handler'lar, ana uygulama içeriği) **değişmeden** kalır - bu spec'in kapsamı sadece en üstteki koşullu render bloğu.

Bu iki bileşen çıkarıldıktan sonra `App.test.jsx` yazılır; `App`'i doğrudan render edip auth/yükleniyor/offline-banner davranışını uçtan uca (component-boundary RTL testiyle, mevcut `ImportPreviewModal.test.jsx`/`SettingsModal.test.jsx`/`BookModal.test.jsx` deseniyle tutarlı) doğrular.

**Sıralama kararı: önce test, sonra refactor.** Gerekçe Implementation Decisions'ta.

## User Stories

1. Geliştirici olarak, `App.jsx`'te auth henüz yüklenirken (`authLoading === true`) doğru yükleniyor ekranının göründüğünü otomatik bir testle doğrulayabilmek istiyorum.
2. Geliştirici olarak, auth yüklendi ama kullanıcı giriş yapmamışken `AuthScreen`'in göründüğünü (ve yükleniyor ekranının/ana uygulamanın görünmediğini) otomatik bir testle doğrulayabilmek istiyorum.
3. Geliştirici olarak, kullanıcı giriş yapmışken `AuthScreen`'in ve genel yükleniyor ekranının artık görünmediğini, ana uygulama kapsayıcısının render edildiğini otomatik bir testle doğrulayabilmek istiyorum.
4. Geliştirici olarak, cihaz çevrimdışıyken offline banner'ın **her üç** durumda da (auth yükleniyor, giriş ekranı, ana uygulama) göründüğünü otomatik bir testle doğrulayabilmek istiyorum - bu üçünü ayrı ayrı kapsayan bir regresyon koruması yok.
5. Geliştirici olarak, cihaz çevrimiçiyken offline banner'ın hiçbir durumda görünmediğini otomatik bir testle doğrulayabilmek istiyorum.
6. Geliştirici olarak, kuyrukta bekleyen kitap sayısı (`queuedCount`) sıfırdan büyükken banner metnine ek kuyruk bilgisinin eklendiğini otomatik bir testle doğrulayabilmek istiyorum.
7. Geliştirici olarak, `App.jsx`'in en üstündeki auth/yükleniyor/offline-banner mantığının ayrı, küçük, saf bileşenlere çıkarılmasıyla, bu mantığı test etmek için artık kitap/kitaplık/istatistik gibi ana uygulama içeriğinin tüm bağımlılık ağacını mock'lamak zorunda kalmamak istiyorum.
8. Geliştirici olarak, bu refactor'ın **davranışı değiştirmediğinden** emin olmak istiyorum - aynı `App.test.jsx` dosyası, refactor öncesinde de sonrasında da (implementasyon detayı değil, dışarıdan gözlemlenen davranış test edildiği için) değişmeden geçmeli.
9. Geliştirici olarak, bu refactor'ın `BookModal` not düzenleme UI'ı ile paralel ilerleyen ayrı bir ticket'la çakışmadığından emin olmak istiyorum - `App.jsx`'e dokunan bu iş, `BookModal.jsx`'e dokunmuyor, aralarında bağımlılık yok.

## Implementation Decisions

- **Çıkarılacak iki yeni bileşen:**
  - `OfflineBanner` — `isOnline: boolean`, `queuedCount: number` prop'larını alır; `isOnline` `false` iken mevcut `.offline-banner` `div`'ini (aynı `role="status"`, aynı çeviri anahtarları: `app.offlineBanner`, kuyruk varsa `app.offlineBannerQueued`) render eder, `true` iken hiçbir şey render etmez. Saf, state'siz, `App.jsx`'teki mevcut JSX'in birebir taşınmasından ibaret - davranış değişmiyor.
  - `AuthGate` — `authLoading: boolean`, `user: object | null`, `onSignIn`, `onSignUp`, `redirectError`, `accountDeletedNotice`, `children` prop'larını alır. `authLoading` true iken mevcut yükleniyor JSX'ini, `!user` iken mevcut `AuthScreen`'i (aynı prop'larla), aksi halde `children`'ı render eder. Yine mevcut nested-ternary'nin birebir taşınması - yeni bir davranış eklenmiyor.
  - İkisi de `src/components/<BileşenAdı>/<BileşenAdı>.jsx` yerleşimini izler (repo'daki mevcut komponent klasörleme deseni).
- **`App.jsx`'teki değişiklik**: En üstteki `return` bloğu, `<OfflineBanner isOnline={isOnline} queuedCount={queuedCount} /><AuthGate authLoading={authLoading} user={user} onSignIn={signIn} onSignUp={signUp} redirectError={redirectError} accountDeletedNotice={accountDeletedNotice}>{/* mevcut ana uygulama JSX'i, değişmeden */}</AuthGate>` şeklinde sadeleşir. Ana uygulama içeriğinin kendisi (kitap/kitaplık yükleniyor/hata durumu, `AppHeader`, `LibraryToolbar`, view'lar, tüm modal orkestrasyonu, tüm handler fonksiyonları - `handleSaveBook`, `handleDeleteBook`, `handleCreateLibrary`, `handleDeleteLibrary`) **hiç değişmiyor** - bu spec'in kapsamı sadece en üstteki koşullu render'ı iki bileşene taşımakla sınırlı, App.jsx'in geri kalanını daha fazla parçalara ayırmak kapsam dışı.
- **Sıralama: önce test, sonra refactor.** Gerekçe:
  - Şu an `App.jsx` için hiçbir test yok - refactor'dan önce mevcut davranışı "karakterize eden" bir test yazmak, refactor'a karşı gerçek bir güvenlik ağı sağlar.
  - Test, dışarıdan gözlemlenebilir davranışı (hangi durumda ne render ediliyor) hedeflediği için implementasyon detayına (App.jsx tek dosya mı, iki bileşene mi bölünmüş) bağlı değil - aynı test dosyası, refactor sonrasında **değişmeden** geçmeye devam etmeli. Bu, refactor'ın davranışı bozmadığının kanıtı olur.
  - Önce refactor yapıp sonra test yazmak, "teste uydurulmuş" bir yapı riski taşır ve refactor'ın kendisinin davranışı bozup bozmadığını doğrulayacak hiçbir şey olmaz.
  - Pratik maliyet farkı yok: `App`'i render edebilmek için gereken mock yüzeyi (aşağıya bakınız) refactor'dan önce de sonra da aynı - dolayısıyla test-önce sırası ekstra maliyet getirmiyor.
- **Test edilecek mock yüzeyi**: `App.test.jsx`, `../lib/supabaseClient`'ı mock'lar (mevcut `SettingsModal.test.jsx`'teki `.auth` mock deseni + mevcut `useBooks.test.js`'teki `queryResult` zincirlenebilir sorgu-builder deseni `.from()` için birleştirilerek). `useAuth`'un `supabase.auth.getSession()`/`onAuthStateChange()`'i kullanması nedeniyle bunlar mock'lanmadan `App` render edilemiyor; `useBooks`/`useLibraries` zaten `userId` yokken (`authLoading`/`!user` durumlarında) `supabase.from()`'a hiç dokunmuyor, dolayısıyla o iki durum için `.from()` mock'unun boş/basit olması yeterli. "Kullanıcı var" durumunu test etmek için `.from()` en azından boş/pending bir sonuçla (gerçek içerik detayına girmeden) yanıt vermeli - bu testte ana uygulamanın iç içeriği (kitap listesi vb.) değil, sadece `AuthScreen`/yükleniyor metninin artık görünmediği ve ana uygulama kapsayıcısının render edildiği doğrulanır.

## Testing Decisions

- İyi bir test dışarıdan gözlemlenen davranışı (belirli bir hook/prop durumunda ekranda ne göründüğü) test eder, iç implementasyon detaylarını (kaç bileşene bölündüğü, iç state adları) değil - bu yüzden aynı `App.test.jsx` refactor öncesi/sonrası değişmeden geçmeli (bkz. Implementation Decisions).
- Yeni dosya: `src/App.test.jsx`, Vitest + RTL, prior art: `ImportPreviewModal.test.jsx`, `SettingsModal.test.jsx`, `BookModal.test.jsx` (component-boundary render + `screen`/`fireEvent` ile assert).
- Mock deseni prior art: `useBooks.test.js`'teki `queryResult()` zincirlenebilir query-builder mock'u (`supabase.from()` için) ve `SettingsModal.test.jsx`'teki `vi.mock('../../lib/supabaseClient', ...)` deseni (`supabase.auth` için) - ikisi `App.test.jsx` için birleştirilir.
- `useAuth` doğrudan mock'lanabilir (`vi.mock('./hooks/useAuth')`) **ya da** `supabase.auth` mock'lanıp `useAuth` gerçek haliyle çalıştırılabilir - hangisi daha az kırılgan/daha okunaklıysa (muhtemelen `useAuth`'u doğrudan mock'lamak daha az yüzey gerektirir) implementasyon sırasında seçilsin, spec bunu zorunlu kılmıyor.
- Kapsanacak senaryolar (asgari, User Stories 1-6'ya karşılık gelir):
  - `authLoading: true` iken yükleniyor metni görünür, `AuthScreen` ve ana uygulama kapsayıcısı görünmez.
  - `authLoading: false`, `user: null` iken `AuthScreen` görünür (ör. giriş formunun bir öğesi üzerinden), yükleniyor metni ve ana uygulama kapsayıcısı görünmez.
  - `authLoading: false`, `user` dolu iken `AuthScreen` ve üst-seviye yükleniyor metni görünmez, ana uygulama kapsayıcısı (`main-container`) render edilir.
  - `isOnline: false` iken yukarıdaki üç durumun **her birinde ayrı ayrı** (auth yükleniyor, giriş ekranı, ana uygulama) offline banner metninin göründüğü - üçü için üç ayrı test/assertion.
  - `isOnline: true` iken offline banner hiçbir durumda görünmez.
  - `isOnline: false` + `queuedCount > 0` iken banner'da kuyruk metni de görünür.
- `useOnlineStatus`, `useAddOrQueueBook`, `useOfflineBookQueue`, `useBookFilters` gibi alt hook'ların kendi davranışı zaten kendi test dosyalarında kapsanıyor (bkz. `useOnlineStatus.test.js`, `useAddOrQueueBook.test.js`, `useBookFilters.test.js`) - `App.test.jsx` bunları tekrar test etmez, sadece üst seviye kompozisyonu doğrular.
- Mevcut test suite'i kırılmadan geçmeli; `OfflineBanner`/`AuthGate` çıkarımı davranış değiştirmediği için başka hiçbir mevcut testte regresyon beklenmiyor.
- `OfflineBanner`/`AuthGate` için ayrı birim test dosyaları **eklenmez** - ikisi de yeterince küçük/saf olduğundan davranışları zaten `App.test.jsx` üzerinden dolaylı olarak kapsanıyor; ayrı dosyalar gereksiz kapsam şişirmesi olurdu.

## Out of Scope

- `App.jsx`'in geri kalanının (ana uygulama içeriği: kitap/kitaplık yükleniyor/hata durumu, view seçimi, tüm modal orkestrasyonu, `handleSaveBook`/`handleDeleteBook`/`handleCreateLibrary`/`handleDeleteLibrary` handler'ları) daha fazla bileşene bölünmesi - bu spec sadece en üstteki auth/yükleniyor/offline-banner katmanını kapsıyor.
- Ana uygulama içeriğinin (kitap listesi, görünümler, modallar) kendi component testleri - ayrı, gelecekteki bir ticket'a bırakılabilir.
- `BookModal` not ekleme/düzenleme UI'ı - paralel, bağımsız bir ticket, bu spec'e dokunmuyor.
- `useAuth`, `useOfflineBookQueue` gibi hook'ların kendi iç davranışının değiştirilmesi - sadece tüketimleri (`App.jsx`'te nasıl render edildikleri) test ediliyor, kendileri değişmiyor.

## Further Notes

- Bu, `App.jsx`'i "tanrı bileşeni" olmaktan tamamen çıkarmıyor - sadece en üstteki, test edilmesi en kolay ve en değerli katmanı (auth/yükleniyor/offline-banner) izole ediyor. Ana uygulama içeriğinin bölünmesi ayrı bir karar/ticket gerektirir ve bu spec'te ele alınmıyor.
- `AuthGate` ismi bu spec için öneridir; implementasyon sırasında repo'nun domain diline daha uygun başka bir isim tercih edilirse (ör. `AppGate`, `SessionGate`) sorun değil - önemli olan sorumluluğun (auth durumuna göre üç dallı render) tek bir yerde, saf bir bileşende toplanması.
