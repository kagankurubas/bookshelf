import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const BOOKS_SELECT = `
  id, title, author, publisher, rating, category, status,
  date_started, date_finished, cover_image, cover_position,
  shelf_id, is_favorite, shelf_row, slot_index, isbn, created_at,
  book_libraries ( library_id ),
  notes ( id, text, created_at )
`;

const BOOK_COLUMN_MAP = {
  title: 'title',
  author: 'author',
  publisher: 'publisher',
  rating: 'rating',
  category: 'category',
  status: 'status',
  dateStarted: 'date_started',
  dateFinished: 'date_finished',
  coverImage: 'cover_image',
  coverPosition: 'cover_position',
  shelfId: 'shelf_id',
  isFavorite: 'is_favorite',
  shelfRow: 'shelf_row',
  slotIndex: 'slot_index',
  isbn: 'isbn',
};

const DATE_FIELDS = new Set(['dateStarted', 'dateFinished']);

function formatNoteDate(createdAt) {
  return new Date(createdAt).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
}

function mapBookRow(row) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    publisher: row.publisher || '',
    rating: row.rating || 0,
    category: row.category,
    status: row.status,
    dateStarted: row.date_started || '',
    dateFinished: row.date_finished || '',
    coverImage: row.cover_image || '',
    coverPosition: row.cover_position ?? 50,
    shelfId: row.shelf_id || 'default',
    isFavorite: row.is_favorite || false,
    shelfRow: row.shelf_row ?? 0,
    slotIndex: row.slot_index ?? 0,
    isbn: row.isbn || '',
    libraryIds: (row.book_libraries || []).map((bl) => bl.library_id),
    notesList: (row.notes || [])
      .slice()
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map((n) => ({ id: n.id, text: n.text, date: formatNoteDate(n.created_at) })),
  };
}

function toBookColumns(fields) {
  const columns = {};
  Object.entries(BOOK_COLUMN_MAP).forEach(([key, column]) => {
    if (fields[key] === undefined) return;
    columns[column] = DATE_FIELDS.has(key) && fields[key] === '' ? null : fields[key];
  });
  return columns;
}

async function syncBookLibraries(bookId, newLibraryIds, oldLibraryIds) {
  const toAdd = newLibraryIds.filter((id) => !oldLibraryIds.includes(id));
  const toRemove = oldLibraryIds.filter((id) => !newLibraryIds.includes(id));

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from('book_libraries')
      .delete()
      .eq('book_id', bookId)
      .in('library_id', toRemove);
    if (error) throw error;
  }

  if (toAdd.length > 0) {
    const { error } = await supabase
      .from('book_libraries')
      .insert(toAdd.map((library_id) => ({ book_id: bookId, library_id })));
    if (error) throw error;
  }
}

// Not listesini önceki DB durumuna göre diff'leyip ekleme/güncelleme/silme yapar,
// ardından yeni id/tarih bilgileriyle güncel notesList'i döner.
async function syncNotes(bookId, newNotes, oldNotes) {
  const oldIds = oldNotes.map((n) => n.id);
  const removedIds = oldIds.filter((id) => !newNotes.some((n) => n.id === id));
  const editedNotes = newNotes.filter((n) => {
    const old = oldNotes.find((o) => o.id === n.id);
    return old && old.text !== n.text;
  });
  const addedNotes = newNotes.filter((n) => !oldIds.includes(n.id));

  if (removedIds.length > 0) {
    const { error } = await supabase.from('notes').delete().in('id', removedIds);
    if (error) throw error;
  }

  for (const note of editedNotes) {
    const { error } = await supabase.from('notes').update({ text: note.text }).eq('id', note.id);
    if (error) throw error;
  }

  let insertedRows = [];
  if (addedNotes.length > 0) {
    const { data, error } = await supabase
      .from('notes')
      .insert(addedNotes.map((n) => ({ book_id: bookId, text: n.text })))
      .select();
    if (error) throw error;
    insertedRows = data;
  }

  const keptNotes = newNotes
    .filter((n) => oldIds.includes(n.id))
    .map((n) => ({ ...oldNotes.find((o) => o.id === n.id), text: n.text }));

  const newlyInsertedNotes = insertedRows.map((row) => ({
    id: row.id,
    text: row.text,
    date: formatNoteDate(row.created_at),
  }));

  return [...keptNotes, ...newlyInsertedNotes];
}

export function useBooks() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('books')
      .select(BOOKS_SELECT)
      .order('created_at', { ascending: true });

    if (fetchError) {
      setError(fetchError);
    } else {
      setBooks(data.map(mapBookRow));
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Supabase'den ilk veri çekişi (mount'ta fetch) - standart veri senkronizasyon deseni.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBooks();
  }, [fetchBooks]);

  const addBook = useCallback(async (bookFields) => {
    const columns = toBookColumns(bookFields);
    const { data, error: insertError } = await supabase.from('books').insert(columns).select().single();
    if (insertError) throw insertError;

    const libraryIds = bookFields.libraryIds || [];
    if (libraryIds.length > 0) {
      await syncBookLibraries(data.id, libraryIds, []);
    }

    const notesList = bookFields.notesList || [];
    const savedNotes = notesList.length > 0 ? await syncNotes(data.id, notesList, []) : [];

    const newBook = { ...mapBookRow(data), libraryIds, notesList: savedNotes };
    setBooks((prev) => [...prev, newBook]);
    return newBook;
  }, []);

  const editBook = useCallback(
    async (id, bookFields) => {
      const current = books.find((b) => b.id === id);
      const columns = toBookColumns(bookFields);

      if (Object.keys(columns).length > 0) {
        const { error: updateError } = await supabase.from('books').update(columns).eq('id', id);
        if (updateError) throw updateError;
      }

      const newLibraryIds = bookFields.libraryIds || current?.libraryIds || [];
      await syncBookLibraries(id, newLibraryIds, current?.libraryIds || []);

      const newNotesList = bookFields.notesList || current?.notesList || [];
      const savedNotes = await syncNotes(id, newNotesList, current?.notesList || []);

      const updatedBook = {
        ...current,
        ...bookFields,
        id,
        libraryIds: newLibraryIds,
        notesList: savedNotes,
      };

      setBooks((prev) => prev.map((b) => (b.id === id ? updatedBook : b)));
      return updatedBook;
    },
    [books]
  );

  const deleteBook = useCallback(async (id) => {
    const { error: deleteError } = await supabase.from('books').delete().eq('id', id);
    if (deleteError) throw deleteError;
    setBooks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const updateBookPosition = useCallback(async (id, shelfRow, slotIndex) => {
    const { error: updateError } = await supabase
      .from('books')
      .update({ shelf_row: shelfRow, slot_index: slotIndex })
      .eq('id', id);
    if (updateError) throw updateError;
    setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, shelfRow, slotIndex } : b)));
  }, []);

  return {
    books,
    loading,
    error,
    addBook,
    editBook,
    deleteBook,
    updateBookPosition,
    refetchBooks: fetchBooks,
  };
}
