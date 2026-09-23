import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { resolveTagCasing } from '../../lib/tagCasing';
import { openLibraryCoverUrl } from '../../lib/openLibrary';
import { useBrokenCovers } from '../../hooks/useBrokenCovers';
import './BookModal.css';

const iconProps = { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8 };
const PersonIcon = () => (<svg {...iconProps}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></svg>);
const BuildingIcon = () => (<svg {...iconProps}><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 21v-4h6v4M9 8h.01M15 8h.01M9 12h.01M15 12h.01" /></svg>);
const HashIcon = () => (<svg {...iconProps}><path d="M5 9h14M5 15h14M10 3L8 21M16 3l-2 18" /></svg>);
const PagesIcon = () => (<svg {...iconProps}><path d="M4 5.5C4 4.7 4.7 4 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5v-13z" /><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H12v16h6.5a1.5 1.5 0 0 0 1.5-1.5v-13z" /></svg>);
const LibraryStackIcon = () => (<svg {...iconProps}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>);
const TagIcon = () => (<svg {...iconProps}><path d="M20.6 12.6L12 21l-9-9 8.6-8.4H20.6z" /><circle cx="14.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" /></svg>);
const RefreshIcon = () => (<svg {...iconProps}><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" /></svg>);
const PlayIcon = () => (<svg {...iconProps}><path d="M6 4l14 8-14 8V4z" fill="currentColor" stroke="none" /></svg>);
const FlagIcon = () => (<svg {...iconProps}><path d="M5 21V4h13l-3 4.5L18 13H5" /></svg>);
const CheckIcon = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M4 12l6 6L20 6" /></svg>);
const StarPlaceholderIcon = () => (<svg {...iconProps} strokeWidth="1.6"><path d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.5 6.3L12 17l-5.7 3.1 1.5-6.3-4.8-4.3 6.4-.6z" /></svg>);
const PlusMiniIcon = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>);
const NoteIcon = () => (<svg {...iconProps}><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /><path d="M9.5 12h5M9.5 16h5" /></svg>);
const PencilIcon = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>);

// Identifies a note across renders/edits regardless of list position - a
// saved note's DB id, or a draft's generated key. Never sent to the server
// as `id` (syncNotes() reads that field to decide insert vs. update).
const noteKey = (note) => note.id ?? note.draftKey;

function BookModal({ onClose, onSave, selectedBook, prefillData = null, existingAuthors = [], existingTags = [], libraries = [], activeLibraryId = null }) {
  const { t } = useTranslation();
  useEscapeKey(onClose);
  const defaultLibraryId = libraries.find((lib) => lib.isDefault)?.id || null;
  const [title, setTitle] = useState(selectedBook ? selectedBook.title : (prefillData?.title || ''));
  const [author, setAuthor] = useState(selectedBook ? selectedBook.author : (prefillData?.author || ''));
  const [publisher, setPublisher] = useState(selectedBook ? selectedBook.publisher || '' : (prefillData?.publisher || ''));
  const [rating, setRating] = useState(selectedBook ? selectedBook.rating : 0);
  const [category, setCategory] = useState(selectedBook ? selectedBook.category : 'Klasik Edebiyat');
  const [tags, setTags] = useState(selectedBook ? selectedBook.tags || [] : []);
  const [tagInput, setTagInput] = useState('');
  const [status, setStatus] = useState(selectedBook ? selectedBook.status : 'Başlanmadı');
  const [dateStarted, setDateStarted] = useState(selectedBook ? selectedBook.dateStarted : '');
  const [dateFinished, setDateFinished] = useState(selectedBook ? selectedBook.dateFinished : '');
  const [coverImage, setCoverImage] = useState(selectedBook ? selectedBook.coverImage || '' : (prefillData?.coverImage || ''));
  const [isbn, setIsbn] = useState(selectedBook ? selectedBook.isbn || '' : (prefillData?.isbn || ''));
  const [pageCount, setPageCount] = useState(
    String((selectedBook ? selectedBook.pageCount : prefillData?.pageCount) ?? '')
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [isAddingCover, setIsAddingCover] = useState(false);
  const { isBroken, markBroken } = useBrokenCovers();
  const [coverPosition, setCoverPosition] = useState(selectedBook ? selectedBook.coverPosition || 50 : 50);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startPos, setStartPos] = useState(50);
  
  const [notesList, setNotesList] = useState(selectedBook ? selectedBook.notesList || [] : []);
  const [newNoteText, setNewNoteText] = useState('');
  const [editingNoteKey, setEditingNoteKey] = useState(null);
  const [editingNoteText, setEditingNoteText] = useState('');

  const [shelfId] = useState(selectedBook ? selectedBook.shelfId || 'default' : 'default');
  const [isFavorite] = useState(selectedBook ? selectedBook.isFavorite || false : false);
  
  const [selectedLibraries, setSelectedLibraries] = useState(() => {
    const base = selectedBook
      ? selectedBook.libraryIds || []
      : (activeLibraryId ? [activeLibraryId] : []);
    // The main library holds every book - it can never be deselected, so it's
    // always included in the initial selection.
    return defaultLibraryId && !base.includes(defaultLibraryId) ? [...base, defaultLibraryId] : base;
  });

  const isModified = selectedBook
    ? (
        title !== selectedBook.title ||
        author !== selectedBook.author ||
        publisher !== (selectedBook.publisher || '') ||
        rating !== selectedBook.rating ||
        category !== selectedBook.category ||
        JSON.stringify(tags) !== JSON.stringify(selectedBook.tags || []) ||
        status !== selectedBook.status ||
        dateStarted !== (selectedBook.dateStarted || '') ||
        dateFinished !== (selectedBook.dateFinished || '') ||
        coverImage !== (selectedBook.coverImage || '') ||
        coverPosition !== (selectedBook.coverPosition || 50) ||
        isbn !== (selectedBook.isbn || '') ||
        pageCount !== String(selectedBook.pageCount ?? '') ||
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

  const commitTagInput = (rawValue) => {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      setTagInput('');
      return;
    }
    // If the same tag already exists with different casing on another book
    // (e.g. "Favorite"), reuse that casing - so the same concept accumulates
    // as the same string across all books, with no retroactive normalize/migration needed.
    const value = resolveTagCasing(trimmed, existingTags);
    const alreadyPresent = tags.some((tag) => tag.toLowerCase() === value.toLowerCase());
    if (!alreadyPresent) {
      setTags([...tags, value]);
    }
    setTagInput('');
  };

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitTagInput(tagInput);
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const commitNewNote = () => {
    const trimmed = newNoteText.trim();
    if (trimmed) {
      // No `id` field on a fresh note - syncNotes() in useBooks.js treats
      // its absence as "insert" once the book is saved. `draftKey` only
      // identifies it locally (see noteKey) and is dropped once saved.
      setNotesList([...notesList, { text: trimmed, draftKey: crypto.randomUUID() }]);
    }
    setNewNoteText('');
  };

  const startNoteEdit = (note) => {
    setEditingNoteKey(noteKey(note));
    setEditingNoteText(note.text);
  };

  const cancelNoteEdit = () => {
    setEditingNoteKey(null);
    setEditingNoteText('');
  };

  const commitNoteEdit = (key) => {
    const trimmed = editingNoteText.trim();
    if (trimmed) {
      setNotesList(notesList.map((note) => (noteKey(note) === key ? { ...note, text: trimmed } : note)));
    }
    cancelNoteEdit();
  };

  const handleRemoveNote = (key) => {
    setNotesList(notesList.filter((note) => noteKey(note) !== key));
    if (editingNoteKey === key) cancelNoteEdit();
  };

  const handleLibraryToggle = (libId) => {
    if (libId === defaultLibraryId) return;
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

  // Mouse events never fire on touch screens, so cover-position dragging
  // didn't work on mobile at all - added touch counterparts.
  const handleTouchStart = (e) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setStartPos(coverPosition);
  };

  const updateCoverPositionFromY = (clientY) => {
    const deltaY = clientY - startY;
    let newPos = startPos - (deltaY * 0.15);
    if (newPos < 0) newPos = 0;
    if (newPos > 100) newPos = 100;
    setCoverPosition(Math.round(newPos));
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    updateCoverPositionFromY(e.clientY);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    updateCoverPositionFromY(e.touches[0].clientY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSave = async () => {
    setSaveError(null);
    if (!title || !author) {
      setSaveError(t('bookModal.validationError'));
      return;
    }

    const bookData = {
      id: selectedBook ? selectedBook.id : undefined,
      title,
      author,
      publisher,
      rating,
      category,
      tags,
      status,
      dateStarted,
      dateFinished,
      coverImage,
      coverPosition,
      isbn,
      pageCount: pageCount.trim() ? parseInt(pageCount, 10) : null,
      notesList,
      shelfId,
      isFavorite,
      libraryIds: selectedLibraries,
    };

    setIsSaving(true);
    try {
      await onSave(bookData);
      onClose();
    } catch {
      // Save failed - modal stays open, the user's input isn't lost, and an
      // inline error is shown for retrying (App.jsx's generic alert() no
      // longer shows in this case).
      setSaveError(t('bookModal.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const categories = [
    'Klasik Edebiyat', 'Kurgu', 'Fantastik Kurgu', 'Bilim Kurgu', 
    'Distopya', 'Kurgu Dışı', 'Biyografi', 'Bilim', 'Tarih', 'Felsefe'
  ];
  const statuses = ['Başlanmadı', 'Okunuyor', 'Tamamlandı', 'Yarıda Bırakıldı'];
  const showCover = Boolean(coverImage) && !isBroken(coverImage);

  return (
    <div className="modal-overlay book-modal-overlay" onClick={onClose}>
      <div className="modal-content book-modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: 0, overflow: 'hidden' }}>
        
        <div
          style={{
            width: '100%', height: showCover || isAddingCover ? '240px' : '90px',
            background: showCover ? '#1a1a1a' : 'var(--surface-alt)', position: 'relative', overflow: 'hidden', borderBottom: '1px solid var(--border)',
            transition: 'height 0.2s ease', cursor: showCover ? (isDragging ? 'grabbing' : 'grab') : 'default'
          }}
          onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
          onTouchMove={handleTouchMove} onTouchEnd={handleMouseUp}
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

          {showCover ? (
            <div style={{ width: '100%', height: '100%', position: 'relative', userSelect: 'none', touchAction: 'none' }} onMouseDown={handleMouseDown} onTouchStart={handleTouchStart}>
              <img src={openLibraryCoverUrl(coverImage)} alt={t('bookModal.coverPreviewAlt')} draggable="false" onError={() => markBroken(coverImage)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `center ${coverPosition}%`, pointerEvents: 'none' }} />
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
                  type="url" placeholder={t('bookModal.coverUrlPlaceholder')} aria-label={t('bookModal.coverUrlPlaceholder')} autoFocus
                  value={coverImage} onChange={(e) => setCoverImage(e.target.value)}
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

        <div className="modal-body book-modal-body">
          <input
            type="text" placeholder={t('bookModal.titlePlaceholder')} aria-label={t('bookModal.titlePlaceholder')} value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="book-modal-title-input"
            style={{ fontFamily: 'var(--font-heading)', fontSize: '26px', fontWeight: 700, marginBottom: '22px', width: '100%', background: 'transparent', border: 'none', color: 'var(--text)', outline: 'none' }}
          />

          <div className="form-group">
            <label className="form-label" htmlFor="book-author"><PersonIcon /> {t('bookModal.author')}</label>
            <input id="book-author" type="text" className="form-input" list="author-list" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder={t('bookModal.authorPlaceholder')} />
            <datalist id="author-list">
              {existingAuthors.map((a, index) => <option key={index} value={a} />)}
            </datalist>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="book-publisher"><BuildingIcon /> {t('bookModal.publisher')}</label>
            <input id="book-publisher" type="text" className="form-input" value={publisher} onChange={(e) => setPublisher(e.target.value)} placeholder={t('bookModal.publisherPlaceholder')} />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="book-isbn"><HashIcon /> {t('bookModal.isbn')}</label>
            <input id="book-isbn" type="text" className="form-input" value={isbn} onChange={(e) => setIsbn(e.target.value)} placeholder="978..." />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="book-page-count"><PagesIcon /> {t('bookModal.pageCount')}</label>
            <input
              id="book-page-count"
              type="number"
              min="0"
              className="form-input"
              value={pageCount}
              onChange={(e) => setPageCount(e.target.value)}
              placeholder={t('bookModal.pageCountPlaceholder')}
            />
          </div>

          <div className="form-group">
            <span className="form-label"><LibraryStackIcon /> {t('bookModal.libraries')}</span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {libraries.map(lib => {
                const isSelected = selectedLibraries.includes(lib.id);
                const isMandatory = lib.id === defaultLibraryId;
                return (
                  <button
                    key={lib.id}
                    type="button"
                    onClick={() => handleLibraryToggle(lib.id)}
                    title={isMandatory ? t('bookModal.defaultLibraryHint') : undefined}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '5px',
                      background: isSelected ? 'var(--accent)' : 'var(--surface-alt)',
                      color: isSelected ? '#fff' : 'var(--text)',
                      border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border-strong)'}`,
                      padding: '6px 12px',
                      borderRadius: '100px',
                      fontFamily: 'var(--font-body)',
                      fontSize: '12px',
                      cursor: isMandatory ? 'default' : 'pointer',
                      fontWeight: isSelected ? 700 : 500,
                      opacity: isMandatory ? 0.85 : 1
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
            <label className="form-label" htmlFor="book-category"><TagIcon /> {t('bookModal.category')}</label>
            <select id="book-category" className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map(cat => <option key={cat} value={cat}>{t(`categories.${cat}`, cat)}</option>)}
            </select>
          </div>

          <div className="form-group tag-input-group">
            <label className="form-label" htmlFor="book-tags"><TagIcon /> {t('bookModal.tags')}</label>
            <div className="tag-input-wrap">
              <input
                id="book-tags"
                type="text"
                className="form-input"
                list="tag-suggestions"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                placeholder={t('bookModal.tagsPlaceholder')}
              />
              <datalist id="tag-suggestions">
                {existingTags.map((tag, index) => <option key={index} value={tag} />)}
              </datalist>
              {tags.length > 0 && (
                <div className="tag-chip-list">
                  {tags.map((tag) => (
                    <span key={tag} className="tag-chip">
                      {tag}
                      <button type="button" onClick={() => handleRemoveTag(tag)} aria-label={t('bookModal.removeTag', { tag })}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-group notes-group">
            <span className="form-label"><NoteIcon /> {t('bookModal.notes')}</span>
            <div className="notes-wrap">
              {notesList.length === 0 ? (
                <p className="notes-empty">{t('bookModal.notesEmpty')}</p>
              ) : (
                <ul className="notes-list">
                  {notesList.map((note) => {
                    const key = noteKey(note);
                    return (
                      <li key={key} className="note-item">
                        {editingNoteKey === key ? (
                          <div className="note-edit-row">
                            <textarea
                              className="form-input notes-textarea"
                              value={editingNoteText}
                              onChange={(e) => setEditingNoteText(e.target.value)}
                              autoFocus
                            />
                            <div className="note-item-actions">
                              <button type="button" className="chip-btn" onClick={() => commitNoteEdit(key)}>{t('bookModal.notesSaveEdit')}</button>
                              <button type="button" className="chip-btn" onClick={cancelNoteEdit}>{t('bookModal.notesCancelEdit')}</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="note-item-body">
                              <p className="note-text">{note.text}</p>
                              <span className="note-date">{note.date || t('bookModal.notesDraftDate')}</span>
                            </div>
                            <div className="note-item-actions">
                              <button type="button" className="note-action-btn" aria-label={t('bookModal.notesEdit')} onClick={() => startNoteEdit(note)}>
                                <PencilIcon />
                              </button>
                              <button type="button" className="note-action-btn note-action-danger" aria-label={t('bookModal.notesDelete')} onClick={() => handleRemoveNote(key)}>
                                ×
                              </button>
                            </div>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="note-add-row">
                <textarea
                  className="form-input notes-textarea"
                  placeholder={t('bookModal.notesAddPlaceholder')}
                  aria-label={t('bookModal.notesAddPlaceholder')}
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                />
                <button type="button" className="chip-btn" onClick={commitNewNote}>{t('bookModal.notesAdd')}</button>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="book-status"><RefreshIcon /> {t('bookModal.status')}</label>
            <select id="book-status" className="form-select" value={status} onChange={(e) => handleStatusChange(e.target.value)}>
              {statuses.map(stat => <option key={stat} value={stat}>{t(`statuses.${stat}`, stat)}</option>)}
            </select>
          </div>

          {status !== 'Başlanmadı' && (
            <div className="form-group">
              <label className="form-label" htmlFor="book-date-started"><PlayIcon /> {t('bookModal.dateStarted')}</label>
              <input id="book-date-started" type="date" className="form-input" value={dateStarted} onChange={(e) => setDateStarted(e.target.value)} />
            </div>
          )}

          {status === 'Tamamlandı' && (
            <div className="form-group">
              <label className="form-label" htmlFor="book-date-finished"><FlagIcon /> {t('bookModal.dateFinished')}</label>
              <input id="book-date-finished" type="date" className="form-input" value={dateFinished} onChange={(e) => setDateFinished(e.target.value)} />
            </div>
          )}
        </div>

        {saveError && <p className="book-modal-save-error" role="alert">{saveError}</p>}

        <div className="modal-footer">
          <button className="save-book-btn" onClick={handleSave} disabled={!isModified || isSaving}>
            {isSaving
              ? t('bookModal.saving')
              : selectedBook ? t('bookModal.saveExisting') : t('bookModal.saveNew')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BookModal;