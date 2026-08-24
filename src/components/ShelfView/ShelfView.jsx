import { useTranslation } from 'react-i18next';
import { PlusIcon } from '../icons/Icons';

// Kitap sırtlarının gerçek bir kitaplıktaki gibi biraz farklı en/boyda
// görünmesi için, kitabın id'sinden deterministik (her renderda aynı)
// bir boyut türetiyoruz - rastgele state tutmaya gerek kalmıyor.
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getSpineSize(id) {
  const hash = hashString(String(id));
  const width = 46 + (hash % 17); // 46-62px
  const height = 138 + ((hash >> 4) % 35); // 138-172px
  return { width, height };
}

function ShelfView({
  books,
  shelfCount,
  draggedBookId,
  dragOverTarget,
  onAddShelfRow,
  onRemoveShelfRow,
  onDragStart,
  onDragEnd,
  onDragOverAt,
  onDropAt,
  onOpenBook,
  getCategoryColorClass,
}) {
  const { t } = useTranslation();

  const rows = Array.from({ length: shelfCount }).map((_, rowIndex) =>
    books
      .filter((b) => (b.shelfRow ?? 0) === rowIndex)
      .slice()
      .sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0))
  );

  return (
    <main className="wooden-shelf-main-wrapper" onDragEnd={onDragEnd}>

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '25px', gap: '8px' }}>
        <button
          onClick={onAddShelfRow}
          className="chip-btn"
          title={t('shelf.addRowTitle')}
        >
          <PlusIcon size={11} /> {t('shelf.addRow')}
        </button>

        {shelfCount > 1 && (
          <button
            onClick={onRemoveShelfRow}
            className="btn-danger-outline"
            title={t('shelf.removeRowTitle')}
          >
            − {t('shelf.removeRow')}
          </button>
        )}
      </div>

      <div className="wooden-shelf-container">
        {rows.map((rowBooks, rowIndex) => {
          const isAppendHovered = dragOverTarget?.shelfRow === rowIndex && dragOverTarget?.bookId === null;

          if (rowBooks.length === 0) {
            return (
              <div
                key={rowIndex}
                className={`shelf-row-empty ${isAppendHovered ? 'drag-over' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  onDragOverAt(rowIndex, null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  onDropAt(rowIndex, null);
                }}
              >
                <span>{t('shelf.emptyRowHint')}</span>
              </div>
            );
          }

          return (
            <div key={rowIndex} className="shelf-row-scroll">
              <div className="shelf-row">
                <div className="shelf-line"></div>

                {rowBooks.map((book) => {
                  const colorClass = getCategoryColorClass(book.category);
                  const isHovered = dragOverTarget?.shelfRow === rowIndex && dragOverTarget?.bookId === book.id;
                  const { width, height } = getSpineSize(book.id);

                  return (
                    <div
                      key={book.id}
                      className={`shelf-book ${colorClass} ${draggedBookId === book.id ? 'dragging' : ''} ${isHovered ? 'drag-over' : ''}`}
                      draggable
                      onDragStart={(e) => onDragStart(e, book.id)}
                      onDragEnd={onDragEnd}
                      onDragOver={(e) => {
                        e.preventDefault();
                        onDragOverAt(rowIndex, book.id);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        onDropAt(rowIndex, book.id);
                      }}
                      onClick={() => onOpenBook(book)}
                      title={`${book.title} (${t(`categories.${book.category}`, book.category)}) - ${t('shelf.dragHint')}`}
                      style={{ width: `${width}px`, height: `${height}px` }}
                    >
                      <span className="shelf-book-band top"></span>
                      <span className="shelf-book-band bottom"></span>
                      <span className="shelf-book-highlight"></span>
                      <span className="shelf-book-title">{book.title}</span>
                    </div>
                  );
                })}

                <div
                  className={`shelf-append-zone ${draggedBookId !== null ? 'active' : ''} ${isAppendHovered ? 'drag-over' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    onDragOverAt(rowIndex, null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    onDropAt(rowIndex, null);
                  }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

export default ShelfView;
