import { useCallback, useEffect, useState } from 'react';

// If a verification/password-reset link is invalid (expired, already used,
// etc), Supabase still redirects to emailRedirectTo, but appends
// error/error_code/error_description to the URL hash instead of success
// data. There's no router, so we catch this hash in the app's root
// component and turn it into a readable message.
function parseRedirectError(hash) {
  if (!hash || hash.length < 2) return null;

  const params = new URLSearchParams(hash.slice(1));
  const error = params.get('error');
  if (!error) return null;

  return {
    error,
    errorCode: params.get('error_code'),
    errorDescription: params.get('error_description'),
  };
}

function clearHash() {
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
}

export function useAuthRedirectError() {
  // Lazy initializer: read-only, no side effects - so React calling it
  // twice in Strict Mode (see the useState docs, "initializer function runs
  // twice") is harmless, both calls return the same result. A prior
  // version also called history.replaceState here (impure); calling it
  // twice made the second call find the hash already cleared and return
  // null, so the error sometimes disappeared.
  const [redirectError, setRedirectError] = useState(() => parseRedirectError(window.location.hash));

  useEffect(() => {
    // If the error the lazy initializer read is still in the URL (fresh
    // page load), clear it here rather than in the initializer, since
    // Strict Mode calling the initializer twice would double this side
    // effect too.
    if (parseRedirectError(window.location.hash)) clearHash();

    // If the user clicks Supabase's verification link AGAIN while already
    // on this tab (e.g. returning to an old link after logout), the target
    // URL only differs in the hash, so the browser does NOT do a full page
    // reload - it only fires 'hashchange'. The component doesn't remount,
    // so the lazy initializer never runs again. Without this listener,
    // later errors are never processed and the hash is never cleared
    // (exactly the reported bug).
    const handleHashChange = () => {
      const next = parseRedirectError(window.location.hash);
      if (!next) return;
      setRedirectError(next);
      clearHash();
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // This state lives for the whole tab session without a refresh - it
  // isn't cleared just because the user logs in and keeps using the app
  // after seeing the error from an invalid link. So if the same screen
  // (AuthScreen) needs to show another, conflicting notice (e.g. account
  // deletion success), the caller must be able to explicitly clear this
  // stale/unrelated error.
  const clearRedirectError = useCallback(() => setRedirectError(null), []);

  return [redirectError, clearRedirectError];
}
