import { lazy, Suspense, useEffect, useRef, useState } from 'react';
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
import { useLibrary } from './hooks/useLibrary';
import { useOfflineBookQueue } from './hooks/useOfflineBookQueue';
import './App.css';

// These two components carry the zxing-wasm barcode-reading engine and are
// only needed once the user opens a scan flow - code-split via dynamic import
// to keep them out of the initial page load.
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
    deleteLibrary: deleteLibraryRow,
    refetchLibraries,
  } = useLibraries(user?.id);

  // useLibrary's mutators need refreshStats to refresh reading stats after a
  // success, but refreshStats comes from useReadingStats, which itself needs
  // the activeLibraryId that useLibrary produces - we break the circular
  // dependency with a ref: the function passed to useLibrary always reads the
  // readingStats assigned on the latest render, and mutators are only ever
  // called from a user interaction (after render has finished).
  const readingStatsRef = useRef(null);
  const library = useLibrary({
    libraries,
    addBook,
    editBook,
    deleteBook,
    refetchBooks,
    deleteLibrary: deleteLibraryRow,
    refreshStats: () => readingStatsRef.current?.refetchStats(),
  });
  const { activeLibraryId, activeLibrary } = library;
  const readingStats = useReadingStats(activeLibraryId);
  useEffect(() => {
    readingStatsRef.current = readingStats;
  });

  // The whole orchestration of the offline book-add queue (isOnline, queue
  // count, flush, add-directly-vs-queue decision) lives in
  // useOfflineBookQueue - App.jsx only injects which addBook variant
  // (single/without stats) to use and when to consider things "ready" (so a
  // flush isn't attempted before library data has loaded).
  const { isOnline, queuedCount, addOrQueueBook } = useOfflineBookQueue({
    addBook: library.addBook,
    addBookForSync: library.addBookWithoutStatsRefresh,
    refreshStats: library.refreshStats,
    isReady: Boolean(user) && !booksLoading && !librariesLoading,
  });

  const [newLibraryName, setNewLibraryName] = useState('');
  const [isAddingLibrary, setIsAddingLibrary] = useState(false);
  const [libraryNameError, setLibraryNameError] = useState(null);

  const [activeView, setActiveView] = useState('cards');

  const bookFilters = useBookFilters(books, activeLibraryId);

  // Get the active library's shelf row count (no more fixed capacity)
  const shelfCount = activeLibrary?.shelfCount || 2;

  const shelfDnd = useShelfDnd(books, activeLibraryId, shelfCount, updateLibrary, updateBookPosition);
  const addFlow = useAddBookFlow(shelfDnd.draggedBookId, isOnline);

  const renderStars = (rating) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
      {Array.from({ length: rating }).map((_, i) => <StarIcon key={i} />)}
    </span>
  );

  const currentLibraryBooks = books.filter(book => book.libraryIds.includes(activeLibraryId));

  const handleSaveBook = async (bookData) => {
    try {
      if (bookData.id) {
        await library.editBook(bookData.id, bookData);
      } else {
        const libraryIds = bookData.libraryIds && bookData.libraryIds.length ? bookData.libraryIds : [activeLibraryId];

        await addOrQueueBook({
          ...bookData,
          libraryIds,
          shelfRow: 0,
          slotIndex: shelfDnd.countBooksInRow(activeLibraryId, 0),
        });
      }
      addFlow.clearSelectedBook();
    } catch (err) {
      console.error(err);
      // BookModal catches this error and shows its own inline message while
      // keeping the form open - no separate alert() here.
      throw err;
    }
  };

  const handleDeleteBook = async (e, id) => {
    e.stopPropagation();
    try {
      await library.deleteBook(id);
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
        // The user's first library automatically becomes the main
        // (undeletable) one - guaranteeing at least one undeletable library at all times.
        isDefault: libraries.length === 0
      });
      library.setActiveLibraryId(newLib.id);
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
      await library.deleteLibrary(libId);
    } catch (err) {
      console.error(err);
      alert(t('alerts.deleteLibraryError'));
    }
  };

  // So the offline banner can also appear across the loading/auth/main-app
  // screens, these three branches were converted from separate early-returns
  // into one nested ternary inside a single return - each branch's own
  // content is kept exactly as before.
  return (
    <>
      {!isOnline && (
        <div className="offline-banner" role="status">
          {t('app.offlineBanner')}
          {queuedCount > 0 && ' ' + t('app.offlineBannerQueued', { count: queuedCount })}
        </div>
      )}
      {authLoading ? (
        <div className="main-container">
          <p className="app-loading-text">{t('app.loading')}</p>
        </div>
      ) : !user ? (
        <AuthScreen
          onSignIn={signIn}
          onSignUp={signUp}
          redirectError={redirectError}
          accountDeletedNotice={accountDeletedNotice}
        />
      ) : (
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
          books={books}
          addBook={addBook}
          libraries={libraries}
          onClose={() => setIsSettingsOpen(false)}
          onAccountDeleted={() => {
            setIsSettingsOpen(false);
            // Account deletion is unrelated to the verification-link error -
            // but redirectError can stay in memory for this tab's whole
            // lifetime (e.g. user landed with an invalid link, then signed in
            // and deleted their account). Since the two aren't meaningful
            // together, we clear it deliberately, otherwise AuthScreen would
            // show two stacked messages.
            clearRedirectError();
            setAccountDeletedNotice(true);
          }}
        />
      )}

      <LibraryToolbar
        libraries={libraries}
        activeLibraryId={activeLibraryId}
        onChangeActiveLibrary={library.setActiveLibraryId}
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
          uniqueTags={bookFilters.uniqueTags}
          searchQuery={bookFilters.searchQuery}
          onSearchQueryChange={bookFilters.setSearchQuery}
          selectedCategory={bookFilters.selectedCategory}
          onSelectedCategoryChange={bookFilters.setSelectedCategory}
          selectedAuthor={bookFilters.selectedAuthor}
          onSelectedAuthorChange={bookFilters.setSelectedAuthor}
          selectedTag={bookFilters.selectedTag}
          onSelectedTagChange={bookFilters.setSelectedTag}
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
          shelfDnd={shelfDnd}
          onOpenBook={addFlow.openBookDetailModal}
        />
      )}

      {activeView === 'dashboard' && (
        <DashboardPage libraryId={activeLibraryId} libraryName={activeLibrary?.name} books={currentLibraryBooks} />
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
                addBook={addOrQueueBook}
                isOnline={isOnline}
                onBatchSaved={library.refreshStats}
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
          existingTags={bookFilters.uniqueTags}
          libraries={libraries}
          activeLibraryId={activeLibraryId}
        />
      )}
      </>
      )}

    </div>
      )}
    </>
  );
}

export default App;
