import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import BarcodeScanner from '../BarcodeScanner/BarcodeScanner';
import { getBookByIsbn } from '../../lib/openLibrary';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import './BatchScanner.css';

const ClockIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>);
const QuestionIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.4 2.3c-.9.4-1.4 1-1.4 1.9v.3" /><path d="M12 17h.01" /></svg>);
const BookGlyphIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 5.5C4 4.7 4.7 4 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5v-13z" /><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H12v16h6.5a1.5 1.5 0 0 0 1.5-1.5v-13z" /></svg>);
const CheckCircleIcon = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.3 2.3L16 10" /></svg>);
const CelebrateIcon = () => (<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.6"><path d="M4 20l3-9 9-3-3 9z" /><path d="M15 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" /><path d="M19 13l.6 1.4L21 15l-1.4.6L19 17l-.6-1.4L17 15l1.4-.6z" /></svg>);

// Ayni ISBN kisa sure icinde tekrar okunursa (barkod hala kamera karesinde
// dururken) yeniden islenmesin diye bekleme suresi.
const REPROCESS_COOLDOWN_MS = 4000;

function BatchScanner({ books, activeLibraryId, addBook, onClose, onManualAddIsbn }) {
  const { t } = useTranslation();
  useEscapeKey(onClose);
  const [phase, setPhase] = useState('scanning'); // 'scanning' | 'review' | 'done'
  const [entries, setEntries] = useState([]); // { isbn, status: 'pending'|'found'|'not_found', book }
  const lastSeenMapRef = useRef(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [savedCount, setSavedCount] = useState(0);

  const handleDetected = (isbn) => {
    const now = Date.now();
    const lastSeen = lastSeenMapRef.current.get(isbn);
    if (lastSeen && now - lastSeen < REPROCESS_COOLDOWN_MS) return;
    lastSeenMapRef.current.set(isbn, now);

    setEntries((prev) => {
      if (prev.some((e) => e.isbn === isbn)) return prev;
      return [...prev, { isbn, status: 'pending', book: null }];
    });

    getBookByIsbn(isbn)
      .then((book) => {
        setEntries((prev) =>
          prev.map((e) => (e.isbn === isbn ? { ...e, status: book ? 'found' : 'not_found', book } : e))
        );
      })
      .catch((err) => {
        console.error(err);
        setEntries((prev) => prev.map((e) => (e.isbn === isbn ? { ...e, status: 'not_found', book: null } : e)));
      });
  };

  const handleRemoveEntry = (isbn) => {
    setEntries((prev) => prev.filter((e) => e.isbn !== isbn));
  };

  const handleFinish = () => {
    setPhase('review');
  };

  const handleSaveAll = async () => {
    const foundEntries = entries.filter((e) => e.status === 'found' && e.book);
    if (foundEntries.length === 0) return;

    setIsSaving(true);
    setSaveError(null);

    let nextSlot = books.filter(
      (b) => b.libraryIds.includes(activeLibraryId) && (b.shelfRow ?? 0) === 0
    ).length;

    let saved = 0;
    try {
      for (const entry of foundEntries) {
        await addBook({
          title: entry.book.title || t('batchScanner.untitled'),
          author: entry.book.author || t('batchScanner.unknownAuthorFallback'),
          publisher: entry.book.publisher || '',
          coverImage: entry.book.coverImage || '',
          isbn: entry.book.isbn || entry.isbn,
          pageCount: entry.book.pageCount || null,
          libraryIds: [activeLibraryId],
          shelfRow: 0,
          slotIndex: nextSlot,
          notesList: [],
        });
        saved++;
        nextSlot++;
      }
      setSavedCount(saved);
      setPhase('done');
    } catch (err) {
      console.error(err);
      setSavedCount(saved);
      setSaveError(t('batchScanner.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const foundEntries = entries.filter((e) => e.status === 'found');
  const notFoundEntries = entries.filter((e) => e.status === 'not_found');
  const pendingCount = entries.filter((e) => e.status === 'pending').length;

  return (
    <div className="batch-scanner">
      {phase === 'scanning' && (
        <>
          <BarcodeScanner
            continuous
            title={t('batchScanner.headerTitle')}
            onScan={handleDetected}
            onFinish={handleFinish}
            onClose={onClose}
          />

          <div className="batch-scanner-list-card">
            <div className="batch-scanner-list-header">
              <span>{t('batchScanner.scannedBooks', { count: entries.length })}</span>
              {pendingCount > 0 && <span className="batch-scanner-pending-label">{t('batchScanner.querying', { count: pendingCount })}</span>}
            </div>

            {entries.length === 0 ? (
              <p className="batch-scanner-empty-hint">{t('batchScanner.scanEmpty')}</p>
            ) : (
              <ul className="batch-scanner-list">
                {entries
                  .slice()
                  .reverse()
                  .map((entry) => (
                    <li key={entry.isbn} className="batch-scanner-row">
                      {entry.status === 'found' && entry.book?.coverImage ? (
                        <img src={entry.book.coverImage} alt={entry.book.title} className="batch-scanner-cover" />
                      ) : (
                        <div className="batch-scanner-cover batch-scanner-cover-placeholder">
                          {entry.status === 'pending' ? <ClockIcon /> : entry.status === 'not_found' ? <QuestionIcon /> : <BookGlyphIcon />}
                        </div>
                      )}
                      <div className="batch-scanner-row-info">
                        {entry.status === 'pending' && <span className="batch-scanner-row-title">ISBN: {entry.isbn}</span>}
                        {entry.status === 'found' && (
                          <>
                            <span className="batch-scanner-row-title">{entry.book.title}</span>
                            <span className="batch-scanner-row-author">{entry.book.author || t('batchScanner.unknownAuthor')}</span>
                          </>
                        )}
                        {entry.status === 'not_found' && (
                          <span className="batch-scanner-row-title batch-scanner-row-not-found">
                            {t('batchScanner.notFoundLabel', { isbn: entry.isbn })}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </>
      )}

      {phase === 'review' && (
        <div className="batch-scanner-review-card">
          <div className="batch-scanner-list-header">
            <span>{t('batchScanner.reviewTitle', { count: entries.length })}</span>
            <button type="button" onClick={onClose} className="barcode-scanner-close" title={t('batchScanner.close')}>×</button>
          </div>

          <div className="batch-scanner-review-body">
            <h4 className="batch-scanner-section-title"><CheckCircleIcon /> {t('batchScanner.foundSection', { count: foundEntries.length })}</h4>
            {foundEntries.length === 0 ? (
              <p className="batch-scanner-empty-hint">{t('batchScanner.nothingToSave')}</p>
            ) : (
              <ul className="batch-scanner-list">
                {foundEntries.map((entry) => (
                  <li key={entry.isbn} className="batch-scanner-row">
                    {entry.book.coverImage ? (
                      <img src={entry.book.coverImage} alt={entry.book.title} className="batch-scanner-cover" />
                    ) : (
                      <div className="batch-scanner-cover batch-scanner-cover-placeholder"><BookGlyphIcon /></div>
                    )}
                    <div className="batch-scanner-row-info">
                      <span className="batch-scanner-row-title">{entry.book.title}</span>
                      <span className="batch-scanner-row-author">{entry.book.author || t('batchScanner.unknownAuthor')}</span>
                    </div>
                    <button
                      type="button"
                      className="batch-scanner-remove-btn"
                      onClick={() => handleRemoveEntry(entry.isbn)}
                      title={t('batchScanner.removeFromList')}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {notFoundEntries.length > 0 && (
              <>
                <h4 className="batch-scanner-section-title"><QuestionIcon /> {t('batchScanner.notFoundSection', { count: notFoundEntries.length })}</h4>
                <ul className="batch-scanner-list">
                  {notFoundEntries.map((entry) => (
                    <li key={entry.isbn} className="batch-scanner-row">
                      <div className="batch-scanner-cover batch-scanner-cover-placeholder"><QuestionIcon /></div>
                      <div className="batch-scanner-row-info">
                        <span className="batch-scanner-row-title">ISBN: {entry.isbn}</span>
                        <span className="batch-scanner-row-author">{t('batchScanner.openLibraryNotFound')}</span>
                      </div>
                      <button
                        type="button"
                        className="batch-scanner-manual-btn"
                        onClick={() => onManualAddIsbn(entry.isbn)}
                      >
                        {t('batchScanner.manualAdd')}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {saveError && <p className="batch-scanner-error-text">{saveError}</p>}
          </div>

          <div className="batch-scanner-footer">
            <button type="button" className="batch-scanner-secondary-btn" onClick={() => setPhase('scanning')}>
              {t('batchScanner.scanMore')}
            </button>
            <button
              type="button"
              className="batch-scanner-save-btn"
              onClick={handleSaveAll}
              disabled={foundEntries.length === 0 || isSaving}
            >
              {isSaving ? t('batchScanner.saving') : t('batchScanner.saveAll', { count: foundEntries.length })}
            </button>
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div className="batch-scanner-review-card">
          <div className="batch-scanner-list-header">
            <span>{t('batchScanner.done')}</span>
          </div>
          <div className="batch-scanner-review-body batch-scanner-done-body">
            <CelebrateIcon />
            <p>{t('batchScanner.doneMessage', { count: savedCount })}</p>
          </div>
          <div className="batch-scanner-footer">
            <button type="button" className="batch-scanner-save-btn" onClick={onClose}>
              {t('batchScanner.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BatchScanner;
