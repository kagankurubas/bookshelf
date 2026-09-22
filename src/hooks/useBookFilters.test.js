import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBookFilters } from './useBookFilters';

function book(overrides = {}) {
  return {
    id: 'b1',
    title: 'Suç ve Ceza',
    author: 'Dostoyevski',
    category: 'Klasik Edebiyat',
    status: 'Tamamlandı',
    libraryIds: ['lib-1'],
    notesList: [],
    tags: [],
    ...overrides,
  };
}

describe('useBookFilters', () => {
  it('still matches on title/author with no tags/notes present (regression)', () => {
    const books = [book({ id: 'b1', title: 'Foundation', author: 'Asimov' })];
    const { result } = renderHook(() => useBookFilters(books, 'lib-1'));

    act(() => result.current.setSearchQuery('found'));
    expect(result.current.filteredBooks.map((b) => b.id)).toEqual(['b1']);

    act(() => result.current.setSearchQuery('asimov'));
    expect(result.current.filteredBooks.map((b) => b.id)).toEqual(['b1']);
  });

  it('matches search query against note text', () => {
    const books = [
      book({ id: 'b1', notesList: [{ id: 'n1', text: 'harika bir final' }] }),
      book({ id: 'b2', notesList: [{ id: 'n2', text: 'sıkıcıydı' }] }),
    ];
    const { result } = renderHook(() => useBookFilters(books, 'lib-1'));

    act(() => result.current.setSearchQuery('final'));
    expect(result.current.filteredBooks.map((b) => b.id)).toEqual(['b1']);
  });

  it('matches search query against tags', () => {
    const books = [
      book({ id: 'b1', tags: ['yeniden okunacak'] }),
      book({ id: 'b2', tags: ['ödünç aldım'] }),
    ];
    const { result } = renderHook(() => useBookFilters(books, 'lib-1'));

    act(() => result.current.setSearchQuery('ödünç'));
    expect(result.current.filteredBooks.map((b) => b.id)).toEqual(['b2']);
  });

  it('does not crash for a book with no tags field at all', () => {
    const books = [{ ...book({ id: 'b1' }), tags: undefined }];
    const { result } = renderHook(() => useBookFilters(books, 'lib-1'));

    expect(() => result.current.filteredBooks).not.toThrow();
    expect(result.current.filteredBooks.map((b) => b.id)).toEqual(['b1']);
  });

  it('filters by selectedTag independently of the free-text search', () => {
    const books = [
      book({ id: 'b1', tags: ['ödünç aldım'] }),
      book({ id: 'b2', tags: ['yeniden okunacak'] }),
      book({ id: 'b3', tags: [] }),
    ];
    const { result } = renderHook(() => useBookFilters(books, 'lib-1'));

    act(() => result.current.setSelectedTag('ödünç aldım'));
    expect(result.current.filteredBooks.map((b) => b.id)).toEqual(['b1']);
  });

  it('combines selectedTag with other filters using AND', () => {
    const books = [
      book({ id: 'b1', category: 'Kurgu', tags: ['ödünç aldım'] }),
      book({ id: 'b2', category: 'Bilim', tags: ['ödünç aldım'] }),
    ];
    const { result } = renderHook(() => useBookFilters(books, 'lib-1'));

    act(() => {
      result.current.setSelectedTag('ödünç aldım');
      result.current.setSelectedCategory('Kurgu');
    });
    expect(result.current.filteredBooks.map((b) => b.id)).toEqual(['b1']);
  });

  it('computes uniqueTags from all books regardless of activeLibraryId', () => {
    const books = [
      book({ id: 'b1', libraryIds: ['lib-1'], tags: ['a', 'b'] }),
      book({ id: 'b2', libraryIds: ['lib-2'], tags: ['b', 'c'] }),
    ];
    const { result } = renderHook(() => useBookFilters(books, 'lib-1'));

    expect(result.current.uniqueTags).toEqual(['a', 'b', 'c']);
  });
});
