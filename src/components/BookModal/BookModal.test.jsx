import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BookModal from './BookModal';

function selectedBook(overrides = {}) {
  return {
    id: 'b1',
    title: 'Suç ve Ceza',
    author: 'Dostoyevski',
    publisher: '',
    rating: 0,
    category: 'Klasik Edebiyat',
    tags: [],
    status: 'Okunuyor',
    dateStarted: '',
    dateFinished: '',
    coverImage: '',
    isbn: '',
    pageCount: null,
    notesList: [],
    libraryIds: ['lib-1'],
    ...overrides,
  };
}

function renderModal(overrides = {}) {
  const handlers = {
    onClose: vi.fn(),
    onSave: vi.fn().mockResolvedValue({}),
    selectedBook: null,
    libraries: [{ id: 'lib-1', name: 'Ana Kitaplık', isDefault: true }],
    ...overrides,
  };
  render(<BookModal {...handlers} />);
  return handlers;
}

function save() {
  fireEvent.click(screen.getByRole('button', { name: /Kaydet/ }));
}

describe('BookModal notes', () => {
  it('renders existing notes from selectedBook.notesList', () => {
    renderModal({
      selectedBook: selectedBook({
        notesList: [{ id: 'n1', text: 'harika bir final', date: '1 Ocak 2026' }],
      }),
    });

    expect(screen.getByText('harika bir final')).toBeInTheDocument();
    expect(screen.getByText('1 Ocak 2026')).toBeInTheDocument();
  });

  it('adds a new note (no id) and includes it in onSave on Save', async () => {
    const handlers = renderModal({ selectedBook: selectedBook() });

    fireEvent.change(screen.getByPlaceholderText('Bir not yaz...'), {
      target: { value: 'yeni not' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ekle' }));

    save();

    await waitFor(() => expect(handlers.onSave).toHaveBeenCalled());
    const [bookData] = handlers.onSave.mock.calls[0];
    expect(bookData.notesList).toHaveLength(1);
    expect(bookData.notesList[0]).toMatchObject({ text: 'yeni not' });
    expect(bookData.notesList[0].id).toBeUndefined();
  });

  it('ignores whitespace-only note text on Add', () => {
    renderModal({ selectedBook: selectedBook() });

    fireEvent.change(screen.getByPlaceholderText('Bir not yaz...'), {
      target: { value: '   ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ekle' }));

    expect(screen.getByText('Henüz not yok')).toBeInTheDocument();
  });

  it('edits an existing note, keeping its id and updating its text on Save', async () => {
    const handlers = renderModal({
      selectedBook: selectedBook({
        notesList: [{ id: 'n1', text: 'eski metin', date: '1 Ocak 2026' }],
      }),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Notu düzenle' }));
    const textarea = screen.getByDisplayValue('eski metin');
    fireEvent.change(textarea, { target: { value: 'güncel metin' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));

    save();

    await waitFor(() =>
      expect(handlers.onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          notesList: [{ id: 'n1', text: 'güncel metin', date: '1 Ocak 2026' }],
        })
      )
    );
  });

  it('keeps editing the right note when an earlier note in the list is deleted mid-edit', async () => {
    const handlers = renderModal({
      selectedBook: selectedBook({
        notesList: [
          { id: 'n1', text: 'birinci not', date: '1 Ocak 2026' },
          { id: 'n2', text: 'ikinci not', date: '2 Ocak 2026' },
        ],
      }),
    });

    // Start editing the second note (index 1) ...
    const editButtons = screen.getAllByRole('button', { name: 'Notu düzenle' });
    fireEvent.click(editButtons[1]);
    expect(screen.getByDisplayValue('ikinci not')).toBeInTheDocument();

    // ... then delete the first note, which shifts everyone after it down
    // by one array index. The edit must stay attached to the second note by
    // identity (id), not by its now-stale position.
    fireEvent.click(screen.getByRole('button', { name: 'Notu sil' }));
    expect(screen.getByDisplayValue('ikinci not')).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('ikinci not'), { target: { value: 'güncellendi' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));

    save();

    await waitFor(() =>
      expect(handlers.onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          notesList: [{ id: 'n2', text: 'güncellendi', date: '2 Ocak 2026' }],
        })
      )
    );
  });

  it('deletes an existing note, dropping it from onSave on Save', async () => {
    const handlers = renderModal({
      selectedBook: selectedBook({
        notesList: [{ id: 'n1', text: 'silinecek not', date: '1 Ocak 2026' }],
      }),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Notu sil' }));
    save();

    await waitFor(() =>
      expect(handlers.onSave).toHaveBeenCalledWith(expect.objectContaining({ notesList: [] }))
    );
  });

  it('enables the Save button on a note change alone, with nothing else edited', () => {
    renderModal({
      selectedBook: selectedBook({
        notesList: [{ id: 'n1', text: 'not', date: '1 Ocak 2026' }],
      }),
    });

    expect(screen.getByRole('button', { name: /Kaydet/ })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Notu sil' }));

    expect(screen.getByRole('button', { name: /Kaydet/ })).not.toBeDisabled();
  });
});

describe('BookModal cover', () => {
  it('falls back to the Add Cover state when the cover fails to load', () => {
    renderModal({ selectedBook: selectedBook({ coverImage: 'https://covers.openlibrary.org/b/isbn/9780000000000-L.jpg' }) });

    fireEvent.error(screen.getByRole('img', { name: 'Kapak Önizleme' }));

    expect(screen.queryByRole('img', { name: 'Kapak Önizleme' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kapak Ekle/ })).toBeInTheDocument();
  });
});
