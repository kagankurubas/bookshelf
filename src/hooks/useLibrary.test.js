import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLibrary } from './useLibrary';

function deps(overrides = {}) {
  return {
    libraries: [],
    addBook: vi.fn(),
    editBook: vi.fn(),
    deleteBook: vi.fn(),
    refetchBooks: vi.fn(),
    deleteLibrary: vi.fn(),
    refreshStats: vi.fn(),
    ...overrides,
  };
}

describe('useLibrary', () => {
  it('defaults the active library to the library marked isDefault', () => {
    const libraries = [
      { id: 'lib-1', name: 'Yazlık', isDefault: false },
      { id: 'lib-2', name: 'Ana Kitaplık', isDefault: true },
    ];
    const { result } = renderHook(() => useLibrary(deps({ libraries })));

    expect(result.current.activeLibraryId).toBe('lib-2');
    expect(result.current.activeLibrary).toEqual(libraries[1]);
  });

  it('switches to an explicitly selected library, overriding the default', () => {
    const libraries = [
      { id: 'lib-1', name: 'Yazlık', isDefault: false },
      { id: 'lib-2', name: 'Ana Kitaplık', isDefault: true },
    ];
    const { result } = renderHook(() => useLibrary(deps({ libraries })));

    act(() => result.current.setActiveLibraryId('lib-1'));

    expect(result.current.activeLibraryId).toBe('lib-1');
    expect(result.current.activeLibrary).toEqual(libraries[0]);
  });

  it('addBook adds the default library to libraryIds and refreshes stats', async () => {
    const libraries = [{ id: 'lib-default', name: 'Ana Kitaplık', isDefault: true }];
    const addBook = vi.fn().mockResolvedValue({ id: 'book-1' });
    const refreshStats = vi.fn();
    const { result } = renderHook(() => useLibrary(deps({ libraries, addBook, refreshStats })));

    await act(async () => {
      await result.current.addBook({ title: 'Dune', libraryIds: ['lib-other'] });
    });

    expect(addBook).toHaveBeenCalledWith({ title: 'Dune', libraryIds: ['lib-other', 'lib-default'] });
    expect(refreshStats).toHaveBeenCalledTimes(1);
  });

  it('addBookWithoutStatsRefresh applies the default-library invariant but does not refresh stats', async () => {
    const libraries = [{ id: 'lib-default', name: 'Ana Kitaplık', isDefault: true }];
    const addBook = vi.fn().mockResolvedValue({ id: 'book-1' });
    const refreshStats = vi.fn();
    const { result } = renderHook(() => useLibrary(deps({ libraries, addBook, refreshStats })));

    await act(async () => {
      await result.current.addBookWithoutStatsRefresh({ title: 'Dune', libraryIds: [] });
    });

    expect(addBook).toHaveBeenCalledWith({ title: 'Dune', libraryIds: ['lib-default'] });
    expect(refreshStats).not.toHaveBeenCalled();
  });

  it('editBook applies the default-library invariant and refreshes stats', async () => {
    const libraries = [{ id: 'lib-default', name: 'Ana Kitaplık', isDefault: true }];
    const editBook = vi.fn().mockResolvedValue({ id: 'book-1' });
    const refreshStats = vi.fn();
    const { result } = renderHook(() => useLibrary(deps({ libraries, editBook, refreshStats })));

    await act(async () => {
      await result.current.editBook('book-1', { title: 'Dune (edited)', libraryIds: [] });
    });

    expect(editBook).toHaveBeenCalledWith('book-1', { title: 'Dune (edited)', libraryIds: ['lib-default'] });
    expect(refreshStats).toHaveBeenCalledTimes(1);
  });

  it('deleteBook refreshes stats after deleting', async () => {
    const deleteBook = vi.fn().mockResolvedValue(undefined);
    const refreshStats = vi.fn();
    const { result } = renderHook(() => useLibrary(deps({ deleteBook, refreshStats })));

    await act(async () => {
      await result.current.deleteBook('book-1');
    });

    expect(deleteBook).toHaveBeenCalledWith('book-1');
    expect(refreshStats).toHaveBeenCalledTimes(1);
  });

  it('deleteLibrary deletes the library, resets the explicit selection, and refetches books', async () => {
    const libraries = [
      { id: 'lib-1', name: 'Yazlık', isDefault: false },
      { id: 'lib-2', name: 'Ana Kitaplık', isDefault: true },
    ];
    const deleteLibrary = vi.fn().mockResolvedValue(undefined);
    const refetchBooks = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useLibrary(deps({ libraries, deleteLibrary, refetchBooks })));

    act(() => result.current.setActiveLibraryId('lib-1'));
    expect(result.current.activeLibraryId).toBe('lib-1');

    await act(async () => {
      await result.current.deleteLibrary('lib-1');
    });

    expect(deleteLibrary).toHaveBeenCalledWith('lib-1');
    expect(refetchBooks).toHaveBeenCalledTimes(1);
    // Selection reset and fell back to the default library.
    expect(result.current.activeLibraryId).toBe('lib-2');
  });

  it('re-exposes refreshStats so a batch caller can trigger one refresh after its own loop', async () => {
    const refreshStats = vi.fn();
    const { result } = renderHook(() => useLibrary(deps({ refreshStats })));

    await act(async () => {
      await result.current.refreshStats();
    });

    expect(refreshStats).toHaveBeenCalledTimes(1);
  });

  it('has no active library while the library list is still empty', () => {
    const { result } = renderHook(() => useLibrary(deps({ libraries: [] })));

    expect(result.current.activeLibraryId).toBeNull();
    expect(result.current.activeLibrary).toBeNull();
  });
});
