import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDeleteAccount, WrongPasswordError } from './useDeleteAccount';
import { supabase } from '../lib/supabaseClient';

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
