# 03: book_libraries RLS izolasyon + migration-011 regresyon testleri

**What to build:** Geliştirici, `book_libraries` junction tablosunun hem bağlı kitabın hem bağlı kitaplığın sahipliğini birlikte kontrol ettiğini (migration 011'in kapattığı, sadece `book_id` kontrol edilip `library_id`'nin unutulduğu açığın geri gelmediğini) kanıtlayan testlere sahip olur.

**Blocked by:** 01 (local Supabase + entegrasyon test harness'i)

**Status:** ready-for-agent

**Not:** `book_libraries`'in kendi `user_id` kolonu YOK (sahiplik `book_id`→`books.user_id` ve `library_id`→`libraries.user_id` join'i üzerinden). `tests/integration/rls/fixtures.js`'teki `insertOwnRow` bu tabloda **kullanılamaz** — tüm senaryolarda çıplak `insertRow(client, 'book_libraries', { book_id, library_id })`'i, ilgili `book_id`/`library_id` değerlerini elle vererek kullan (fixture kitap/kitaplıkları `insertOwnRow` ile `books`/`libraries`'te önceden oluşturulmuş olmalı).

- [ ] User A, kendi `book_id`'si + kendi `library_id`'siyle bir `book_libraries` satırı ekleyebiliyor (pozitif kontrol)
- [ ] User A, kendi `book_id`'si + User B'nin `library_id`'siyle INSERT denediğinde işlem reddediliyor (migration-011 regresyon senaryosu, yön 1)
- [ ] User A, User B'nin `book_id`'si + kendi `library_id`'siyle INSERT denediğinde işlem reddediliyor (migration-011 regresyon senaryosu, yön 2)
- [ ] User A, User B'ye ait bir `book_libraries` satırını SELECT ettiğinde sonuç boş dönüyor
- [ ] User A, User B'ye ait bir `book_libraries` satırını DELETE etmeye çalıştığında satır silinmiyor
- [ ] Oturum açmamış (anon) bir client, `book_libraries` üzerinde SELECT/INSERT/DELETE ile hiçbir işlem yapamıyor
