import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BookModal from './BookModal';
import i18n from '../../i18n/i18n';
import { LibrariesNotReadyError, NoLibraryError } from '../../lib/saveErrors';

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

  it('returns to the URL input with the pasted text kept when a new cover URL fails to load', () => {
    renderModal({ selectedBook: selectedBook() });

    fireEvent.click(screen.getByRole('button', { name: /Kapak Ekle/ }));
    fireEvent.change(screen.getByLabelText(/kapak/i), { target: { value: 'https://example.com/not-an-image' } });
    fireEvent.error(screen.getByRole('img', { name: 'Kapak Önizleme' }));

    expect(screen.getByLabelText(/kapak/i)).toHaveValue('https://example.com/not-an-image');
  });
});

describe('BookModal while libraries load', () => {
  function fillTitleAndAuthor() {
    fireEvent.change(screen.getByLabelText('Kitap Adı (Örn: Suç ve Ceza)'), { target: { value: 'Dune' } });
    fireEvent.change(screen.getByPlaceholderText('Yazar Adı Seç veya Yaz'), { target: { value: 'Herbert' } });
  }

  it('keeps Save disabled and explains why until the libraries have loaded', () => {
    const handlers = renderModal({ libraries: [], librariesLoading: true });
    fillTitleAndAuthor();

    const saveButton = screen.getByRole('button', { name: 'Kitabı Kaydet' });
    expect(saveButton).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Kitaplıkların yükleniyor');

    fireEvent.click(saveButton);
    expect(handlers.onSave).not.toHaveBeenCalled();
  });

  it('allows Save once the libraries have loaded, even when there are none', async () => {
    const handlers = renderModal({ libraries: [], librariesLoading: false });
    fillTitleAndAuthor();

    expect(screen.queryByText(/Kitaplıkların yükleniyor/)).not.toBeInTheDocument();
    save();

    await waitFor(() => expect(handlers.onSave).toHaveBeenCalled());
  });
});

describe('BookModal save errors', () => {
  const rlsError = {
    code: '42501',
    message: 'new row violates row-level security policy for table "book_libraries"',
    details: null,
    hint: null,
  };

  function fillAndSave(handlers) {
    fireEvent.change(screen.getByLabelText('Kitap Adı (Örn: Suç ve Ceza)'), { target: { value: 'Dune' } });
    fireEvent.change(screen.getByPlaceholderText('Yazar Adı Seç veya Yaz'), { target: { value: 'Herbert' } });
    save();
    return waitFor(() => expect(handlers.onSave).toHaveBeenCalled());
  }

  function expectInputKept(handlers) {
    expect(screen.getByLabelText('Kitap Adı (Örn: Suç ve Ceza)')).toHaveValue('Dune');
    expect(screen.getByPlaceholderText('Yazar Adı Seç veya Yaz')).toHaveValue('Herbert');
    expect(handlers.onClose).not.toHaveBeenCalled();
  }

  it('asks to check the connection only for a network failure, keeping the input', async () => {
    const handlers = renderModal({ onSave: vi.fn().mockRejectedValue({ code: '', message: 'TypeError: Load failed' }) });
    await fillAndSave(handlers);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Kaydedilemedi. Bağlantını kontrol edip tekrar dene; girdiğin bilgiler duruyor.');
    expectInputKept(handlers);
  });

  it('says the server refused a rejected save, without the raw error, connection advice or retry advice', async () => {
    const handlers = renderModal({ onSave: vi.fn().mockRejectedValue(rlsError) });
    await fillAndSave(handlers);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Bu kitap kaydedilemedi: sunucu kaydı kabul etmedi. Girdiğin bilgiler duruyor.');
    for (const leaked of ['42501', 'row-level', 'book_libraries', 'policy']) {
      expect(alert.textContent).not.toContain(leaked);
    }
    expect(alert.textContent).not.toMatch(/bağlantı/i);
    expect(alert.textContent).not.toMatch(/tekrar dene/i);
    expectInputKept(handlers);
  });

  it('asks for a library first when the book has none', async () => {
    const handlers = renderModal({ libraries: [], onSave: vi.fn().mockRejectedValue(new NoLibraryError()) });
    await fillAndSave(handlers);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Kitabı kaydetmek için önce bir kitaplık oluştur. Girdiğin bilgiler duruyor.');
    expect(alert.textContent).not.toMatch(/bağlantı/i);
    expectInputKept(handlers);
  });

  it('asks to save again in a moment when the libraries had not loaded', async () => {
    const handlers = renderModal({ onSave: vi.fn().mockRejectedValue(new LibrariesNotReadyError()) });
    await fillAndSave(handlers);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Kitaplıkların henüz yüklenmedi; birazdan yeniden kaydet. Girdiğin bilgiler duruyor.');
    expect(alert.textContent).not.toMatch(/bağlantı/i);
    expectInputKept(handlers);
  });

  it('calls a stale-clock JWT rejection a temporary problem worth retrying, keeping the input', async () => {
    const jwtFuture = { code: 'PGRST303', message: 'JWT issued at future', details: null, hint: null };
    const handlers = renderModal({ onSave: vi.fn().mockRejectedValue(jwtFuture) });
    await fillAndSave(handlers);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Geçici bir sorun oluştu. Birkaç saniye sonra tekrar dene; girdiğin bilgiler duruyor.');
    expect(alert.textContent).not.toMatch(/PGRST303|JWT|bağlantı/i);
    expectInputKept(handlers);
  });

  it('shows the temporary-problem message in English for an English interface', async () => {
    await i18n.changeLanguage('en');
    try {
      const handlers = renderModal({ onSave: vi.fn().mockRejectedValue({ code: 'PGRST303', message: 'JWT issued at future' }) });
      fireEvent.change(screen.getByLabelText('Book Title (e.g. Crime and Punishment)'), { target: { value: 'Dune' } });
      fireEvent.change(screen.getByPlaceholderText('Pick or type an author name'), { target: { value: 'Herbert' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save Book' }));

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Something went wrong for a moment. Try again in a few seconds - what you entered is still here.');
      expect(screen.getByLabelText('Book Title (e.g. Crime and Punishment)')).toHaveValue('Dune');
      expect(handlers.onClose).not.toHaveBeenCalled();
    } finally {
      await i18n.changeLanguage('tr');
    }
  });

  it('shows the rejected message in English for an English interface', async () => {
    await i18n.changeLanguage('en');
    try {
      const handlers = renderModal({ onSave: vi.fn().mockRejectedValue(rlsError) });
      fireEvent.change(screen.getByLabelText('Book Title (e.g. Crime and Punishment)'), { target: { value: 'Dune' } });
      fireEvent.change(screen.getByPlaceholderText('Pick or type an author name'), { target: { value: 'Herbert' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save Book' }));

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent("This book couldn't be saved: the server didn't accept it. What you entered is still here.");
      expect(alert.textContent).not.toMatch(/connection|try again|42501/i);
      expect(handlers.onClose).not.toHaveBeenCalled();
    } finally {
      await i18n.changeLanguage('tr');
    }
  });
});
