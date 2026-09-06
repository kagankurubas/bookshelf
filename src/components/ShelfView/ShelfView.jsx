import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, MoveHandleIcon } from '../icons/Icons';
import { getSpineSize, getSpineFilter, getCategoryEmblem, chunkIntoLines } from '../../lib/shelfSpine';

function ShelfView({
  books,
  shelfCount,
  draggedBookId,
  dragOverTarget,
  pickedBookId,
  onAddShelfRow,
  onRemoveShelfRow,
  onDragStart,
  onDragEnd,
  onDragOverAt,
  onDropAt,
  onPickBook,
  onPlaceBook,
  onCancelPick,
  onOpenBook,
  getCategoryColorClass,
}) {
  const { t, i18n } = useTranslation();
  const containerRef = useRef(null);
  const [availableWidth, setAvailableWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width;
      if (width) setAvailableWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const rows = Array.from({ length: shelfCount }).map((_, rowIndex) =>
    books
      .filter((b) => (b.shelfRow ?? 0) === rowIndex)
      .slice()
      .sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0))
  );

  // Kitaplıkta hiç kitap yokken "Kitapları buraya sürükle" ipucu yanıltıcı
  // olur (sürüklenecek hiçbir şey yok) - bu durumda ilk kitabı nasıl
  // ekleyeceğini gösteren ayrı bir mesaj gösteriyoruz.
  const isLibraryEmpty = books.length === 0;
  // Dokunmatik ekranlarda native surukleme calismadigi icin ikinci bir
  // tasima yolu: kitabin tutamacina dokununca "secili" olur, sonra herhangi
  // bir kitaba/bos alana dokununca oraya tasinir (bkz. useShelfDnd).
  const isPicking = pickedBookId !== null;

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

      {isPicking && (
        <div className="shelf-move-banner">
          <span>{t('shelf.movePickHint')}</span>
          <button type="button" className="chip-btn" onClick={onCancelPick}>{t('toolbar.cancel')}</button>
        </div>
      )}

      <div className={`wooden-shelf-container ${isPicking ? 'picking' : ''}`} ref={containerRef}>
        {rows.map((rowBooks, rowIndex) => {
          const isAppendHovered = dragOverTarget?.shelfRow === rowIndex && dragOverTarget?.bookId === null;

          if (rowBooks.length === 0) {
            return (
              <div
                key={rowIndex}
                className={`shelf-row-empty ${isAppendHovered ? 'drag-over' : ''} ${isPicking ? 'pick-target' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  onDragOverAt(rowIndex, null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  onDropAt(rowIndex, null);
                }}
                onClick={() => { if (isPicking) onPlaceBook(rowIndex, null); }}
              >
                <span>{isLibraryEmpty ? t('shelf.emptyLibraryHint') : t('shelf.emptyRowHint')}</span>
              </div>
            );
          }

          // Bir raf katı (shelfRow) sayfa genişliğine sığmayacak kadar kitap
          // içerebilir - bu durumda birden fazla satıra (line) bölünüyor.
          // Her satır kendi kesintisiz raf çizgisini alır (bkz. .shelf-row),
          // ama hepsi aynı katın parçası olduğu için birbirine yakın durur.
          const lines = chunkIntoLines(rowBooks, availableWidth);

          return (
            <div key={rowIndex} className="shelf-tier">
              {lines.map((lineBooks, lineIndex) => (
                <div key={lineIndex} className="shelf-row">
                  {lineBooks.map((book) => {
                    const colorClass = getCategoryColorClass(book.category);
                    const isHovered = dragOverTarget?.shelfRow === rowIndex && dragOverTarget?.bookId === book.id;
                    const { width, height } = getSpineSize(book.id);
                    const spineFilter = getSpineFilter(book.id);
                    const emblem = getCategoryEmblem(book.category, i18n.language);

                    const isPicked = pickedBookId === book.id;

                    return (
                      <div
                        key={book.id}
                        className={`shelf-book ${colorClass} ${draggedBookId === book.id ? 'dragging' : ''} ${isHovered ? 'drag-over' : ''} ${isPicked ? 'picked' : ''} ${isPicking && !isPicked ? 'pick-target' : ''}`}
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
                        onClick={() => {
                          if (isPicking) {
                            if (isPicked) onCancelPick();
                            else onPlaceBook(rowIndex, book.id);
                            return;
                          }
                          onOpenBook(book);
                        }}
                        title={`${book.title} (${t(`categories.${book.category}`, book.category)}) - ${t('shelf.dragHint')}`}
                        style={{ width: `${width}px`, height: `${height}px`, filter: spineFilter }}
                      >
                        <span className="shelf-book-texture"></span>
                        <span className="shelf-book-foil"></span>
                        <span className="shelf-book-highlight"></span>
                        {emblem && <span className="shelf-book-emblem">{emblem}</span>}
                        <span className="shelf-book-title">{book.title}</span>
                        <button
                          type="button"
                          className="shelf-book-move-handle"
                          title={t('shelf.moveHandleTitle')}
                          aria-label={t('shelf.moveHandleTitle')}
                          onClick={(e) => { e.stopPropagation(); onPickBook(book.id); }}
                        >
                          <MoveHandleIcon />
                        </button>
                      </div>
                    );
                  })}

                  {lineIndex === lines.length - 1 && (
                    <div
                      className={`shelf-append-zone ${(draggedBookId !== null || isPicking) ? 'active' : ''} ${isAppendHovered ? 'drag-over' : ''}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        onDragOverAt(rowIndex, null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        onDropAt(rowIndex, null);
                      }}
                      onClick={() => { if (isPicking) onPlaceBook(rowIndex, null); }}
                    ></div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </main>
  );
}

export default ShelfView;
