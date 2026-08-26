import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useLibraries } from './useLibraries';
import { supabase } from '../lib/supabaseClient';

vi.mock('../lib/supabaseClient', () => ({
  supabase: { from: vi.fn() },
}));

// Supabase'in zincirlenebilir ve hem dogrudan hem de .single() ile
// awaitlenebilen sorgu builder'ini taklit eder.
function queryResult(result) {
  const builder = {};
  const self = () => builder;
  builder.select = vi.fn(self);
  builder.insert = vi.fn(self);
  builder.update = vi.fn(self);
  builder.delete = vi.fn(self);
  builder.eq = vi.fn(self);
  builder.order = vi.fn(self);
  builder.single = vi.fn(() => Promise.resolve(result));
  builder.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  return builder;
}

async function renderWithInitialRows(rows) {
  supabase.from.mockReturnValueOnce(queryResult({ data: rows, error: null }));
  const hook = renderHook(() => useLibraries('user-1'));
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
}

describe('useLibraries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches libraries for the given user and maps db rows to the app shape', async () => {
    const row = { id: 'lib-1', name: 'Ana Kitaplık', shelf_count: 3, is_default: true };
    const { result } = await renderWithInitialRows([row]);

    expect(supabase.from).toHaveBeenCalledWith('libraries');
    expect(result.current.libraries).toEqual([
      { id: 'lib-1', name: 'Ana Kitaplık', shelfCount: 3, isDefault: true },
    ]);
  });

  it('does not query supabase and clears libraries when there is no user id', async () => {
    const { result } = renderHook(() => useLibraries(undefined));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.libraries).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('stores the error and stops loading when the fetch fails', async () => {
    const fetchError = new Error('network down');
    supabase.from.mockReturnValueOnce(queryResult({ data: null, error: fetchError }));

    const { result } = renderHook(() => useLibraries('user-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe(fetchError);
    expect(result.current.libraries).toEqual([]);
  });

  it('createLibrary inserts a row and appends the mapped library to state', async () => {
    const { result } = await renderWithInitialRows([]);

    const insertedRow = { id: 'lib-2', name: 'Yazlık', shelf_count: 2, is_default: false };
    const insertBuilder = queryResult({ data: insertedRow, error: null });
    supabase.from.mockReturnValueOnce(insertBuilder);

    let created;
    await act(async () => {
      created = await result.current.createLibrary({ name: 'Yazlık' });
    });

    expect(insertBuilder.insert).toHaveBeenCalledWith({
      name: 'Yazlık', shelf_count: 2, is_default: false, user_id: 'user-1',
    });
    expect(created).toEqual({ id: 'lib-2', name: 'Yazlık', shelfCount: 2, isDefault: false });
    expect(result.current.libraries).toContainEqual(created);
  });

  it('updateLibrary sends only the provided columns and merges the mapped result into state', async () => {
    const row = { id: 'lib-1', name: 'Ana Kitaplık', shelf_count: 2, is_default: true };
    const { result } = await renderWithInitialRows([row]);

    const updatedRow = { id: 'lib-1', name: 'Ana Kitaplık', shelf_count: 3, is_default: true };
    const updateBuilder = queryResult({ data: updatedRow, error: null });
    supabase.from.mockReturnValueOnce(updateBuilder);

    await act(async () => {
      await result.current.updateLibrary('lib-1', { shelfCount: 3 });
    });

    expect(updateBuilder.update).toHaveBeenCalledWith({ shelf_count: 3 });
    expect(result.current.libraries[0]).toEqual({
      id: 'lib-1', name: 'Ana Kitaplık', shelfCount: 3, isDefault: true,
    });
  });

  it('deleteLibrary refuses to delete the default library without calling supabase', async () => {
    const row = { id: 'lib-1', name: 'Ana Kitaplık', shelf_count: 2, is_default: true };
    const { result } = await renderWithInitialRows([row]);

    await expect(result.current.deleteLibrary('lib-1')).rejects.toThrow('Ana kitaplık silinemez.');
    expect(supabase.from).toHaveBeenCalledTimes(1); // sadece ilk fetch
    expect(result.current.libraries).toHaveLength(1);
  });

  it('deleteLibrary removes a non-default library from supabase and state', async () => {
    const row = { id: 'lib-2', name: 'Yazlık', shelf_count: 2, is_default: false };
    const { result } = await renderWithInitialRows([row]);

    supabase.from.mockReturnValueOnce(queryResult({ error: null }));
    await act(async () => {
      await result.current.deleteLibrary('lib-2');
    });

    expect(result.current.libraries).toEqual([]);
  });
});
