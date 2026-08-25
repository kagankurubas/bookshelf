import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './BookModal.css';

const iconProps = { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 };
const PersonIcon = () => (<svg {...iconProps}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></svg>);
const BuildingIcon = () => (<svg {...iconProps}><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 21v-4h6v4M9 8h.01M15 8h.01M9 12h.01M15 12h.01" /></svg>);
const HashIcon = () => (<svg {...iconProps}><path d="M5 9h14M5 15h14M10 3L8 21M16 3l-2 18" /></svg>);
const LibraryStackIcon = () => (<svg {...iconProps}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>);
const TagIcon = () => (<svg {...iconProps}><path d="M20.6 12.6L12 21l-9-9 8.6-8.4H20.6z" /><circle cx="14.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" /></svg>);
const RefreshIcon = () => (<svg {...iconProps}><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" /></svg>);
const PlayIcon = () => (<svg {...iconProps}><path d="M6 4l14 8-14 8V4z" fill="currentColor" stroke="none" /></svg>);
const FlagIcon = () => (<svg {...iconProps}><path d="M5 21V4h13l-3 4.5L18 13H5" /></svg>);
const CheckIcon = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M4 12l6 6L20 6" /></svg>);
const StarPlaceholderIcon = () => (<svg {...iconProps} strokeWidth="1.6"><path d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.5 6.3L12 17l-5.7 3.1 1.5-6.3-4.8-4.3 6.4-.6z" /></svg>);
const PlusMiniIcon = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>);

function BookModal({ onClose, onSave, selectedBook, prefillData = null, existingAuthors = [], libraries = [], activeLibraryId = null }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(selectedBook ? selectedBook.title : (prefillData?.title || ''));
  const [author, setAuthor] = useState(selectedBook ? selectedBook.author : (prefillData?.author || ''));
  const [publisher, setPublisher] = useState(selectedBook ? selectedBook.publisher || '' : (prefillData?.publisher || ''));
  const [rating, setRating] = useState(selectedBook ? selectedBook.rating : 0);
  const [category, setCategory] = useState(selectedBook ? selectedBook.category : 'Klasik Edebiyat');
  const [status, setStatus] = useState(selectedBook ? selectedBook.status : 'Başlanmadı');
  const [dateStarted, setDateStarted] = useState(selectedBook ? selectedBook.dateStarted : '');
  const [dateFinished, setDateFinished] = useState(selectedBook ? selectedBook.dateFinished : '');
  const [coverImage, setCoverImage] = useState(selectedBook ? selectedBook.coverImage || '' : (prefillData?.coverImage || ''));
  const [isbn, setIsbn] = useState(selectedBook ? selectedBook.isbn || '' : (prefillData?.isbn || ''));

  const [isAddingCover, setIsAddingCover] = useState(false);
  const [coverPosition, setCoverPosition] = useState(selectedBook ? selectedBook.coverPosition || 50 : 50);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startPos, setStartPos] = useState(50);
  
  const [notesList] = useState(selectedBook ? selectedBook.notesList || [] : []);

  const [shelfId] = useState(selectedBook ? selectedBook.shelfId || 'default' : 'default');
  const [isFavorite] = useState(selectedBook ? selectedBook.isFavorite || false : false);
  
  const [selectedLibraries, setSelectedLibraries] = useState(
    selectedBook
      ? selectedBook.libraryIds || []
      : (activeLibraryId ? [activeLibraryId] : [])
  );

  const isModified = selectedBook
    ? (
        title !== selectedBook.title ||
        author !== selectedBook.author ||
        publisher !== (selectedBook.publisher || '') ||
        rating !== selectedBook.rating ||
        category !== selectedBook.category ||
        status !== selectedBook.status ||
        dateStarted !== (selectedBook.dateStarted || '') ||
        dateFinished !== (selectedBook.dateFinished || '') ||
        coverImage !== (selectedBook.coverImage || '') ||
        coverPosition !== (selectedBook.coverPosition || 50) ||
        isbn !== (selectedBook.isbn || '') ||
        JSON.stringify(notesList) !== JSON.stringify(selectedBook.notesList || []) ||
        JSON.stringify(selectedLibraries) !== JSON.stringify(selectedBook.libraryIds || [])
      )
    : (title.trim() !== '' || author.trim() !== '' || coverImage.trim() !== '');

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    if (newStatus === 'Okunuyor' && !dateStarted) {
      const today = new Date().toISOString().split('T')[0];
      setDateStarted(today);
    }
    if (newStatus === 'Tamamlandı' && !dateFinished) {
      const today = new Date().toISOString().split('T')[0];
      setDateFinished(today);
    }
  };

  const handleLibraryToggle = (libId) => {
    if (selectedLibraries.includes(libId)) {
      if (selectedLibraries.length === 1) return;
      setSelectedLibraries(selectedLibraries.filter(id => id !== libId));
    } else {
      setSelectedLibraries([...selectedLibraries, libId]);
    }
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartY(e.clientY);
    setStartPos(coverPosition);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const deltaY = e.clientY - startY;
    let newPos = startPos - (deltaY * 0.15); 
    if (newPos < 0) newPos = 0;
    if (newPos > 100) newPos = 100;
    setCoverPosition(Math.round(newPos));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSave = () => {
    if (!title || !author) {
      alert(t('bookModal.validationError'));
      return;
    }

    const bookData = {
      id: selectedBook ? selectedBook.id : undefined,
      title,
      author,
      publisher,
      rating,
      category,
      status,
      dateStarted,
      dateFinished,
      coverImage,
      coverPosition,
      isbn,
      notesList,
      shelfId,
      isFavorite,
      libraryIds: selectedLibraries,
    };

    onSave(bookData);
    onClose();
  };

  const categories = [
    'Klasik Edebiyat', 'Kurgu', 'Fantastik Kurgu', 'Bilim Kurgu', 
    'Distopya', 'Kurgu Dışı', 'Biyografi', 'Bilim', 'Tarih', 'Felsefe'
  ];
  const statuses = ['Başlanmadı', 'Okunuyor', 'Tamamlandı', 'Yarıda Bırakıldı'];

  return (
    <div className="modal-overlay book-modal-overlay" onClick={onClose}>
      <div className="modal-content book-modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: 0, overflow: 'hidden' }}>
        
        <div
          style={{
            width: '100%', height: coverImage || isAddingCover ? '240px' : '90px',
            background: coverImage ? '#1a1a1a' : 'var(--surface-alt)', position: 'relative', overflow: 'hidden', borderBottom: '1px solid var(--border)',
            transition: 'height 0.2s ease', cursor: coverImage ? (isDragging ? 'grabbing' : 'grab') : 'default'
          }}
          onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
        >
          <button 
            className="close-modal-btn" onClick={onClose} 
            style={{ 
              position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.6)', 
              color: '#fff', borderRadius: '50%', width: '28px', height: '28px', border: 'none', 
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20, fontSize: '14px'
            }}
          >
            ×
          </button>

          {coverImage ? (
            <div style={{ width: '100%', height: '100%', position: 'relative', userSelect: 'none' }} onMouseDown={handleMouseDown}>
              <img src={coverImage} alt={t('bookModal.coverPreviewAlt')} draggable="false" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `center ${coverPosition}%`, pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: '10px', left: '15px', background: 'rgba(0,0,0,0.6)', padding: '3px 8px', borderRadius: '4px', pointerEvents: 'none', zIndex: 10, display: 'flex', alignItems: 'center', gap: '5px' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"><path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4" /></svg>
                <span style={{ fontSize: '10px', color: '#ccc' }}>{t('bookModal.dragCoverHint')}</span>
              </div>
              <button
                type="button" onClick={(e) => { e.stopPropagation(); setCoverImage(''); setCoverPosition(50); setIsAddingCover(false); }}
                style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(0,0,0,0.7)', color: '#f87171', border: '1px solid rgba(255,255,255,0.2)', padding: '4px 8px', fontSize: '11px', borderRadius: '4px', cursor: 'pointer', zIndex: 10 }}
              >
                {t('bookModal.removeCover')}
              </button>
            </div>
          ) : isAddingCover ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
              <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '400px' }}>
                <input
                  type="url" placeholder={t('bookModal.coverUrlPlaceholder')} autoFocus
                  onChange={(e) => setCoverImage(e.target.value)}
                  className="form-input" style={{ flex: 1, fontSize: '12px' }}
                />
                <button type="button" onClick={() => setIsAddingCover(false)} className="chip-btn" style={{ padding: '8px 14px' }}>{t('toolbar.cancel')}</button>
              </div>
            </div>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '18px' }}>
              <button type="button" onClick={() => setIsAddingCover(true)} className="chip-btn" style={{ padding: '7px 16px' }}>
                <PlusMiniIcon /> {t('bookModal.addCover')}
              </button>
            </div>
          )}
        </div>

        <div className="modal-body" style={{ padding: '25px 30px' }}>
          <input
            type="text" placeholder={t('bookModal.titlePlaceholder')} value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="book-modal-title-input"
            style={{ fontFamily: 'var(--font-heading)', fontSize: '26px', fontWeight: 700, marginBottom: '22px', width: '100%', background: 'transparent', border: 'none', color: 'var(--text)', outline: 'none' }}
          />

          <div className="form-group">
            <span className="form-label"><PersonIcon /> {t('bookModal.author')}</span>
            <input type="text" className="form-input" list="author-list" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder={t('bookModal.authorPlaceholder')} />
            <datalist id="author-list">
              {existingAuthors.map((a, index) => <option key={index} value={a} />)}
            </datalist>
          </div>

          <div className="form-group">
            <span className="form-label"><BuildingIcon /> {t('bookModal.publisher')}</span>
            <input type="text" className="form-input" value={publisher} onChange={(e) => setPublisher(e.target.value)} placeholder={t('bookModal.publisherPlaceholder')} />
          </div>

          <div className="form-group">
            <span className="form-label"><HashIcon /> {t('bookModal.isbn')}</span>
            <input type="text" className="form-input" value={isbn} onChange={(e) => setIsbn(e.target.value)} placeholder="978..." />
          </div>

          <div className="form-group">
            <span className="form-label"><LibraryStackIcon /> {t('bookModal.libraries')}</span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {libraries.map(lib => {
                const isSelected = selectedLibraries.includes(lib.id);
                return (
                  <button
                    key={lib.id}
                    type="button"
                    onClick={() => handleLibraryToggle(lib.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      background: isSelected ? 'var(--accent)' : 'var(--surface-alt)',
                      color: isSelected ? '#fff' : 'var(--text)',
                      border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border-strong)'}`,
                      padding: '6px 12px',
                      borderRadius: '100px',
                      fontFamily: 'var(--font-body)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: isSelected ? 700 : 500
                    }}
                  >
                    {isSelected ? <CheckIcon /> : <PlusMiniIcon />} {lib.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <span className="form-label"><StarPlaceholderIcon /> {t('bookModal.rating')}</span>
            <div className="rating-input">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className={`star ${star <= rating ? 'filled' : ''}`} onClick={() => setRating(star)}>★</span>
              ))}
              {rating > 0 && <span style={{ marginLeft: '10px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--font-body)' }} onClick={() => setRating(0)}>{t('bookModal.ratingClear')}</span>}
            </div>
          </div>

          <div className="form-group">
            <span className="form-label"><TagIcon /> {t('bookModal.category')}</span>
            <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map(cat => <option key={cat} value={cat}>{t(`categories.${cat}`, cat)}</option>)}
            </select>
          </div>

          <div className="form-group">
            <span className="form-label"><RefreshIcon /> {t('bookModal.status')}</span>
            <select className="form-select" value={status} onChange={(e) => handleStatusChange(e.target.value)}>
              {statuses.map(stat => <option key={stat} value={stat}>{t(`statuses.${stat}`, stat)}</option>)}
            </select>
          </div>

          {status !== 'Başlanmadı' && (
            <div className="form-group">
              <span className="form-label"><PlayIcon /> {t('bookModal.dateStarted')}</span>
              <input type="date" className="form-input" value={dateStarted} onChange={(e) => setDateStarted(e.target.value)} />
            </div>
          )}

          {status === 'Tamamlandı' && (
            <div className="form-group">
              <span className="form-label"><FlagIcon /> {t('bookModal.dateFinished')}</span>
              <input type="date" className="form-input" value={dateFinished} onChange={(e) => setDateFinished(e.target.value)} />
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="save-book-btn" onClick={handleSave} disabled={!isModified}>
            {selectedBook ? t('bookModal.saveExisting') : t('bookModal.saveNew')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BookModal;