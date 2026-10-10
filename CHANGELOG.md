# Changelog

[English](#english) · [Türkçe](#türkçe)

## English

### 1.1.0 — 2026-10-10

#### What's new and changed

**Reading Recap**
- Share a month or a year of finished books as a square shelf card: the native share menu on phones, a download on desktop.
- A new calendar style, on a portrait card, shows each day of the month with the books read on it. Finished books show their rating on the finishing day.

**Books**
- Free tags on books. Search now also covers notes and tags, and the table has a tag filter.
- Add, edit and delete notes in the book dialog.
- Export your books as CSV or JSON, and import from Goodreads and StoryGraph CSV exports.
- Start and finish dates filled in by the book dialog use your local day, not the UTC day.

**Libraries and saving**
- A new account without a library gets a clear message in the book dialog and a Create shortcut. A book is never saved without a library.
- Save errors say whether the connection failed, the server refused the book, or the problem is temporary. What you typed is kept.

**Shelf**
- Tap-to-move on touch screens: tap a book's handle, then tap where it should go.
- Cover positioning in the book dialog works on touch screens.

**Mobile layout**
- Tabs show a short name under the icon, and every view has its own heading.
- The three reading stats stay on one row.
- The + and AI buttons no longer cover the last item of a view.
- Long author lists in the table stop at two lines.
- Shelf rows are called "rows" (TR: "Kat"), with "Add row" / "Remove row" and a row count in the Shelf view.

**Offline and install**
- Installable as an app (PWA) and usable offline. Books added offline are queued and sent once you are back online.
- The offline queue belongs to the user who added the books. Signing out asks before discarding unsent books.
- A failed request is no longer reported as "not found" for barcode scans and searches, and an offline banner shows when the connection drops.
- Covers load lazily, use a size that fits, and fall back to the placeholder when they fail. Settings, Statistics and the AI chat load only when opened; the initial download drops from about 183 kB to 164 kB (gzip).
- New app icon.

**Account and privacy**
- Delete your account and all of its data from Settings.
- The email verification link no longer leads to a 404.
- Signing out or deleting the account clears the user's data cached on the device. AI chat history is no longer cached.

**Book Assistant**
- Replies in the language of your message, not the app language.
- A shared daily limit with a friendly notice instead of an error.
- A signed-in user can no longer use up the shared daily limit by calling the limit function directly; only the Book Assistant's server can call it.
- Gemini's temporary "busy" errors (503, 429) are retried, and a request that gets no reply doesn't count against the daily limit.

#### Known limitations

- Start and finish dates saved on the wrong day before this release are not corrected.
- After updating, open the app online once.
- When a different account signs in on the same device, the previous account's unsent offline books are deleted.
- Old queued books whose owner is unknown are not sent.
- Books that couldn't be sent have no list window yet.
- Duplicate book protection and an automatic default library for new accounts come in v1.1.1.
- The calendar and the interface were tested on one device each in iOS Safari and Android Chrome.
- On a phone, the full author list of a book can't be reached from the table; it shows when the book is opened.
- A queued offline book refused with an unrecognized error can hold up the books queued after it.

## Türkçe

### 1.1.0 — 2026-10-10

#### Yenilikler ve değişiklikler

**Okuma Özeti**
- Bir ayda ya da yılda bitirdiğin kitapları kare bir raf kartı olarak paylaş: telefonda paylaşım menüsü, masaüstünde indirme.
- Yeni Takvim stili, dikey bir kartta, ayın her gününü o gün okunan kitaplarla gösterir. Tamamlanan kitapların puanı bitiş gününde görünür.

**Kitaplar**
- Kitaplara serbest etiketler. Arama artık notları ve etiketleri de kapsıyor; tabloda etiket filtresi var.
- Kitap penceresinde not ekleme, düzenleme ve silme.
- Kitapları CSV ya da JSON olarak dışa aktarma; Goodreads ve StoryGraph CSV dosyalarından içe aktarma.
- Kitap penceresinin doldurduğu başlangıç ve bitiş tarihleri UTC günü yerine yerel günü kullanır.

**Kitaplıklar ve kaydetme**
- Kitaplığı olmayan yeni bir hesap, kitap penceresinde net bir mesaj ve Oluştur kısayolu görür. Kitaplıksız kitap kaydedilmez.
- Kaydetme hataları bağlantı sorununu, sunucunun reddini ve geçici sorunu ayırır. Yazdıkların korunur.

**Raf**
- Dokunmatik ekranda dokunarak taşıma: kitabın tutamacına, sonra gideceği yere dokun.
- Kitap penceresinde kapak konumlandırma dokunmatik ekranda çalışır.

**Mobil düzen**
- Sekmelerde simgenin altında kısa ad var; her görünümün kendi başlığı var.
- Üç okuma istatistiği tek satırda kalır.
- + ve AI düğmeleri görünümün son öğesini kapatmaz.
- Tablodaki uzun yazar listeleri iki satırda kesilir.
- Raftaki sıraların adı "Kat" (EN: "rows"): "Kat Ekle" / "Kat Sil" ve Raf görünümünde kat sayısı.

**Çevrimdışı ve kurulum**
- Uygulama olarak kurulabilir (PWA) ve çevrimdışı kullanılabilir. Çevrimdışı eklenen kitaplar kuyruğa alınır, bağlantı gelince gönderilir.
- Çevrimdışı kuyruk kitapları ekleyen kullanıcıya aittir. Çıkış yaparken gönderilmemiş kitaplar varsa onay istenir.
- Barkod tarama ve aramada başarısız istek artık "bulunamadı" diye gösterilmez; bağlantı kesilince çevrimdışı bandı görünür.
- Kapaklar gerektiğinde ve uygun boyutta yüklenir; yüklenemezse yer tutucu görünür. Ayarlar, İstatistikler ve AI sohbet yalnızca açılınca yüklenir; ilk indirme yaklaşık 183 kB'tan 164 kB'a (gzip) iner.
- Yeni uygulama simgesi.

**Hesap ve gizlilik**
- Ayarlar'dan hesabını ve tüm verisini silme.
- E-posta doğrulama bağlantısı artık 404'e düşmez.
- Çıkışta ve hesap silmede kullanıcının cihazda önbelleğe alınmış verisi temizlenir. AI sohbet geçmişi artık önbelleğe alınmaz.

**Kitap Asistanı**
- Arayüz diline değil, mesajın diline göre yanıt verir.
- Paylaşılan günlük sınır, hata yerine nazik bir uyarıyla.
- Giriş yapmış bir kullanıcı sınır işlevini doğrudan çağırarak paylaşılan günlük sınırı artık tüketemez; işlevi yalnızca Kitap Asistanı'nın sunucusu çağırabilir.
- Gemini'nin geçici "yoğunluk" hataları (503, 429) yeniden denenir; yanıt alınamayan istek günlük sınırdan düşmez.

#### Bilinen sınırlar

- Bu sürümden önce yanlış güne kaydedilmiş başlangıç ve bitiş tarihleri düzeltilmedi.
- Güncellemeden sonra uygulamayı bir kez çevrimiçiyken aç.
- Aynı cihazda farklı bir hesapla giriş yapılırsa önceki hesabın gönderilmemiş çevrimdışı kitapları silinir.
- Sahibi bilinmeyen eski kuyruk kayıtları gönderilmez.
- Gönderilemeyen kayıtları listeleyen bir pencere henüz yok.
- Çift kitap koruması ve yeni hesaplar için otomatik varsayılan kitaplık v1.1.1'de geliyor.
- Takvim ve arayüz iOS Safari ve Android Chrome'da birer cihazda test edildi.
- Telefonda uzun yazar listesinin tamamına tablodan ulaşılamıyor; kitabı açınca görünür.
- Çevrimdışı kuyrukta tanınmayan bir hatayla reddedilen kayıt sonraki kayıtları bekletebilir.
