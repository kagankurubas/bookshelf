import { useState } from 'react';
import BookModal from './components/BookModal/BookModal';
import './App.css';

function App() {
  const [books, setBooks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);

  const [activeView, setActiveView] = useState('cards');
  const [filterCategory, setFilterCategory] = useState('Tümü');
  const [filterStatus, setFilterStatus] = useState('Tümü');

  const handleSaveBook = (bookData) => {
    const existingIndex = books.findIndex(b => b.id === bookData.id);
    if (existingIndex >= 0) {
      const updatedBooks = [...books];
      updatedBooks[existingIndex] = bookData;
      setBooks(updatedBooks);
    } else {
      setBooks([...books, bookData]);
    }
    setSelectedBook(null);
  };

  const deleteBook = (e, id) => {
    e.stopPropagation();
    setBooks(books.filter((book) => book.id !== id));
  };

  const openNewBookModal = () => {
    setSelectedBook(null);
    setIsModalOpen(true);
  };

  const openBookDetailModal = (book) => {
    setSelectedBook(book);
    setIsModalOpen(true);
  };

  const renderStars = (rating) => '⭐'.repeat(rating);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const filteredBooks = books.filter(book => {
    const matchesCategory = filterCategory === 'Tümü' || book.category === filterCategory;
    const matchesStatus = filterStatus === 'Tümü' || book.status === filterStatus;
    return matchesCategory && matchesStatus;
  });

  return (
    <div className="main-container">
      
      {/* 1. En Üstte Başlık */}
      <header className="app-header" style={{ marginBottom: '15px', borderBottom: 'none', paddingBottom: '0' }}>
        <h1 style={{ margin: 0, fontSize: '32px' }}>BookShelf 📚</h1>
      </header>

      {/* Dikey Ana Kapsayıcı */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' }}>
        
        {/* 2. Sırada: Genişletilmiş Sekmeler */}
        <div style={{ display: 'flex', width: '100%' }}>
          <div className="modern-tabs" style={{ display: 'flex', width: '100%' }}>
            <button 
              className={`modern-tab-btn ${activeView === 'cards' ? 'active' : ''}`}
              onClick={() => setActiveView('cards')}
              style={{ flex: 1, textAlign: 'center' }}
            >
              📖 Kitaplar
            </button>
            <button 
              className={`modern-tab-btn ${activeView === 'table' ? 'active' : ''}`}
              onClick={() => setActiveView('table')}
              style={{ flex: 1, textAlign: 'center' }}
            >
              📑 Tablo
            </button>
            <button 
              className={`modern-tab-btn ${activeView === 'shelf' ? 'active' : ''}`}
              onClick={() => setActiveView('shelf')}
              style={{ flex: 1, textAlign: 'center' }}
            >
              📚 Kitaplık Rafı
            </button>
          </div>
        </div>

        {/* 3. Sırada: Sekmelerin Altında, Sağ Köşede Mavi Yuvarlak Buton */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '5px', width: '100%' }}>
          <button 
            onClick={openNewBookModal}
            style={{
              background: '#2383e2',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              fontSize: '24px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(35, 131, 226, 0.4)',
              transition: 'all 0.2s',
              flexShrink: 0
            }}
            title="Yeni Kitap Ekle"
          >
            +
          </button>
        </div>

      </div>

      {/* --- KİTAPLAR GÖRÜNÜMÜ --- */}
     {activeView === 'cards' && (
        <main className="book-list-container">
          {books.length === 0 ? (
            <div className="empty-state">
              <p>Henüz kitap eklenmemiş. Sağ üstteki **+** butonundan başlayabilirsin.</p>
            </div>
          ) : (
            <div className="book-cards-grid">
              {books.map((book) => (
                <div 
                  key={book.id}
                  className="book-card" 
                  onClick={() => openBookDetailModal(book)} 
                  style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                >
                  {/* Eğer kapak görseli varsa kartın en üstüne banner gibi yerleştirelim */}
                  {book.coverImage ? (
                    <div className="card-cover-banner">
                    <img 
                      src={book.coverImage} 
                      alt={book.title} 
                      className="card-cover-image" 
                      style={{ objectPosition: `center ${book.coverPosition || 50}%` }}
                    />
                    <button 
                      className="card-cover-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        openBookDetailModal(book);
                      }}
                    >
                      Kapağı Düzenle
                    </button>
                  </div>
                  ) : (
                    <div className="card-cover-banner placeholder">
                      <button 
                        className="card-cover-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          openBookDetailModal(book);
                        }}
                      >
                        + Kapak Ekle
                      </button>
                    </div>
                  )}
                  
                  <div className="card-content" style={{ padding: '15px 20px 20px 20px' }}>
                    <h3 className="card-title">{book.title}</h3>
                    <p className="card-author">Yazar: {book.author}</p>
                    
                    <div className="card-properties">
                      {book.rating > 0 && <span className="property-tag rating">{renderStars(book.rating)}</span>}
                      <span className="property-tag category">{book.category}</span>
                      <span className={`property-tag status ${book.status.toLowerCase().replace(/\s+/g, '-')}`}>{book.status}</span>
                    </div>

                    {book.notesList && book.notesList.length > 0 && (
                      <p style={{ fontSize: '13px', color: '#888', margin: '10px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        💬 {book.notesList[book.notesList.length - 1].text} <span style={{ fontSize: '11px', color: '#555' }}>({book.notesList.length} not)</span>
                      </p>
                    )}
                    
                    <div className="card-dates">
                      {book.status !== 'Başlanmadı' && book.dateStarted && (
                        <small><strong>Başlama:</strong> {formatDate(book.dateStarted)}</small>
                      )}
                      {book.status === 'Tamamlandı' && book.dateFinished && (
                        <small><strong>Bitiş:</strong> {formatDate(book.dateFinished)}</small>
                      )}
                    </div>
                  </div>
                  
                  <button 
                    onClick={(e) => deleteBook(e, book.id)}
                    className="delete-card-btn"
                  >
                    Kitabı Sil
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* --- TABLO GÖRÜNÜMÜ --- */}
      {activeView === 'table' && (
        <main className="book-list-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 style={{ fontSize: '18px', margin: 0, color: '#fff' }}>Kitap Listesi & Filtreleme</h2>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <select 
                className="form-select" 
                value={filterCategory} 
                onChange={(e) => setFilterCategory(e.target.value)}
                style={{ padding: '6px 12px', fontSize: '13px', background: '#202020', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}
              >
                <option value="Tümü">Tüm Kategoriler</option>
                <option value="Klasik Edebiyat">Klasik Edebiyat</option>
                <option value="Kurgu">Kurgu</option>
                <option value="Kurgu Dışı">Kurgu Dışı</option>
                <option value="Biyografi">Biyografi</option>
                <option value="Bilim">Bilim</option>
                <option value="Tarih">Tarih</option>
                <option value="Felsefe">Felsefe</option>
              </select>

              <select 
                className="form-select" 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ padding: '6px 12px', fontSize: '13px', background: '#202020', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}
              >
                <option value="Tümü">Tüm Durumlar</option>
                <option value="Başlanmadı">Başlanmadı</option>
                <option value="Okunuyor">Okunuyor</option>
                <option value="Tamamlandı">Tamamlandı</option>
                <option value="Yarıda Bırakıldı">Yarıda Bırakıldı</option>
              </select>
            </div>
          </div>

          {filteredBooks.length === 0 ? (
            <div className="empty-state">
              <p>Seçilen kriterlere uygun kitap bulunamadı.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', background: '#202020', border: '1px solid #333', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #333', color: '#888', background: '#252525' }}>
                    <th style={{ padding: '12px 16px' }}>Kitap Adı</th>
                    <th style={{ padding: '12px 16px' }}>Yazar</th>
                    <th style={{ padding: '12px 16px' }}>Kategori</th>
                    <th style={{ padding: '12px 16px' }}>Durum</th>
                    <th style={{ padding: '12px 16px' }}>Puan</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBooks.map((book) => (
                    <tr 
                      key={book.id} 
                      onClick={() => openBookDetailModal(book)}
                      style={{ borderBottom: '1px solid #2a2a2a', cursor: 'pointer', transition: 'background 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#282828'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#fff' }}>{book.title}</td>
                      <td style={{ padding: '12px 16px', color: '#aaa' }}>{book.author}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className="property-tag category">{book.category}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className={`property-tag status ${book.status.toLowerCase().replace(/\s+/g, '-')}`}>{book.status}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>{book.rating > 0 ? renderStars(book.rating) : '-'}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button 
                          className="table-delete-btn" 
                          onClick={() => deleteBook(book.id)}
                          title="Kitabı Sil"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      )}

      {/* --- KİTAPLIK RAFI GÖRÜNÜMÜ --- */}
      {activeView === 'shelf' && (
        <main className="book-list-container">
          {books.length === 0 ? (
            <div className="empty-state">
              <p>Rafta sergilenecek henüz kitap yok. Sağ üstteki **+** butonundan ekleyebilirsin!</p>
            </div>
          ) : (
            <div className="wooden-shelf-container">
              
              {/* İleride buraya raf görünümü için kategori/durum filtresi eklenebilir */}
              
              {Array.from({ length: Math.ceil(books.length / 12) }).map((_, shelfIndex) => {
                const shelfBooks = books.slice(shelfIndex * 12, (shelfIndex + 1) * 12);
                return (
                  <div key={shelfIndex} className="shelf-row">
                    {shelfBooks.map((book, index) => (
                      <div 
                        key={book.id} 
                        className={`shelf-book color-${index % 6}`}
                        onClick={() => openBookDetailModal(book)}
                        title={`${book.title} - ${book.author}`}
                      >
                        <span className="shelf-book-title">{book.title}</span>
                        {/* İkon tamamen kaldırıldı, sırtlık tertemiz kaldı */}
                      </div>
                    ))}
                    <div className="shelf-board"></div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}

      {isModalOpen && (
        <BookModal 
          onClose={() => setIsModalOpen(false)} 
          onSave={handleSaveBook}
          selectedBook={selectedBook}
        />
      )}

    </div>
  );
}

export default App;