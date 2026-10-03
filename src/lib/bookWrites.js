import { NoLibraryError } from './saveErrors';

// Book writes that take the Supabase client as a parameter, so the RLS
// integration tests can run the exact same code against a real database.

const BOOK_COLUMN_MAP = {
  title: 'title',
  author: 'author',
  publisher: 'publisher',
  rating: 'rating',
  category: 'category',
  status: 'status',
  tags: 'tags',
  dateStarted: 'date_started',
  dateFinished: 'date_finished',
  coverImage: 'cover_image',
  coverPosition: 'cover_position',
  shelfId: 'shelf_id',
  isFavorite: 'is_favorite',
  shelfRow: 'shelf_row',
  slotIndex: 'slot_index',
  isbn: 'isbn',
  pageCount: 'page_count',
};

const DATE_FIELDS = new Set(['dateStarted', 'dateFinished']);

export function formatNoteDate(createdAt) {
  return new Date(createdAt).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
}

export function toBookColumns(fields) {
  const columns = {};
  Object.entries(BOOK_COLUMN_MAP).forEach(([key, column]) => {
    if (fields[key] === undefined) return;
    columns[column] = DATE_FIELDS.has(key) && fields[key] === '' ? null : fields[key];
  });
  return columns;
}

export function hasValidLibraryIds(libraryIds) {
  return Array.isArray(libraryIds)
    && libraryIds.length > 0
    && libraryIds.every((id) => typeof id === 'string' && id !== '');
}

export async function syncBookLibraries(client, bookId, newLibraryIds, oldLibraryIds) {
  const toAdd = newLibraryIds.filter((id) => !oldLibraryIds.includes(id));
  const toRemove = oldLibraryIds.filter((id) => !newLibraryIds.includes(id));

  if (toRemove.length > 0) {
    const { error } = await client
      .from('book_libraries')
      .delete()
      .eq('book_id', bookId)
      .in('library_id', toRemove);
    if (error) throw error;
  }

  if (toAdd.length > 0) {
    const { error } = await client
      .from('book_libraries')
      .insert(toAdd.map((library_id) => ({ book_id: bookId, library_id })));
    if (error) throw error;
  }
}

// Diffs the notes list against the previous DB state to add/update/delete,
// then returns the current notesList with fresh id/date info.
export async function syncNotes(client, bookId, newNotes, oldNotes) {
  const oldIds = oldNotes.map((n) => n.id);
  const removedIds = oldIds.filter((id) => !newNotes.some((n) => n.id === id));
  const editedNotes = newNotes.filter((n) => {
    const old = oldNotes.find((o) => o.id === n.id);
    return old && old.text !== n.text;
  });
  const addedNotes = newNotes.filter((n) => !oldIds.includes(n.id));

  if (removedIds.length > 0) {
    const { error } = await client.from('notes').delete().in('id', removedIds);
    if (error) throw error;
  }

  for (const note of editedNotes) {
    const { error } = await client.from('notes').update({ text: note.text }).eq('id', note.id);
    if (error) throw error;
  }

  let insertedRows = [];
  if (addedNotes.length > 0) {
    const { data, error } = await client
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

// Returns how many rows were deleted: RLS turns a delete of someone else's
// book into zero rows rather than an error.
export async function deleteBookRow(client, id) {
  const { data, error } = await client.from('books').delete().eq('id', id).select('id');
  if (error) throw error;
  return data?.length ?? 0;
}

// Inserts a book with its library links and notes. A book without a library
// is refused before anything is written, and if a later step fails the book
// row is deleted again, so a failed save never leaves an orphan book behind.
export async function insertBookWithLinks(client, userId, bookFields) {
  const { libraryIds } = bookFields;
  if (!hasValidLibraryIds(libraryIds)) throw new NoLibraryError();

  const { data: row, error: insertError } = await client
    .from('books')
    .insert({ ...toBookColumns(bookFields), user_id: userId })
    .select()
    .single();
  if (insertError) throw insertError;

  try {
    await syncBookLibraries(client, row.id, libraryIds, []);
    const notesList = bookFields.notesList || [];
    const savedNotes = notesList.length > 0 ? await syncNotes(client, row.id, notesList, []) : [];
    return { row, libraryIds, notesList: savedNotes };
  } catch (err) {
    try {
      const deletedCount = await deleteBookRow(client, row.id);
      if (deletedCount !== 1) {
        console.error('Clean-up of a half-saved book deleted an unexpected number of rows', row.id, deletedCount);
      }
    } catch (cleanupError) {
      console.error('Could not remove a half-saved book', row.id, cleanupError);
    }
    throw err;
  }
}
