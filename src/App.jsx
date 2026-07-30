import React, { useState } from 'react';
import BookModal from './components/BookModal/BookModal';
import './App.css';

const initialBooks = [
  {
    id: 1,
    title: 'Suç ve Ceza',
    author: 'Dostoyevski',
    publisher: 'İş Bankası Yayınları',
    rating: 5,
    category: 'Klasik Edebiyat',
    status: 'Tamamlandı',
    dateStarted: '2026-06-01',
    dateFinished: '2026-06-15',
    coverImage: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c',
    coverPosition: 50,
    shelfId: 'default',
    isFavorite: true,
    libraryIds: ['lib-1', 'lib-2'],
    slotIndex: 0,
    notesList: [{ id: 101, text: 'Eşsiz bir başyapıt.', date: '10 Haz 2026 14:00' }]
  },
  {
    id: 2,
    title: 'Yüzüklerin Efendisi',
    author: 'J.R.R. Tolkien',
    publisher: 'Metis Yayıncılık',
    rating: 5,
    category: 'Fantastik Kurgu',
    status: 'Okunuyor',
    dateStarted: '2026-07-01',
    dateFinished: '',
    coverImage: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353',
    coverPosition: 50,
    shelfId: 'default',
    isFavorite: true,
    libraryIds: ['lib-1', 'lib-3'],
    slotIndex: 1,
    notesList: []
  }
];

function App() {
  const [books, setBooks] = useState(initialBooks);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);

  // Kitaplıklara raf kat sayısı (shelfCount) ve raf başına kapasite ekledik
  const [libraries, setLibraries] = useState([
    { id: 'lib-1', name: 'Ana Kitaplığım', isDefault: true, capacity: 10, shelfCount: 2 },
    { id: 'lib-2', name: 'Favori Klasiklerim', isDefault: false, capacity: 10, shelfCount: 2 },
    { id: 'lib-3', name: 'Yaz Okumaları', isDefault: false, capacity: 10, shelfCount: 2 }
  ]);
  const [activeLibraryId, setActiveLibraryId] = useState('lib-1');
  const [newLibraryName, setNewLibraryName] = useState('');
  const [newLibraryCapacity, setNewLibraryCapacity] = useState(10);
  const [isAddingLibrary, setIsAddingLibrary] = useState(false);

  const [activeView, setActiveView] = useState('cards');

  const [filterCategory, setFilterCategory] = useState('Tümü');
  const [filterStatus, setFilterStatus] = useState('Tümü');
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [selectedAuthor, setSelectedAuthor] = useState('Tümü');
  const [searchQuery, setSearchQuery] = useState('');

  const [shelves, setShelves] = useState([
    { id: 'default', name: 'Ana Raf', isFavorite: true },
    { id: 'favorites', name: 'Favoriler', isFavorite: true }
  ]);
  const [selectedShelf, setSelectedShelf] = useState('Tümü');

  const [draggedBookId, setDraggedBookId] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const categories = [
    'Klasik Edebiyat', 'Kurgu', 'Fantastik Kurgu', 'Bilim Kurgu', 
    'Distopya', 'Kurgu Dışı', 'Biyografi', 'Bilim', 'Tarih', 'Felsefe'
  ];

  const getCategoryColorClass = (category) => {
    switch (category) {
      case 'Klasik Edebiyat': return 'category-klasik';
      case 'Fantastik Kurgu': return 'category-fantastik';
      case 'Bilim Kurgu': return 'category-bilimkurgu';
      case 'Distopya': return 'category-distopya';
      case 'Kurgu': return 'category-kurgu';
      case 'Tarih': return 'category-tarih';
      case 'Felsefe': return 'category-felsefe';
      case 'Biyografi': return 'category-biyografi';
      case 'Bilim': return 'category-bilim';
      default: return 'category-default';
    }
  };

  const uniqueAuthors = [...new Set(books.map(b => b.author))];

  const renderStars = (rating) => '⭐'.repeat(rating);

  const currentLibraryBooks = books.filter(book => {
    if (!book.libraryIds) return activeLibraryId === 'lib-1';
    return book.libraryIds.includes(activeLibraryId);
  });

  // Aktif kitaplığın kapasitesini ve raf kat sayısını alalım
  const activeLibrary = libraries.find(l => l.id === activeLibraryId) || libraries[0];
  const shelfCapacity = activeLibrary.capacity || 10;
  const shelfCount = activeLibrary.shelfCount || 2;

  const handleSaveBook = (bookData) => {
    const existingIndex = books.findIndex(b => b.id === bookData.id);
    if (existingIndex >= 0) {
      const updatedBooks = [...books];
      updatedBooks[existingIndex] = bookData;
      setBooks(updatedBooks);
    } else {
      const existingSlots = books
        .filter(b => (b.libraryIds || ['lib-1']).includes(activeLibraryId))
        .map(b => b.slotIndex ?? 0);
      
      let freeSlot = 0;
      while (existingSlots.includes(freeSlot)) {
        freeSlot++;
      }

      const newBookWithSlot = {
        ...bookData,
        libraryIds: bookData.libraryIds || [activeLibraryId],
        slotIndex: freeSlot
      };
      setBooks([...books, newBookWithSlot]);
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
    if (draggedBookId === null) {
      setSelectedBook(book);
      setIsModalOpen(true);
    }
  };

  const handleCreateLibrary = (e) => {
    e.preventDefault();
    if (!newLibraryName.trim()) return;
    const newLib = {
      id: `lib-${Date.now()}`,
      name: newLibraryName.trim(),
      isDefault: false,
      capacity: Number(newLibraryCapacity) || 10,
      shelfCount: 2
    };
    setLibraries([...libraries, newLib]);
    setActiveLibraryId(newLib.id);
    setNewLibraryName('');
    setNewLibraryCapacity(10);
    setIsAddingLibrary(false);
  };

  const handleDeleteLibrary = (libId) => {
    setLibraries(libraries.filter(l => l.id !== libId));
    setActiveLibraryId('lib-1');
  };

  // Aktif kitaplığın kapasitesini güncelleme fonksiyonu
  const handleUpdateCapacity = (newCap) => {
    const cap = Math.max(5, Math.min(30, Number(newCap) || 10));
    setLibraries(libraries.map(lib => {
      if (lib.id === activeLibraryId) {
        return { ...lib, capacity: cap };
      }
      return lib;
    }));
  };

  // Yeni Raf Katı Ekle
  const handleAddShelfRow = () => {
    setLibraries(libraries.map(lib => {
      if (lib.id === activeLibraryId) {
        return { ...lib, shelfCount: (lib.shelfCount || 2) + 1 };
      }
      return lib;
    }));
  };

  // Raf Katı Sil
  const handleRemoveShelfRow = () => {
    setLibraries(libraries.map(lib => {
      if (lib.id === activeLibraryId && (lib.shelfCount || 2) > 1) {
        return { ...lib, shelfCount: lib.shelfCount - 1 };
      }
      return lib;
    }));
  };

  const handleDragStart = (e, bookId) => {
    setDraggedBookId(bookId);
    e.dataTransfer.setData('text/plain', bookId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedBookId(null);
    setDragOverIndex(null);
  };

  const handleDropToSlot = (targetSlotIndex) => {
    const activeBookId = draggedBookId;
    if (activeBookId === null) {
      handleDragEnd();
      return;
    }

    setBooks(prevBooks => {
      const targetBook = prevBooks.find(b => 
        (b.libraryIds || ['lib-1']).includes(activeLibraryId) && (b.slotIndex ?? 0) === targetSlotIndex
      );

      const activeBook = prevBooks.find(b => b.id === activeBookId);
      const oldSlotIndex = activeBook ? (activeBook.slotIndex ?? 0) : 0;

      return prevBooks.map(book => {
        if (book.id === activeBookId) {
          return { ...book, slotIndex: targetSlotIndex };
        }
        if (targetBook && book.id === targetBook.id) {
          return { ...book, slotIndex: oldSlotIndex };
        }
        return book;
      });
    });

    handleDragEnd();
  };

  const filteredBooks = currentLibraryBooks.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          book.author.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = (selectedCategory === 'Tümü' || book.category === selectedCategory) &&
                            (filterCategory === 'Tümü' || book.category === filterCategory);
                            
    const matchesAuthor = selectedAuthor === 'Tümü' || book.author === selectedAuthor;
    const matchesStatus = filterStatus === 'Tümü' || book.status === filterStatus;
    const matchesShelf = selectedShelf === 'Tümü' || book.shelfId === selectedShelf;

    return matchesSearch && matchesCategory && matchesAuthor && matchesStatus && matchesShelf;
  });

  return (
    <div className="main-container" onDragEnd={handleDragEnd}>
      
      <header className="app-header" style={{ marginBottom: '15px', borderBottom: 'none', paddingBottom: '0' }}>
        <h1 style={{ margin: 0, fontSize: '32px' }}>BookShelf 📚</h1>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' }}>
        
        <div style={{ display: 'flex', width: '100%' }}>
          <div className="modern-tabs" style={{ display: 'flex', width: '100%' }}>
            <button className={`modern-tab-btn ${activeView === 'cards' ? 'active' : ''}`} onClick={() => setActiveView('cards')} style={{ flex: 1, textAlign: 'center' }}>📖 Kitaplar</button>
            <button className={`modern-tab-btn ${activeView === 'table' ? 'active' : ''}`} onClick={() => setActiveView('table')} style={{ flex: 1, textAlign: 'center' }}>📑 Tablo</button>
            <button className={`modern-tab-btn ${activeView === 'shelf' ? 'active' : ''}`} onClick={() => setActiveView('shelf')} style={{ flex: 1, textAlign: 'center' }}>📚 Kitaplık Rafı</button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '5px', width: '100%' }}>
          <button 
            onClick={openNewBookModal}
            style={{
              background: '#2383e2', color: 'white', border: 'none', borderRadius: '50%',
              width: '44px', height: '44px', fontSize: '24px', fontWeight: 'bold',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(35, 131, 226, 0.4)', transition: 'all 0.2s', flexShrink: 0
            }}
            title="Yeni Kitap Ekle"
          >
            +
          </button>
        </div>

      </div>

      {activeView === 'cards' && (
        <main className="book-list-container">
          {currentLibraryBooks.length === 0 ? (
            <div className="empty-state"><p>Bu kitaplıkta henüz kitap yok.</p></div>
          ) : (
            <div className="book-cards-grid">
              {currentLibraryBooks.map((book) => (
                <div key={book.id} className="book-card" onClick={() => openBookDetailModal(book)} style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                  {book.coverImage ? (
                    <div className="card-cover-banner">
                      <img src={book.coverImage} alt={book.title} className="card-cover-image" style={{ objectPosition: `center ${book.coverPosition || 50}%` }} />
                      <button className="card-cover-action-btn" onClick={(e) => { e.stopPropagation(); openBookDetailModal(book); }}>Kapağı Düzenle</button>
                    </div>
                  ) : (
                    <div className="card-cover-banner placeholder">
                      <button className="card-cover-action-btn" onClick={(e) => { e.stopPropagation(); openBookDetailModal(book); }}>+ Kapak Ekle</button>
                    </div>
                  )}
                  
                  <div className="card-content" style={{ padding: '15px 20px 20px 20px' }}>
                    <h3 className="card-title">{book.title}</h3>
                    <p className="card-author">Yazar: {book.author}</p>
                    {book.publisher && <p style={{ fontSize: '12px', color: '#888', margin: '2px 0 8px 0' }}>Yayınevi: {book.publisher}</p>}
                    
                    <div className="card-properties">
                      {book.rating > 0 && <span className="property-tag rating">{renderStars(book.rating)}</span>}
                      <span className="property-tag category">{book.category}</span>
                      <span className={`property-tag status ${book.status.toLowerCase().replace(/\s+/g, '-')}`}>{book.status}</span>
                    </div>
                  </div>
                  
                  <button onClick={(e) => deleteBook(e, book.id)} className="delete-card-btn">Kitabı Sil</button>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {activeView === 'table' && (
        <main className="book-list-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 style={{ fontSize: '18px', margin: 0, color: '#fff' }}>Kitap Listesi & Filtreleme</h2>
            
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input 
                type="text" placeholder="Kitap veya yazar ara..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)} className="form-input"
                style={{ padding: '6px 12px', fontSize: '13px', background: '#202020', color: '#fff', border: '1px solid #444', borderRadius: '4px', width: '180px' }}
              />

              <select className="form-select" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={{ padding: '6px 12px', fontSize: '13px', background: '#202020', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}>
                <option value="Tümü">Tüm Kategoriler</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>

              <select className="form-select" value={selectedAuthor} onChange={(e) => setSelectedAuthor(e.target.value)} style={{ padding: '6px 12px', fontSize: '13px', background: '#202020', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}>
                <option value="Tümü">Tüm Yazarlar</option>
                {uniqueAuthors.map(author => <option key={author} value={author}>{author}</option>)}
              </select>

              <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '6px 12px', fontSize: '13px', background: '#202020', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}>
                <option value="Tümü">Tüm Durumlar</option>
                <option value="Başlanmadı">Başlanmadı</option>
                <option value="Okunuyor">Okunuyor</option>
                <option value="Tamamlandı">Tamamlandı</option>
                <option value="Yarıda Bırakıldı">Yarıda Bırakıldı</option>
              </select>
            </div>
          </div>

          {filteredBooks.length === 0 ? (
            <div className="empty-state"><p>Seçilen kriterlere uygun kitap bulunamadı.</p></div>
          ) : (
            <div style={{ overflowX: 'auto', background: '#202020', border: '1px solid #333', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #333', color: '#888', background: '#252525' }}>
                    <th style={{ padding: '12px 16px' }}>Kitap Adı</th>
                    <th style={{ padding: '12px 16px' }}>Yazar</th>
                    <th style={{ padding: '12px 16px' }}>Yayınevi</th>
                    <th style={{ padding: '12px 16px' }}>Kategori</th>
                    <th style={{ padding: '12px 16px' }}>Durum</th>
                    <th style={{ padding: '12px 16px' }}>Puan</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBooks.map((book) => (
                    <tr key={book.id} onClick={() => openBookDetailModal(book)} style={{ borderBottom: '1px solid #2a2a2a', cursor: 'pointer', transition: 'background 0.2s' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#fff' }}>{book.title}</td>
                      <td style={{ padding: '12px 16px', color: '#aaa' }}>{book.author}</td>
                      <td style={{ padding: '12px 16px', color: '#aaa' }}>{book.publisher || '-'}</td>
                      <td style={{ padding: '12px 16px' }}><span className="property-tag category">{book.category}</span></td>
                      <td style={{ padding: '12px 16px' }}><span className={`property-tag status ${book.status.toLowerCase().replace(/\s+/g, '-')}`}>{book.status}</span></td>
                      <td style={{ padding: '12px 16px' }}>{book.rating > 0 ? renderStars(book.rating) : '-'}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button className="table-delete-btn" onClick={(e) => deleteBook(e, book.id)} title="Kitabı Sil">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      )}

      {/* --- KİTAPLIK RAFI GÖRÜNÜMÜ (Çoklu Raf Katları & Raf Ekle Butonu) --- */}
      {activeView === 'shelf' && (
        <main className="wooden-shelf-main-wrapper" onDragEnd={handleDragEnd}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', gap: '10px', flexWrap: 'wrap' }}>
            
            {/* Raf Ayarları ve Raf Ekle/Sil Butonları */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#1e1e1e', padding: '6px 12px', borderRadius: '6px', border: '1px solid #333', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', color: '#aaa' }}>Raf Slotu:</span>
                <input 
                  type="number" min="5" max="30" value={shelfCapacity}
                  onChange={(e) => handleUpdateCapacity(e.target.value)}
                  style={{ width: '45px', background: '#2a2a2a', color: '#fff', border: '1px solid #444', borderRadius: '4px', padding: '4px 4px', textAlign: 'center', fontSize: '13px' }}
                />
              </div>

              <div style={{ height: '18px', width: '1px', background: '#444' }}></div>

              <button 
                onClick={handleAddShelfRow}
                style={{ background: '#10b981', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                title="Altına yeni bir raf katı ekle"
              >
                + Raf Ekle
              </button>

              {shelfCount > 1 && (
                <button 
                  onClick={handleRemoveShelfRow}
                  style={{ background: 'transparent', border: '1px solid #f87171', color: '#f87171', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                  title="En alttaki rafı kaldır"
                >
                  - Raf Sil
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {isAddingLibrary ? (
                <form onSubmit={handleCreateLibrary} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input 
                    type="text" placeholder="Kitaplık Adı..." value={newLibraryName}
                    onChange={(e) => setNewLibraryName(e.target.value)} autoFocus
                    style={{ padding: '6px 12px', fontSize: '13px', background: '#202020', color: '#fff', border: '1px solid #444', borderRadius: '4px', outline: 'none' }}
                  />
                  <input 
                    type="number" placeholder="Kapasite" min="5" max="30" value={newLibraryCapacity}
                    onChange={(e) => setNewLibraryCapacity(e.target.value)}
                    style={{ width: '70px', padding: '6px 8px', fontSize: '13px', background: '#202020', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}
                  />
                  <button type="submit" style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>Ekle</button>
                  <button type="button" onClick={() => setIsAddingLibrary(false)} style={{ background: '#444', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>İptal</button>
                </form>
              ) : (
                <button onClick={() => setIsAddingLibrary(true)} style={{ background: '#2383e2', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>+ Yeni Kitaplık Oluştur</button>
              )}

              <select className="form-select" value={activeLibraryId} onChange={(e) => setActiveLibraryId(e.target.value)} style={{ padding: '6px 12px', fontSize: '13px', background: '#202020', color: '#fff', border: '1px solid #444', borderRadius: '4px' }}>
                {libraries.map(lib => <option key={lib.id} value={lib.id}>{lib.name} ({lib.shelfCount || 2} Kat)</option>)}
              </select>

              {libraries.find(l => l.id === activeLibraryId && !l.isDefault) && (
                <button onClick={() => handleDeleteLibrary(activeLibraryId)} title="Bu Kitaplığı Sil" style={{ background: 'transparent', border: '1px solid #f87171', color: '#f87171', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Kitaplığı Sil</button>
              )}
            </div>

          </div>

          <div className="wooden-shelf-container">
            {/* Dinamik olarak raf katı sayısı (shelfCount) kadar raf ve ahşap zemin render ediliyor */}
            {Array.from({ length: shelfCount }).map((_, shelfIndex) => {
              
              const slots = Array.from({ length: shelfCapacity }).map((_, slotIndex) => {
                const globalIndex = shelfIndex * shelfCapacity + slotIndex;
                return currentLibraryBooks.find(b => (b.libraryIds || ['lib-1']).includes(activeLibraryId) && (b.slotIndex ?? 0) === globalIndex) || null;
              });

              return (
                <div key={shelfIndex} className="shelf-row">
                  
                  {slots.map((book, slotIndex) => {
                    const globalSlotIndex = shelfIndex * shelfCapacity + slotIndex;
                    const isHovered = dragOverIndex === globalSlotIndex;
                    const isDraggingThis = draggedBookId !== null;

                    if (book) {
                      const colorClass = getCategoryColorClass(book.category);

                      return (
                        <div 
                          key={book.id} 
                          className={`shelf-book ${colorClass} ${draggedBookId === book.id ? 'dragging' : ''} ${isHovered ? 'drag-over' : ''}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, book.id)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragOverIndex(globalSlotIndex);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            handleDropToSlot(globalSlotIndex);
                          }}
                          onClick={() => openBookDetailModal(book)}
                          title={`${book.title} (${book.category}) - Sürükleyerek yer değiştirebilirsin`}
                          style={{ cursor: 'grab' }}
                        >
                          <span className="shelf-book-title">{book.title}</span>
                        </div>
                      );
                    } else {
                      if (!isDraggingThis) {
                        return (
                          <div 
                            key={`space-${globalSlotIndex}`} 
                            style={{ width: '55px', height: '155px', marginBottom: '22px', flexShrink: 0 }} 
                          />
                        );
                      }

                      return (
                        <div
                          key={`empty-${globalSlotIndex}`}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragOverIndex(globalSlotIndex);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            handleDropToSlot(globalSlotIndex);
                          }}
                          className={`shelf-book shelf-slot-empty ${isHovered ? 'drag-over' : ''}`}
                          title={`Slot ${globalSlotIndex + 1} - Buraya yerleştir`}
                          style={{ cursor: 'pointer' }}
                        >
                          <span style={{ fontSize: '12px', color: isHovered ? '#fff' : '#60a5fa', fontWeight: 'bold' }}>
                            {globalSlotIndex + 1}
                          </span>
                        </div>
                      );
                    }
                  })}

                  <div className="shelf-board"></div>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {isModalOpen && (
        <BookModal 
          onClose={() => setIsModalOpen(false)} 
          onSave={handleSaveBook}
          selectedBook={selectedBook}
          existingAuthors={uniqueAuthors}
          libraries={libraries}
        />
      )}

    </div>
  );
}

export default App;