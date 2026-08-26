import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabaseClient';

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

// onAuthStateChange'in gercek supabase davranisini taklit eder: callback'i saklar,
// disardan (trigger) tetiklenebilir kilar. signIn/signOut kendileri state
// guncellemez - gercek uygulamada session degisikligi bu callback'ten gelir.
function mockAuthStateChange() {
  let capturedCallback;
  supabase.auth.onAuthStateChange.mockImplementation((cb) => {
    capturedCallback = cb;
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });
  return { trigger: (event, session) => capturedCallback(event, session) };
}

async function renderSignedOut() {
  supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
  const { trigger } = mockAuthStateChange();
  const hook = renderHook(() => useAuth());
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return { ...hook, trigger };
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs the user in: signIn calls supabase, and the resulting session updates the hook state', async () => {
    const { result, trigger } = await renderSignedOut();
    supabase.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });

    await result.current.signIn('a@test.com', 'pw');
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@test.com', password: 'pw' });

    const session = { user: { id: 'u1', email: 'a@test.com' } };
    act(() => trigger('SIGNED_IN', session));

    expect(result.current.user).toEqual(session.user);
  });

  it('signIn throws and leaves the user signed out when supabase rejects the credentials', async () => {
    const { result } = await renderSignedOut();
    supabase.auth.signInWithPassword.mockResolvedValue({ data: null, error: new Error('invalid credentials') });

    await expect(result.current.signIn('a@test.com', 'wrong')).rejects.toThrow('invalid credentials');
    expect(result.current.user).toBeNull();
  });

  it('logs the user out: signOut calls supabase, and the resulting session clears the hook state', async () => {
    const { result, trigger } = await renderSignedOut();
    act(() => trigger('SIGNED_IN', { user: { id: 'u1' } }));
    expect(result.current.user).toEqual({ id: 'u1' });

    supabase.auth.signOut.mockResolvedValue({ error: null });
    await result.current.signOut();
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);

    act(() => trigger('SIGNED_OUT', null));
    expect(result.current.user).toBeNull();
  });

  it('signOut throws when supabase returns an error', async () => {
    const { result } = await renderSignedOut();
    supabase.auth.signOut.mockResolvedValue({ error: new Error('network error') });

    await expect(result.current.signOut()).rejects.toThrow('network error');
  });
});
