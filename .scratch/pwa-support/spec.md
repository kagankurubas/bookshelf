# PWA Desteği (offline + installable, vite-plugin-pwa)

Status: ready-for-agent

## Problem Statement

BookShelf'in "mobilde kullanılabilir" iddiası şu an sadece responsive web tasarımına dayanıyor: uygulama yüklenebilir (installable) değil, service worker'ı yok, ve internet bağlantısı kesildiğinde (barkod tarama akışının en çok kullanıldığı, sinyalin zayıf olduğu bir kitapçı/kütüphane ortamı gibi senaryolarda) sayfa yenilenirse veya ilk açılıştaysa kullanıcıya boş/hata ekranından başka bir şey gösterilemiyor.

Bugün tamamlanan "hata durumları" ticket'ı bu alanda iki temel yapı taşı bıraktı ve bu ticket bunların **üzerine inşa ediyor, tekrar yazmıyor**:
- `src/lib/openLibrary.js`: network hatası/timeout ve HTTP hata kodlarında artık `throw` ediyor (gerçek "bulunamadı" durumundan ayrı).
- `src/hooks/useOnlineStatus.js` + `App.jsx`'teki global "İnternet bağlantın yok" banner'ı.

## Solution

`vite-plugin-pwa` (Workbox tabanlı, `generateSW` stratejisiyle) eklenir: uygulama kabuğu (JS/CSS/HTML + barkod okuyucunun WASM motoru) precache'lenir, bir `manifest.webmanifest` ile uygulama Android/masaüstü Chrome'da "yükle" (installable) hale gelir, ve seçici bir runtime-caching kurallar seti eklenir - **kullanıcı verisi (Supabase) asla stale kalmasın diye sadece okuma (GET) isteklerine, ağ öncelikli (NetworkFirst) bir cache-fallback** uygulanır; Open Library kapak görselleri gibi değişmeyen statik içerik ise agresifçe (CacheFirst) cache'lenir. Yazma istekleri (POST/PATCH/DELETE) Workbox'ın route'ları varsayılan olarak sadece GET'i dinlediği için zaten hiç cache mekanizmasına girmiyor - ekstra bir "yazmaları hariç tut" kuralı yazmaya gerek yok.

Buna ek olarak, kullanıcı offline'ken barkod tarayıp (veya arayıp, ya da elle) yeni bir kitap eklemeye çalışırsa, bu ekleme IndexedDB'de basit bir kuyruğa alınır ve `useOnlineStatus`'a eklenen bir "online oldu" callback'i tetiklendiğinde sırayla (FIFO, tek tek) senkronize edilir.

## User Stories

1. Kullanıcı olarak, telefonumda Chrome/Safari'den "Ana ekrana ekle" / "Yükle" seçeneğini görüp BookShelf'i normal bir uygulama gibi ikonla açabilmek istiyorum.
2. Kullanıcı olarak, uygulamayı daha önce açtıysam, internetim tamamen kesilse bile uygulamanın (beyaz ekran/tarayıcı hatası yerine) en azından kendi arayüzüyle açılmasını istiyorum.
3. Kullanıcı olarak, offline'ken uygulamayı açtığımda, en son görüntülediğim kitap listemi (muhtemelen güncel olmayabileceğinin farkında olarak) görebilmek istiyorum - boş bir ekran veya "kitaplığın yüklenemedi" hata ekranı değil.
4. Kullanıcı olarak, offline'ken barkod okutup kamera/tarama arayüzünün yine de açılmasını istiyorum (barkod okuma kameranın kendi işi, internet gerektirmiyor) - sadece kitap bilgisini Open Library'den çekme adımı başarısız olmalı, tarama ekranının kendisi değil.
5. Kullanıcı olarak, offline'ken bir barkod okuttuğumda (Open Library'ye ulaşılamadığı için) otomatik olarak elle giriş formuna (ISBN önceden dolu, başlık/yazarı kendim yazacağım) yönlendirilmek istiyorum, "hata oluştu" deyip beni yarı yolda bırakmasın.
6. Kullanıcı olarak, offline'ken (barkodla veya elle) bir kitap eklediğimde, bunun "kaydedilemedi" diye başarısız gösterilmesini değil, "bağlantı gelince eklenecek" gibi net bir bilgilendirme görmek istiyorum.
7. Kullanıcı olarak, toplu tarama (BatchScanner) sırasında taradığım kitapları "Kaydet"e bastığımda internetim yoksa, bunların da tek tek "kaydedilemedi" hatası vermek yerine kuyruğa alındığını görmek istiyorum.
8. Kullanıcı olarak, offline'ken kuyruğa eklediğim kitap sayısını (ör. "2 kitap bağlantı gelince eklenecek") bir yerde görebilmek istiyorum, kuyruğun sessizce kaybolmadığından emin olmak için.
9. Kullanıcı olarak, internetim geri geldiğinde, kuyruğa alınmış kitaplarımın kendiliğinden (benim tekrar bir şey yapmama gerek kalmadan) eklenmesini istiyorum.
10. Kullanıcı olarak, offline'ken uygulamayı kapatıp daha sonra (hâlâ offline ya da online) tekrar açsam bile, kuyruğa aldığım kitapların kaybolmadığını (tarayıcı sekmesini kapatmanın kuyruğu silmediğini) istiyorum.
11. Kullanıcı olarak, uygulamanın yeni bir sürümü yayınlandığında, bunu fark etmek için elle bir şey yapmama gerek kalmadan bir sonraki ziyaretimde güncel sürümü almak istiyorum (karmaşık bir "güncelleme mevcut" diyaloğuyla uğraşmak istemiyorum).

## Implementation Decisions

### Paket ve strateji

- **`vite-plugin-pwa`** eklenir (güncel sürüm 1.3.0, `peerDependencies.vite: "^3.1.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0"` - projenin kullandığı Vite ^8.1.1 ile uyumlu; Vite 8 desteği yakın zamanda eklendi, [vite-pwa/vite-plugin-pwa#923](https://github.com/vite-pwa/vite-plugin-pwa/issues/923)).
- **Strateji: `generateSW`** (varsayılan), `injectManifest` değil. Gerekçe: sadece "precache + bildirimsel (declarative) runtime caching" istiyoruz - Background Sync API, push notification veya özel bir `fetch` handler'ı **bilerek kapsam dışı** (bkz. Out of Scope), bu yüzden elle yazılan bir service worker dosyasına (injectManifest'in gerektirdiği) ihtiyaç yok; `generateSW` Workbox'ın kendi ürettiği, `workbox.runtimeCaching` array'inden route'lar kuran bir SW'yi otomatik üretir.
- **`registerType: 'autoUpdate'`**. Gerekçe: `'prompt'` seçeneği `virtual:pwa-register/react`'ten `useRegisterSW` hook'uyla elle bir "yeni sürüm var, yenile" toast/dialog bileşeni yazmayı gerektiriyor ([vite-pwa-org.netlify.app/frameworks/react](https://vite-pwa-org.netlify.app/frameworks/react.html)) - bu, "basit tut" ilkesine göre gereksiz bir UI parçası. `autoUpdate` hiçbir ek bileşen gerektirmeden yeni SW'yi arka planda güncelleyip bir sonraki (veya aynı sekmede bir süre sonraki) navigasyonda devreye sokar.

### Runtime caching kuralları (`vite.config.js` → `VitePWA({ workbox: { runtimeCaching: [...] } })`)

`urlPattern` bir regex, `handler` Workbox strateji adı (`'NetworkFirst'` / `'CacheFirst'`), `options.expiration` girişlerin ne kadar tutulacağını sınırlar. Workbox route'ları **varsayılan olarak sadece `GET` isteklerini** dinler - `method` alanı hiç belirtilmezse POST/PATCH/DELETE zaten hiçbir route'a girmeden ağa gider ([Workbox routing docs](https://developer.chrome.com/docs/workbox/modules/workbox-routing/): "By default, Routes are registered for GET requests... you'll need to specify the method" for non-GET). Bu, Supabase'e yazma isteklerinin (insert/update/delete, hepsi POST/PATCH/DELETE) **hiçbir ek konfigürasyon yazmadan** cache mekanizmasına hiç girmeyeceği, sadece okumaların (`.select()` → GET) etkileneceği anlamına geliyor - kritik güvenlik/tazelik garantisi bu sayede "olmaması gereken bir şeyi unutmaya" değil, Workbox'ın varsayılan davranışına dayanıyor.

- **Supabase REST okuma sorguları** (`https://<proje-ref>.supabase.co/rest/v1/*` - proje ref'i `.env`'deki `VITE_SUPABASE_URL`'den geliyor, build-time'da regex'e gömülmeyecek şekilde `import.meta.env.VITE_SUPABASE_URL` ile dinamik bir `urlPattern` fonksiyonu - sabit regex değil - yazılmalı, çünkü Supabase proje URL'i deploy'a göre değişebilir bir env değişkeni):
  ```js
  {
    urlPattern: ({ url }) => url.href.startsWith(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`),
    handler: 'NetworkFirst',
    options: {
      cacheName: 'supabase-rest-cache',
      expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }, // 1 gun
      cacheableResponse: { statuses: [0, 200] },
      networkTimeoutSeconds: 5, // yavas/yari-bagli bir agda cok uzun beklemesin
    },
  }
  ```
  `/auth/v1/*` ve `/functions/v1/*` (AI Kitap Asistanı) bu pattern'e hiç girmiyor (path'i `/rest/v1/` degil) - ayrica hariç tutma kuralı yazmaya gerek yok.
- **Open Library** (hem ISBN/arama JSON'u hem kapak görselleri - ikisi de pratikte hiç değişmeyen veri):
  ```js
  {
    urlPattern: /^https:\/\/(covers\.)?openlibrary\.org\/.*/i,
    handler: 'CacheFirst',
    options: {
      cacheName: 'openlibrary-cache',
      expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30 gun
      cacheableResponse: { statuses: [0, 200] },
    },
  }
  ```
- **Barkod okuyucu WASM motoru** (`zxing-wasm`, ~1.09 MB, `BarcodeScanner` bileşeniyle birlikte zaten lazy/code-split ediliyor - bkz. `App.jsx`'teki `lazy(() => import(...))`): varsayılan `generateSW` `globPatterns`'i `.wasm` uzantısını **içermez**, yani elle eklenmezse bu dosya hiç precache'e girmez ve barkod tarama offline'de (ilk kez hiç kullanılmamışsa) çalışmaz. Bunun yerine bu dosyayı da precache'e (globPatterns'e `wasm` eklenerek - build çıktısı halihazırda Workbox'ın varsayılan 2 MB `maximumFileSizeToCacheInBytes` sınırının altında, 1.09 MB) dahil ediyoruz; büyük ve nadiren değişen bir dosya olduğu için CacheFirst runtime-caching yerine doğrudan precache'i tercih ediyoruz ki kullanıcı barkod tarama ekranını hiç açmamış olsa bile (ör. uygulamayı ilk kez offline bir ortamda deneyen biri) WASM motoru zaten kurulum anında inmiş olsun - bu, "barkod tarama kamerası offline'de de çalışsın" hikâyesinin (User Story 4) teknik temeli.
- **AI Kitap Asistanı (`/functions/v1/ai-chat`) ve Supabase Auth (`/auth/v1/*`)**: hiçbir runtime-caching kuralına dahil edilmez (yukarıdaki Supabase pattern'i sadece `/rest/v1/`'i eşliyor) - bu istekler her zaman canlı ağa gider, başarısız olursa zaten mevcut (bugün tamamlanan ticket'taki) hata mesajları devreye girer.

### Manifest ve ikonlar

- `VitePWA({ manifest: {...} })` içinde: `name: 'BookShelf'`, `short_name: 'BookShelf'`, `start_url: '/'`, `display: 'standalone'`, `theme_color` ve `background_color` (mevcut `App.css`'teki `--bg`/marka rengiyle tutarlı), `icons` dizisi.
- Chrome'un installability kriteri: manifest'te en az **192×192 ve 512×512 PNG, `purpose: "any"`** (veya `purpose` hiç belirtilmemiş - varsayılan `"any"`) olmalı; bu iki boyut olmadan "yükle" seçeneği hiç çıkmaz. **Maskable ikon zorunlu değil** ama Android'in adaptive-icon kırpmasında (daire/kare) logonun kesilmemesi için **önerilir**; sadece maskable ikon verip "any" vermemek ise Chrome'un kurulumu tamamen reddetmesine yol açar - o yüzden ikisi birlikte bulunmalı. ([web.dev/Chrome installability, "PWA icon requirements" araştırması])
- **iOS Safari**, web manifest'teki ikonları "Ana Ekrana Ekle" için kullanmıyor - ayrı bir `<link rel="apple-touch-icon" href="/apple-touch-icon.png">` (180×180) `index.html`'e eklenmeli.
- Projede şu an sadece 28×28 viewBox'lı bir `public/favicon.svg` var, PWA için gereken PNG boyutlarında hiçbir ikon yok. Bunları elle (Figma/export) üretmek yerine, vite-plugin-pwa'nın resmi yardımcı aracı **`@vite-pwa/assets-generator`** kullanılır (devDependency): tek bir kaynak SVG'den (`public/favicon.svg`) `minimal2023Preset` ile tam set üretir - transparan 64/192/512 (`purpose: "any"`), maskable 512, apple-touch-icon 180 - ve maskable/apple ikonlar için **safe-zone dolgusunu (0.3 padding) otomatik uyguluyor**, elle güvenli-alan hesaplamaya gerek yok.
  ```ts
  // pwa-assets.config.ts
  import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config'
  export default defineConfig({ headLinkOptions: { preset: '2023' }, preset, images: ['public/favicon.svg'] })
  ```
  `npx pwa-assets-generator` ile üretilir, çıktı `public/`'e yazılır. Üretilen dosya adları (`pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`) **elle** `manifest.icons` dizisine yazılmalı - araç manifest'i otomatik güncellemiyor.

### Offline kitap ekleme kuyruğu

- **Depolama**: yeni `src/lib/offlineBookQueue.js` - ham `indexedDB` API'siyle (ek bağımlılık gerekmez, tek store'luk basit bir kuyruk için `idb` gibi bir sarmalayıcı gereksiz) tek bir `pendingBooks` object store. Fonksiyonlar: `enqueueBook(bookFields)`, `getQueuedBooks()`, `removeQueuedBook(id)` - saf, Supabase/React'tan bağımsız, `src/lib/openLibrary.js` ile aynı "saf fonksiyon" desenine uyar.
- **`useOnlineStatus` genişletmesi**: `useOnlineStatus(onOnline?)` - opsiyonel bir callback parametresi alır, tarayıcı `offline`'dan `online`'a geçtiğinde (yani gerçek bir *geçiş* anında, mount'ta zaten online olma durumunda değil) tetiklenir. Mevcut `App.jsx`'teki parametre almayan çağrı (`useOnlineStatus()`) geriye dönük uyumlu kalır.
- **Kuyruk-veya-ekle sarmalayıcısı**: `App.jsx` içinde yeni bir `addOrQueueBook(fields)` fonksiyonu - `isOnline` `true` ise doğrudan `library.addBook(fields)`'i çağırır (bugünkü davranış, değişmez); `false` ise ağa hiç dokunmadan `enqueueBook(fields)` ile kuyruğa yazar ve optimistik bir "kuyruğa alındı" sonucu döner. **Bu ayrım, bir yazma isteğini deneyip hata tipini yorumlamak yerine, tıklama anındaki `isOnline` bayrağına bakarak yapılır** - "hata durumları" ticket'ındaki aynı ilke (network hatası ayrımını `throw`'a değil `isOnline` sinyaline dayandırma) burada da korunuyor: `isOnline === true` iken yine de bir yazma başarısız olursa (gerçek sunucu hatası), bu **kuyruğa alınmaz**, bugünkü gibi normal hata mesajı gösterilir.
- **İki çağrı noktası** aynı sarmalayıcıyı kullanır (kod tekrarı olmasın diye): `App.jsx`'teki `handleSaveBook` (BookModal'dan "Kaydet" - tekli barkod/arama/elle ekleme akışlarının hepsi buradan geçiyor) VE `BatchScanner`'a bugüne kadar `addBook={library.addBookWithoutStatsRefresh}` olarak geçirilen prop, artık `addBook={addOrQueueBook}` olarak değiştirilir - `BatchScanner`'ın kendi kodunda hiçbir online/offline mantığı yazılmaz, sadece hangi fonksiyonun çağrıldığı değişir.
- **`useAddBookFlow.handleBarcodeScanned` offline fallback'i**: `useAddBookFlow`'a `isOnline` parametresi eklenir. `getBookByIsbn(isbn)` hata fırlattığında, eğer o anda `isOnline === false` ise (Open Library'ye offline olduğumuz için ulaşamadık, gerçek bir Open Library hatası değil), kullanıcıya hata alert'i göstermek yerine **doğrudan `handleManualAddFromIsbn(isbn)` çağrılır** (BatchScanner'ın "Manuel Ekle" butonunun bugün zaten kullandığı, ISBN'i önceden dolduran aynı yol) - böylece kullanıcı taranan ISBN'le başlayıp başlık/yazarı elle girebilir. `isOnline === true` iken bir hata olursa (Open Library gerçekten çöktü/500 döndü), davranış **değişmez**: bugünkü `isbnLookup.error` alert'i gösterilir.
- **Flush (senkronizasyon)**: `App.jsx`'te yeni bir `useOfflineBookQueue`-benzeri effect/fonksiyon: (a) uygulama açılışında, eğer `navigator.onLine` zaten `true` ise (uygulama offline'ken kapatılıp sonra online'ken tekrar açıldıysa - `online` event'i bu durumda hiç ateşlenmez, mount anında ayrıca kontrol edilmeli), (b) `useOnlineStatus`'un `onOnline` callback'i tetiklendiğinde - kuyruktaki kayıtlar **sırayla (bir `for` döngüsüyle, paralel değil)** `library.addBookWithoutStatsRefresh` ile eklenir, her biri başarılı olur olmaz **hemen o kaydı** IndexedDB'den siler (toplu silme değil - senkronizasyon yarıda kesilirse kalan kayıtlar güvende kalsın). Bir öğe eklenirken hata alırsa (ör. tekrar bağlantı gitti) döngü durur, kalanlar kuyrukta kalır, bir sonraki `online` olayında tekrar denenir. Döngü bitince `library.refreshStats()` bir kez çağrılır (BatchScanner'ın bugünkü "N ekleme sonunda bir kez refresh" deseniyle tutarlı).
- **Kuyruk göstergesi**: mevcut offline banner'a (`App.jsx`, `.offline-banner`) kuyrukta bekleyen kitap sayısı varsa ikinci bir satır/ek metin eklenir (ör. "İnternet bağlantın yok. Bazı özellikler çalışmayabilir. 2 kitap bağlantı gelince eklenecek.") - yeni bir bileşen icat edilmez, var olan banner'ın metni `queuedCount`'a göre koşullu genişletilir. `BatchScanner`'ın "Kaydet Hepsini" sonrası gösterdiği `doneMessage` de `isOnline`'a göre iki farklı metin kullanacak şekilde küçük bir koşulla güncellenir ("N kitap eklendi" / "N kitap bağlantı gelince eklenecek").

### Netlify / statik dosya sunumu

- `netlify.toml`'a `/sw.js` için `Cache-Control: must-revalidate` header'ı eklenir - service worker dosyasının adı deploy'lar arasında değişmiyor (`sw.js`, sabit isim), bu yüzden CDN'in onu uzun süre agresif cache'lememesi, her ziyarette taze SW/precache manifestinin kontrol edilmesi gerekiyor. `/assets/*` (Vite'ın zaten içerik-hash'li isimlendirdiği JS/CSS parçaları) için ek bir değişiklik gerekmiyor - onlar zaten güvenle uzun süre cache'lenebilir, dosya adı değiştiği için bayatlama riski yok.

## Testing Decisions

- `src/lib/offlineBookQueue.js` için `fake-indexeddb/auto` (yeni devDependency, güncel sürüm 6.x) sadece bu test dosyasının başında import edilir (global `src/test/setup.js`'e eklenmez - diğer testleri etkilemesin diye kapsam dar tutulur). `enqueueBook`/`getQueuedBooks`/`removeQueuedBook`'un temel CRUD davranışı, sırayı koruduğu (FIFO) ve bir kaydı sildikten sonra diğerlerinin etkilenmediği mock'suz test edilir.
- `useOnlineStatus`'un yeni `onOnline` callback parametresi için: `offline`→`online` geçişinde callback'in bir kez çağrıldığı, ama zaten `online` iken mount olduğunda **çağrılmadığı** (sadece geçişte, ilk durumda değil) doğrulanır.
- `App.jsx`'teki `addOrQueueBook` mantığı, doğrudan `App.jsx` render testi olmadığı için (önceki ticket'ta not edildiği gibi bu dosyanın component testi yok) **saf bir yardımcı fonksiyon olarak `src/lib/` altına çıkarılıp** (ör. `shouldQueueBook(isOnline)` gibi minimal bir saf fonksiyon, ya da doğrudan `addOrQueueBook`'un kendisi bir hook/util olarak) izole test edilebilir hale getirilir - App.jsx içine gömülü, test edilemeyen bir closure olarak bırakılmaz.
- `useAddBookFlow.handleBarcodeScanned`'ın yeni offline-fallback dalı için (bu hook'un bugün hiç testi yok) en azından şu iki senaryoyu kapsayan yeni bir `useAddBookFlow.test.js` eklenir: `getBookByIsbn` reddedildiğinde ve `isOnline=false` iken `handleManualAddFromIsbn` yoluna (prefillBook = `{ isbn }`, modal açık) düştüğü; `isOnline=true` iken hâlâ `isbnLookup.error` alert'ine düştüğü (regresyon testi - bugünkü davranış bozulmasın).
- `BatchScanner`'ın `doneMessage`'ının `isOnline`'a göre değişen metni için mevcut bir component test dosyası yoksa yeni eklemeye gerek yok (kapsam dışına taşırmamak için) - ama en azından `addOrQueueBook`'un BatchScanner'a doğru prop olarak geçtiği App.jsx seviyesinde manuel/tarayıcı doğrulaması yapılır (App.jsx'in kendisi test edilemiyor, bkz. önceki ticket'ın notu).
- vite-plugin-pwa kurulumunun kendisi (manifest doğruluğu, service worker'ın gerçekten precache yaptığı, installability) **birim testleriyle değil**, `npm run build` + `npm run preview` sonrası tarayıcıda (Chrome DevTools > Application > Manifest/Service Workers sekmesi ve Lighthouse PWA denetimi) manuel doğrulanır - bu tarz bir bütünleşik/tarayıcı-native davranış vitest/jsdom ortamında anlamlı şekilde test edilemez.

## Out of Scope

- **Push notification** - Todoist görev tanımında hiç istenmedi.
- **Gerçek (tarayıcı-native) Background Sync API** - çok yeni ve tüm tarayıcılarda desteklenmiyor; bunun yerine basit "online event'inde kuyruğu dene" deseni kullanılıyor (yukarıda anlatıldığı gibi), bu yeterli kabul edildi.
- Offline'ken kitap **düzenleme veya silme** kuyruğa alınmıyor - sadece **yeni kitap ekleme** (barkod/arama/elle, tekli ve toplu) kapsanıyor. Offline'ken bir kitabı düzenlemeye/silmeye çalışmak bugünkü gibi normal hata mesajını göstermeye devam eder.
- Kuyruktaki kitapların kitaplık/raf listesinde senkronize olana kadar bir "hayalet kart" olarak önizlenmesi - kuyruktaki kitaplar senkronize olup gerçek bir DB id aldıktan sonra normal şekilde listede belirir, öncesinde sadece sayaç/banner ile bilgi verilir.
- Aynı oturumda offline'ken **birden fazla** kitap art arda eklenirse, her birinin raf konumunun (shelfRow/slotIndex) kuyruğa alma anında hesaplanıp donduğu, senkronizasyon anında yeniden hesaplanmadığı - bu, iki kuyruklu kitabın aynı raf slotuna düşüp görsel olarak çakışabileceği (veri kaybı değil, sadece kullanıcının elle sürükleyip düzeltmesi gereken bir görsel çakışma) anlamına geliyor. Kullanıcının "aynı kullanıcı, aynı cihaz, sıralı ekleme, karmaşık conflict-resolution gerekmiyor" notuyla bilinçli olarak kabul edilen bir sınırlama.
- Offline'ken **RLS/auth token süresi dolması** senaryosu (uzun süre offline kalıp token'ın expire olması, sonra sync denemesi) ayrıca ele alınmıyor - Supabase client'ın kendi token yenileme mekanizması online olunca normal şekilde devreye girer, bunun üstüne ekstra bir hata yönetimi eklenmiyor.
- `registerType: 'prompt'` + elle "yeni sürüm var" toast'ı - `autoUpdate` tercih edildiği için gerekmiyor (bkz. Implementation Decisions).
- Diğer statik varlıkların (Google Fonts, vb.) runtime cache'lenmesi - sadece Supabase (okuma), Open Library ve barkod WASM'ı kapsanıyor.

## Further Notes

- `@vite-pwa/assets-generator`'ın ürettiği ikonlar mevcut `favicon.svg`'nin marka renklerini (oklch yeşil/mor) birebir koruyacak - kaynak dosya değişmiyor, sadece PNG'ye render ediliyor. Maskable safe-zone içinde mevcut çizimin (iki üst üste binen "sayfa" şekli) nasıl göründüğü üretimden sonra görsel olarak bir kez kontrol edilmeli (araç otomatik padding uyguluyor ama nihai görünüm otomatik doğrulanmıyor).
- `useRegisterSW`'nin sağladığı `offlineReady` bayrağı (ilk kez tam precache tamamlandığında true olur) ileride basit bir "artık offline çalışabilir" bildirimi için kullanılabilir - bu ticket'ta bilinçli olarak eklenmiyor (bkz. Out of Scope, autoUpdate kararı), ama `virtual:pwa-register/react` zaten kurulu olacağı için maliyeti düşük bir gelecek iyileştirme.
- Kapsam (service worker + manifest + ikon üretimi + runtime caching + offline yazma kuyruğu) tek bir ticket için büyük - `/to-tickets` ile şuna benzer 4 parçaya bölünmesi öneriliyor (spec özetiyle birlikte sunuldu):
  1. Temel kurulum: `vite-plugin-pwa` + `generateSW` + `registerType: 'autoUpdate'` + boş/minimal manifest (installable olma kriterini karşılayan en küçük adım).
  2. İkon üretimi: `@vite-pwa/assets-generator` + `pwa-assets.config.ts` + `manifest.icons` + `apple-touch-icon` link'i.
  3. Runtime caching: Supabase REST (NetworkFirst) + Open Library (CacheFirst) + barkod WASM precache + Netlify `sw.js` header'ı - "offline'da genel kabuk/kendi kitap listeni görebilme" hikâyesi burada tamamlanıyor.
  4. Offline kitap ekleme kuyruğu: `offlineBookQueue.js` (IndexedDB) + `useOnlineStatus` callback genişletmesi + `App.jsx`/`BatchScanner`/`useAddBookFlow` entegrasyonu.
