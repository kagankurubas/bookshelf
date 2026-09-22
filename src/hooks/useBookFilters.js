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
  const [selectedTag, setSelectedTag] = useState('Tümü');
  const [searchQuery, setSearchQuery] = useState('');

  const uniqueAuthors = [...new Set(books.map((b) => b.author))];
  // uniqueAuthors ile ayni gerekce: activeLibraryId'ye gore daraltilmiyor,
  // hem tablo filtresini hem BookModal'daki etiket oneri listesini besliyor.
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
