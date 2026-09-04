import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingsModal from './SettingsModal';

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: { signInWithPassword: vi.fn(), signOut: vi.fn() },
    functions: { invoke: vi.fn() },
  },
}));

function renderModal(overrides = {}) {
  const handlers = {
    userEmail: 'a@test.com',
    onClose: vi.fn(),
    onAccountDeleted: vi.fn(),
    ...overrides,
  };
  render(<SettingsModal {...handlers} />);
  return handlers;
}

describe('SettingsModal', () => {
  it('shows the signed-in account email and the danger zone', () => {
    renderModal();
    expect(screen.getByText('a@test.com')).toBeInTheDocument();
    expect(screen.getByText('Tehlikeli Bölge')).toBeInTheDocument();
  });

  it('opens the delete-account confirmation modal when the danger button is clicked', () => {
    renderModal();
    expect(screen.queryByText('Hesabını Sil')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hesabımı Sil' }));

    expect(screen.getByText('Hesabını Sil')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const handlers = renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Kapat' }));
    expect(handlers.onClose).toHaveBeenCalledTimes(1);
  });
});
