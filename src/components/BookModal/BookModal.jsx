import React, { useState } from 'react';
import './BookModal.css';

function BookModal({ onClose, onSave, selectedBook }) {
  const [title, setTitle] = useState(selectedBook ? selectedBook.title : '');
  const [author, setAuthor] = useState(selectedBook ? selectedBook.author : '');
  const [rating, setRating] = useState(selectedBook ? selectedBook.rating : 0);
  const [category, setCategory] = useState(selectedBook ? selectedBook.category : 'Klasik Edebiyat');
  const [status, setStatus] = useState(selectedBook ? selectedBook.status : 'Başlanmadı');
  const [dateStarted, setDateStarted] = useState(selectedBook ? selectedBook.dateStarted : '');
  const [dateFinished, setDateFinished] = useState(selectedBook ? selectedBook.dateFinished : '');
  
  // Notlar artık bir dizi (array) olacak: [{ id, text, date }]
  const [notesList, setNotesList] = useState(selectedBook ? selectedBook.notesList || [] : []);
  
  // Yeni yazılmakta olan not veya düzenlenen notun metni
  const [currentNoteText, setCurrentNoteText] = useState('');
  // Eğer şu an bir not düzenleniyorsa onun ID'si, yoksa null
  const [editingNoteId, setEditingNoteId] = useState(null);

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

  // Yeni not ekleme veya güncellemeyi kaydetme
  const handleSaveNoteItem = () => {
    if (!currentNoteText.trim()) return;

    const formattedDate = new Date().toLocaleString('tr-TR', { 
      dateStyle: 'medium', 
      timeStyle: 'short' 
    });

    if (editingNoteId) {
      // Düzenleme modundaysak mevcut notu güncelle
      setNotesList(notesList.map(note => 
        note.id === editingNoteId ? { ...note, text: currentNoteText, date: `${formattedDate} (Düzenlendi)` } : note
      ));
      setEditingNoteId(null);
    } else {
      // Yeni not ekleme modundaysak listeye ekle
      const newNote = {
        id: Date.now(),
        text: currentNoteText,
        date: formattedDate
      };
      setNotesList([...notesList, newNote]);
    }

    setCurrentNoteText(''); // Kutuyu temizle
  };

  // Notu düzenleme moduna al
  const handleEditNote = (note) => {
    setCurrentNoteText(note.text);
    setEditingNoteId(note.id);
  };

  // Notu sil
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
      rating,
      category,
      status,
      dateStarted,
      dateFinished,
      notesList, // Çoklu not listesini kaydediyoruz
      createdAt: selectedBook ? selectedBook.createdAt : new Date().toISOString(),
    };

    onSave(bookData);
    onClose();
  };

  const categories = ['Klasik Edebiyat', 'Kurgu', 'Kurgu Dışı', 'Biyografi', 'Bilim', 'Tarih', 'Felsefe'];
  const statuses = ['Başlanmadı', 'Okunuyor', 'Tamamlandı', 'Yarıda Bırakıldı'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        
        <div className="modal-header">
          <button className="close-modal-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <input 
            type="text" 
            placeholder="Kitap Adı (Örn: Suç ve Ceza)" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ fontSize: '30px', fontWeight: 'bold', marginBottom: '25px', width: '100%', background: 'transparent', border: 'none', color: 'white' }}
          />

          <div className="form-group">
            <span className="form-label">👤 Yazar</span>
            <input type="text" className="form-input" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Yazar Adı" />
          </div>

          <div className="form-group">
            <span className="form-label">⭐ Puan</span>
            <div className="rating-input">
              {[1, 2, 3, 4, 5].map((star) => (
                <span 
                  key={star}
                  className={`star ${star <= rating ? 'filled' : ''}`}
                  onClick={() => setRating(star)}
                >
                  ★
                </span>
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

          {/* Başlama Tarihi: "Başlanmadı" haricindeki tüm durumlarda görünür */}
          {status !== 'Başlanmadı' && (
                <div className="form-group">
                <span className="form-label">▶️ Başlama</span>
                <input type="date" className="form-input" value={dateStarted} onChange={(e) => setDateStarted(e.target.value)} />
                </div>
            )}

            {/* Bitiş Tarihi: Sadece "Tamamlandı" durumunda görünür */}
            {status === 'Tamamlandı' && (
                <div className="form-group">
                <span className="form-label">🏁 Bitiş</span>
                <input type="date" className="form-input" value={dateFinished} onChange={(e) => setDateFinished(e.target.value)} />
                </div>
            )}

          {/* NOTLAR BÖLÜMÜ (Bloklar Halinde) */}
          <div style={{ marginTop: '30px', borderTop: '1px solid #333', paddingTop: '20px' }}>
            <h3 style={{ fontSize: '16px', color: '#aaa', marginBottom: '15px' }}>📝 Kitap Notları ve Düşünceler</h3>
            
            {/* Yeni Not Yazma Alanı ve Ekle/Güncelle Butonu */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              <textarea 
                className="form-textarea"
                placeholder={editingNoteId ? "Seçilen notu düzenliyorsunuz..." : "Bu kitap için yeni bir düşünce veya alıntı ekle..."}
                value={currentNoteText}
                onChange={(e) => setCurrentNoteText(e.target.value)}
                style={{ width: '100%', minHeight: '80px', padding: '12px', background: '#252525', color: '#fff', border: '1px solid #444', borderRadius: '6px', resize: 'vertical' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                {editingNoteId && (
                  <button 
                    onClick={() => { setCurrentNoteText(''); setEditingNoteId(null); }}
                    style={{ background: '#555', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    İptal
                  </button>
                )}
                <button 
                  onClick={handleSaveNoteItem}
                  style={{ background: editingNoteId ? '#f59e0b' : '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {editingNoteId ? 'Notu Güncelle' : '+ Not Ekle'}
                </button>
              </div>
            </div>

            {/* Eklenen Notların Listesi (Bloklar / Label Tarzı) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {notesList.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#666', fontStyle: 'italic' }}>Henüz not eklenmemiş.</p>
              ) : (
                notesList.map((note) => (
                  <div key={note.id} style={{ background: '#222', border: '1px solid #333', borderRadius: '6px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    
                    {/* Not Tarihi ve İşlem Butonları Üst Kısım */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #313131', paddingBottom: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#888', fontWeight: '500' }}>
                        📅 {note.date}
                      </span>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button 
                            onClick={() => handleEditNote(note)}
                            title="Düzenle"
                            style={{ background: 'transparent', border: 'none', color: '#60a5fa', fontSize: '14px', cursor: 'pointer', padding: '2px' }}
                        >
                            ✏️
                        </button>
                        <button 
                            onClick={() => handleDeleteNote(note.id)}
                            title="Sil"
                            style={{ background: 'transparent', border: 'none', color: '#f87171', fontSize: '14px', cursor: 'pointer', padding: '2px' }}
                        >
                            🗑️
                        </button>
                        </div>
                    </div>

                    {/* Not İçeriği */}
                    <p style={{ margin: 0, fontSize: '14px', color: '#ddd', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                      {note.text}
                    </p>
                  </div>
                ))
              )}
            </div>

          </div>

        </div>

        <div className="modal-footer">
          <button className="save-book-btn" onClick={handleSave}>Kitabı Kaydet</button>
        </div>
      </div>
    </div>
  );
}

export default BookModal;