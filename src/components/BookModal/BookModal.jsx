import React, { useState } from 'react';
import './BookModal.css';

function BookModal({ onClose, onSave, selectedBook, existingAuthors = [], libraries = [] }) {
  const [title, setTitle] = useState(selectedBook ? selectedBook.title : '');
  const [author, setAuthor] = useState(selectedBook ? selectedBook.author : '');
  const [publisher, setPublisher] = useState(selectedBook ? selectedBook.publisher || '' : '');
  const [rating, setRating] = useState(selectedBook ? selectedBook.rating : 0);
  const [category, setCategory] = useState(selectedBook ? selectedBook.category : 'Klasik Edebiyat');
  const [status, setStatus] = useState(selectedBook ? selectedBook.status : 'Başlanmadı');
  const [dateStarted, setDateStarted] = useState(selectedBook ? selectedBook.dateStarted : '');
  const [dateFinished, setDateFinished] = useState(selectedBook ? selectedBook.dateFinished : '');
  const [coverImage, setCoverImage] = useState(selectedBook ? selectedBook.coverImage || '' : '');
  
  const [isAddingCover, setIsAddingCover] = useState(false);
  const [coverPosition, setCoverPosition] = useState(selectedBook ? selectedBook.coverPosition || 50 : 50);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startPos, setStartPos] = useState(50);
  
  const [notesList, setNotesList] = useState(selectedBook ? selectedBook.notesList || [] : []);
  const [currentNoteText, setCurrentNoteText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);

  const [shelfId, setShelfId] = useState(selectedBook ? selectedBook.shelfId || 'default' : 'default');
  const [isFavorite, setIsFavorite] = useState(selectedBook ? selectedBook.isFavorite || false : false);
  
  const [selectedLibraries, setSelectedLibraries] = useState(
    selectedBook ? selectedBook.libraryIds || ['lib-1'] : ['lib-1']
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
        JSON.stringify(notesList) !== JSON.stringify(selectedBook.notesList || []) ||
        JSON.stringify(selectedLibraries) !== JSON.stringify(selectedBook.libraryIds || ['lib-1'])
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

  const handleSaveNoteItem = () => {
    if (!currentNoteText.trim()) return;

    const formattedDate = new Date().toLocaleString('tr-TR', { 
      dateStyle: 'medium', 
      timeStyle: 'short' 
    });

    if (editingNoteId) {
      setNotesList(notesList.map(note => 
        note.id === editingNoteId ? { ...note, text: currentNoteText, date: `${formattedDate} (Düzenlendi)` } : note
      ));
      setEditingNoteId(null);
    } else {
      const newNote = {
        id: Date.now(),
        text: currentNoteText,
        date: formattedDate
      };
      setNotesList([...notesList, newNote]);
    }

    setCurrentNoteText('');
  };

  const handleEditNote = (note) => {
    setCurrentNoteText(note.text);
    setEditingNoteId(note.id);
  };

  const handleDeleteNote = (id) => {
    setNotesList(notesList.filter(note => note.id !== id));
    if (editingNoteId === id) {
      setCurrentNoteText('');
      setEditingNoteId(null);
    }
  };

  const handleSave = () => {
    if (!title || !author) {
      alert('Lütfen Kitap Adı ve Yazar alanlarını doldurun.');
      return;
    }

    const bookData = {
      id: selectedBook ? selectedBook.id : Date.now(),
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
      notesList,
      createdAt: selectedBook ? selectedBook.createdAt : new Date().toISOString(),
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: 0, overflow: 'hidden' }}>
        
        <div 
          style={{ 
            width: '100%', height: coverImage || isAddingCover ? '240px' : '90px', 
            background: '#1a1a1a', position: 'relative', overflow: 'hidden', borderBottom: '1px solid #333', 
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
              <img src={coverImage} alt="Kapak Önizleme" draggable="false" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `center ${coverPosition}%`, pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: '10px', left: '15px', background: 'rgba(0,0,0,0.6)', padding: '3px 8px', borderRadius: '4px', pointerEvents: 'none', zIndex: 10 }}>
                <span style={{ fontSize: '10px', color: '#aaa' }}>↕️ Resmi hareket ettirmek için basıp sürükle</span>
              </div>
              <button 
                type="button" onClick={(e) => { e.stopPropagation(); setCoverImage(''); setCoverPosition(50); setIsAddingCover(false); }}
                style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(0,0,0,0.7)', color: '#f87171', border: '1px solid rgba(255,255,255,0.2)', padding: '4px 8px', fontSize: '11px', borderRadius: '4px', cursor: 'pointer', zIndex: 10 }}
              >
                Kaldır
              </button>
            </div>
          ) : isAddingCover ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
              <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '400px' }}>
                <input 
                  type="url" placeholder="Kapak Görseli URL'si yapıştır (https://...)" autoFocus
                  onChange={(e) => setCoverImage(e.target.value)}
                  style={{ flex: 1, background: '#252525', border: '1px solid #444', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', outline: 'none' }}
                />
                <button type="button" onClick={() => setIsAddingCover(false)} style={{ background: '#444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>İptal</button>
              </div>
            </div>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '18px' }}>
              <button type="button" onClick={() => setIsAddingCover(true)} style={{ background: 'rgba(255,255,255,0.08)', color: '#ccc', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 16px', fontSize: '12px', fontWeight: '500', borderRadius: '6px', cursor: 'pointer' }}>+ Kapak Ekle</button>
            </div>
          )}
        </div>

        <div className="modal-body" style={{ padding: '25px 30px' }}>
          <input 
            type="text" placeholder="Kitap Adı (Örn: Suç ve Ceza)" value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '25px', width: '100%', background: 'transparent', border: 'none', color: 'white', outline: 'none' }}
          />

          <div className="form-group">
            <span className="form-label">👤 Yazar</span>
            <input type="text" className="form-input" list="author-list" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Yazar Adı Seç veya Yaz" />
            <datalist id="author-list">
              {existingAuthors.map((a, index) => <option key={index} value={a} />)}
            </datalist>
          </div>

          <div className="form-group">
            <span className="form-label">🏢 Yayınevi (Opsiyonel)</span>
            <input type="text" className="form-input" value={publisher} onChange={(e) => setPublisher(e.target.value)} placeholder="Yayınevi Adı" />
          </div>

          <div className="form-group">
            <span className="form-label">📚 Bulunduğu Kitaplıklar</span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
              {libraries.map(lib => {
                const isSelected = selectedLibraries.includes(lib.id);
                return (
                  <button
                    key={lib.id}
                    type="button"
                    onClick={() => handleLibraryToggle(lib.id)}
                    style={{
                      background: isSelected ? '#2383e2' : '#222',
                      color: '#fff',
                      border: `1px solid ${isSelected ? '#2383e2' : '#444'}`,
                      padding: '5px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: isSelected ? 'bold' : 'normal'
                    }}
                  >
                    {isSelected ? '✓ ' : '+ '} {lib.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <span className="form-label">⭐ Puan</span>
            <div className="rating-input">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className={`star ${star <= rating ? 'filled' : ''}`} onClick={() => setRating(star)}>★</span>
              ))}
              {rating > 0 && <span style={{marginLeft: '10px', color: '#aaa', cursor: 'pointer', fontSize: '13px'}} onClick={() => setRating(0)}>(Temizle)</span>}
            </div>
          </div>

          <div className="form-group">
            <span className="form-label">🏷️ Kategori</span>
            <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <div className="form-group">
            <span className="form-label">🔄 Durum</span>
            <select className="form-select" value={status} onChange={(e) => handleStatusChange(e.target.value)}>
              {statuses.map(stat => <option key={stat} value={stat}>{stat}</option>)}
            </select>
          </div>

          {status !== 'Başlanmadı' && (
            <div className="form-group">
              <span className="form-label">▶️ Başlama</span>
              <input type="date" className="form-input" value={dateStarted} onChange={(e) => setDateStarted(e.target.value)} />
            </div>
          )}

          {status === 'Tamamlandı' && (
            <div className="form-group">
              <span className="form-label">🏁 Bitiş</span>
              <input type="date" className="form-input" value={dateFinished} onChange={(e) => setDateFinished(e.target.value)} />
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ padding: '15px 30px', background: '#181818', borderTop: '1px solid #333', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            className="save-book-btn" onClick={handleSave} disabled={!isModified}
            style={{ 
              opacity: isModified ? 1 : 0.5, cursor: isModified ? 'pointer' : 'not-allowed',
              backgroundColor: isModified ? '#2383e2' : '#444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold'
            }}
          >
            {selectedBook ? 'Değişiklikleri Kaydet' : 'Kitabı Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BookModal;