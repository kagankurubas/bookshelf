import { useEffect, useState } from 'react';

// Supabase, dogrulama/parola-sifirlama linki gecersizse (suresi dolmus,
// zaten kullanilmis vb.) kullaniciyi yine emailRedirectTo'ya yonlendirir
// ama basari verileri yerine URL hash'ine error/error_code/error_description
// ekler. Router olmadigi icin bu hash'i uygulamanin kok bileseninde
// yakalayip anlasilir bir mesaja cevirmemiz gerekiyor.
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
  // Lazy initializer: SADECE okur, yan etkisi yok - bu yuzden React'in
  // Strict Mode'da initializer'i iki kez cagirmasi (bkz. React useState
  // dokumantasyonu, "initializer function runs twice") sorun yaratmaz, her
  // iki cagri da ayni sonucu dondurur. Onceki surumde bu initializer
  // history.replaceState de cagiriyordu (yan etkili/impure) - iki kez
  // cagrildiginda ikinci cagri hash'i zaten temizlenmis buluyor ve null
  // donduruyordu, boylece hata bazen kayboluyordu.
  const [redirectError, setRedirectError] = useState(() => parseRedirectError(window.location.hash));

  useEffect(() => {
    // Lazy initializer'in okudugu hata hala URL'deyse (taze sayfa
    // yuklemesi durumu) burada temizle - initializer icinde degil, cunku
    // initializer'in Strict Mode'da iki kez cagrilmasi bu yan etkiyi de
    // ikiye katlardi.
    if (parseRedirectError(window.location.hash)) clearHash();

    // Kullanici zaten acik olan bu sekmede Supabase'in dogrulama linkine
    // TEKRAR tiklarsa (ör. logout sonrasi ayni sekmeden eski linke donmek):
    // hedef URL sadece hash'te farklilastigi icin tarayici TAM SAYFA
    // YENILEMESI yapmaz, sadece 'hashchange' olayi fırlatir - component
    // yeniden mount olmaz, lazy initializer bir daha calismaz. Bu dinleyici
    // olmadan sonraki hatalar hic islenmez ve hash de hic temizlenmez
    // (bildirilen bug tam olarak buydu).
    const handleHashChange = () => {
      const next = parseRedirectError(window.location.hash);
      if (!next) return;
      setRedirectError(next);
      clearHash();
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return redirectError;
}
