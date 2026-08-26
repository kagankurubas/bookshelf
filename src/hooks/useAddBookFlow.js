import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getBookByIsbn } from '../lib/openLibrary';

// Kitap ekleme/gorme akisinin tamamini (secim modali, barkod tarama, arama,
// toplu tarama, ISBN sorgusu ve bunlarin hepsinin paylastigi BookModal) tek
// bir yerde tutar. draggedBookId disaridan geliyor cunku raf suruklemesi
// App.jsx'in kendi state'i - burasi sadece surukleme sirasinda detay
// modalinin acilmasini engellemek icin okuyor.
export function useAddBookFlow(draggedBookId) {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [prefillBook, setPrefillBook] = useState(null);
  const [isAddChoiceOpen, setIsAddChoiceOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isBatchScanOpen, setIsBatchScanOpen] = useState(false);
  const [isLookingUpIsbn, setIsLookingUpIsbn] = useState(false);

  const openNewBookModal = () => {
    setIsAddChoiceOpen(true);
  };

  const closeAddChoice = () => {
    setIsAddChoiceOpen(false);
  };

  const openBookDetailModal = (book) => {
    if (draggedBookId === null) {
      setSelectedBook(book);
      setPrefillBook(null);
      setIsModalOpen(true);
    }
  };

  const closeBookModal = () => {
    setIsModalOpen(false);
    setPrefillBook(null);
  };

  const clearSelectedBook = () => {
    setSelectedBook(null);
  };

  const startManualAdd = () => {
    setIsAddChoiceOpen(false);
    setSelectedBook(null);
    setPrefillBook(null);
    setIsModalOpen(true);
  };

  const startBarcodeAdd = () => {
    setIsAddChoiceOpen(false);
    setIsScannerOpen(true);
  };

  const closeScanner = () => {
    setIsScannerOpen(false);
  };

  const handleBarcodeScanned = async (isbn) => {
    setIsScannerOpen(false);
    setIsLookingUpIsbn(true);
    try {
      const bookInfo = await getBookByIsbn(isbn);
      if (bookInfo) {
        setSelectedBook(null);
        setPrefillBook(bookInfo);
        setIsModalOpen(true);
      } else {
        alert(t('isbnLookup.notFound', { isbn }));
        setIsAddChoiceOpen(true);
      }
    } catch (err) {
      console.error(err);
      alert(t('isbnLookup.error'));
      setIsAddChoiceOpen(true);
    } finally {
      setIsLookingUpIsbn(false);
    }
  };

  const startSearchAdd = () => {
    setIsAddChoiceOpen(false);
    setIsSearchOpen(true);
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
  };

  const handleSearchResultSelect = (book) => {
    setIsSearchOpen(false);
    setSelectedBook(null);
    setPrefillBook({
      title: book.title,
      author: book.author,
      coverImage: book.coverImage,
      isbn: book.isbn,
      pageCount: book.pageCount,
    });
    setIsModalOpen(true);
  };

  const startBatchScanAdd = () => {
    setIsAddChoiceOpen(false);
    setIsBatchScanOpen(true);
  };

  const closeBatchScan = () => {
    setIsBatchScanOpen(false);
  };

  const handleManualAddFromIsbn = (isbn) => {
    setSelectedBook(null);
    setPrefillBook({ isbn });
    setIsModalOpen(true);
  };

  return {
    isModalOpen,
    selectedBook,
    prefillBook,
    isAddChoiceOpen,
    isScannerOpen,
    isSearchOpen,
    isBatchScanOpen,
    isLookingUpIsbn,
    openNewBookModal,
    closeAddChoice,
    openBookDetailModal,
    closeBookModal,
    clearSelectedBook,
    startManualAdd,
    startBarcodeAdd,
    closeScanner,
    handleBarcodeScanned,
    startSearchAdd,
    closeSearch,
    handleSearchResultSelect,
    startBatchScanAdd,
    closeBatchScan,
    handleManualAddFromIsbn,
  };
}
