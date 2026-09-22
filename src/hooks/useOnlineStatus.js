import { useEffect, useRef, useState } from 'react';

// Reflects the network interface status reported by the browser/OS - not
// actual internet reachability (e.g. can wrongly report 'true' on a network
// that's connected but has no internet), a known platform limitation.
//
// The optional `onOnline` callback fires once, exactly when the browser
// transitions from 'offline' to 'online' (not when already online at
// mount) - for "connection is back" triggers like offline-queue sync. The
// existing no-argument call (`useOnlineStatus()`) stays backward compatible.
//
// `onOnline` is kept in a ref and updated after every render - the 'online'
// event listener below is registered ONCE at mount (empty dependency
// array), so even though App.jsx passes a new `onOnline` closure (capturing
// current `library`/state) on every render, the listener always calls the
// LATEST callback via the ref when the event actually fires, not the
// stale one from the first render. Without this ref, offline-queue sync
// would run against a stale closure from the first render (before library
// data had loaded).
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
