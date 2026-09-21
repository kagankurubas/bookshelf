# 04: Offline kitap ekleme kuyruğu

**What to build:** Kullanıcı offline'ken (barkod, arama veya elle) yeni bir kitap eklemeye çalıştığında, bu ekleme başarısız olup hata göstermek yerine IndexedDB'de bir kuyruğa alınır; bağlantı geri geldiğinde sırayla (FIFO) otomatik senkronize edilir. Barkod tarama akışında, Open Library'ye offline olduğu için ulaşılamadığında kullanıcı otomatik olarak elle-giriş formuna yönlendirilir. Bu ticket, `01`/`02`/`03`'teki service worker/manifest kurulumundan bağımsızdır (saf uygulama mantığı, PWA kurulu olmasa da çalışır) - paralel olarak başlanabilir.

**Blocked by:** None (can start immediately; `useOnlineStatus`/`openLibrary.js` zaten mevcut bir önceki ticket'tan)

**Status:** ready-for-agent

- [ ] Yeni `src/lib/offlineBookQueue.js`: ham `indexedDB` API'siyle tek bir `pendingBooks` object store; `enqueueBook(bookFields)`, `getQueuedBooks()`, `removeQueuedBook(id)` fonksiyonları - Supabase/React'tan bağımsız, saf
- [ ] `src/hooks/useOnlineStatus.js`'e opsiyonel `onOnline` callback parametresi eklendi: `offline`→`online` geçişinde (sadece geçişte, mount anında zaten online ise tetiklenmeden) çağrılıyor; mevcut parametresiz çağrı (`useOnlineStatus()`, `App.jsx`) geriye dönük uyumlu çalışmaya devam ediyor
- [ ] `App.jsx`'te yeni bir `addOrQueueBook(fields)` sarmalayıcısı: `isOnline === true` ise doğrudan `library.addBook(fields)`'i çağırıyor (davranış değişmiyor); `false` ise `enqueueBook(fields)` ile kuyruğa yazıp optimistik başarı dönüyor - bir yazma denenip hata tipine bakılmıyor, karar tıklama anındaki `isOnline` bayrağına dayanıyor
- [ ] `handleSaveBook` (BookModal "Kaydet" - tekli barkod/arama/elle akışlarının hepsi) yeni kitap eklerken `addOrQueueBook` kullanıyor
- [ ] `BatchScanner`'a geçirilen `addBook` prop'u `library.addBookWithoutStatsRefresh`'ten `addOrQueueBook`'a değiştirildi - `BatchScanner`'ın kendi kodunda yeni bir online/offline dalı YOK, sadece hangi fonksiyonun çağrıldığı değişti
- [ ] `useAddBookFlow`'a `isOnline` parametresi eklendi; `handleBarcodeScanned` içinde `getBookByIsbn` hata fırlattığında ve `isOnline === false` ise `handleManualAddFromIsbn(isbn)` çağrılıyor (bugünkü `isbnLookup.error` alert'i yerine); `isOnline === true` iken hâlâ hata olursa davranış değişmiyor (regresyon yok)
- [ ] Uygulama açılışında VE her `onOnline` tetiklenişinde: kuyruktaki kayıtlar sırayla (bir döngüyle, paralel değil) `library.addBookWithoutStatsRefresh` ile ekleniyor; her biri başarılı olur olmaz o kayıt hemen IndexedDB'den siliniyor (toplu silme değil); bir öğe başarısız olursa döngü duruyor, kalanlar kuyrukta kalıyor; döngü sonunda (en az bir öğe eklendiyse) `library.refreshStats()` bir kez çağrılıyor
- [ ] Mevcut `.offline-banner` metni, kuyrukta bekleyen kitap sayısı > 0 ise bunu da belirtecek şekilde koşullu genişletildi (ör. "... N kitap bağlantı gelince eklenecek")
- [ ] `BatchScanner`'ın `doneMessage`'ı, kaydetme anında offline ise "N kitap eklendi" yerine "N kitap bağlantı gelince eklenecek" gösteriyor
- [ ] `src/lib/offlineBookQueue.test.js`: `fake-indexeddb/auto` (yeni devDependency) sadece bu dosyada import edilerek, `enqueueBook`/`getQueuedBooks`/`removeQueuedBook`'un temel CRUD'u, FIFO sırası ve bir kaydı sildikten sonra diğerlerinin etkilenmediği mock'suz test edildi
- [ ] `useOnlineStatus.test.js` (yeni veya genişletilmiş): `onOnline`'ın sadece `offline→online` geçişinde bir kez çağrıldığı, zaten online iken mount'ta çağrılmadığı doğrulandı
- [ ] `addOrQueueBook` mantığı, App.jsx'e gömülü test edilemeyen bir closure olarak bırakılmadı - saf/izole test edilebilir bir yardımcı olarak çıkarılıp birim testiyle kapsandı
- [ ] Yeni `useAddBookFlow.test.js`: `getBookByIsbn` reddedildiğinde ve `isOnline=false` iken `handleManualAddFromIsbn` yoluna (prefillBook = `{ isbn }`, modal açık) düştüğü; `isOnline=true` iken hâlâ `isbnLookup.error` alert'ine düştüğü (regresyon) test edildi
- [ ] Manuel doğrulama: Chrome DevTools → Network → Offline işaretliyken barkod tarat (veya elle "Kitap Ekle"), kitabı kaydet, offline banner'ında "N kitap bağlantı gelince eklenecek" görünüyor; Offline işaretini kaldırınca (Online'a dön) kitabın otomatik olarak gerçek kitaplığa eklendiği ve banner'ın güncellendiği doğrulandı
- [ ] Mevcut `npm test` ve `npm run lint` değişmeden geçmeye devam ediyor
