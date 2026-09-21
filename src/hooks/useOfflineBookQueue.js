import { useEffect, useRef, useState } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { useAddOrQueueBook } from './useAddOrQueueBook';
import { enqueueBook, getQueuedBooks, removeQueuedBook } from '../lib/offlineBookQueue';

// Offline kitap ekleme kuyrugunun tum orkestrasyonunu (App.jsx'e gomulu
// kalirsa hem kitaplik/raf mantigiyla ilgisiz bir ikinci degisim nedeni
// olurdu hem de test edilemezdi) tek bir yerde toplar: kuyrukta bekleyen
// kayit sayisi, kayitlari sirayla (paralel degil) senkronize eden flush
// islemi, ve online/offline durumuna gore "dogrudan ekle vs kuyrukla"
// karari.
//
// `addBook`: online'ken tek bir kitabi hemen eklemek icin (stats'i kendi
// tazeler). `addBookForSync`: flush sirasinda N kitap icin N kez stats
// tazelemesin diye stats-siz varyant - dongu bitince `refreshStats` bir
// kez cagrilir. `isReady`, kitaplik verisi (activeLibraryId) henuz
// yuklenmemisken flush denenmesin diye disaridan kontrol edilir.
export function useOfflineBookQueue({ addBook, addBookForSync, refreshStats, isReady }) {
  const [queuedCount, setQueuedCount] = useState(0);

  const refreshQueuedCount = () => {
    getQueuedBooks()
      .then((queued) => setQueuedCount(queued.length))
      .catch((err) => console.error(err));
  };

  // Kayitlari sirayla (paralel degil) dener; her biri basarili olur olmaz
  // HEMEN IndexedDB'den siler (toplu silme degil) - senkronizasyon yarida
  // kesilirse kalan kayitlar guvende kalir. Bir oge basarisiz olursa dongu
  // durur, kalanlar kuyrukta kalip bir sonraki online gecisinde tekrar
  // denenir.
  const flushQueuedBooks = async () => {
    const queued = await getQueuedBooks();
    let addedAny = false;
    for (const queuedBook of queued) {
      const { id, ...fields } = queuedBook;
      try {
        await addBookForSync(fields);
        await removeQueuedBook(id);
        addedAny = true;
      } catch (err) {
        console.error(err);
        break;
      }
    }
    if (addedAny) {
      refreshStats();
    }
    refreshQueuedCount();
  };

  // useOnlineStatus, cagirani her render'da yeni bir onOnline closure'i
  // (bu render'daki guncel addBookForSync/refreshStats'i yakalayan
  // flushQueuedBooks'u) gecirse de, gercek 'offline'->'online' gecisinde
  // HER ZAMAN EN GUNCEL closure'i cagirir (bkz. useOnlineStatus.js - bir
  // ref uzerinden). Bu sayede senkronizasyon bayat/yuklenmemis kitaplik
  // verisiyle calismaz.
  const isOnline = useOnlineStatus(() => {
    flushQueuedBooks();
  });

  // Kuyruk-veya-ekle karari (isOnline bayragina bakarak, bir yazmayi
  // deneyip hata tipini yorumlamak yerine) izole/test edilebilir bir
  // yardimciya (useAddOrQueueBook) dayanir; burada sadece kuyruga
  // dusen ekleme sonrasi sayaci tazeliyoruz.
  const addOrQueueBookRaw = useAddOrQueueBook({ isOnline, addBook, enqueueBook });
  const addOrQueueBook = async (fields) => {
    const outcome = await addOrQueueBookRaw(fields);
    if (outcome?.queued) {
      refreshQueuedCount();
    }
    return outcome;
  };

  // Uygulama offline'ken kapatilip sonra ONLINE'ken tekrar acilirsa 'online'
  // event'i hic ateslenmez (tarayici zaten online) - bu yuzden `isReady`
  // ilk true oldugu anda (kitaplik verisi hazir oldugunda) ayrica bir kez
  // kontrol ediyoruz. flushQueuedBooks'u bilincli olarak deps'e eklemedik -
  // her render'da yeniden olusan bir closure, ama biz zaten sadece
  // hasFlushedOnLoadRef ile korunan TEK bir cagriyi (verinin ilk hazir
  // oldugu andaki en guncel closure'i) istiyoruz.
  const hasFlushedOnLoadRef = useRef(false);
  useEffect(() => {
    if (!isReady) return;
    if (hasFlushedOnLoadRef.current) return;
    hasFlushedOnLoadRef.current = true;
    if (navigator.onLine) {
      flushQueuedBooks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  // Kuyrukta onceki bir oturumdan kalan kayit varsa, banner'in dogru sayiyi
  // ilk render'dan itibaren gosterebilmesi icin acilista bir kez okunur.
  useEffect(() => {
    refreshQueuedCount();
  }, []);

  return { isOnline, queuedCount, addOrQueueBook };
}
