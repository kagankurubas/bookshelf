# CSV/JSON Export ve Import (Goodreads/StoryGraph Uyumlu)

Status: ready-for-agent

## Problem Statement

Kullanıcının BookShelf'e girdiği tüm kitap/okuma verisi şu an sadece uygulama içinde erişilebilir - kullanıcı bu veriyi dışarı çıkaramıyor (yedek almak, başka bir araca taşımak, veya sadece "verim bende, kilit altında değil" güvencesini hissetmek için). Aynı şekilde, Goodreads veya StoryGraph'tan BookShelf'e geçmek isteyen bir kullanıcı, yüzlerce kitabı elle tek tek girmek zorunda - bu, uygulamaya geçişin önündeki en büyük pratik engel.

## Solution

Ayarlar ekranına bir "Veri" bölümü eklenir:
- **Dışa Aktar**: Kullanıcının kendi kitaplarını (RLS zaten `auth.uid() = user_id` ile filtrelediği için ek yetki kontrolüne gerek yok) tek tıkla CSV veya JSON olarak indirebileceği iki buton.
- **İçe Aktar**: Kullanıcının Goodreads veya StoryGraph'tan indirdiği CSV dosyasını seçip yükleyebileceği, ayrıştırılan kitapları bir önizleme ekranında görüp (olası çift kayıtlar işaretlenmiş halde) onaylayarak BookShelf'e ekleyebileceği bir akış.

Hem export hem import, var olan `useBooks` hook'unun zaten yüklediği veri ve zaten var olan `addBook` yazma yolu üzerinden çalışır - yeni bir Supabase sorgusu veya yeni bir RLS/yetki kontrolü gerekmez.

## User Stories

1. Kullanıcı olarak, Ayarlar ekranından tek tıkla tüm kitaplarımı CSV olarak indirebilmek istiyorum, ki verimin bir kopyasını kendi bilgisayarımda tutabileyim.
2. Kullanıcı olarak, Ayarlar ekranından tek tıkla tüm kitaplarımı JSON olarak indirebilmek istiyorum, ki notlarım ve kütüphane bilgim gibi yapılandırılmış veriyi de kaybetmeden dışarı alabileyim.
3. Kullanıcı olarak, indirdiğim dosyanın adında bir tarih damgası görmek istiyorum, ki farklı zamanlarda aldığım yedekleri karıştırmayayım.
4. Kullanıcı olarak, dışa aktarılan CSV'de kitabın başlığı, yazarı, yayınevi, kategorisi, durumu, puanı, ISBN'i, sayfa sayısı, favori durumu, başlangıç/bitiş tarihleri ve hangi kitaplık(lar)da olduğunu görmek istiyorum, ki dosya tek başına anlamlı olsun.
5. Kullanıcı olarak, dışa aktarılan JSON'da yukarıdakilere ek olarak kitaba eklediğim notları da görmek istiyorum, ki JSON export'u gerçek bir tam yedek olsun.
6. Kullanıcı olarak, Goodreads'ten indirdiğim CSV export dosyasını BookShelf'e yükleyebilmek istiyorum, ki Goodreads'teki kitaplığımı elle yeniden girmek zorunda kalmayayım.
7. Kullanıcı olarak, StoryGraph'tan indirdiğim CSV export dosyasını BookShelf'e yükleyebilmek istiyorum, ki StoryGraph'taki kitaplığımı elle yeniden girmek zorunda kalmayayım.
8. Kullanıcı olarak, içe aktarma öncesi hangi platformdan (Goodreads/StoryGraph) yüklediğimi seçmek istiyorum, ki uygulama doğru sütun eşlemesini kullansın.
9. Kullanıcı olarak, dosyamı yükledikten sonra, hangi kitapların ekleneceğini bir önizleme listesinde görmek istiyorum, ki gerçekten içe aktarmadan önce ne olacağını kontrol edebileyim.
10. Kullanıcı olarak, önizleme listesinde kitaplığımda zaten olduğunu düşündüğüm (başlık+yazar eşleşen) satırların işaretlendiğini görmek istiyorum, ki aynı kitabı yanlışlıkla iki kez eklemeyeyim.
11. Kullanıcı olarak, olası çift kayıt olarak işaretlenmiş bir satırı yine de içe aktarmak istersem bunu seçebilmek istiyorum (ör. gerçekten aynı kitabın farklı bir baskısı), ki uygulama benim yerime kesin karar vermesin.
12. Kullanıcı olarak, önizlemede istemediğim satırların seçimini tek tek kaldırabilmek istiyorum, ki sadece gerçekten istediğim kitapları içe aktarayım.
13. Kullanıcı olarak, içe aktarma tamamlandığında kaç kitabın eklendiğini, kaçının atlandığını ve neden atlandığını özetleyen bir sonuç mesajı görmek istiyorum, ki işlemin sonucundan emin olayım.
14. Kullanıcı olarak, StoryGraph'taki küsuratlı (ör. 4.25) puanlarımın BookShelf'in tam sayı puanlama sistemine yuvarlandığını, ve kaç kitabın puanının yuvarlandığını içe aktarma özetinde görmek istiyorum, ki hassas bilgi kaybının farkında olmadan kaybolmasın.
15. Kullanıcı olarak, Goodreads'in "Currently Reading"/"Read"/"To Read" raflarımın BookShelf'in Okunuyor/Tamamlandı/Başlanmadı durumlarına doğru eşlendiğini görmek istiyorum, ki durumu elle düzeltmek zorunda kalmayayım.
16. Kullanıcı olarak, StoryGraph'ta "did-not-finish" olarak işaretlediğim bir kitabın BookShelf'te "Yarıda Bırakıldı" olarak geldiğini görmek istiyorum, ki bu bilgi de taşınsın.
17. Kullanıcı olarak, Goodreads'ten gelen kitaplarda "yarıda bırakma" bilgisi olmadığını (Goodreads'in böyle bir rafı yok) biliyorum, bu yüzden böyle kitapların varsayılan olarak "Başlanmadı" gelmesini makul buluyorum.
18. Kullanıcı olarak, kitabımın Goodreads'teki ISBN'inin (Excel'in bozmaması için `="1234567890"` şeklinde sarmalanmış olsa bile) doğru şekilde okunduğunu istiyorum, ki bu alan bozuk gelmesin.
19. Kullanıcı olarak, bozuk veya beklenmeyen formatta bir CSV dosyası yüklersem, anlaşılır bir hata mesajı görmek istiyorum ("dosya okunamadı" gibi teknik olmayan bir dille), ki ne yapacağımı bileyim.
20. Kullanıcı olarak, yanlış platformu seçip (ör. StoryGraph dosyasını "Goodreads" olarak) yüklersem, bunun fark edilip bana "seçtiğin format bu dosyayla eşleşmiyor, kontrol et" gibi açık bir uyarı verilmesini istiyorum, ki sessizce yanlış/boş veri içe aktarılmasın.
21. Kullanıcı olarak, çok büyük bir dosya yüklersem (makul bir sınırın üzerinde), tarayıcımın kilitlenmesi yerine anlaşılır bir "dosya çok büyük" hatası görmek istiyorum.
22. Kullanıcı olarak, içe aktarılan bir satırda başlık gibi zorunlu bir alan eksikse, bu satırın atlanıp bana atlanma sebebiyle birlikte bildirilmesini istiyorum, ki dosyamın geri kalanı yine de içe aktarılsın.
23. Kullanıcı olarak, içe aktarma sırasında oluşan kitapların doğrudan mevcut kitaplıklarımdan birine (varsayılan kitaplığa) eklendiğini istiyorum, ki içe aktarılan kitaplar "havada" kalmasın.
24. Kullanıcı olarak, Goodreads/StoryGraph'taki shelf/kitaplık gruplamamın (varsa) BookShelf'e taşınmadığını, tüm kitapların tek bir varsayılan kitaplığa geldiğini içe aktarma sonucunda açıkça görmek istiyorum, ki "diğer kitaplıklarım nereye gitti" diye şaşırmayayım.
25. Geliştirici olarak, export/import mantığının Supabase'e veya DOM'a bağımlı olmayan saf fonksiyonlar olarak yazılmasını istiyorum, ki mock'suz, hızlı birim testleri yazabileyim.

## Implementation Decisions

- **Seam**: Tek bir yeni katman - `src/lib/` altında saf (Supabase/DOM'suz) export ve import/mapping fonksiyonları. Export, zaten `useBooks(userId)` ile bellekte yüklü olan kitap listesini serileştirir (ek sorgu yok). Import, CSV'yi parse edip her satırı var olan `useBooks().addBook(bookFields)` çağrısına eşdeğer bir nesneye dönüştürür; **yeni bir DB-yazma yolu eklenmez**, mevcut `addBook` (kitaplık ilişkilendirme ve not ekleme dahil) olduğu gibi kullanılır.
- **CSV kütüphanesi**: `papaparse` bağımlılık olarak eklenir (hem parse hem unparse için). RFC4180 kaçış kurallarını (tırnak içinde virgül/newline, çift tırnak escape'i) elle yazmak yüksek riskli bir hata kaynağıdır; küçük ve yaygın kullanılan bu kütüphane burada "az kod" ilkesine aykırı değil, güvenilirlik için gereklidir.
- **Dosya indirme mekanizması**: Yeni bir şey icat edilmez - `ReadingRecap.jsx`'teki var olan `Blob` + `URL.createObjectURL` + `<a download>` + `URL.revokeObjectURL` deseni aynen tekrar kullanılır.
- **Dosya adı konvansiyonu**: `bookshelf-export-YYYY-MM-DD.csv` / `.json` (indirme anındaki yerel tarih, `ReadingRecap`'in dosya adı desenine benzer şekilde `t()` ile çevrilebilir bir önek de düşünülebilir ama sabit `bookshelf-export-` öneki yeterli).
- **Export edilen alanlar (CSV ve JSON ortak)**: title, author, publisher, category, status (BookShelf'in kendi Türkçe durum adlarıyla: Başlanmadı/Okunuyor/Tamamlandı/Yarıda Bırakıldı), rating, isbn, pageCount, isFavorite, dateStarted, dateFinished, createdAt, ve kitabın bağlı olduğu kitaplık(lar)ın **adları** (raw `library_id` değil - taşınabilirlik için anlamsız). CSV'de kitaplık adları tek bir sütunda `; ` ile ayrılmış liste olarak, notlar tek bir sütunda `\n---\n` ile ayrılmış liste olarak (papaparse embedded newline'ı doğru quote'layıp okuyacağı için sorun değil). JSON'da notlar `{ text, date }` dizisi olarak tam yapısıyla korunur - JSON, tam yedek formatıdır.
- **Dışa aktarımda hariç tutulanlar**: `coverImage`, `coverPosition`, `shelfId`, `shelfRow`, `slotIndex` - bunlar sadece uygulama içi raf/görsel yerleşim detayları, uygulama dışında (veya geri içe aktarıldığında) anlamsız.
- **Format seçimi kullanıcı tarafından yapılır**: İçe aktarma akışı önce kullanıcıya "Goodreads" veya "StoryGraph" seçtirir, sonra dosya seçtirir - otomatik platform tespiti yapılmaz. Seçilen platform için beklenen sütunların (örn. Goodreads için `Title`, `Author`, `Exclusive Shelf`; StoryGraph için `Title`, `Authors`, `Read Status`/`ReadStatus`) dosyanın başlık satırında bulunup bulunmadığı kontrol edilir; eksikse "seçtiğin format bu dosyayla eşleşmiyor" hatası verilir, hiçbir satır işlenmez.
  - **Implementasyon notu**: StoryGraph'ın "okuma durumu" sütununun tam adı (`Read Status` vs `ReadStatus`) kaynaklara göre farklılık gösteriyor - implementasyon sırasında gerçek bir StoryGraph export örneğiyle doğrulanmalı, bu araştırma özetine körü körüne güvenilmemeli.
- **Goodreads sütun eşlemesi** (gerçek export başlık satırı: `Book Id, Title, Author, Author l-f, Additional Authors, ISBN, ISBN13, My Rating, Average Rating, Publisher, Binding, Number of Pages, Year Published, Original Publication Year, Date Read, Date Added, Bookshelves, Bookshelves with positions, Exclusive Shelf, My Review, Spoiler, Private Notes, Read Count, Recommended For, Recommended By, Owned Copies, Original Purchase Date, Original Purchase Location, Condition, Condition Description, BCID`):
  - `Title` → title; `Author` (+ varsa `Additional Authors` virgülle birleştirilir) → author; `ISBN13` (yoksa `ISBN`) → isbn - **her iki alan da Goodreads'te Excel'in bozmaması için `="değer"` şeklinde sarmalanmış gelir, parse ederken bu sarmalayıcı temizlenmeli**; `Publisher` → publisher; `My Rating` (0-5 tam sayı, 0 = puansız) → rating; `Number of Pages` → pageCount; `Date Read` → dateFinished (sadece `Exclusive Shelf = read` ise); `My Review` veya `Private Notes` (boş değilse) → tek bir not satırı.
  - `Exclusive Shelf` → status: `read` → Tamamlandı, `currently-reading` → Okunuyor, `to-read` → Başlanmadı. Goodreads'in "yarıda bırakıldı" kavramı yok - eşlemeyen/tanınmayan değerler Başlanmadı'ya düşer.
  - `category` alanına eşleme yok (Goodreads'in `Bookshelves` alanı kullanıcı tanımlı serbest etiketlerdir, sabit bir tür/kategori değildir) - boş bırakılır.
  - `dateStarted` alanına eşleme yok (Goodreads başlangıç tarihi tutmuyor) - hep boş kalır.
- **StoryGraph sütun eşlemesi** (gerçek export başlık satırı: `Title, Authors, Contributors, ISBN/UID, Format, Read Status, Date Added, Last Date Read, Dates Read, Read Count, Moods, Pace, Character- or Plot-Driven?, Strong Character Development?, Loveable Characters?, Diverse Characters?, Flawed Characters?, Star Rating, Review, Content Warnings, Content Warning Description, Tags, Owned?`):
  - `Title` → title; `Authors` → author; `ISBN/UID` → isbn; `Star Rating` → rating (aşağıdaki yuvarlama kuralına göre); `Last Date Read` → dateFinished (sadece durum "read" ise); `Review` (boş değilse) → tek bir not satırı.
  - `Read Status` → status: `read` → Tamamlandı, `currently-reading` → Okunuyor, `to-read` → Başlanmadı, `did-not-finish` → Yarıda Bırakıldı (StoryGraph'ın DNF durumu bu şekilde tam karşılık buluyor).
  - StoryGraph export'unda `Publisher` ve sayfa sayısı sütunu **yok** - publisher ve pageCount hep boş/null kalır.
  - `category`/`dateStarted` alanlarına eşleme yok, aynı Goodreads gerekçesiyle (Moods/Tags kategori değildir, başlangıç tarihi export'ta yok).
- **Rating yuvarlama**: StoryGraph'ın küsuratlı puanı (0.25 adımlarla, ör. 4.25, 3.5) `Math.round()` ile en yakın tam sayıya yuvarlanır (0.5 tam ortadaysa yukarı - JS'in doğal `Math.round` davranışı), 0-5 aralığına clamp edilir. Bu bir bilgi kaybıdır ve **sessiz kalmaz**: kaç kitabın puanının yuvarlandığı içe aktarma sonuç özetinde ayrıca raporlanır (bkz. aşağıdaki "İçe aktarma sonuç özeti").
- **Çift kayıt tespiti**: Title+author karşılaştırması **case-insensitive ve baştaki/sondaki boşluklar temizlenerek (trim + lowercase normalizasyonu)** yapılır - aksi halde "Fahrenheit 451" ile "fahrenheit 451 " gibi önemsiz farklar bile yanlışlıkla "farklı kitap" sayılır ve dedup mekanizması işlevsiz kalır. Otomatik atlama YAPILMAZ: eşleşen satırlar önizleme ekranında "muhtemel çift kayıt" olarak işaretlenip varsayılan olarak seçimsiz (import edilmeyecek) bırakılır, kullanıcı isterse tek tek seçip yine de ekleyebilir. Eşleşme, kullanıcının o an kitaplığındaki (App state'te zaten yüklü) kitaplara karşı yapılır - ek bir DB sorgusu gerekmez.
- **İçe aktarılan kitapların hedef kitaplığı**: Tüm içe aktarılan kitaplar, kullanıcının varsayılan (`is_default = true`, "her zaman her kitabı barındıran korumalı ana kitaplık") kitaplığına eklenir - `addBook`'a verilen `libraryIds` sadece bu kitaplığın id'sini içerir. CSV'deki shelf/kitaplık bilgisi (Goodreads'in `Bookshelves`/`Bookshelves with positions` sütunları, StoryGraph'ta karşılığı olmayan bir kavram) **yeni bir BookShelf kitaplığı oluşturmak veya var olan bir kitaplıkla eşleştirmek için hiç kullanılmaz** - tamamen görmezden gelinir, tıpkı `category` gibi. Sadece `Exclusive Shelf`/`Read Status` (okuma durumu: read/currently-reading/to-read/did-not-finish) okunup `status` alanına eşlenir - bu, kitabın hangi kitaplığa değil, hangi *duruma* düşeceğini belirler. Kullanıcı arayüzde bunu görebilsin diye, içe aktarma sonuç özetine "N kitap [varsayılan kitaplık adı]'na eklendi; Goodreads/StoryGraph'taki kitaplık/shelf gruplamanız aktarılmadı" gibi tek satırlık bir bilgi notu eklenir - round-trip/çoklu-kitaplık eşleme zaten Out of Scope'ta, ama kullanıcı bunu import anında fark etmeli, sürpriz olmamalı.
- **Dosya/satır limitleri**: 5 MB dosya boyutu VEYA 5000 satır (hangisi önce aşılırsa) üzerindeki dosyalar, hiç parse edilmeden "dosya çok büyük" hatasıyla reddedilir - client-side (tarayıcıda) işlendiği için tarayıcı kilitlenmesini önlemek amaçlı.
- **Satır bazlı hata toleransı**: Dosyanın tamamı parse edilemezse (bozuk CSV yapısı, beklenen sütunlar tamamen yok) import baştan reddedilir, hiçbir satır işlenmez. Dosya genel olarak geçerliyse ama tek tek satırlarda zorunlu alan (title) eksikse, sadece o satır atlanır ve sebebiyle birlikte sonuç özetine eklenir - dosyanın geri kalanı işlenmeye devam eder.
- **İçe aktarma sonuç özeti**: İşlem bitince kullanıcıya: eklenen kitap sayısı, atlanan satır sayısı (ve sebepleri - eksik başlık, muhtemel çift kayıt kullanıcı tarafından işaretsiz bırakıldığı için atlandı vb.), ve **kaç kitabın puanının yuvarlandığı** gösterilir.
- **Yeni UI bileşenleri**: `SettingsModal`'a bir "Veri" bölümü (Export CSV/JSON butonları + Import başlatma butonu) eklenir. İçe aktarma akışı için ayrı bir önizleme/onay modalı (`ImportPreviewModal` benzeri) eklenir - dosya seçimi, platform seçimi, önizleme listesi (seçilebilir satırlar + çift kayıt işaretleri) ve sonuç özetini bir arada yönetir.

## Testing Decisions

- Export ve import/mapping fonksiyonları **saf fonksiyonlardır** (girdi → çıktı, Supabase/DOM bağımlılığı yok) - `src/lib/shelfSpine.test.js`, `src/lib/readingRecap.test.js`, `src/lib/openLibrary.test.js` ile aynı desende, mock'suz, doğrudan test edilir. Sadece dış davranış (üretilen CSV/JSON string'i, veya parse edilen `bookFields` nesnesi) test edilir, iç implementasyon detayları değil.
- Özellikle test edilecek senaryolar: Goodreads/StoryGraph örnek satırlarının doğru alanlara eşlenmesi, Goodreads'in `="..."` ISBN sarmalayıcısının temizlenmesi, StoryGraph küsuratlı rating'in doğru yuvarlanması, status eşlemesinin dört BookShelf durumuna doğru düşmesi, eksik başlıklı bir satırın atlanıp raporlanması, title+author normalizasyonunun (case/whitespace) çift kayıt tespitini doğru tetiklemesi, yanlış platform seçildiğinde beklenen hatanın verilmesi, limit üstü dosyanın reddedilmesi.
- UI tarafı (Settings'teki butonlar, önizleme modalının satır seçme/onaylama davranışı) `SettingsModal.test.jsx` ve `AiChatDrawer.test.jsx` gibi mevcut RTL bileşen testleriyle aynı desende test edilir - gerçek dosya indirme/Supabase çağrıları mock'lanır, sadece kullanıcı etkileşimi ve ekrana yansıyan sonuç doğrulanır.

## Out of Scope

- BookShelf'in kendi CSV export'unu tekrar BookShelf'e içe aktarma (round-trip). Bu spec sadece Goodreads/StoryGraph → BookShelf yönünü kapsar; BookShelf'in CSV export formatı bu iki platformun formatıyla aynı değildir ve içe aktarma sadece Goodreads/StoryGraph formatlarını tanır.
- Kapak görselinin içe aktarma sırasında otomatik bulunup indirilmesi (ör. ISBN üzerinden bir kapak API'sinden çekme) - hiçbir iki export formatı da kapak görseli/URL'i içermiyor, bu ayrı bir gelecek geliştirme olabilir.
- `libraries`, `notes`, `book_libraries` tablolarının bağımsız export/import'u - bu spec sadece `books` tablosunu (ve varsa tek bir özet not satırını) kapsıyor.
- Diğer platformlardan (LibraryThing, Fable, vb.) import desteği.
- Sunucu tarafında (Edge Function) çalışan bir import/export - her şey client-side, mevcut RLS'in zaten filtrelediği veriyle çalışır.
- Kısmi/otomatik devam eden ("resumable") büyük dosya yükleme - dosya boyutu limiti ile bu ihtiyaç zaten önleniyor.

## Further Notes

- StoryGraph'ın okuma durumu sütununun tam adı kaynaklar arasında tutarsız görünüyor (`Read Status` / `ReadStatus`) - implementasyon ticket'ı gerçek bir örnek dosyayla bunu doğrulamalı.
- İleride BookShelf'in kendi export formatını round-trip import edilebilir hale getirmek (yedekten geri yükleme) istenirse, bu ayrı bir spec olmalı - şu anki export alan seçimi (kitaplık adları, UUID değil) buna kasıtlı olarak uygun değil.
