import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  deleteBookRow,
  formatNoteDate,
  insertBookWithLinks,
  syncBookLibraries,
  syncNotes,
  toBookColumns,
} from '../lib/bookWrites';

const BOOKS_SELECT = `
  id, title, author, publisher, rating, category, status,
  date_started, date_finished, cover_image, cover_position,
  shelf_id, is_favorite, shelf_row, slot_index, isbn, page_count, created_at, tags,
  book_libraries ( library_id ),
  notes ( id, text, created_at )
`;

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
    pageCount: row.page_count ?? null,
    createdAt: row.created_at || '',
    tags: row.tags || [],
    libraryIds: (row.book_libraries || []).map((bl) => bl.library_id),
    notesList: (row.notes || [])
      .slice()
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map((n) => ({ id: n.id, text: n.text, date: formatNoteDate(n.created_at) })),
  };
}

export function useBooks(userId) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBooks = useCallback(async () => {
    if (!userId) {
      setBooks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('books')
      .select(BOOKS_SELECT)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (fetchError) {
      setError(fetchError);
    } else {
      setBooks(data.map(mapBookRow));
      setError(null);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBooks();
  }, [fetchBooks]);

  const addBook = useCallback(async (bookFields) => {
    const { row, libraryIds, notesList } = await insertBookWithLinks(supabase, userId, bookFields);
    const newBook = { ...mapBookRow(row), libraryIds, notesList };
    setBooks((prev) => [...prev, newBook]);
    return newBook;
  }, [userId]);

  const editBook = useCallback(
    async (id, bookFields) => {
      const current = books.find((b) => b.id === id);
      const columns = toBookColumns(bookFields);

      if (Object.keys(columns).length > 0) {
        const { error: updateError } = await supabase.from('books').update(columns).eq('id', id);
        if (updateError) throw updateError;
      }

      const newLibraryIds = bookFields.libraryIds || current?.libraryIds || [];
      await syncBookLibraries(supabase, id, newLibraryIds, current?.libraryIds || []);

      const newNotesList = bookFields.notesList || current?.notesList || [];
      const savedNotes = await syncNotes(supabase, id, newNotesList, current?.notesList || []);

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
    await deleteBookRow(supabase, id);
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
