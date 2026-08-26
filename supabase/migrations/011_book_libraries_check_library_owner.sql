-- book_libraries RLS politikasi su ana kadar sadece book_id'nin cagiran
-- kullaniciya ait oldugunu dogruluyordu, library_id'yi kontrol etmiyordu.
-- Bu, bir kullanicinin kendi kitabini baska bir kullanicinin library_id'siyle
-- iliskilendiren bir book_libraries satiri eklemesine izin veriyordu
-- (referans butunlugu/veri karismasi riski - sorgular kitap sahipligine gore
-- filtrelendigi icin su an aktif bir veri sizintisi yok, ama duzeltilmesi
-- gereken gercek bir eksik). Artik hem book_id hem library_id'nin ayni
-- kullaniciya ait oldugu dogrulanir.
drop policy if exists "Users manage own book_libraries" on book_libraries;

create policy "Users manage own book_libraries" on book_libraries
  for all using (
    exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid())
    and exists (select 1 from libraries l where l.id = library_id and l.user_id = auth.uid())
  ) with check (
    exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid())
    and exists (select 1 from libraries l where l.id = library_id and l.user_id = auth.uid())
  );
