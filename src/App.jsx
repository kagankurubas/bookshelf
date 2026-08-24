import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import BookModal from './components/BookModal/BookModal';
import BarcodeScanner from './components/BarcodeScanner/BarcodeScanner';
import BookSearch from './components/BookSearch/BookSearch';
import BatchScanner from './components/BatchScanner/BatchScanner';
import AppHeader from './components/AppHeader/AppHeader';
import LibraryToolbar from './components/LibraryToolbar/LibraryToolbar';
import CardsView from './components/CardsView/CardsView';
import TableView from './components/TableView/TableView';
import ShelfView from './components/ShelfView/ShelfView';
import AddChoiceModal from './components/AddChoiceModal/AddChoiceModal';
import AuthScreen from './components/AuthScreen/AuthScreen';
import AiChatDrawer from './components/AiChatDrawer/AiChatDrawer';
import { StarIcon, SparkleIcon } from './components/icons/Icons';
import { useAuth } from './hooks/useAuth';
import { useBooks } from './hooks/useBooks';
import { useLibraries } from './hooks/useLibraries';
import { getBookByIsbn } from './lib/openLibrary';
import './App.css';

function App() {
  const { t } = useTranslation();
  const { user, loading: authLoading, signIn, signUp, signOut } = useAuth();
  const { books, loading: booksLoading, addBook, editBook, deleteBook, updateBookPosition, refetchBooks } = useBooks(user?.id);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [prefillBook, setPrefillBook] = useState(null);
  const [isAddChoiceOpen, setIsAddChoiceOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isBatchScanOpen, setIsBatchScanOpen] = useState(false);
  const [isLookingUpIsbn, setIsLookingUpIsbn] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);

  const {
    libraries,
    loading: librariesLoading,
    createLibrary,
    updateLibrary,
    deleteLibrary,
  } = useLibraries(user?.id);
  const [explicitActiveLibraryId, setActiveLibraryId] = useState(null);
  const defaultLibrary = libraries.find((lib) => lib.isDefault) || libraries[0] || null;
  const activeLibraryId = explicitActiveLibraryId ?? defaultLibrary?.id ?? null;
  const [newLibraryName, setNewLibraryName] = useState('');
  const [isAddingLibrary, setIsAddingLibrary] = useState(false);

  const [activeView, setActiveView] = useState('cards');

  const [filterStatus, setFilterStatus] = useState('Tümü');
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [selectedAuthor, setSelectedAuthor] = useState('Tümü');
  const [searchQuery, setSearchQuery] = useState('');

  const [draggedBookId, setDraggedBookId] = useState(null);
  const [dragOverTarget, setDragOverTarget] = useState(null); // { shelfRow, bookId } | null

  const categories = [
    'Klasik Edebiyat', 'Kurgu', 'Fantastik Kurgu', 'Bilim Kurgu',
    'Distopya', 'Kurgu Dışı', 'Biyografi', 'Bilim', 'Tarih', 'Felsefe'
  ];

  const getCategoryColorClass = (category) => {
    switch (category) {
      case 'Klasik Edebiyat': return 'category-klasik';
      case 'Fantastik Kurgu': return 'category-fantastik';
      case 'Bilim Kurgu': return 'category-bilimkurgu';
      case 'Distopya': return 'category-distopya';
      case 'Kurgu': return 'category-kurgu';
      case 'Tarih': return 'category-tarih';
      case 'Felsefe': return 'category-felsefe';
      case 'Biyografi': return 'category-biyografi';
      case 'Bilim': return 'category-bilim';
      default: return 'category-default';
    }
  };

  const uniqueAuthors = [...new Set(books.map(b => b.author))];

  const renderStars = (rating) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
      {Array.from({ length: rating }).map((_, i) => <StarIcon key={i} />)}
    </span>
  );

  const currentLibraryBooks = books.filter(book => book.libraryIds.includes(activeLibraryId));

  // Aktif kitaplığın raf kat sayısını alalım (artık sabit kapasite yok)
  const activeLibrary = libraries.find(l => l.id === activeLibraryId) || libraries[0] || { shelfCount: 2 };
  const shelfCount = activeLibrary.shelfCount || 2;

  // Bir kitaplığın belirli bir raf katında kaç kitap oldugunu sayar - yeni
  // kitaplar bu katin sonuna eklenir (shelf_row: 0, sirali slot_index).
  const countBooksInRow = (libraryId, shelfRow) =>
    books.filter(b => b.libraryIds.includes(libraryId) && (b.shelfRow ?? 0) === shelfRow).length;

  const handleSaveBook = async (bookData) => {
    try {
      if (bookData.id) {
        await editBook(bookData.id, bookData);
      } else {
        const libraryIds = bookData.libraryIds && bookData.libraryIds.length ? bookData.libraryIds : [activeLibraryId];

        await addBook({
          ...bookData,
          libraryIds,
          shelfRow: 0,
          slotIndex: countBooksInRow(activeLibraryId, 0),
        });
      }
      setSelectedBook(null);
    } catch (err) {
      console.error(err);
      alert(t('alerts.saveBookError'));
    }
  };

  const handleDeleteBook = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteBook(id);
    } catch (err) {
      console.error(err);
      alert(t('alerts.deleteBookError'));
    }
  };

  const openNewBookModal = () => {
    setIsAddChoiceOpen(true);
  };

  const openBookDetailModal = (book) => {
    if (draggedBookId === null) {
      setSelectedBook(book);
      setPrefillBook(null);
      setIsModalOpen(true);
    }
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

  const handleCreateLibrary = async (e) => {
    e.preventDefault();
    if (!newLibraryName.trim()) return;
    try {
      const newLib = await createLibrary({
        name: newLibraryName.trim(),
        shelfCount: 2,
        isDefault: false
      });
      setActiveLibraryId(newLib.id);
      setNewLibraryName('');
      setIsAddingLibrary(false);
    } catch (err) {
      console.error(err);
      alert(t('alerts.createLibraryError'));
    }
  };

  const handleDeleteLibrary = async (libId) => {
    try {
      await deleteLibrary(libId);
      setActiveLibraryId(null);
      await refetchBooks();
    } catch (err) {
      console.error(err);
      alert(t('alerts.deleteLibraryError'));
    }
  };

  // Yeni Raf Katı Ekle
  const handleAddShelfRow = async () => {
    try {
      await updateLibrary(activeLibraryId, { shelfCount: (activeLibrary.shelfCount || 2) + 1 });
    } catch (err) {
      console.error(err);
    }
  };

  // Raf Katı Sil - en alttaki raftaki kitaplar bir üstteki rafın sonuna taşınır
  const handleRemoveShelfRow = async () => {
    const currentShelfCount = activeLibrary.shelfCount || 2;
    if (currentShelfCount <= 1) return;

    const lastRow = currentShelfCount - 1;
    const targetRow = lastRow - 1;

    try {
      const rowBooks = currentLibraryBooks
        .filter(b => (b.shelfRow ?? 0) === lastRow)
        .sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0));

      if (rowBooks.length > 0) {
        const targetRowCount = countBooksInRow(activeLibraryId, targetRow);
        await Promise.all(
          rowBooks.map((b, i) => updateBookPosition(b.id, targetRow, targetRowCount + i))
        );
      }

      await updateLibrary(activeLibraryId, { shelfCount: currentShelfCount - 1 });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDragStart = (e, bookId) => {
    setDraggedBookId(bookId);
    e.dataTransfer.setData('text/plain', bookId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedBookId(null);
    setDragOverTarget(null);
  };

  // targetBookId === null -> ilgili rafın sonuna ekle
  const handleDropAt = async (targetShelfRow, targetBookId) => {
    const activeBookId = draggedBookId;
    const activeBook = books.find(b => b.id === activeBookId);
    if (!activeBook) {
      handleDragEnd();
      return;
    }

    const originRow = activeBook.shelfRow ?? 0;

    const rows = {};
    currentLibraryBooks.forEach((b) => {
      const row = b.shelfRow ?? 0;
      if (!rows[row]) rows[row] = [];
      rows[row].push(b);
    });
    Object.values(rows).forEach((arr) => arr.sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0)));

    rows[originRow] = (rows[originRow] || []).filter((b) => b.id !== activeBookId);
    if (!rows[targetShelfRow]) rows[targetShelfRow] = [];

    const insertIndex = targetBookId === null
      ? rows[targetShelfRow].length
      : (() => {
          const idx = rows[targetShelfRow].findIndex((b) => b.id === targetBookId);
          return idx === -1 ? rows[targetShelfRow].length : idx;
        })();

    rows[targetShelfRow].splice(insertIndex, 0, activeBook);

    const touchedRows = new Set([originRow, targetShelfRow]);
    const updates = [];
    touchedRows.forEach((rowKey) => {
      (rows[rowKey] || []).forEach((b, idx) => {
        if ((b.shelfRow ?? 0) !== rowKey || (b.slotIndex ?? 0) !== idx) {
          updates.push(updateBookPosition(b.id, rowKey, idx));
        }
      });
    });

    try {
      await Promise.all(updates);
    } catch (err) {
      console.error(err);
    }

    handleDragEnd();
  };

  const filteredBooks = currentLibraryBooks.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          book.author.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'Tümü' || book.category === selectedCategory;
    const matchesAuthor = selectedAuthor === 'Tümü' || book.author === selectedAuthor;
    const matchesStatus = filterStatus === 'Tümü' || book.status === filterStatus;

    return matchesSearch && matchesCategory && matchesAuthor && matchesStatus;
  });

  if (authLoading) {
    return (
      <div className="main-container">
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '80px', fontFamily: 'var(--font-body)' }}>{t('app.loading')}</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onSignIn={signIn} onSignUp={signUp} />;
  }

  return (
    <div className="main-container" onDragEnd={handleDragEnd}>

      {booksLoading || librariesLoading ? (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '80px', fontFamily: 'var(--font-body)' }}>{t('app.loading')}</p>
      ) : (
      <>
      <AppHeader activeView={activeView} onChangeView={setActiveView} userEmail={user.email} onSignOut={signOut} />

      <LibraryToolbar
        libraries={libraries}
        activeLibraryId={activeLibraryId}
        onChangeActiveLibrary={setActiveLibraryId}
        isAddingLibrary={isAddingLibrary}
        onStartAddingLibrary={() => setIsAddingLibrary(true)}
        onCancelAddingLibrary={() => setIsAddingLibrary(false)}
        newLibraryName={newLibraryName}
        onNewLibraryNameChange={setNewLibraryName}
        onCreateLibrary={handleCreateLibrary}
        onDeleteLibrary={handleDeleteLibrary}
        onOpenAddBook={openNewBookModal}
      />

      <button
        className="ai-chat-fab"
        onClick={() => setIsAiChatOpen(true)}
        title={t('aiChat.fabTitle')}
      >
        <SparkleIcon />
      </button>

      {isAiChatOpen && (
        <AiChatDrawer userId={user.id} onClose={() => setIsAiChatOpen(false)} />
      )}

      {activeView === 'cards' && (
        <CardsView
          books={currentLibraryBooks}
          onOpenBook={openBookDetailModal}
          onDeleteBook={handleDeleteBook}
          renderStars={renderStars}
        />
      )}

      {activeView === 'table' && (
        <TableView
          books={filteredBooks}
          categories={categories}
          uniqueAuthors={uniqueAuthors}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onSelectedCategoryChange={setSelectedCategory}
          selectedAuthor={selectedAuthor}
          onSelectedAuthorChange={setSelectedAuthor}
          filterStatus={filterStatus}
          onFilterStatusChange={setFilterStatus}
          onOpenBook={openBookDetailModal}
          onDeleteBook={handleDeleteBook}
          renderStars={renderStars}
        />
      )}

      {activeView === 'shelf' && (
        <ShelfView
          books={currentLibraryBooks}
          shelfCount={shelfCount}
          draggedBookId={draggedBookId}
          dragOverTarget={dragOverTarget}
          onAddShelfRow={handleAddShelfRow}
          onRemoveShelfRow={handleRemoveShelfRow}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOverAt={(shelfRow, bookId) => setDragOverTarget({ shelfRow, bookId })}
          onDropAt={handleDropAt}
          onOpenBook={openBookDetailModal}
          getCategoryColorClass={getCategoryColorClass}
        />
      )}

      {isAddChoiceOpen && (
        <AddChoiceModal
          onClose={() => setIsAddChoiceOpen(false)}
          onBarcodeAdd={startBarcodeAdd}
          onSearchAdd={startSearchAdd}
          onBatchAdd={startBatchScanAdd}
          onManualAdd={startManualAdd}
        />
      )}

      {isScannerOpen && (
        <div className="modal-overlay" onClick={closeScanner}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '520px', padding: '0 16px', boxSizing: 'border-box' }}>
            <BarcodeScanner onScan={handleBarcodeScanned} onClose={closeScanner} />
          </div>
        </div>
      )}

      {isSearchOpen && (
        <div className="modal-overlay" onClick={closeSearch}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '520px', padding: '0 16px', boxSizing: 'border-box' }}>
            <BookSearch onSelect={handleSearchResultSelect} onClose={closeSearch} />
          </div>
        </div>
      )}

      {isBatchScanOpen && (
        <div className="modal-overlay" onClick={(e) => e.stopPropagation()}>
          <div style={{ width: '100%', maxWidth: '560px', padding: '0 16px', boxSizing: 'border-box' }}>
            <BatchScanner
              books={books}
              activeLibraryId={activeLibraryId}
              addBook={addBook}
              onClose={closeBatchScan}
              onManualAddIsbn={handleManualAddFromIsbn}
            />
          </div>
        </div>
      )}

      {isLookingUpIsbn && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '320px', padding: '30px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text)', fontFamily: 'var(--font-body)', margin: 0 }}>{t('isbnLookup.loading')}</p>
          </div>
        </div>
      )}

      {isModalOpen && (
        <BookModal
          onClose={() => { setIsModalOpen(false); setPrefillBook(null); }}
          onSave={handleSaveBook}
          selectedBook={selectedBook}
          prefillData={prefillBook}
          existingAuthors={uniqueAuthors}
          libraries={libraries}
          activeLibraryId={activeLibraryId}
        />
      )}
      </>
      )}

    </div>
  );
}

export default App;
