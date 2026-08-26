import { useState } from 'react';

export const CATEGORIES = [
  'Klasik Edebiyat', 'Kurgu', 'Fantastik Kurgu', 'Bilim Kurgu',
  'Distopya', 'Kurgu Dışı', 'Biyografi', 'Bilim', 'Tarih', 'Felsefe'
];

// Table gorunumunun arama/kategori/yazar/durum filtrelerini ve bunlarin
// uyguladigi listeyi tutar. uniqueAuthors kasitli olarak activeLibraryId'ye
// gore daraltilmiyor - BookModal'daki yazar otomatik tamamlama da bu listeyi
// kullaniyor ve orada kitabin hangi kitapliga eklenecegi onemli degil.
export function useBookFilters(books, activeLibraryId) {
  const [filterStatus, setFilterStatus] = useState('Tümü');
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [selectedAuthor, setSelectedAuthor] = useState('Tümü');
  const [searchQuery, setSearchQuery] = useState('');

  const uniqueAuthors = [...new Set(books.map((b) => b.author))];

  const filteredBooks = books
    .filter((book) => book.libraryIds.includes(activeLibraryId))
    .filter((book) => {
      const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            book.author.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategory === 'Tümü' || book.category === selectedCategory;
      const matchesAuthor = selectedAuthor === 'Tümü' || book.author === selectedAuthor;
      const matchesStatus = filterStatus === 'Tümü' || book.status === filterStatus;

      return matchesSearch && matchesCategory && matchesAuthor && matchesStatus;
    });

  return {
    categories: CATEGORIES,
    filterStatus,
    setFilterStatus,
    selectedCategory,
    setSelectedCategory,
    selectedAuthor,
    setSelectedAuthor,
    searchQuery,
    setSearchQuery,
    filteredBooks,
    uniqueAuthors,
  };
}
