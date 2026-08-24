import { useTranslation } from 'react-i18next';

function CardsView({ books, onOpenBook, onDeleteBook, renderStars }) {
  const { t } = useTranslation();

  return (
    <main className="book-list-container">
      {books.length === 0 ? (
        <div className="empty-state"><p>{t('cards.empty')}</p></div>
      ) : (
        <div className="book-cards-grid">
          {books.map((book) => (
            <div key={book.id} className="book-card" onClick={() => onOpenBook(book)} style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
              {book.coverImage ? (
                <div className="card-cover-banner">
                  <img src={book.coverImage} alt={book.title} className="card-cover-image" style={{ objectPosition: `center ${book.coverPosition || 50}%` }} />
                  <div className="card-cover-hover-hint">{t('cards.editCover')}</div>
                </div>
              ) : (
                <div className="card-cover-banner placeholder">
                  <span className="card-cover-placeholder-icon">+</span>
                  <div className="card-cover-hover-hint">{t('cards.addCover')}</div>
                </div>
              )}

              <div className="card-content" style={{ padding: '15px 20px 20px 20px' }}>
                <h3 className="card-title">{book.title}</h3>
                <p className="card-author">{t('cards.author')}: {book.author}</p>
                {book.publisher && <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 8px 0' }}>{t('cards.publisher')}: {book.publisher}</p>}

                <div className="card-properties">
                  {book.rating > 0 && <span className="property-tag rating">{renderStars(book.rating)}</span>}
                  {book.category && <span className="property-tag category">{t(`categories.${book.category}`, book.category)}</span>}
                  <span className={`property-tag status ${book.status.toLowerCase().replace(/\s+/g, '-')}`}>{t(`statuses.${book.status}`, book.status)}</span>
                </div>
              </div>

              <button onClick={(e) => onDeleteBook(e, book.id)} className="delete-card-btn">{t('cards.delete')}</button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

export default CardsView;
