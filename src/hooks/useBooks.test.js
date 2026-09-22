import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useBooks } from './useBooks';
import { supabase } from '../lib/supabaseClient';

vi.mock('../lib/supabaseClient', () => ({
  supabase: { from: vi.fn() },
}));

// Mimics Supabase's chainable query builder (select().eq().order() etc),
// awaitable both directly and via .single().
function queryResult(result) {
  const builder = {};
  const self = () => builder;
  builder.select = vi.fn(self);
  builder.insert = vi.fn(self);
  builder.update = vi.fn(self);
  builder.delete = vi.fn(self);
  builder.eq = vi.fn(self);
  builder.in = vi.fn(self);
  builder.order = vi.fn(self);
  builder.single = vi.fn(() => Promise.resolve(result));
  builder.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  return builder;
}

const baseRow = {
  id: 'b1', title: 'Old Title', author: 'Author', publisher: '', rating: 3,
  category: 'Kurgu', status: 'Okunuyor', date_started: '', date_finished: '',
  cover_image: '', cover_position: 50, shelf_id: 'default', is_favorite: false,
  shelf_row: 0, slot_index: 0, isbn: '', page_count: null, created_at: '2024-01-01T00:00:00Z',
  book_libraries: [{ library_id: 'lib-1' }], notes: [],
};

async function renderWithInitialRows(rows) {
  supabase.from.mockReturnValueOnce(queryResult({ data: rows, error: null }));
  const hook = renderHook(() => useBooks('user-1'));
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

describe('useBooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches books for the given user and maps db rows to the app shape', async () => {
    const row = {
      ...baseRow,
      notes: [{ id: 'n1', text: 'great', created_at: '2024-01-02T00:00:00Z' }],
    };
    const { result } = await renderWithInitialRows([row]);

    expect(supabase.from).toHaveBeenCalledWith('books');
    expect(result.current.books).toHaveLength(1);
    expect(result.current.books[0]).toMatchObject({
      id: 'b1', title: 'Old Title', author: 'Author', libraryIds: ['lib-1'],
    });
    expect(result.current.books[0].notesList[0]).toMatchObject({ id: 'n1', text: 'great' });
  });

  it('maps the tags column from the db row, defaulting to an empty array when null', async () => {
    const { result } = await renderWithInitialRows([
      { ...baseRow, id: 'b1', tags: ['ödünç aldım', 'yeniden okunacak'] },
      { ...baseRow, id: 'b2', tags: null },
    ]);

    expect(result.current.books[0].tags).toEqual(['ödünç aldım', 'yeniden okunacak']);
    expect(result.current.books[1].tags).toEqual([]);
  });

  it('stores the error and stops loading when the fetch fails', async () => {
    const fetchError = new Error('network down');
    supabase.from.mockReturnValueOnce(queryResult({ data: null, error: fetchError }));

    const { result } = renderHook(() => useBooks('user-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe(fetchError);
    expect(result.current.books).toEqual([]);
  });

  it('addBook inserts a book row plus its library links and notes, then appends it to state', async () => {
    const { result } = await renderWithInitialRows([]);

    const insertedRow = {
      ...baseRow, id: 'new-1', title: 'Foundation', author: 'Asimov', book_libraries: undefined, notes: undefined,
    };
    supabase.from
      .mockReturnValueOnce(queryResult({ data: insertedRow, error: null })) // books insert+select+single
      .mockReturnValueOnce(queryResult({ error: null })) // book_libraries insert
      .mockReturnValueOnce(queryResult({ // notes insert+select
        data: [{ id: 'note-1', text: 'ilk not', created_at: '2024-03-01T00:00:00Z' }], error: null,
      }));

    let newBook;
    await act(async () => {
      newBook = await result.current.addBook({
        title: 'Foundation', author: 'Asimov', libraryIds: ['lib-1'], notesList: [{ text: 'ilk not' }],
      });
    });

    expect(newBook.id).toBe('new-1');
    expect(newBook.libraryIds).toEqual(['lib-1']);
    expect(newBook.notesList[0]).toMatchObject({ id: 'note-1', text: 'ilk not' });
    expect(result.current.books).toHaveLength(1);
    expect(result.current.books[0].id).toBe('new-1');
  });

  it('addBook sends tags through the same plain-column insert path as category/status', async () => {
    const { result } = await renderWithInitialRows([]);

    const insertBuilder = queryResult({
      data: { ...baseRow, id: 'new-1', tags: ['ödünç aldım'], book_libraries: undefined, notes: undefined },
      error: null,
    });
    supabase.from.mockReturnValueOnce(insertBuilder);

    let newBook;
    await act(async () => {
      newBook = await result.current.addBook({ title: 'Foundation', author: 'Asimov', tags: ['ödünç aldım'] });
    });

    expect(insertBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({ tags: ['ödünç aldım'] }));
    expect(newBook.tags).toEqual(['ödünç aldım']);
    expect(result.current.books[0].tags).toEqual(['ödünç aldım']);
  });

  it('editBook sends only the changed columns and merges the result into state', async () => {
    const { result } = await renderWithInitialRows([baseRow]);

    const updateBuilder = queryResult({ error: null });
    supabase.from.mockReturnValueOnce(updateBuilder);

    let updated;
    await act(async () => {
      updated = await result.current.editBook('b1', { title: 'New Title', rating: 5 });
    });

    expect(updateBuilder.update).toHaveBeenCalledWith({ title: 'New Title', rating: 5 });
    expect(updateBuilder.eq).toHaveBeenCalledWith('id', 'b1');
    expect(updated).toMatchObject({ id: 'b1', title: 'New Title', rating: 5, libraryIds: ['lib-1'] });
    expect(result.current.books[0].title).toBe('New Title');
  });

  it('editBook sends tags through the same plain-column update path as category/status', async () => {
    const { result } = await renderWithInitialRows([baseRow]);

    const updateBuilder = queryResult({ error: null });
    supabase.from.mockReturnValueOnce(updateBuilder);

    await act(async () => {
      await result.current.editBook('b1', { tags: ['ödünç aldım'] });
    });

    expect(updateBuilder.update).toHaveBeenCalledWith({ tags: ['ödünç aldım'] });
    expect(result.current.books[0].tags).toEqual(['ödünç aldım']);
  });

  it('deleteBook removes the book from supabase and from state', async () => {
    const { result } = await renderWithInitialRows([baseRow]);

    supabase.from.mockReturnValueOnce(queryResult({ error: null }));
    await act(async () => {
      await result.current.deleteBook('b1');
    });

    expect(result.current.books).toEqual([]);
  });
});
