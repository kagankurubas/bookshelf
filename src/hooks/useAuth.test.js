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
// disardan (trigger) tetiklenebilir kilar ve unsubscribe cagrisini izlenebilir yapar.
function mockAuthStateChange() {
  const unsubscribe = vi.fn();
  let capturedCallback;
  supabase.auth.onAuthStateChange.mockImplementation((cb) => {
    capturedCallback = cb;
    return { data: { subscription: { unsubscribe } } };
  });
  return { unsubscribe, trigger: (event, session) => capturedCallback(event, session) };
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts loading and resolves to no user when there is no session', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    mockAuthStateChange();

    const { result } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it('exposes the signed-in user from the initial session', async () => {
    const session = { user: { id: 'u1', email: 'a@test.com' } };
    supabase.auth.getSession.mockResolvedValue({ data: { session } });
    mockAuthStateChange();

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user).toEqual(session.user);
  });

  it('updates session/user when the auth state change listener fires', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    const { trigger } = mockAuthStateChange();

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const newSession = { user: { id: 'u2', email: 'b@test.com' } };
    act(() => trigger('SIGNED_IN', newSession));

    expect(result.current.user).toEqual(newSession.user);
    expect(result.current.session).toEqual(newSession);
  });

  it('unsubscribes from auth changes on unmount', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    const { unsubscribe } = mockAuthStateChange();

    const { unmount, result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('signIn calls signInWithPassword with the credentials and returns its data', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    mockAuthStateChange();
    const data = { user: { id: 'u1' } };
    supabase.auth.signInWithPassword.mockResolvedValue({ data, error: null });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const returned = await result.current.signIn('a@test.com', 'pw');
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@test.com', password: 'pw' });
    expect(returned).toEqual(data);
  });

  it('signIn throws when supabase returns an error', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    mockAuthStateChange();
    supabase.auth.signInWithPassword.mockResolvedValue({ data: null, error: new Error('invalid credentials') });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(result.current.signIn('a@test.com', 'wrong')).rejects.toThrow('invalid credentials');
  });

  it('signUp calls supabase.auth.signUp with the credentials and returns its data', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    mockAuthStateChange();
    const data = { user: { id: 'new' } };
    supabase.auth.signUp.mockResolvedValue({ data, error: null });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const returned = await result.current.signUp('new@test.com', 'pw');
    expect(supabase.auth.signUp).toHaveBeenCalledWith({ email: 'new@test.com', password: 'pw' });
    expect(returned).toEqual(data);
  });

  it('signOut throws when supabase returns an error', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    mockAuthStateChange();
    supabase.auth.signOut.mockResolvedValue({ error: new Error('network error') });

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(result.current.signOut()).rejects.toThrow('network error');
  });
});
