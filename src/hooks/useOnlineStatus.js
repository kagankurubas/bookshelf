import { useEffect, useRef, useState } from 'react';

// Tarayicinin/isletim sisteminin bildirdigi ag arayuzu durumunu yansitir -
// gercek internet erisimini degil (ör. bagli ama internetsiz bir agda hatali
// 'true' donebilir), bu bilinen bir platform sinirlamasi.
//
// Opsiyonel `onOnline` callback'i, tarayici 'offline'dan 'online'a GECTIGI
// anda (mount aninda zaten online olma durumunda degil, sadece gercek bir
// gecişte) bir kez cagrilir - offline kuyrugu senkronizasyonu gibi
// "baglanti geri geldi" tetikleyicileri icin. Mevcut parametresiz cagri
// (`useOnlineStatus()`) geriye donuk uyumlu kalir.
//
// `onOnline` bir ref'te tutulup her render sonrasi guncelleniyor - asagidaki
// 'online' event listener'i mount'ta BIR KEZ kaydediliyor (bagimlilik dizisi
// bos), yani App.jsx her render'da yeni bir `onOnline` closure'i (guncel
// `library`/state'i yakalayan) geçse bile, event gercekten ateslendiginde
// listener'in kendisi eski/ilk render'daki closure'i degil, ref uzerinden
// HER ZAMAN EN GUNCEL callback'i cagirir. Bu ref olmadan, kuyruk
// senkronizasyonu ilk render'daki (henuz kitaplik verisi yuklenmemis)
// bayat bir closure'i calistirirdi.
export function useOnlineStatus(onOnline) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const onOnlineRef = useRef(onOnline);

  useEffect(() => {
    onOnlineRef.current = onOnline;
  });

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      onOnlineRef.current?.();
    };
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
