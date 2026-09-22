import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getBookByIsbn } from '../lib/openLibrary';

// Owns the whole add/view-book flow (choice modal, barcode scan, search,
// batch scan, ISBN lookup, and the BookModal they all share) in one place.
// draggedBookId comes from outside because shelf dragging is App.jsx's own
// state - this hook only reads it to avoid opening the detail modal while
// a drag is in progress.
// `isOnline` (from useOnlineStatus) is used in the barcode flow to tell
// "unreachable because we're offline" apart from a real Open Library error.
export function useAddBookFlow(draggedBookId, isOnline) {
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
      // If isOnline === false, we couldn't reach Open Library because we're
      // offline, not a real Open Library error - go straight to the
      // manual-entry form (ISBN pre-filled) instead of showing an error
      // alert. If isOnline === true and it still errors (Open Library is
      // actually down/500), behavior is unchanged: show today's alert.
      if (isOnline === false) {
        handleManualAddFromIsbn(isbn);
      } else {
        alert(t('isbnLookup.error'));
        setIsAddChoiceOpen(true);
      }
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
