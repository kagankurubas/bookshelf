# 01: BookModal not (notes) ekleme/düzenleme/silme UI'ı

**What to build:** Kullanıcı, `BookModal`'da (elle/barkodla eklenmiş ya da CSV import'tan gelmiş herhangi bir kitapta) bir not ekleyebilir, var olan bir notu düzenleyip vazgeçebilir, bir notu tek tıkla silebilir. Bu değişiklikler sadece modal'ın ana "Kaydet" butonuna basıldığında `onSave(bookData)` ile dışarı çıkar ve mevcut `syncNotes()` akışı üzerinden kalıcı olur (veri katmanında hiçbir değişiklik yok). Modal "×" ile kapatılırsa (kaydetmeden) hiçbir not değişikliği kalıcı olmaz. Form TR/EN i18n coverage'a sahiptir.

**Blocked by:** None (can start immediately)

- [ ] `selectedBook.notesList` doluyken var olan notlar (tarihleriyle) formda listelenir.
- [ ] Yeni not, bir `<textarea>` + "Ekle" butonuyla eklenebilir; boş/whitespace-only metinle "Ekle"ye basmak sessizce yok sayılır.
- [ ] Var olan bir notun metni düzenlenip kaydedilebilir (`id` korunur, `text` güncellenir) ya da düzenleme "Kaydet"e basmadan vazgeçilip orijinal metne dönülebilir.
- [ ] Var olan/taslak herhangi bir not, onay penceresi olmadan tek tıkla `notesList`'ten kaldırılabilir.
- [ ] Not ekleme/düzenleme/silme sadece component-local state'i günceller; sadece modal'ın ana "Kaydet" butonuna basılınca `onSave(bookData)` içindeki `bookData.notesList` bu değişiklikleri yansıtır - ayrı bir autosave/kayıt işlemi tetiklenmez.
- [ ] Not değişikliği tek başına (başka hiçbir alan değişmeden) mevcut `isModified` mantığını true yapar ve "Kaydet" butonu aktifleşir.
- [ ] Henüz kaydedilmemiş (draft) yeni notlara asla sahte/geçici bir `id` alanı atanmaz (`syncNotes()` bu alanın varlığına/yokluğuna göre insert/update kararı veriyor); React listesi için gereken `key`, `id` alanından tamamen ayrı bir mekanizmayla sağlanır.
- [ ] Taslak (henüz `id`'si olmayan) notlarda tarih yerine bir placeholder gösterilir - gerçek `created_at` sunucu tarafında oluştuğundan istemci tarafında bir tarih uydurulmaz.
- [ ] Yeni çeviri anahtarları `bookModal` namespace'i altında hem `src/i18n/locales/tr.json` hem `src/i18n/locales/en.json`'a eklenir.
- [ ] `src/components/BookModal/BookModal.test.jsx` (yeni dosya, `ImportPreviewModal.test.jsx`/`SettingsModal.test.jsx` pattern'i) mocked `onSave` prop'una geçen `bookData` argümanını assert ederek en az şu senaryoları kapsar: var olan notların render edilmesi, yeni not ekleme, boş metin ekleme denemesinin yok sayılması, var olan not düzenleme, var olan not silme, not değişikliğinin "Kaydet" butonunu aktifleştirmesi.
- [ ] Mevcut test suite'i (`useBooks.test.js`, `useBookFilters.test.js` dahil) kırılmadan geçer.
