# 04: notes RLS izolasyon testleri

**What to build:** Geliştirici, `notes` tablosunun bağlı kitabın sahipliği üzerinden doğru izole edildiğini (bir kullanıcının başka bir kullanıcının kitabına bağlı notlarını göremediğini/değiştiremediğini) kanıtlayan otomatik testlere sahip olur.

**Blocked by:** 01 (local Supabase + entegrasyon test harness'i)

**Status:** ready-for-agent

- [ ] User A, kendi kitabına bağlı `notes` satırlarını SELECT ile görebiliyor (pozitif kontrol)
- [ ] User A, User B'nin kitabına bağlı `notes` satırlarını SELECT ettiğinde sonuç boş dönüyor
- [ ] User A, User B'ye ait bir `notes` satırını UPDATE etmeye çalıştığında işlem etkisiz kalıyor
- [ ] User A, User B'ye ait bir `notes` satırını DELETE etmeye çalıştığında satır silinmiyor
- [ ] Oturum açmamış (anon) bir client, `notes` üzerinde SELECT/INSERT/UPDATE/DELETE ile hiçbir işlem yapamıyor
