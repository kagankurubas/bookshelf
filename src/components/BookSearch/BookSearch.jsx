import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { searchBooks } from '../../lib/openLibrary';
import './BookSearch.css';

const DEBOUNCE_MS = 400;

const SearchHeaderIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
);
const BookPlaceholderIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 5.5C4 4.7 4.7 4 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5v-13z" /><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H12v16h6.5a1.5 1.5 0 0 0 1.5-1.5v-13z" /></svg>
);

function BookSearch({ onSelect, onClose }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | success | empty | error

  const handleQueryChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
      setStatus('idle');
    }
  };

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return undefined;
    }

    let cancelled = false;

    const timeoutId = setTimeout(() => {
      setStatus('loading');
      searchBooks(trimmed)
        .then((data) => {
          if (cancelled) return;
          setResults(data);
          setStatus(data.length > 0 ? 'success' : 'empty');
        })
        .catch((err) => {
          if (cancelled) return;
          console.error(err);
          setResults([]);
          setStatus('error');
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [query]);

  return (
    <div className="book-search">
      <div className="book-search-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><SearchHeaderIcon /> {t('bookSearch.headerTitle')}</span>
        <button type="button" onClick={onClose} className="book-search-close" title={t('bookSearch.close')}>×</button>
      </div>

      <div className="book-search-input-row">
        <input
          type="text"
          className="book-search-input"
          placeholder={t('bookSearch.inputPlaceholder')}
          value={query}
          onChange={handleQueryChange}
          autoFocus
        />
      </div>

      <div className="book-search-results">
        {status === 'idle' && <p className="book-search-hint">{t('bookSearch.idle')}</p>}
        {status === 'loading' && <p className="book-search-hint">{t('bookSearch.loading')}</p>}
        {status === 'error' && <p className="book-search-hint">{t('bookSearch.error')}</p>}
        {status === 'empty' && <p className="book-search-hint">{t('bookSearch.empty')}</p>}
        {status === 'success' && (
          <ul className="book-search-list">
            {results.map((book, index) => (
              <li
                key={`${book.isbn || book.title}-${index}`}
                className="book-search-item"
                onClick={() => onSelect(book)}
              >
                {book.coverImage ? (
                  <img src={book.coverImage} alt={book.title} className="book-search-cover" />
                ) : (
                  <div className="book-search-cover book-search-cover-placeholder"><BookPlaceholderIcon /></div>
                )}
                <div className="book-search-item-info">
                  <span className="book-search-item-title">{book.title}</span>
                  <span className="book-search-item-author">{book.author || t('bookSearch.unknownAuthor')}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default BookSearch;
