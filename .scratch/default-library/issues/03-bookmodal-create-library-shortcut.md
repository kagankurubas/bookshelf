# 03: Kitaplık yokken pencerede açıklama ve kitaplık oluşturma kısayolu (PR A)

**What to build:** "İlk kitaplık Ana Kitaplık olur" kuralı App'ten `useLibraries.createLibrary`'ye taşınır; araç çubuğu ve pencere aynı fonksiyonu kullanır. Kitaplık listesi boşken kitap penceresinin "Kitaplıklar" bölümünde şunlar görünür:
- "Henüz bir kitaplığın yok" açıklaması
- dilin varsayılan adıyla (TR "Kitaplığım", EN "My Library") önceden dolu bir isim alanı
- "Oluştur" düğmesi

Oluşturulan kitaplık seçili gelir, formdaki diğer alanlar korunur. Kitaplık yokken Kaydet devre dışıdır. Oluşturma hatası pencere içinde gösterilir. İkinci Ana Kitaplık ihlali (PR B'deki unique index'ten `23505`) hata mesajı göstermez, `rejected` sınıfına düşmez; kitaplıklar yeniden çekilir:
- pencere kısayolu: var olan Ana Kitaplığı seçer, ikinci bir kitaplık açmaz
- araç çubuğu: kullanıcının yazdığı adı `is_default = false` ile bir kez yeniden ekler

**Blocked by:** 02 (aynı bileşen; çakışmayı önlemek için sıralı)

**Status:** ready-for-agent

- [ ] `useLibraries` testi: kitaplık yokken ilk oluşturma `is_default: true`, sonrakiler `false` gönderir
- [ ] Araç çubuğundan kitaplık oluşturma davranışı değişmez (App testleri yeşil)
- [ ] `useLibraries` testi: Ana Kitaplık index'inden `23505` → hata yok, yeniden çekme; kısayol var olan Ana Kitaplığı döndürür, araç çubuğu aynı adla `is_default: false` bir kez yeniden ekler; başka bir constraint'ten `23505` genel sınıflandırmaya düşer
- [ ] RTL: boş durumda açıklama ve dolu isim alanı görünür, Kaydet devre dışıdır
- [ ] RTL: "Oluştur" → yeni kitaplık seçili çip; başlık ve yazar korunur; Kaydet etkinleşir
- [ ] RTL: oluşturma hatası pencere içinde `alerts.createLibraryError` metniyle gösterilir, `alert()` çağrılmaz
- [ ] Yeni anahtarlar (`bookModal.noLibrariesHint`, `bookModal.defaultLibraryName`, düğme metni) TR ve EN'de
