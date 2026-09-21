// Kullanici offline'ken eklemeye calistigi kitaplari, baglanti gelene kadar
// tarayicida (sekme kapatilsa/yenilense bile hayatta kalacak sekilde)
// tutan basit bir FIFO kuyruk. Tek bir object store'luk minimal bir kullanim
// oldugu icin `idb` gibi bir sarmalayici gereksiz - ham `indexedDB` API'si
// dogrudan Promise'a sariliyor. src/lib/openLibrary.js ile ayni "saf fonksiyon,
// Supabase/React'tan bagimsiz" desenine uyar.
const DB_NAME = 'bookshelf-offline-queue';
const DB_VERSION = 1;
const STORE_NAME = 'pendingBooks';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // autoIncrement anahtar hem benzersiz bir id hem de ekleme sirasini
        // (FIFO) garanti eder - getAll() sonuclari varsayilan olarak anahtar
        // sirasina gore doner.
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// `run(store)` bir IDBRequest dondurur; bu request'in `.result`'u, ceviren
// islemin (transaction) `oncomplete`'i tetiklendiginde (yani veri gercekten
// diske/tarayici deposuna yazildiginda) cozulur.
async function withStore(mode, run) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      const request = run(store);
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

// Kitap alanlarini kuyruga ekler, kaydin otomatik uretilen id'sini dondurur.
//
// Cagiran taraf (App.jsx) BookModal'in state'inden gelen bookData'yi
// oldugu gibi spread'liyor - yeni bir kitap icin bu, acikca `id: undefined`
// (henuz kaydedilmemis oldugu icin) tasiyan bir alan iceriyor. `id`
// object store'un keyPath'i oldugu ve store autoIncrement kullandigi
// icin, GERCEKTEN eksik bir `id` alaninda otomatik anahtar uretimi
// calisirken, acikca `id: undefined` OLAN bir alanda IndexedDB "not a
// valid key" hatasi firlatiyor (Chromium bu ikisini ayirt ediyor). Bu
// yuzden `id` burada bilincli olarak atiliyor - cagiranin bunu
// temizlemesine guvenilmiyor.
export function enqueueBook(bookFields) {
  const fieldsWithoutId = { ...bookFields };
  delete fieldsWithoutId.id;
  return withStore('readwrite', (store) => store.add(fieldsWithoutId));
}

// Kuyruktaki tum kayitlari, eklenme sirasiyla (FIFO) dondurur. Her kayit,
// orijinal alanlarin yaninda otomatik uretilen bir `id` alani da tasir.
export function getQueuedBooks() {
  return withStore('readonly', (store) => store.getAll());
}

// Basariyla senkronize edilmis (veya artik gerek kalmamis) bir kaydi
// kuyruktan siler.
export function removeQueuedBook(id) {
  return withStore('readwrite', (store) => store.delete(id));
}
