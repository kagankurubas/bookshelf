-- ADIM 3/3: Kullanici hesaplarina gecis - kilitleme.
--
-- 003 ve 004'u calistirip verinin hesabina baglandigini dogruladiktan
-- SONRA bu dosyayi calistir. Bundan sonra her kullanici SADECE kendi
-- kitaplarini/kitapliklarini gorebilir ve degistirebilir.
--
-- Not: create policy'lerden once drop policy if exists eklendi ki bu
-- migration hem "schema.sql zaten bu policy'leri iceriyor" (fresh/local
-- kurulum) hem de "bu policy'ler henuz yok" (orijinal production senaryosu)
-- durumunda da hatasiz calissin.

-- Artik her satirin bir sahibi olmali.
alter table libraries alter column user_id set not null;
alter table books alter column user_id set not null;

-- Eski "herkese acik" politikalari kaldir.
drop policy if exists "Allow all on libraries" on libraries;
drop policy if exists "Allow all on books" on books;
drop policy if exists "Allow all on book_libraries" on book_libraries;
drop policy if exists "Allow all on notes" on notes;

-- libraries: sadece kendi kitapliklarini gorebilir/degistirebilir.
drop policy if exists "Users manage own libraries" on libraries;
create policy "Users manage own libraries" on libraries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- books: sadece kendi kitaplarini gorebilir/degistirebilir.
drop policy if exists "Users manage own books" on books;
create policy "Users manage own books" on books
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- book_libraries: bagli kitap kendisine aitse islem yapabilir.
drop policy if exists "Users manage own book_libraries" on book_libraries;
create policy "Users manage own book_libraries" on book_libraries
  for all using (
    exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid())
  ) with check (
    exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid())
  );

-- notes: bagli kitap kendisine aitse islem yapabilir.
drop policy if exists "Users manage own notes" on notes;
create policy "Users manage own notes" on notes
  for all using (
    exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid())
  ) with check (
    exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid())
  );