import { useTranslation } from 'react-i18next';
import { TrashIcon } from '../icons/Icons';

function TableView({
  books,
  categories,
  uniqueAuthors,
  searchQuery,
  onSearchQueryChange,
  selectedCategory,
  onSelectedCategoryChange,
  selectedAuthor,
  onSelectedAuthorChange,
  filterStatus,
  onFilterStatusChange,
  onOpenBook,
  onDeleteBook,
  renderStars,
}) {
  const { t } = useTranslation();

  return (
    <main className="book-list-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', margin: 0, color: 'var(--text)' }}>{t('table.heading')}</h2>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="text" placeholder={t('table.searchPlaceholder')} aria-label={t('table.searchPlaceholder')} value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)} className="form-input"
            style={{ width: '180px' }}
          />

          <select className="form-select" aria-label={t('table.categoryFilterLabel')} value={selectedCategory} onChange={(e) => onSelectedCategoryChange(e.target.value)}>
            <option value="Tümü">{t('table.allCategories')}</option>
            {categories.map((cat) => <option key={cat} value={cat}>{t(`categories.${cat}`, cat)}</option>)}
          </select>

          <select className="form-select" aria-label={t('table.authorFilterLabel')} value={selectedAuthor} onChange={(e) => onSelectedAuthorChange(e.target.value)}>
            <option value="Tümü">{t('table.allAuthors')}</option>
            {uniqueAuthors.map((author) => <option key={author} value={author}>{author}</option>)}
          </select>

          <select className="form-select" aria-label={t('table.statusFilterLabel')} value={filterStatus} onChange={(e) => onFilterStatusChange(e.target.value)}>
            <option value="Tümü">{t('table.allStatuses')}</option>
            <option value="Başlanmadı">{t('statuses.Başlanmadı')}</option>
            <option value="Okunuyor">{t('statuses.Okunuyor')}</option>
            <option value="Tamamlandı">{t('statuses.Tamamlandı')}</option>
            <option value="Yarıda Bırakıldı">{t('statuses.Yarıda Bırakıldı')}</option>
          </select>
        </div>
      </div>

      {books.length === 0 ? (
        <div className="empty-state"><p>{t('table.empty')}</p></div>
      ) : (
        <div style={{ overflowX: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px', fontFamily: 'var(--font-body)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', background: 'var(--surface-alt)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>{t('table.colTitle')}</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>{t('table.colAuthor')}</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>{t('table.colPublisher')}</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>{t('table.colCategory')}</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>{t('table.colStatus')}</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>{t('table.colRating')}</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>{t('table.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {books.map((book) => (
                <tr key={book.id} onClick={() => onOpenBook(book)} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>{book.title}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{book.author}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{book.publisher || '-'}</td>
                  <td style={{ padding: '12px 16px' }}>{book.category ? <span className="property-tag category">{t(`categories.${book.category}`, book.category)}</span> : '-'}</td>
                  <td style={{ padding: '12px 16px' }}><span className={`property-tag status ${book.status.toLowerCase().replace(/\s+/g, '-')}`}>{t(`statuses.${book.status}`, book.status)}</span></td>
                  <td style={{ padding: '12px 16px' }}>{book.rating > 0 ? renderStars(book.rating) : '-'}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button className="table-delete-btn" onClick={(e) => onDeleteBook(e, book.id)} title={t('table.deleteTitle')} aria-label={t('table.deleteTitle')}><TrashIcon /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

export default TableView;
