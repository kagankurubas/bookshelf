# 01: App.jsx auth/yükleniyor/offline-banner durumları için test kapsamı

**What to build:** `src/App.test.jsx` (yeni dosya) yazılır ve mevcut (henüz refactor edilmemiş) `App.jsx`'e karşı çalışır. `../lib/supabaseClient` mock'lanır (`useBooks.test.js`'teki `queryResult()` zincirlenebilir sorgu-builder deseni `.from()` için, `SettingsModal.test.jsx`'teki `vi.mock('../../lib/supabaseClient', ...)` deseni `.auth` için - ikisi birleştirilir); `useAuth` doğrudan mock'lamak da kabul edilebilir bir alternatif. Test, auth yükleniyor / kullanıcı yok / kullanıcı var üç durumunda doğru ekranın göründüğünü, ve offline banner'ın (`isOnline: false`) bu üç durumun **her birinde ayrı ayrı** (üç ayrı assertion) göründüğünü, `isOnline: true` iken hiçbirinde görünmediğini, ve `queuedCount > 0` iken banner metnine kuyruk bilgisinin eklendiğini doğrular.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `authLoading: true` iken yükleniyor metni görünür; `AuthScreen` ve ana uygulama kapsayıcısı (`main-container`) görünmez.
- [ ] `authLoading: false`, `user: null` iken `AuthScreen` görünür; yükleniyor metni ve ana uygulama kapsayıcısı görünmez.
- [ ] `authLoading: false`, `user` dolu iken `AuthScreen` ve üst-seviye yükleniyor metni görünmez; ana uygulama kapsayıcısı render edilir.
- [ ] `isOnline: false` iken offline banner metni, yukarıdaki üç durumun **her birinde ayrı ayrı** (üç ayrı test/assertion) görünür.
- [ ] `isOnline: true` iken offline banner hiçbir durumda görünmez.
- [ ] `isOnline: false` + `queuedCount > 0` iken banner metninde kuyruk bilgisi de görünür.
- [ ] `useOnlineStatus`/`useAddOrQueueBook`/`useOfflineBookQueue`/`useBookFilters` gibi alt hook'ların kendi davranışı burada tekrar test edilmez (zaten kendi test dosyalarında kapsanıyor) - sadece üst seviye kompozisyon doğrulanır.
- [ ] Mevcut test suite'i (tümü) kırılmadan geçer.
