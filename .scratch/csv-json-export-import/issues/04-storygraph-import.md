# 04: StoryGraph CSV import

**What to build:** Kullanıcı, içe aktarma platform seçiminde artık "StoryGraph"ı da seçebilir; StoryGraph CSV export dosyasını, 03'te kurulmuş aynı akıştan (dosya yükleme → önizleme/dedup → onay → özet) geçirerek kitaplarını BookShelf'e aktarabilir. Bu ticket akışı yeniden inşa etmez, sadece ikinci bir parser/eşleme ekler.

**Blocked by:** 03 (Goodreads CSV import - uçtan uca akış)

**Status:** ready-for-agent

- [ ] Platform seçiminde "StoryGraph" seçeneği aktif hale getirildi (03'teki UI'ya ikinci seçenek olarak eklendi)
- [ ] StoryGraph CSV'si parse edilip eşleniyor: `Title`→title, `Authors`→author, `ISBN/UID`→isbn, `Star Rating`→rating (`Math.round()` ile en yakın tam sayıya yuvarlanıp 0-5 aralığına clamp edilerek), `Last Date Read`→dateFinished (status "read" ise), `Review` (boş değilse)→tek bir not, okuma durumu sütunu→status (`read`→Tamamlandı, `currently-reading`→Okunuyor, `to-read`→Başlanmadı, `did-not-finish`→Yarıda Bırakıldı)
- [ ] **Implementasyon notu**: Okuma durumu sütununun tam adı (`Read Status` vs `ReadStatus`) araştırmada kaynaklara göre tutarsız çıktı - gerçek bir StoryGraph export örneğiyle doğrulanmalı, spec'teki araştırma özetine körü körüne güvenilmemeli
- [ ] Publisher ve sayfa sayısı (pageCount) alanları StoryGraph export'unda bulunmadığı için boş/null kalıyor
- [ ] Seçilen platform StoryGraph iken yüklenen dosyanın başlık satırı StoryGraph yapısıyla uyuşmuyorsa 03'teki ile aynı "format eşleşmiyor" hatası veriliyor
- [ ] Puanı yuvarlanan kitap sayısı, işlem sonucu özetinde ayrıca raporlanıyor ("N kitabın puanı en yakın tam sayıya yuvarlandı")
- [ ] Saf StoryGraph parse/eşleme fonksiyonları (küsuratlı rating yuvarlama/clamp, DNF eşlemesi, publisher/pageCount'un boş kalması dahil) mock'suz birim testleriyle kapsanmış
