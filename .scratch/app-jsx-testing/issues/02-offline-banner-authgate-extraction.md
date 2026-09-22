# 02: OfflineBanner + AuthGate çıkarımı

**What to build:** `App.jsx`'in en üstündeki auth-yükleniyor / kullanıcı-yok / kullanıcı-var üçlü koşullu render'ı ve offline banner JSX'i, iki küçük saf sunum bileşenine taşınır: `OfflineBanner` (`isOnline`, `queuedCount` prop'larına göre banner'ı gösterir/gizler - mevcut `.offline-banner` JSX'inin birebir taşınması) ve `AuthGate` (`authLoading`, `user`, `onSignIn`, `onSignUp`, `redirectError`, `accountDeletedNotice`, `children` prop'larını alıp yükleniyor/`AuthScreen`/`children` üçlüsünü render eder - mevcut nested-ternary'nin birebir taşınması). İsimler esnek (ör. `AppGate`, `SessionGate` de kabul edilir) - önemli olan sorumluluğun tek, saf bir bileşende toplanması. `App.jsx`'in geri kalanı (ana uygulama içeriği, tüm handler'lar) değişmez.

**Blocked by:** 01 (App.jsx auth/yükleniyor/offline-banner durumları için test kapsamı) - ticket 01'deki `App.test.jsx`, bu refactor'ın davranışı bozmadığının kanıtı olarak kullanılacak; güvenlik ağı önce var olmalı.

**Status:** ready-for-agent

- [ ] `OfflineBanner` bileşeni oluşturulur, `App.jsx`'teki mevcut offline banner JSX'ini (aynı `role="status"`, aynı `app.offlineBanner`/`app.offlineBannerQueued` çeviri anahtarları) birebir taşır - davranış değişmez.
- [ ] `AuthGate` (veya eşdeğer isimli) bileşen oluşturulur, `App.jsx`'teki mevcut auth-yükleniyor/`AuthScreen`/`children` nested-ternary'sini birebir taşır - davranış değişmez.
- [ ] `App.jsx`, bu iki bileşeni kullanacak şekilde güncellenir; ana uygulama içeriği (kitap/kitaplık yükleniyor/hata durumu, `AppHeader`, `LibraryToolbar`, view'lar, tüm modal orkestrasyonu, `handleSaveBook`/`handleDeleteBook`/`handleCreateLibrary`/`handleDeleteLibrary`) değişmeden kalır.
- [ ] Ticket 01'de yazılan `App.test.jsx`, bu refactor sonrasında **hiçbir değişiklik yapılmadan** yeşil kalır.
- [ ] Mevcut test suite'i (tümü) kırılmadan geçer.
- [ ] `App.jsx`'in geri kalanını daha fazla bileşene bölmek bu ticket'ın kapsamında değildir.
