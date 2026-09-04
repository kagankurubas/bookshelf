import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DeleteAccountModal from './DeleteAccountModal';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    functions: { invoke: vi.fn() },
  },
}));

function renderModal(overrides = {}) {
  const handlers = {
    email: 'a@test.com',
    onClose: vi.fn(),
    onDeleted: vi.fn(),
    ...overrides,
  };
  render(<DeleteAccountModal {...handlers} />);
  return handlers;
}

describe('DeleteAccountModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the confirm button disabled until the exact confirmation word is typed', () => {
    renderModal();
    const submitBtn = screen.getByRole('button', { name: 'Hesabımı Kalıcı Olarak Sil' });
    expect(submitBtn).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Onaylamak için "SİL" yaz'), { target: { value: 'sil' } });
    expect(submitBtn).toBeEnabled();
  });

  it('rejects an incorrect confirmation phrase and does not call the edge function', async () => {
    const handlers = renderModal();
    const submitBtn = screen.getByRole('button', { name: 'Hesabımı Kalıcı Olarak Sil' });

    fireEvent.change(screen.getByPlaceholderText('Onaylamak için "SİL" yaz'), { target: { value: 'evet sil' } });
    expect(submitBtn).toBeDisabled();
    fireEvent.click(submitBtn);

    expect(supabase.functions.invoke).not.toHaveBeenCalled();
    expect(handlers.onDeleted).not.toHaveBeenCalled();
  });

  it('deletes the account and reports success once the confirmation word matches', async () => {
    supabase.functions.invoke.mockResolvedValue({ data: { success: true }, error: null });
    supabase.auth.signOut.mockResolvedValue({ error: null });
    const handlers = renderModal();

    fireEvent.change(screen.getByPlaceholderText('Onaylamak için "SİL" yaz'), { target: { value: 'SİL' } });
    fireEvent.click(screen.getByRole('button', { name: 'Hesabımı Kalıcı Olarak Sil' }));

    await waitFor(() => expect(handlers.onDeleted).toHaveBeenCalledTimes(1));
    expect(supabase.functions.invoke).toHaveBeenCalledWith('delete-account');
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
  });

  it('shows an error message and keeps the modal open when the edge function fails', async () => {
    supabase.functions.invoke.mockResolvedValue({ data: null, error: new Error('Unauthorized') });
    const handlers = renderModal();

    fireEvent.change(screen.getByPlaceholderText('Onaylamak için "SİL" yaz'), { target: { value: 'SİL' } });
    fireEvent.click(screen.getByRole('button', { name: 'Hesabımı Kalıcı Olarak Sil' }));

    expect(await screen.findByText('Hesap silinirken bir hata oluştu. Lütfen tekrar dene.')).toBeInTheDocument();
    expect(handlers.onDeleted).not.toHaveBeenCalled();
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
  });

  it('shows a wrong-password message in password mode and never calls the edge function', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ data: null, error: new Error('invalid credentials') });
    const handlers = renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Şifreyle onayla' }));
    fireEvent.change(screen.getByPlaceholderText('Şifre'), { target: { value: 'wrong-pw' } });
    fireEvent.click(screen.getByRole('button', { name: 'Hesabımı Kalıcı Olarak Sil' }));

    expect(await screen.findByText('Şifre yanlış.')).toBeInTheDocument();
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
    expect(handlers.onDeleted).not.toHaveBeenCalled();
  });
});
