import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDeleteAccount, WrongPasswordError } from './useDeleteAccount';
import { supabase } from '../lib/supabaseClient';
import { clearQueue } from '../lib/offlineBookQueue';

vi.mock('../lib/offlineBookQueue', () => ({ clearQueue: vi.fn(() => Promise.resolve()) }));

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    functions: { invoke: vi.fn() },
  },
}));

describe('useDeleteAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls the delete-account edge function and signs the user out when no password is given', async () => {
    supabase.functions.invoke.mockResolvedValue({ data: { success: true }, error: null });
    supabase.auth.signOut.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useDeleteAccount());

    await act(async () => {
      await result.current.deleteAccount('a@test.com');
    });

    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(supabase.functions.invoke).toHaveBeenCalledWith('delete-account');
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
    expect(result.current.isDeleting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('verifies the password first, then deletes and signs out when a password is given', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
    supabase.functions.invoke.mockResolvedValue({ data: { success: true }, error: null });
    supabase.auth.signOut.mockResolvedValue({ error: null });

    const { result } = renderHook(() => useDeleteAccount());

    await act(async () => {
      await result.current.deleteAccount('a@test.com', { password: 'right-pw' });
    });

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@test.com', password: 'right-pw' });
    expect(supabase.functions.invoke).toHaveBeenCalledWith('delete-account');
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it('throws a WrongPasswordError and never calls the edge function when the password is wrong', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ data: null, error: new Error('invalid credentials') });

    const { result } = renderHook(() => useDeleteAccount());

    await expect(result.current.deleteAccount('a@test.com', { password: 'wrong-pw' })).rejects.toBeInstanceOf(WrongPasswordError);

    expect(supabase.functions.invoke).not.toHaveBeenCalled();
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.error).toBeInstanceOf(WrongPasswordError));
  });

  it('sets the error state and does not sign out when the edge function call fails', async () => {
    supabase.functions.invoke.mockResolvedValue({ data: null, error: new Error('Unauthorized') });

    const { result } = renderHook(() => useDeleteAccount());

    await expect(result.current.deleteAccount('a@test.com')).rejects.toThrow('Unauthorized');

    expect(supabase.auth.signOut).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.isDeleting).toBe(false);
  });

  it('sets the error state when the edge function responds 200 but with a structured API error', async () => {
    supabase.functions.invoke.mockResolvedValue({ data: { error: 'Internal error' }, error: null });

    const { result } = renderHook(() => useDeleteAccount());

    await expect(
      act(async () => {
        await result.current.deleteAccount('a@test.com');
      })
    ).rejects.toThrow('Internal error');

    expect(supabase.auth.signOut).not.toHaveBeenCalled();
  });
});

describe('useDeleteAccount cached data', () => {
  let order;

  beforeEach(() => {
    vi.clearAllMocks();
    order = [];
    vi.stubGlobal('caches', { delete: vi.fn(async (name) => { order.push(`clear:${name}`); return true; }) });
    supabase.auth.signOut.mockImplementation(async () => { order.push('signOut'); return { error: null }; });
    clearQueue.mockImplementation(async () => { order.push('clearQueue'); });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('clears the cached REST reads and the offline queue before signing out after a successful deletion', async () => {
    supabase.functions.invoke.mockResolvedValue({ data: { success: true }, error: null });
    const { result } = renderHook(() => useDeleteAccount());

    await act(async () => {
      await result.current.deleteAccount('a@test.com');
    });

    expect(order).toEqual(['clear:supabase-rest-cache', 'clearQueue', 'signOut']);
  });

  it('still signs out when clearing the offline queue fails', async () => {
    supabase.functions.invoke.mockResolvedValue({ data: { success: true }, error: null });
    clearQueue.mockImplementation(async () => { throw new Error('idb unavailable'); });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useDeleteAccount());

    await act(async () => {
      await result.current.deleteAccount('a@test.com');
    });

    expect(order).toEqual(['clear:supabase-rest-cache', 'signOut']);
    console.error.mockRestore();
  });

  it('keeps the cache and the offline queue when the deletion fails', async () => {
    supabase.functions.invoke.mockResolvedValue({ data: null, error: new Error('boom') });
    const { result } = renderHook(() => useDeleteAccount());

    await act(async () => {
      await result.current.deleteAccount('a@test.com').catch(() => {});
    });

    expect(order).toEqual([]);
  });
});
