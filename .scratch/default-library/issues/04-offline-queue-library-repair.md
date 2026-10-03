# 04: Çevrimdışı kuyruk: kitaplıksız kayıt girmesin, takılı kayıtlar onarılsın, kuyruk kilitlenmesin (PR A)

**What to build:**
- **Kuyruğa giriş:** kitaplık id listesi geçersizse ekle-ya-da-kuyruğa-al kararından önce `no_library` fırlatılır; kayıt kuyruğa girmez.
- **Onarım:** senkron her kaydı göndermeden önce kitaplık listesindeki `null` ve boş değerleri atar ve Ana Kitaplığı ekler; önceki sürümde `[null]` ile kuyruğa girmiş kayıtlar böyle onarılır. Hiç kitaplık yokken senkron başlamaz, kayıtlar kuyrukta bekler.
- **Kilitlenmeme:** `network` hatası senkronu durdurur (bugünkü davranış). `rejected` ve `no_library` hatasında kaydın deneme sayacı ve son hata sınıfı yazılır, loglanır, sonraki kayda geçilir.
- **Sessizce kalmama:** reddedilen kayıt sonsuza kadar sessizce kuyrukta kalmaz; 3 başarısız denemeden sonraki durumu spec'teki "Açık karar: gönderilemeyen kuyruk kayıtları"na göre (önerilen: "gönderilemeyen kayıtlar" listesi, Yeniden dene / Sil).

**Blocked by:** 01

**Status:** needs-info (gönderilemeyen kayıtların son durumu kararı)

- [ ] Geçersiz kitaplıkla çevrimdışı ekleme kuyruğa yazmaz, `no_library` fırlatır (`useAddOrQueueBook` testi)
- [ ] `libraryIds: [null]` olan kayıt senkronda Ana Kitaplık id'siyle gönderilir ve kuyruktan silinir
- [ ] `rejected` hata veren kayıt kuyrukta kalır, deneme sayacı artar, arkasındaki kayıt senkronlanır, sayaç doğru güncellenir
- [ ] 3. başarısız denemeden sonra kayıt otomatik senkrondan çıkar ve kullanıcıya görünür (seçilen seçeneğe göre RTL testi)
- [ ] `network` hatası senkronu durdurur; kalanlar kuyrukta kalır (mevcut "ilk hatada dur" testi bu ayrıma göre güncellenir)
- [ ] Kitaplık yokken açılışta senkron denenmez
- [ ] Yeni metinler TR ve EN'de; locale eşlik testi yeşil
- [ ] Elle: çevrimdışı ekle → çevrimiçi ol → kitap Ana Kitaplıkta görünür (PR açıklamasında elle doğrulama adımı)
