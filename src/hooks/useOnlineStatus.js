import { useEffect, useState } from 'react';

// Tarayicinin/isletim sisteminin bildirdigi ag arayuzu durumunu yansitir -
// gercek internet erisimini degil (ör. bagli ama internetsiz bir agda hatali
// 'true' donebilir), bu bilinen bir platform sinirlamasi.
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
