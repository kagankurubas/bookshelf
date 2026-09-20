import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

describe('SettingsModal veri (export) section', () => {
  const books = [
    {
      id: 'book-1',
      title: 'Dune',
      author: 'Frank Herbert',
      status: 'Tamamlandı',
      rating: 5,
      libraryIds: ['lib-1'],
      notesList: [],
    },
  ];
  const libraries = [{ id: 'lib-1', name: 'Ana Kitaplık' }];

  let createObjectURLSpy;
  let revokeObjectURLSpy;
  let clickSpy;

  beforeEach(() => {
    createObjectURLSpy = vi.fn(() => 'blob:mock-url');
    revokeObjectURLSpy = vi.fn();
    URL.createObjectURL = createObjectURLSpy;
    URL.revokeObjectURL = revokeObjectURLSpy;
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    clickSpy.mockRestore();
  });

  it('shows the data section with CSV and JSON download buttons', () => {
    renderModal({ books, libraries });
    expect(screen.getByText('Veri')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /CSV olarak indir/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /JSON olarak indir/ })).toBeInTheDocument();
  });

  it('triggers a CSV download when the CSV button is clicked', () => {
    renderModal({ books, libraries });
    fireEvent.click(screen.getByRole('button', { name: /CSV olarak indir/ }));

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    const blobArg = createObjectURLSpy.mock.calls[0][0];
    expect(blobArg.type).toContain('text/csv');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
  });

  it('triggers a JSON download when the JSON button is clicked', () => {
    renderModal({ books, libraries });
    fireEvent.click(screen.getByRole('button', { name: /JSON olarak indir/ }));

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    const blobArg = createObjectURLSpy.mock.calls[0][0];
    expect(blobArg.type).toContain('application/json');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
  });
});
