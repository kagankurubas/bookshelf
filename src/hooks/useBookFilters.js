import { useState } from 'react';

export const CATEGORIES = [
  'Klasik Edebiyat', 'Kurgu', 'Fantastik Kurgu', 'Bilim Kurgu',
  'Distopya', 'Kurgu Dışı', 'Biyografi', 'Bilim', 'Tarih', 'Felsefe'
];

// Holds the Table view's search/category/author/status filters and the
// list they produce. uniqueAuthors is deliberately not narrowed by
// activeLibraryId - BookModal's author autocomplete uses this same list,
// where which library a book will be added to doesn't matter.
export function useBookFilters(books, activeLibraryId) {
  const [filterStatus, setFilterStatus] = useState('Tümü');
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [selectedAuthor, setSelectedAuthor] = useState('Tümü');
  const [selectedTag, setSelectedTag] = useState('Tümü');
  const [searchQuery, setSearchQuery] = useState('');

  const uniqueAuthors = [...new Set(books.map((b) => b.author))];
  // Same rationale as uniqueAuthors: not narrowed by activeLibraryId, since
  // it feeds both the table filter and BookModal's tag suggestion list.
  const uniqueTags = [...new Set(books.flatMap((b) => b.tags || []))].sort();

  const filteredBooks = books
    .filter((book) => book.libraryIds.includes(activeLibraryId))
    .filter((book) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = query === '' ||
                            book.title.toLowerCase().includes(query) ||
                            book.author.toLowerCase().includes(query) ||
                            book.notesList.some((n) => n.text.toLowerCase().includes(query)) ||
                            (book.tags || []).some((tag) => tag.toLowerCase().includes(query));

      const matchesCategory = selectedCategory === 'Tümü' || book.category === selectedCategory;
      const matchesAuthor = selectedAuthor === 'Tümü' || book.author === selectedAuthor;
      const matchesStatus = filterStatus === 'Tümü' || book.status === filterStatus;
      const matchesTag = selectedTag === 'Tümü' || (book.tags || []).includes(selectedTag);

      return matchesSearch && matchesCategory && matchesAuthor && matchesStatus && matchesTag;
    });

  return {
    categories: CATEGORIES,
    filterStatus,
    setFilterStatus,
    selectedCategory,
    setSelectedCategory,
    selectedAuthor,
    setSelectedAuthor,
    selectedTag,
    setSelectedTag,
    searchQuery,
    setSearchQuery,
    filteredBooks,
    uniqueAuthors,
    uniqueTags,
  };
}
