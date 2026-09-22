# Not (Notes) Ekleme/Düzenleme UI'ı

Status: ready-for-agent

## Problem Statement

`books` altındaki `notes` tablosu, RLS policy'si ve `useBooks.js` içindeki `syncNotes()` fonksiyonu tam çalışır durumda ve test edilmiş - ama bu veri katmanına ulaşan tek yol Goodreads/StoryGraph CSV import'u (My Review / Private Notes kolonları). `BookModal.jsx` içinde `notesList` sadece `selectedBook.notesList`'ten okunan, hiçbir `<textarea>`/input'a bağlanmamış bir state; kullanıcı elle ya da barkodla eklediği kitaplara not düşemiyor, var olan bir notu düzenleyemiyor ya da silemiyor.

Bunun sonucu olarak "not metinlerinde arama" özelliği (`useBookFilters.js`) fiilen sadece CSV import'tan gelen kitaplarda işlevsel - elle eklenen kitaplarda `notesList` hep boş kaldığı için arama hiçbir zaman oralarda eşleşme bulamıyor.

## Solution

`BookModal.jsx`'e, mevcut form alanlarıyla (etiketler, kapak, kitaplıklar) aynı görsel dilde bir "Notlar" bölümü eklenir. Bu bölüm:

- Var olan notları (varsa `selectedBook.notesList`'ten gelen `{ id, text, date }` kayıtları) tarih bilgisiyle birlikte listeler.
- Her notun yanında bir düzenle (kaleme tıklayınca metin bir `<textarea>`'ya döner) ve bir sil (etiket chip'lerindeki "×" ile aynı desen, onay penceresi yok) aksiyonu sunar.
- Altta yeni not eklemek için bir `<textarea>` + "Ekle" butonu bulunur (Enter değil buton - not metni çok satırlı olabileceğinden tag input'taki Enter-ile-commit deseni burada kullanılmaz).

Bütün bu değişiklikler, formun geri kalanıyla aynı şekilde **sadece component-local state**'te tutulur ve ancak modal'ın mevcut "Kaydet" butonuna basıldığında `onSave(bookData)` ile dışarı çıkar - yeni bir not eklerken/düzenlerken/silerken ayrı bir kayıt işlemi (autosave) tetiklenmez. `bookData.notesList` zaten `handleSave` içinde toplanıp `onSave`'e veriliyor ve `App.jsx`'teki `handleSaveBook` bunu doğrudan `editBook`/`addBook`'a - dolayısıyla `syncNotes()`'a - geçiriyor; bu akışta hiçbir değişiklik gerekmiyor, veri katmanı olduğu gibi yeniden kullanılıyor.

Kapsam tamamen `BookModal.jsx` (+ birlikte yaşadığı `BookModal.css`, i18n dosyaları, yeni test dosyası) ile sınırlı - `App.jsx`'e veya `useBooks.js`'e dokunmaya gerek yok.

## User Stories

1. Kullanıcı olarak, elle eklediğim bir kitaba, kitap detay/düzenleme formundan not ekleyebilmek istiyorum.
2. Kullanıcı olarak, barkodla taratıp kaydettiğim bir kitaba da (ekleme anında değil, sonradan düzenleme formunu açarak) not ekleyebilmek istiyorum.
3. Kullanıcı olarak, yeni bir kitap oluştururken (henüz kaydetmeden) de not yazabilmek, kitabı ilk kez kaydettiğimde bu notun kitapla birlikte oluşturulmasını istiyorum.
4. Kullanıcı olarak, bir kitaba birden fazla ayrı not ekleyebilmek istiyorum (tek bir serbest metin alanı değil, ayrı ayrı not kayıtları).
5. Kullanıcı olarak, boş ya da sadece boşluk karakterlerinden oluşan bir notu eklemeye çalıştığımda, bunun sessizce yok sayılmasını istiyorum (tag input'taki boş-değer davranışıyla tutarlı).
6. Kullanıcı olarak, CSV import'tan gelmiş var olan bir notu bu formdan görebilmek, okuyabilmek istiyorum.
7. Kullanıcı olarak, var olan bir notun metnini düzenleyebilmek istiyorum.
8. Kullanıcı olarak, düzenlemekte olduğum bir notu, "Kaydet"e basmadan vazgeçip eski haline döndürebilmek istiyorum (düzenleme modundan iptal ile çıkış).
9. Kullanıcı olarak, var olan bir notu tek işlemle (tag'lerdeki "×" ile aynı basitlikte, ekstra onay penceresi olmadan) silebilmek istiyorum.
10. Kullanıcı olarak, henüz kaydetmediğim yeni bir notu, "Kaydet"e basmadan formdan kaldırabilmek istiyorum (silme aksiyonu hem kayıtlı hem kayıtsız notlar için aynı şekilde çalışmalı).
11. Kullanıcı olarak, notlarda yaptığım değişiklikler (ekleme/düzenleme/silme) sadece formun asıl "Kaydet" butonuna bastığımda kalıcı olsun istiyorum - modal'ı "×" ile kapatırsam (kaydetmeden), hiçbir not değişikliği veritabanına yansımasın.
12. Kullanıcı olarak, notlarda değişiklik yaptığımda (başka hiçbir alanı değiştirmesem bile) "Kaydet" butonunun aktifleşmesini istiyorum - mevcut `isModified` mantığıyla tutarlı.
13. Kullanıcı olarak, bir notu kaydettikten sonra, o notun ne zaman eklendiğini (tarih) formda görebilmek istiyorum.
14. Kullanıcı olarak, henüz kaydedilmemiş (taslak) bir not için, henüz gerçek bir eklenme tarihi olmadığını anlayabileceğim bir gösterim istiyorum (ör. tarih yerine boş/"kaydedilince eklenecek" ifadesi) - olmayan bir tarih uydurulmasın.
15. Kullanıcı olarak, notlarımı eklediğim/düzenlediğim formun tamamen Türkçe ya da tamamen İngilizce görünmesini istiyorum (uygulamanın dil ayarına göre) - notlar bölümü de diğer form alanları gibi `react-i18next` üzerinden çevrilsin.
16. Kullanıcı olarak, bir kitaba düştüğüm notların, mevcut arama kutusunda aranabilir olmasını istiyorum - bu zaten `useBookFilters.js`'de çalışıyor, bu formun tek görevi `notesList`'i gerçek verilerle doldurmak.
17. Geliştirici olarak, not ekleme/düzenleme/silme akışının mevcut `syncNotes()` diff mantığıyla (id'si olmayan = yeni, id'si olup metni değişen = güncellenecek, eski listede olup yeni listede olmayan id = silinecek) birebir uyumlu bir `notesList` şekli üretmesini istiyorum - veri katmanında hiçbir değişiklik gerekmiyor.

## Implementation Decisions

- **Yer**: Notlar bölümü `BookModal.jsx`'in `modal-body`'sine, mevcut form-group'larla aynı desende (etiketlerden sonra, durum/tarih alanlarından önce ya da sonra - agent'in görsel akışa en uygun yeri seçmesi serbest) eklenir. Ayrı bir modal/route açılmaz.
- **State şekli**: `notesList` artık salt-okunur değil, `useState` + setter ile tutulan bir dizi olur. Her eleman ya `{ id, text, date }` (var olan, DB'den gelen not) ya da `{ text }` (henüz kaydedilmemiş, yeni eklenen not) şeklindedir - `id` alanının varlığı/yokluğu, `syncNotes()`'un "bu not yeni mi var olan mı" ayrımını yaptığı sinyal olduğundan (`useBooks.js`'teki `addedNotes = newNotes.filter(n => !oldIds.includes(n.id))`), yeni notlara asla sahte/geçici bir `id` alanı verilmez.
- **React key**: Yeni eklenen (henüz `id`'si olmayan) notlar için React listesinde stabil bir `key` gerekiyor; bu, `id` alanından tamamen ayrı, sadece render için kullanılan bir client-side anahtar olmalı (ör. `crypto.randomUUID()` ile üretilip ayrı bir alanda - `notesList`'in kendi elemanına değil, ayrı bir paralel state/map'e - tutulur ya da not oluşturma sırasında elemana `_clientKey` gibi `syncNotes()`'un bilmediği, `bookData`'ya gönderilmeden önce süzülen bir alan eklenir). Bu detayın somut biçimi implementasyon sırasında serbest, ama `id` alanı asla bu amaçla kirletilmemeli.
- **Ekleme UI'ı**: Tek bir `<textarea>` + "Ekle" butonu. Tag input'taki Enter-ile-commit deseni burada **kullanılmaz** çünkü not metni çok satırlı olabilir (Enter yeni satır anlamına gelmeli). Boş/trim sonrası boş metin "Ekle"ye basılsa bile yok sayılır (aynı `commitTagInput`/`wrapNote` trim kuralı).
- **Düzenleme UI'ı**: Her not satırında bir kalem/düzenle ikonu, tıklanınca o notun metnini bir `<textarea>`'ya çevirir; "Kaydet" (o notun local state'ini günceller, düzenleme modundan çıkar) ve "Vazgeç" (değişikliği atıp orijinal metne döner) aksiyonları olur. Bu, modal'ın asıl "Kaydet" butonundan bağımsız, sadece local `notesList` state'ini günceller - DB'ye hiçbir şey yazmaz.
- **Silme UI'ı**: Tag chip'lerindeki "×" ile aynı basitlikte tek tıkla, onay penceresi olmadan `notesList`'ten kaldırır (hem kayıtlı hem taslak notlar için aynı davranış).
- **Tarih gösterimi**: Kayıtlı notlarda `note.date` (zaten `formatNoteDate()` ile insan-okunur formatta geliyor) gösterilir. Taslak (henüz `id`'si olmayan, henüz kaydedilmemiş) notlarda tarih yerine bir placeholder/ifade gösterilir - gerçek bir tarih **uydurulmaz** (ör. `new Date()` ile o anki tarih basılmaz), çünkü gerçek `created_at` DB insert'i sırasında sunucu tarafında oluşuyor.
- **`isModified` etkisi**: Mevcut `JSON.stringify(notesList) !== JSON.stringify(selectedBook.notesList || [])` karşılaştırması hem ekleme hem düzenleme hem silme için otomatik olarak doğru sonucu verir - bu satırda değişiklik gerekmiyor.
- **`App.jsx` / `useBooks.js`**: Değişiklik yok. `handleSaveBook` zaten `bookData.notesList`'i `editBook`/`addBook`'a geçiriyor, onlar da `syncNotes()`'u çağırıyor.
- **i18n**: Yeni çeviri anahtarları `bookModal` namespace'i altına, `src/i18n/locales/tr.json` ve `src/i18n/locales/en.json`'a eklenir (bölüm başlığı, not ekle placeholder'ı, "Ekle"/"Kaydet"/"Vazgeç"/"Sil" etiketleri, boş-liste durumu için opsiyonel bir metin, taslak-tarih placeholder'ı).
- **App.jsx ile çakışma yok**: Bu iş `App.jsx`'e hiç dokunmuyor (yukarıya bakınız - `handleSaveBook` zaten değişmeden çalışıyor), dolayısıyla App.jsx'i etkileyen başka bir iş ile sıralama endişesi yok.

## Testing Decisions

- İyi bir test, davranışı `BookModal`'ın dışarıya açtığı tek sınırdan (`onSave` prop'una geçen `bookData`) doğrular - iç state'in nasıl tutulduğu (hangi değişken adı, hangi obje şekli) implementasyon detayıdır ve test edilmez.
- Yeni dosya: `src/components/BookModal/BookModal.test.jsx` (Vitest + React Testing Library), prior art: `ImportPreviewModal.test.jsx` ve `SettingsModal.test.jsx` - `onSave`/`onClose` gibi callback prop'ları `vi.fn()` ile mock'lanıp render edilir, kullanıcı etkileşimleri `fireEvent`/`userEvent` ile simüle edilir, sonuç mock'a geçen argümanlar üzerinden assert edilir.
- Kapsanacak senaryolar (asgari):
  - `selectedBook.notesList` doluyken notlar ekranda görünür.
  - Yeni not textarea'sına metin yazıp "Ekle"ye basınca, "Kaydet"e basıldığında `onSave` çağrısındaki `bookData.notesList` içinde bu yeni not (`id` alanı olmadan, doğru `text` ile) yer alır.
  - Boş/whitespace-only metinle "Ekle"ye basmak notesList'e hiçbir şey eklemez.
  - Var olan bir notu düzenleyip kaydedince, "Kaydet"e basıldığında `bookData.notesList`'teki ilgili elemanın `id`'si aynı kalır, `text`'i güncellenir.
  - Var olan bir notu silince, "Kaydet"e basıldığında `bookData.notesList` o notu içermez.
  - Not değişikliği tek başına (başka hiçbir alan değişmeden) modal'ın "Kaydet" butonunu aktif hale getirir (`disabled` kalkar).
- `syncNotes()`'un kendisi (`useBooks.test.js`) ve arama davranışı (`useBookFilters.test.js`) zaten test kapsamında - bu ticket onlara dokunmuyor, tekrar test edilmiyor.
- Mevcut test suite'i kırmamalı; `notesList`'in artık mutable bir state olması diğer alanlara (`isModified`, `handleSave`) dokunmadığından, mevcut testlerde regresyon beklenmiyor.

## Out of Scope

- `App.jsx`, `useBooks.js`, `syncNotes()` içinde herhangi bir değişiklik.
- Notlara özel bir arama/filtre UI'ı (mevcut genel arama kutusu zaten notesList'i kapsıyor - `free-tags-and-search` spec'inde çözüldü).
- Not autosave / debounce'lu ayrı kaydetme - notlar sadece modal'ın asıl "Kaydet" akışıyla birlikte yazılır.
- Notlara zengin metin biçimlendirme (markdown, resim, vb.) - düz metin.
- Çoklu kullanıcı/işbirlikli not düzenleme senaryoları.
- `BatchScanner.jsx` akışına not ekleme UI'ı eklemek (orada `notesList: []` sabit kalmaya devam eder - toplu barkod taramada not girişi bu ticket'ın kapsamı dışında).

## Further Notes

- Bu spec'i uygulayan agent, `.claude/skills/implement-spec` (ya da eşdeğeri) akışını izleyip bu dosyanın yanına `.scratch/notes-editing-ui/issues/` altında numaralı implementasyon ticket'ları çıkarabilir; tek bir küçük ticket (`01-book-modal-notes-ui.md`) yeterli olabilir, iş `BookModal.jsx` ile sınırlı ve tek bir seam'de test ediliyor.
