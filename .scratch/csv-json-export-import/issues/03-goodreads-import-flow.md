# 03: Goodreads CSV import (uçtan uca akış)

**What to build:** Kullanıcı, Ayarlar'dan içe aktarmayı başlatıp "Goodreads"i seçer, kendi Goodreads CSV export dosyasını yükler, bir önizleme ekranında (olası çift kayıtlar işaretlenmiş/seçimsiz halde) hangi kitapların ekleneceğini görüp istediği satırları seçip onaylar, ve kitapları BookShelf'e (varsayılan kitaplığına) aktarır. İşlem sonunda eklenen/atlanan kitap sayısını özetleyen bir sonuç görür. Bu ticket, ileride başka platform parser'larının (bkz. 04) ekleneceği paylaşılan akışın (upload → parse → önizleme/dedup → onay → addBook → özet) ilk ve tam uçtan uca halidir.

**Blocked by:** 01 (papaparse bağımlılığı)

**Status:** ready-for-agent

- [ ] Ayarlar'dan içe aktarma başlatılabiliyor: platform seçimi (bu ticket'ta sadece "Goodreads" aktif) + dosya seçici
- [ ] Goodreads CSV'si parse edilip BookShelf alanlarına eşleniyor: `Title`→title, `Author`(+ varsa `Additional Authors`)→author, `ISBN13` (yoksa `ISBN`, Excel'in `="değer"` sarmalayıcısı temizlenerek)→isbn, `Publisher`→publisher, `My Rating`→rating, `Number of Pages`→pageCount, `Date Read`→dateFinished (sadece `Exclusive Shelf=read` ise), `My Review`/`Private Notes` (boş değilse)→tek bir not, `Exclusive Shelf`→status (`read`→Tamamlandı, `currently-reading`→Okunuyor, `to-read`→Başlanmadı, tanınmayan/boş→Başlanmadı)
- [ ] Seçilen platform (Goodreads) ile yüklenen dosyanın başlık satırı uyuşmuyorsa (beklenen Goodreads sütunları yoksa) "seçtiğin format bu dosyayla eşleşmiyor" hatası veriliyor, hiçbir satır işlenmiyor
- [ ] 5MB dosya boyutu VEYA 5000 satırdan büyük dosyalar parse edilmeden "dosya çok büyük" hatasıyla reddediliyor
- [ ] Başlığı (title) eksik satırlar atlanıp sebebiyle birlikte sonuç özetine ekleniyor; dosyanın geri kalanı işlenmeye devam ediyor
- [ ] Önizleme ekranı: her ayrıştırılan satır seçilebilir/seçimi kaldırılabilir bir liste olarak gösteriliyor; title+author'ı (case-insensitive, baştaki/sondaki boşluk temizlenerek normalize edilmiş) kullanıcının mevcut kitaplarından biriyle eşleşen satırlar "muhtemel çift kayıt" olarak işaretlenip varsayılan olarak seçimsiz geliyor (kullanıcı isterse yine de seçip ekleyebilir)
- [ ] Onaylanan satırlar `useBooks().addBook()` üzerinden, kullanıcının varsayılan (`is_default`) kitaplığına ekleniyor - yeni bir DB-yazma yolu eklenmiyor
- [ ] İşlem sonunda: eklenen kitap sayısı, atlanan satır sayısı (ve sebepleri: eksik başlık / kullanıcı çift-kayıt işaretini kaldırmadı), ve "kitaplık/shelf gruplamanız aktarılmadı, tüm kitaplar [varsayılan kitaplık adı]'na eklendi" notunu içeren bir özet gösteriliyor
- [ ] Bozuk/parse edilemeyen (CSV yapısı tamamen geçersiz) dosya için teknik olmayan, anlaşılır bir hata mesajı gösteriliyor
- [ ] Saf parse/eşleme fonksiyonları (ISBN sarmalayıcı temizleme, status eşlemesi, eksik başlık atlama, dedup normalizasyonu dahil) mock'suz birim testleriyle kapsanmış; import akışının UI'ı (`addBook` ve dosya okuma mock'lanarak) bir RTL component testiyle kapsanmış
