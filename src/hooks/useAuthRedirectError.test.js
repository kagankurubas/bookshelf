import { describe, it, expect, afterEach } from 'vitest';
import { StrictMode, createElement } from 'react';
import { renderHook, act } from '@testing-library/react';
import { useAuthRedirectError } from './useAuthRedirectError';

function setHash(hash) {
  window.history.replaceState(null, '', `/${hash}`);
}

// Tarayicida ayni sekmede hash-only navigasyonu simule eder (ör. kullanici
// bu ekran zaten acikken Supabase'in dogrulama linkine tekrar tiklar) -
// history.pushState/replaceState 'hashchange' fırlatmaz, bu yuzden gercek
// bir navigasyonu taklit etmek icin hash'i elle degistirip olayi da elle
// dispatch etmemiz gerekiyor.
function navigateHashInPlace(hash) {
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new Event('hashchange'));
  });
}

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('useAuthRedirectError', () => {
  it('returns null for a plain landing (no hash), i.e. the successful sign-in redirect', () => {
    setHash('');
    const { result } = renderHook(() => useAuthRedirectError());
    expect(result.current).toBeNull();
  });

  it('returns null when the hash has no error param (e.g. Supabase session tokens)', () => {
    setHash('#access_token=abc&token_type=bearer');
    const { result } = renderHook(() => useAuthRedirectError());
    expect(result.current).toBeNull();
  });

  it('parses an expired verification link and clears the hash from the URL', () => {
    setHash('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
    const { result } = renderHook(() => useAuthRedirectError());

    expect(result.current).toEqual({
      error: 'access_denied',
      errorCode: 'otp_expired',
      errorDescription: 'Email link is invalid or has expired',
    });
    expect(window.location.hash).toBe('');
  });

  it('parses a generic access_denied error without an error_code', () => {
    setHash('#error=access_denied&error_description=Something+went+wrong');
    const { result } = renderHook(() => useAuthRedirectError());

    expect(result.current).toEqual({
      error: 'access_denied',
      errorCode: null,
      errorDescription: 'Something went wrong',
    });
  });

  // Bug repro: kullanici zaten bu ekrandayken (ör. cikis yaptiktan sonra)
  // ayni sekmede eski/suresi dolmus bir dogrulama linkine tekrar tiklarsa,
  // tarayici hash-only navigasyon yapar - tam sayfa yenilemesi olmaz, hook
  // yeniden mount olmaz. Bunu jsdom'da mount SONRASI hash'i degistirip
  // 'hashchange' dispatch ederek simule ediyoruz.
  it('picks up an expired-link error that appears in the hash AFTER the hook has already mounted, and clears it', () => {
    setHash('');
    const { result } = renderHook(() => useAuthRedirectError());
    expect(result.current).toBeNull();

    navigateHashInPlace('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');

    expect(result.current).toEqual({
      error: 'access_denied',
      errorCode: 'otp_expired',
      errorDescription: 'Email link is invalid or has expired',
    });
    expect(window.location.hash).toBe('');
  });

  it('ignores an in-place hash change that carries no error param', () => {
    setHash('');
    const { result } = renderHook(() => useAuthRedirectError());

    navigateHashInPlace('#access_token=abc&token_type=bearer');

    expect(result.current).toBeNull();
    expect(window.location.hash).toBe('#access_token=abc&token_type=bearer');
  });

  // Onceki implementasyon hash'i temizleyen bir yan etkiyi lazy useState
  // initializer'ina koymustu - initializer'in kendisi yan etki icermedigi
  // surece zararsiz olsa da, React Strict Mode'da (bkz. main.jsx) initializer
  // GELISTIRME ORTAMINDA IKI KEZ cagrilir; impure bir initializer bu yuzden
  // tutarsiz sonuc uretebiliyordu. Bu test, gercek uygulamanin sardigi
  // StrictMode altinda da tek/dogru bir sonuc alindigini dogruluyor.
  it('parses the redirect error correctly even under StrictMode double-invoking', () => {
    setHash('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
    const { result } = renderHook(() => useAuthRedirectError(), {
      wrapper: ({ children }) => createElement(StrictMode, null, children),
    });

    expect(result.current).toEqual({
      error: 'access_denied',
      errorCode: 'otp_expired',
      errorDescription: 'Email link is invalid or has expired',
    });
    expect(window.location.hash).toBe('');
  });
});
