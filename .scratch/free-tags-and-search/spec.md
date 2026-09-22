# Serbest Etiketleme (Tags) + Tam Metin Arama

Status: ready-for-agent

## Problem Statement

Kullanıcı bir kitabı yalnızca tek, sabit bir `category` (Kurgu, Bilim Kurgu, Biyografi...) ile sınıflandırabiliyor. Ama kullanıcının kendi kafasındaki organizasyon ihtiyaçları bu sabit listeye sığmıyor: "yeniden okunacak", "ödünç aldım", "hediye", "tatilde bitecek" gibi kendi tanımladığı, sayısı sınırsız, kitaba birden fazla iliştirilebilen etiketlere ihtiyacı var - bunlar kategoriden farklı bir boyut, kategorinin yerini almıyor.

Ayrıca kütüphanesi büyüdükçe "hangi kitapta böyle bir şey yazmıştım?" ya da "adı öyle böyleydi ama tam hatırlamıyorum" türü aramalar mevcut arama kutusuyla (sadece başlık + yazar) karşılanamıyor - kitaba düşülen notların içeriği aranamıyor.

## Solution

**Etiketler**: `books` tablosuna `tags text[]` kolonu eklenir (bkz. Implementation Decisions - neden ayrı bir tablo değil). Kitap ekleme/düzenleme formunda serbest metin girişli, virgül/Enter ile ayrılan, daha önce kullanılmış etiketleri öneren (native `<datalist>`, yazar alanındaki mevcut autocomplete deseniyle aynı) bir çoklu-etiket girişi eklenir. Etiketler kategoriden bağımsız, bir kitabın birden fazla etiketi olabilir.

**Arama**: Uygulama zaten kullanıcının **tüm** kitaplarını (notlar dahil) tek seferde çekip `useBookFilters` içinde client-side (`.toLowerCase().includes(...)`) filtreliyor - ayrı bir arama sayfası ya da backend tam metin arama altyapısı (tsvector/ILIKE) kurulmuyor, çünkü zaten süzülecek veri tarayıcıda. Mevcut arama kutusu başlık+yazara ek olarak **not metinlerini ve etiketleri** de kapsayacak şekilde genişletilir. Ayrıca, kategori/yazar/durum filtreleri gibi ayrı bir "Etiket" seçim kutusu eklenir - serbest arama "bu metni içeren kitapları bul", etiket filtresi ise "tam olarak bu etikete sahip kitapları bul" ihtiyacını karşılar; ikisi birbirini dışlamaz, birlikte uygulanır.

Bu, mevcut Tablo görünümünün araç çubuğuna (tek filtreleme/arama seam'i - `useBookFilters` + `TableView`) entegre olur; yeni bir sayfa veya bileşen ailesi açılmaz.

## User Stories

1. Kullanıcı olarak, bir kitabı düzenlerken/eklerken serbest metin yazıp Enter'a basarak veya virgülle ayırarak ona istediğim kadar etiket ekleyebilmek istiyorum.
2. Kullanıcı olarak, daha önce başka bir kitaba eklediğim bir etiketi yazmaya başladığımda, onu öneri olarak görüp seçebilmek istiyorum (yazım hatası/tutarsızlık riskini azaltmak için), ama listede olmayan tamamen yeni bir etiket de yazabilmek istiyorum.
3. Kullanıcı olarak, bir kitaba yanlışlıkla eklediğim bir etiketi tek tıkla (chip üzerindeki "x") kaldırabilmek istiyorum.
4. Kullanıcı olarak, aynı kitaba aynı etiketi (baştaki/sondaki boşluklar ya da büyük/küçük harf farkı yüzünden) yanlışlıkla iki kez eklemek istemiyorum - uygulama bunu benim için engellemeli.
5. Kullanıcı olarak, hiç etiket eklemeden bir kitabı kaydedebilmek istiyorum - etiket zorunlu bir alan değil.
6. Kullanıcı olarak, Tablo görünümünde bir kitabın hangi etiketlere sahip olduğunu satırda görebilmek istiyorum (kategori ve durum rozetlerinde olduğu gibi).
7. Kullanıcı olarak, Kart görünümünde de bir kitabın etiketlerini kategori/durum rozetleriyle birlikte görebilmek istiyorum.
8. Kullanıcı olarak, Tablo görünümündeki arama kutusuna bir kelime yazdığımda, bu kelimenin geçtiği kitapları artık sadece başlık/yazardan değil, o kitaba düştüğüm **notların içeriğinden** de bulabilmek istiyorum.
9. Kullanıcı olarak, arama kutusuna bir etiket adı (ya da onun bir parçasını) yazdığımda, o etikete sahip kitapların da sonuçlarda çıkmasını istiyorum.
10. Kullanıcı olarak, Tablo görünümünde kategori/yazar/durum filtrelerine ek olarak bir "Etiket" seçim kutusundan tek bir etiket seçip, sadece o etikete sahip kitapları listeleyebilmek istiyorum.
11. Kullanıcı olarak, etiket filtresini kategori/yazar/durum filtreleriyle **birlikte** (ör. "Kurgu" kategorisi + "ödünç aldım" etiketi) kullanabilmek istiyorum - filtreler birbirini daraltmalı, birbirini geçersiz kılmamalı.
12. Kullanıcı olarak, hiçbir kitapta henüz kullanılmamış bir etiket varsa "Etiket" filtre kutusunda görünmemesini istiyorum - sadece gerçekten kullanılan etiketler listelensin.
13. Kullanıcı olarak, bir kitabın etiketlerini düzenleyip kaydettiğimde, sayfayı yenilesem bile bu etiketlerin kalıcı olmasını istiyorum.
14. Kullanıcı olarak, kendi hesabımdaki kitaplara eklediğim etiketlerin, uygulamada hiçbir zaman başka bir kullanıcıya görünmemesini/karışmamasını istiyorum (mevcut kitap izolasyonuyla aynı garanti).
15. Kullanıcı olarak, bir kitabı silersem, o kitaba ait etiketlerin de (ayrıca bir şey yapmama gerek kalmadan) silinmesini istiyorum.
16. Geliştirici olarak, mevcut `category` alanına hiçbir şekilde dokunulmamasını, bu iki kavramın (sabit kategori vs. serbest etiket) veri modelinde ve UI'da net şekilde ayrı kalmasını istiyorum.

## Implementation Decisions

### Veri modeli

- Yeni migration (`supabase/migrations/013_free_tags.sql` + `supabase/schema.sql`'in güncellenmesi): `books` tablosuna `tags text[] not null default '{}'` kolonu eklenir. **Ayrı bir `tags` + `book_tags` junction tablosu kurulmaz** - gerekçe: uygulama zaten kullanıcının tüm kitaplarını tek seferde belleğe çekiyor (`useBooks`), etiket bazlı istatistik/agregasyon bu görevin kapsamı dışında, ve mevcut `uniqueAuthors` deseni (bkz. `useBookFilters.js`) zaten "kitaplardan client-side benzersiz liste çıkar" işini kanıtlanmış şekilde yapıyor - aynı desen etiketler için de kullanılabilir. İki yeni tablo + RLS policy + senkronizasyon fonksiyonu (junction tablo için `syncBookLibraries`/`syncNotes` benzeri bir "diff'le ekle/sil" katmanı) bu ölçek ve kapsam için gereksiz karmaşıklık olurdu.
- **RLS**: `tags` sıradan bir `books` kolonu olduğu için, mevcut `"Users manage own books"` policy'si (`auth.uid() = user_id`) otomatik olarak kapsıyor - yeni bir policy yazılmasına gerek yok.
- Kitap silindiğinde etiketler otomatik gider (kolon, ayrı satır değil - `on delete cascade` gerekmiyor).

### Veri katmanı (`useBooks.js`)

- `BOOKS_SELECT`'e `tags` eklenir.
- `BOOK_COLUMN_MAP`'e `tags: 'tags'` eklenir (kategori/durum gibi düz bir alan - `notesList`/`libraryIds` gibi ayrı bir sync fonksiyonu gerekmez, `toBookColumns` üzerinden normal `update`/`insert` akışına girer).
- `mapBookRow`'da `tags: row.tags || []` eklenir.

### Filtreleme/arama katmanı (`useBookFilters.js`)

- `uniqueAuthors`'ın hemen yanına, aynı desende `uniqueTags = [...new Set(books.flatMap((b) => b.tags || []))].sort(...)` eklenir - **`activeLibraryId`'ye göre daraltılmaz**, `uniqueAuthors` için yazılmış olan yorumdaki gerekçe (BookModal'daki autocomplete'in hangi kitaplığa ekleneceğinden bağımsız olması) burada da geçerli, aynı `uniqueTags` listesi hem filtre seçim kutusunu hem BookModal'daki öneri listesini besler.
- Yeni state: `selectedTag` (varsayılan `'Tümü'`) + `setSelectedTag`.
- `matchesSearch` genişletilir: mevcut başlık/yazar kontrolüne ek olarak `book.notesList.some((n) => n.text.toLowerCase().includes(q))` ve `(book.tags || []).some((tag) => tag.toLowerCase().includes(q))` eklenir (hepsi mevcut `||` zincirine eklenen ek koşullar - tek bir arama kutusu, tüm alanlarda "içeriyor mu" arar).
- Yeni koşul: `matchesTag = selectedTag === 'Tümü' || (book.tags || []).includes(selectedTag)` - diğer `matchesX` koşullarıyla birlikte `&&` zincirine eklenir (filtreler birbirini daraltır, User Story 11).
- Dönüş değerine `selectedTag`, `setSelectedTag`, `uniqueTags` eklenir.

### Tablo görünümü (`TableView.jsx`)

- Mevcut arama kutusu + kategori/yazar/durum `<select>`lerinin yanına, aynı stil ve desende bir "Etiket" `<select>`i eklenir (`selectedTag`/`onSelectedTagChange` prop'ları, `'Tümü'` + `uniqueTags.map(...)` seçenekleri - kategori filtresiyle birebir aynı yapı).
- Tabloya kategori ile durum arasına (mantıksal olarak ikisi de "etiketleme" niteliğinde alanlar) yeni bir "Etiketler" kolonu eklenir; hücrede kitabın her etiketi mevcut `property-tag` CSS sınıfı ailesine yeni bir varyant (`property-tag tag` gibi) ile küçük bir chip olarak yan yana listelenir, hiç etiket yoksa `-` gösterilir (kategori hücresindeki boş-durum deseniyle aynı).
- `App.jsx`'teki `TableView`'a geçirilen prop listesine `selectedTag`/`onSelectedTagChange`/`uniqueTags` eklenir (`bookFilters` objesinden).

### Kart görünümü (`CardsView.jsx`)

- `card-properties` içindeki rating/kategori/durum rozetlerinin yanına, kitabın etiketleri varsa aynı `property-tag` chip deseniyle (salt-görüntüleme, tıklanamaz) eklenir. Kart görünümünde herhangi bir filtreleme yok (bugün de yok) - bu değişmiyor, sadece görüntüleme.
- Raf (Shelf) görünümüne **hiçbir metadata eklenmiyor** - o görünüm bugün de kategori/durum/etiket göstermiyor, salt görsel/mekansal bir mockup; bu görev onu değiştirmiyor.

### Etiket girişi (`BookModal.jsx`)

- Yeni bir form alanı: "Etiketler" (`TagIcon` zaten mevcut, kategori alanının kullandığı ikon - reddedilecek bir çakışma yok çünkü kategori kendi başlığı altında kalıyor, ayrı bir alan). Serbest metin `<input>` + `list="tag-suggestions"` (`existingAuthors`/`author-list` deseninin birebir aynısı) + bir `<datalist id="tag-suggestions">` (kaynağı: `uniqueTags`, App.jsx'ten `existingAuthors` gibi yeni bir `existingTags` prop'uyla geçirilir).
- `Enter` tuşuna basıldığında (ya da metne virgül girildiğinde) input'taki metin `trim()`lenir, boşsa yok sayılır, kitabın mevcut etiket listesinde **case-insensitive** zaten varsa yok sayılır (User Story 4 - yani o kitapta zaten "Roman" varken "roman" yazılırsa hiçbir şey eklenmez, mevcut "Roman" olduğu gibi kalır), yoksa **girildiği haliyle (normalize etmeden, `author`/`category` alanlarında olduğu gibi)** listeye eklenir ve input temizlenir. Bu case-insensitive kontrol yalnızca **aynı kitabın kendi etiket listesi** içindir - farklı kitaplardaki "Roman" ve "roman" birbirine göre normalize edilmez/birleştirilmez (bkz. Out of Scope - etiket normalizasyonu).
- Eklenen etiketler input'un altında, kaldırılabilir (× butonlu) chip'ler olarak gösterilir - `BookModal`'daki kitaplık seçim chip'lerinin (`selectedLibraries` toggle butonları) görsel/etkileşim desenine yakın, ama burada sabit bir liste arasından seçim değil, serbest ekleme/çıkarma.
- Yeni state: `tags` (başlangıç değeri `selectedBook ? selectedBook.tags || [] : []`), `handleSave`'deki `bookData`'ya `tags` eklenir, `isModified` karşılaştırmasına `JSON.stringify(tags) !== JSON.stringify(selectedBook.tags || [])` eklenir (mevcut `notesList`/`selectedLibraries` karşılaştırma deseniyle aynı).

### i18n

- Yeni çeviri anahtarları hem `src/i18n/locales/tr.json` hem `en.json`'a eklenir, mevcut namespace deseniyle tutarlı: `table.tagFilterLabel`, `table.allTags`, `table.colTags`, `bookModal.tags`, `bookModal.tagsPlaceholder`, `cards` tarafında ayrı bir anahtar gerekmez (chip'ler kendi metnini kitabın verisinden alır, sabit bir label yok).

## Testing Decisions

- İyi bir test dış davranışı doğrular (input → beklenen filtrelenmiş/kaydedilmiş çıktı), iç implementasyon detaylarını (hangi state değişkeninin adı ne) değil.
- `useBookFilters.js`'in bugün hiç testi yok - bu görev onu da ekleyerek başlıyor (yeni `useBookFilters.test.js`): `matchesSearch`'in artık not metni ve etiket içeriğini de eşlediği, `selectedTag` filtresinin diğer filtrelerle (kategori/yazar/durum) birlikte AND mantığıyla çalıştığı, `uniqueTags`'in `activeLibraryId`'den bağımsız (tüm kitaplardan) hesaplandığı, ve boş/tekrarlı etiket durumlarında (`tags` alanı olmayan eski bir kitap satırı, `tags: []`) hata vermediği kapsanır. Prior art (mock'suz, saf hook testi) için `renderHook` kullanımı: `useAuth.test.js`/`useLibrary.test.js`'teki desen izlenir.
- `useBooks.test.js`'e (mevcut dosya, `supabase.from` mock deseni zaten kurulu) `tags` alanının DB satırından doğru map'lendiği ve `addBook`/`editBook`'un `tags`'i diğer düz kolonlar (`category`, `status`) gibi `toBookColumns` üzerinden gönderdiği doğrulayan yeni test case'leri eklenir - yeni bir mock deseni icat edilmez, mevcut `baseRow`/`queryResult` helper'ları genişletilir.
- `BookModal.jsx`'in bugün hiç component testi yok, bu görev kapsamında da tam bir component test paketi kurulmuyor (mevcut testsiz durum korunuyor) - sadece yukarıdaki iki hook testinde davranış doğrulanır. Eğer ileride `BookModal` için testler eklenirse, etiket ekleme/kaldırma/duplicate-engelleme akışı da oraya eklenmelidir; bu görev o altyapıyı **kurmuyor**.
- Yeni migration (`013_free_tags.sql`) için otomatik test yazılmaz - mevcut migration dosyalarının hiçbirinin testi yok, aynı repo konvansiyonu korunur; RLS'in gerçekten izole ettiği zaten mevcut `books` policy'sinden miras alınıyor (ayrı bir RLS entegrasyon testi gerekmiyor - `rls-auth-integration-tests` görevi kapsamındaki mevcut testler `books` tablosunu zaten kapsıyorsa `tags` kolonu otomatik dahil olur, ekstra senaryo yazmaya gerek yok çünkü kolon bazlı değil satır bazlı izolasyon test ediliyor).

## Out of Scope

- Etiket bazlı istatistik/dashboard entegrasyonu (ör. "en çok kullanılan etiketler" grafiği) - ayrı bir görev.
- Çoklu-kullanıcı etiket paylaşımı/önerisi - her kullanıcı sadece kendi geçmiş etiketlerini görür/önerir, paylaşım yok.
- Etiketleri normalize etme/yeniden adlandırma araçları (ör. "bu etiketi her yerde X'ten Y'ye yeniden adlandır") - `text[]` modeliyle bu, ileride ayrı bir görev olarak (gerekirse o zaman normalize modele geçilerek) ele alınabilir.
- Card/Shelf görünümlerine arama/filtre eklenmesi - filtreleme bugün olduğu gibi sadece Tablo görünümünde kalıyor, bu görev o kapsamı genişletmiyor.
- Etiketlere göre kitap sıralama (sort) - sadece filtreleme isteniyor, sıralama değil.
- Maksimum etiket sayısı/uzunluğu sınırı - kullanıcı sayısı ve veri hacmi göz önüne alındığında bir DB constraint'i gerekmiyor kabul edildi.

## Further Notes

Bu görev tek bir seam üzerinden (veri katmanı: `useBooks.js` → filtre katmanı: `useBookFilters.js` → UI: `TableView.jsx` + `CardsView.jsx` + `BookModal.jsx` + bir migration) ilerliyor ve büyüklük olarak tek bir ticket/PR'a sığacak ölçekte (yeni tablo yok, yeni sayfa yok, yeni bağımlılık yok). `/to-tickets` ile bölmek yerine tek parça olarak uygulanmasını öneriyorum; yine de kullanıcı isterse migration+veri katmanı / filtre+arama / BookModal UI şeklinde 3 ayrı ticket'a bölünebilir.
