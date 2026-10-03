# 09: (v1.2 takip) Çıkışta gönderilmemiş kitaplar için uygulama içi onay penceresi

**What to build:** Çıkış düğmesi, gönderilmemiş kuyruk kayıtları olduğunda bugün tarayıcının `window.confirm` penceresini açıyor. Bu pencere:
- uygulamanın görünümüne uymuyor
- metni biçimlendirilemiyor
- bazı ortamlarda (örneğin bazı gömülü tarayıcılar) engellenebiliyor

Yerine uygulama içi bir onay penceresi gelir. Pencerede şunlar bulunur:
- başlık
- "Bu cihazda henüz gönderilmemiş N kitap var; çıkış yaparsan silinecek." metni
- iki düğme: "Vazgeç" ve "Kitapları sil ve çıkış yap"

Davranış 04'tekiyle aynı kalır: onaylanırsa kuyruk silinir ve çıkış yapılır; silme başarısız olsa da çıkış yapılır.

**Blocked by:** 04

**Status:** needs-triage (v1.2; PR A'nın kapsamı dışında)

- [ ] `window.confirm` kullanılmıyor; pencere `role="dialog"`, odak pencereye taşınıyor, Escape ile Vazgeç
- [ ] Vazgeç: kuyruk ve oturum değişmiyor
- [ ] Onay: kuyruk siliniyor, sonra çıkış yapılıyor (sıra testli)
- [ ] Silme hata verirse çıkış yine yapılıyor
- [ ] TR/EN metinler, locale eşlik testi yeşil; RTL testleri
- [ ] 360 px'te pencere taşmıyor (elle)
