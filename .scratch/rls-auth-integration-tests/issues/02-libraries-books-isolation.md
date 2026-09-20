# 02: libraries + books RLS izolasyon testleri

**What to build:** Geliştirici, bir kullanıcının başka bir kullanıcının kitaplıklarını ve kitaplarını gerçek bir Supabase örneğine karşı göremediğini ve değiştiremediğini (UPDATE/DELETE) kanıtlayan otomatik testlere sahip olur; ayrıca oturumsuz (anon) bir isteğin bu tablolara hiç erişemediği doğrulanır.

**Blocked by:** 01 (local Supabase + entegrasyon test harness'i)

**Status:** ready-for-agent

**Not:** `libraries` ve `books` ikisi de **doğrudan** `user_id` kolonuna sahip. Pozitif kontrol (kendi satırını oluşturma) için `tests/integration/rls/fixtures.js`'teki `insertOwnRow(user, table, fields)`'i kullan (otomatik `user_id` enjekte eder). Negatif kontrol (User A'nın User B'nin `user_id`'siyle INSERT denemesi) için çıplak `insertRow(client, table, fields)`'i kullan ve `user_id` alanını elle diğer kullanıcının id'siyle ver.

- [ ] User A, kendi `libraries` satırlarını SELECT ile görebiliyor (pozitif kontrol)
- [ ] User A, User B'nin `libraries` satırlarını SELECT ettiğinde sonuç boş dönüyor
- [ ] User A, User B'ye ait bir `libraries` satırını UPDATE etmeye çalıştığında satır değişmiyor (0 satır etkilendi)
- [ ] User A, User B'ye ait bir `libraries` satırını DELETE etmeye çalıştığında satır silinmiyor
- [ ] User A, kendi `books` satırlarını SELECT ile görebiliyor (pozitif kontrol)
- [ ] User A, User B'nin `books` satırlarını SELECT ettiğinde sonuç boş dönüyor
- [ ] User A, User B'ye ait bir `books` satırını UPDATE/DELETE etmeye çalıştığında işlem etkisiz kalıyor
- [ ] Oturum açmamış (anon) bir client, `libraries` ve `books` tablolarının hiçbirinde SELECT/INSERT/UPDATE/DELETE ile veri göremiyor/değiştiremiyor
