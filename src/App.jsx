import { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import BookModal from './components/BookModal/BookModal';
import BookSearch from './components/BookSearch/BookSearch';
import AppHeader from './components/AppHeader/AppHeader';
import LibraryToolbar from './components/LibraryToolbar/LibraryToolbar';
import CardsView from './components/CardsView/CardsView';
import TableView from './components/TableView/TableView';
import ShelfView from './components/ShelfView/ShelfView';
import AddChoiceModal from './components/AddChoiceModal/AddChoiceModal';
import AuthScreen from './components/AuthScreen/AuthScreen';
import AiChatDrawer from './components/AiChatDrawer/AiChatDrawer';
import SettingsModal from './components/SettingsModal/SettingsModal';
import ReadingStats from './components/ReadingStats/ReadingStats';
import DashboardPage from './components/DashboardPage/DashboardPage';
import { StarIcon, SparkleIcon } from './components/icons/Icons';
import { useAuth } from './hooks/useAuth';
import { useAuthRedirectError } from './hooks/useAuthRedirectError';
import { useBooks } from './hooks/useBooks';
import { useLibraries } from './hooks/useLibraries';
import { useReadingStats } from './hooks/useReadingStats';
import { useAddBookFlow } from './hooks/useAddBookFlow';
import { useShelfDnd } from './hooks/useShelfDnd';
import { useBookFilters } from './hooks/useBookFilters';
import './App.css';

// zxing-wasm barkod okuma motorunu tasiyan bu iki bilesen sadece kullanici
// tarama akisini actiginda gerekiyor - ilk sayfa yukunden ayirmak icin
// dinamik import ile code-split ediliyor.
const BarcodeScanner = lazy(() => import('./components/BarcodeScanner/BarcodeScanner'));
const BatchScanner = lazy(() => import('./components/BatchScanner/BatchScanner'));

function App() {
  const { t } = useTranslation();
  const { user, loading: authLoading, signIn, signUp, signOut } = useAuth();
  const [redirectError, clearRedirectError] = useAuthRedirectError();
  const [accountDeletedNotice, setAccountDeletedNotice] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const {
    books,
    loading: booksLoading,
    error: booksError,
    addBook,
    editBook,
    deleteBook,
    updateBookPosition,
    refetchBooks,
  } = useBooks(user?.id);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);

  const {
    libraries,
    loading: librariesLoading,
    error: librariesError,
    createLibrary,
    updateLibrary,
    deleteLibrary,
    refetchLibraries,
  } = useLibraries(user?.id);
  const [explicitActiveLibraryId, setActiveLibraryId] = useState(null);
  const defaultLibrary = libraries.find((lib) => lib.isDefault) || libraries[0] || null;
  const activeLibraryId = explicitActiveLibraryId ?? defaultLibrary?.id ?? null;
  const readingStats = useReadingStats(activeLibraryId);
  const [newLibraryName, setNewLibraryName] = useState('');
  const [isAddingLibrary, setIsAddingLibrary] = useState(false);
  const [libraryNameError, setLibraryNameError] = useState(null);

  const [activeView, setActiveView] = useState('cards');

  const bookFilters = useBookFilters(books, activeLibraryId);

  // Aktif kitaplığın raf kat sayısını alalım (artık sabit kapasite yok)
  const activeLibrary = libraries.find(l => l.id === activeLibraryId) || libraries[0] || { shelfCount: 2 };
  const shelfCount = activeLibrary.shelfCount || 2;

  const shelfDnd = useShelfDnd(books, activeLibraryId, shelfCount, updateLibrary, updateBookPosition);
  const addFlow = useAddBookFlow(shelfDnd.draggedBookId);

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

  const renderStars = (rating) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
      {Array.from({ length: rating }).map((_, i) => <StarIcon key={i} />)}
    </span>
  );

  const currentLibraryBooks = books.filter(book => book.libraryIds.includes(activeLibraryId));

  // Ana kitaplık silinemez ve her kitap her zaman ona bağlı kalır - bu sayede
  // başka bir kitaplık silinse bile kitaplar veritabanında "sahipsiz" kalıp
  // hem gorunmez olmuyor hem de tekrar eklenmeye calisilinca cakismiyor.
  // Tum ekleme yollarindan (BookModal, BatchScanner) gecen tek ortak nokta
  // burasi oldugu icin garanti burada uygulaniyor.
  const withDefaultLibrary = (libraryIds) => {
    const ids = new Set(libraryIds || []);
    if (defaultLibrary?.id) ids.add(defaultLibrary.id);
    return Array.from(ids);
  };

  const addBookToLibrary = async (bookFields) => {
    const result = await addBook({ ...bookFields, libraryIds: withDefaultLibrary(bookFields.libraryIds) });
    // Kitap sayısı/sayfa/puan gibi okuma istatistikleri kitaplardan ayrı bir
    // RPC ile hesaplanıyor, books state'i değişince otomatik güncellenmiyor -
    // her ekleme/düzenleme/silmeden sonra elle tazeleniyor.
    readingStats.refetchStats();
    return result;
  };

  const handleSaveBook = async (bookData) => {
    try {
      if (bookData.id) {
        await editBook(bookData.id, { ...bookData, libraryIds: withDefaultLibrary(bookData.libraryIds) });
        readingStats.refetchStats();
      } else {
        const libraryIds = bookData.libraryIds && bookData.libraryIds.length ? bookData.libraryIds : [activeLibraryId];

        await addBookToLibrary({
          ...bookData,
          libraryIds,
          shelfRow: 0,
          slotIndex: shelfDnd.countBooksInRow(activeLibraryId, 0),
        });
      }
      addFlow.clearSelectedBook();
    } catch (err) {
      console.error(err);
      // BookModal bu hatayi yakalayip kendi satir ici mesajini gosterip
      // formu acik tutuyor - burada ayrica alert() gostermiyoruz.
      throw err;
    }
  };

  const handleDeleteBook = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteBook(id);
      readingStats.refetchStats();
    } catch (err) {
      console.error(err);
      alert(t('alerts.deleteBookError'));
    }
  };

  const handleCreateLibrary = async (e) => {
    e.preventDefault();
    if (!newLibraryName.trim()) {
      setLibraryNameError(t('toolbar.nameRequired'));
      return;
    }
    try {
      const newLib = await createLibrary({
        name: newLibraryName.trim(),
        shelfCount: 2,
        // Kullanicinin ilk kitapligi otomatik olarak ana (silinemez) kitaplik
        // olur - boylece her zaman en az bir silinmez kitaplik garanti edilir.
        isDefault: libraries.length === 0
      });
      setActiveLibraryId(newLib.id);
      setNewLibraryName('');
      setIsAddingLibrary(false);
      setLibraryNameError(null);
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

  if (authLoading) {
    return (
      <div className="main-container">
        <p className="app-loading-text">{t('app.loading')}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthScreen
        onSignIn={signIn}
        onSignUp={signUp}
        redirectError={redirectError}
        accountDeletedNotice={accountDeletedNotice}
      />
    );
  }

  return (
    <div className="main-container" onDragEnd={shelfDnd.handleDragEnd}>

      {booksLoading || librariesLoading ? (
        <p className="app-loading-text">{t('app.loading')}</p>
      ) : booksError || librariesError ? (
        <div className="app-load-error">
          <p>{t('app.loadError')}</p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => { refetchBooks(); refetchLibraries(); }}
          >
            {t('app.retry')}
          </button>
        </div>
      ) : (
      <>
      <AppHeader
        activeView={activeView}
        onChangeView={setActiveView}
        userEmail={user.email}
        onSignOut={signOut}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {isSettingsOpen && (
        <SettingsModal
          userEmail={user.email}
          onClose={() => setIsSettingsOpen(false)}
          onAccountDeleted={() => {
            setIsSettingsOpen(false);
            // Hesap silme, doğrulama linki hatasıyla alakasız - ama
            // redirectError bu sekmenin tüm ömrü boyunca hafızada kalabilir
            // (ör. kullanıcı gecersiz linkle inip sonra giriş yapıp hesabını
            // sildiyse). İkisi aynı anda anlamlı olmadığı için bilinçli
            // olarak temizliyoruz, aksi halde AuthScreen'de iki mesaj üst
            // üste görünür.
            clearRedirectError();
            setAccountDeletedNotice(true);
          }}
        />
      )}

      <LibraryToolbar
        libraries={libraries}
        activeLibraryId={activeLibraryId}
        onChangeActiveLibrary={setActiveLibraryId}
        isAddingLibrary={isAddingLibrary}
        onStartAddingLibrary={() => { setIsAddingLibrary(true); setLibraryNameError(null); }}
        onCancelAddingLibrary={() => { setIsAddingLibrary(false); setLibraryNameError(null); }}
        newLibraryName={newLibraryName}
        onNewLibraryNameChange={(value) => { setNewLibraryName(value); setLibraryNameError(null); }}
        newLibraryNameError={libraryNameError}
        onCreateLibrary={handleCreateLibrary}
        onDeleteLibrary={handleDeleteLibrary}
        onOpenAddBook={addFlow.openNewBookModal}
      />

      {activeView !== 'dashboard' && <ReadingStats stats={readingStats} />}

      <button
        className="ai-chat-fab"
        onClick={() => setIsAiChatOpen(true)}
        title={t('aiChat.fabTitle')}
        aria-label={t('aiChat.fabTitle')}
      >
        <SparkleIcon />
      </button>

      {isAiChatOpen && (
        <AiChatDrawer userId={user.id} onClose={() => setIsAiChatOpen(false)} />
      )}

      {activeView === 'cards' && (
        <CardsView
          books={currentLibraryBooks}
          onOpenBook={addFlow.openBookDetailModal}
          onDeleteBook={handleDeleteBook}
          renderStars={renderStars}
        />
      )}

      {activeView === 'table' && (
        <TableView
          books={bookFilters.filteredBooks}
          categories={bookFilters.categories}
          uniqueAuthors={bookFilters.uniqueAuthors}
          searchQuery={bookFilters.searchQuery}
          onSearchQueryChange={bookFilters.setSearchQuery}
          selectedCategory={bookFilters.selectedCategory}
          onSelectedCategoryChange={bookFilters.setSelectedCategory}
          selectedAuthor={bookFilters.selectedAuthor}
          onSelectedAuthorChange={bookFilters.setSelectedAuthor}
          filterStatus={bookFilters.filterStatus}
          onFilterStatusChange={bookFilters.setFilterStatus}
          onOpenBook={addFlow.openBookDetailModal}
          onDeleteBook={handleDeleteBook}
          renderStars={renderStars}
        />
      )}

      {activeView === 'shelf' && (
        <ShelfView
          books={currentLibraryBooks}
          shelfCount={shelfCount}
          draggedBookId={shelfDnd.draggedBookId}
          dragOverTarget={shelfDnd.dragOverTarget}
          onAddShelfRow={shelfDnd.handleAddShelfRow}
          onRemoveShelfRow={shelfDnd.handleRemoveShelfRow}
          onDragStart={shelfDnd.handleDragStart}
          onDragEnd={shelfDnd.handleDragEnd}
          onDragOverAt={shelfDnd.onDragOverAt}
          onDropAt={shelfDnd.handleDropAt}
          onOpenBook={addFlow.openBookDetailModal}
          getCategoryColorClass={getCategoryColorClass}
        />
      )}

      {activeView === 'dashboard' && (
        <DashboardPage libraryId={activeLibraryId} libraryName={activeLibrary.name} />
      )}

      {addFlow.isAddChoiceOpen && (
        <AddChoiceModal
          onClose={addFlow.closeAddChoice}
          onBarcodeAdd={addFlow.startBarcodeAdd}
          onSearchAdd={addFlow.startSearchAdd}
          onBatchAdd={addFlow.startBatchScanAdd}
          onManualAdd={addFlow.startManualAdd}
        />
      )}

      {addFlow.isScannerOpen && (
        <div className="modal-overlay" onClick={addFlow.closeScanner}>
          <div onClick={(e) => e.stopPropagation()} className="modal-inline-panel modal-inline-panel--wide">
            <Suspense fallback={null}>
              <BarcodeScanner onScan={addFlow.handleBarcodeScanned} onClose={addFlow.closeScanner} />
            </Suspense>
          </div>
        </div>
      )}

      {addFlow.isSearchOpen && (
        <div className="modal-overlay" onClick={addFlow.closeSearch}>
          <div onClick={(e) => e.stopPropagation()} className="modal-inline-panel">
            <BookSearch onSelect={addFlow.handleSearchResultSelect} onClose={addFlow.closeSearch} />
          </div>
        </div>
      )}

      {addFlow.isBatchScanOpen && (
        <div className="modal-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="modal-inline-panel modal-inline-panel--wide">
            <Suspense fallback={null}>
              <BatchScanner
                books={books}
                activeLibraryId={activeLibraryId}
                addBook={addBookToLibrary}
                onClose={addFlow.closeBatchScan}
                onManualAddIsbn={addFlow.handleManualAddFromIsbn}
              />
            </Suspense>
          </div>
        </div>
      )}

      {addFlow.isLookingUpIsbn && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '320px', padding: '30px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text)', fontFamily: 'var(--font-body)', margin: 0 }}>{t('isbnLookup.loading')}</p>
          </div>
        </div>
      )}

      {addFlow.isModalOpen && (
        <BookModal
          onClose={addFlow.closeBookModal}
          onSave={handleSaveBook}
          selectedBook={addFlow.selectedBook}
          prefillData={addFlow.prefillBook}
          existingAuthors={bookFilters.uniqueAuthors}
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
