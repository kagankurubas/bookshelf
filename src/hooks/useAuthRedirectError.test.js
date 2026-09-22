import { describe, it, expect, afterEach } from 'vitest';
import { StrictMode, createElement } from 'react';
import { renderHook, act } from '@testing-library/react';
import { useAuthRedirectError } from './useAuthRedirectError';

function setHash(hash) {
  window.history.replaceState(null, '', `/${hash}`);
}

// Simulates same-tab, hash-only navigation in the browser (e.g. the user
// clicks Supabase's verification link again while this screen is already
// open) - history.pushState/replaceState don't fire 'hashchange', so we
// change the hash and dispatch the event manually to mimic a real
// navigation.
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
    expect(result.current[0]).toBeNull();
  });

  it('returns null when the hash has no error param (e.g. Supabase session tokens)', () => {
    setHash('#access_token=abc&token_type=bearer');
    const { result } = renderHook(() => useAuthRedirectError());
    expect(result.current[0]).toBeNull();
  });

  it('parses an expired verification link and clears the hash from the URL', () => {
    setHash('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
    const { result } = renderHook(() => useAuthRedirectError());

    expect(result.current[0]).toEqual({
      error: 'access_denied',
      errorCode: 'otp_expired',
      errorDescription: 'Email link is invalid or has expired',
    });
    expect(window.location.hash).toBe('');
  });

  it('parses a generic access_denied error without an error_code', () => {
    setHash('#error=access_denied&error_description=Something+went+wrong');
    const { result } = renderHook(() => useAuthRedirectError());

    expect(result.current[0]).toEqual({
      error: 'access_denied',
      errorCode: null,
      errorDescription: 'Something went wrong',
    });
  });

  // Bug repro: if the user, already on this screen (e.g. after logging
  // out), clicks an old/expired verification link again in the same tab,
  // the browser does a hash-only navigation - no full reload, the hook
  // doesn't remount. Simulated here by changing the hash AFTER mount in
  // jsdom and dispatching 'hashchange'.
  it('picks up an expired-link error that appears in the hash AFTER the hook has already mounted, and clears it', () => {
    setHash('');
    const { result } = renderHook(() => useAuthRedirectError());
    expect(result.current[0]).toBeNull();

    navigateHashInPlace('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');

    expect(result.current[0]).toEqual({
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

    expect(result.current[0]).toBeNull();
    expect(window.location.hash).toBe('#access_token=abc&token_type=bearer');
  });

  // A prior implementation put the hash-clearing side effect in the lazy
  // useState initializer - harmless as long as the initializer itself has
  // no side effects, but React Strict Mode (see main.jsx) calls the
  // initializer TWICE in development; an impure initializer produced
  // inconsistent results. This test verifies a single correct result is
  // still obtained under the StrictMode the real app wraps itself in.
  it('parses the redirect error correctly even under StrictMode double-invoking', () => {
    setHash('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
    const { result } = renderHook(() => useAuthRedirectError(), {
      wrapper: ({ children }) => createElement(StrictMode, null, children),
    });

    expect(result.current[0]).toEqual({
      error: 'access_denied',
      errorCode: 'otp_expired',
      errorDescription: 'Email link is invalid or has expired',
    });
    expect(window.location.hash).toBe('');
  });

  // Bug repro: after account deletion, useAuthRedirectError's state kept
  // holding a stale/unrelated error read elsewhere on the tab, and it
  // overlapped with the deletion success message on AuthScreen. The caller
  // (App) must be able to clear it explicitly via clearRedirectError().
  it('clears the redirect error via clearRedirectError, e.g. right before showing an unrelated notice', () => {
    setHash('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
    const { result } = renderHook(() => useAuthRedirectError());
    expect(result.current[0]).not.toBeNull();

    act(() => result.current[1]());

    expect(result.current[0]).toBeNull();
  });
});
