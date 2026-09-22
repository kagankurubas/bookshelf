-- STEP 3/3: migrating to user accounts - locking down.
--
-- Run this file ONLY AFTER running 003 and 004 and confirming the data is
-- linked to your account. After this, each user can ONLY see and modify
-- their own books/libraries.
--
-- Note: drop policy if exists was added before each create policy so this
-- migration runs cleanly whether "schema.sql already has these policies"
-- (fresh/local setup) or "these policies don't exist yet" (the original
-- production scenario).

-- Every row must now have an owner.
alter table libraries alter column user_id set not null;
alter table books alter column user_id set not null;

-- Remove the old "wide open" policies.
drop policy if exists "Allow all on libraries" on libraries;
drop policy if exists "Allow all on books" on books;
drop policy if exists "Allow all on book_libraries" on book_libraries;
drop policy if exists "Allow all on notes" on notes;

-- libraries: can only see/modify their own libraries.
drop policy if exists "Users manage own libraries" on libraries;
create policy "Users manage own libraries" on libraries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- books: can only see/modify their own books.
drop policy if exists "Users manage own books" on books;
create policy "Users manage own books" on books
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- book_libraries: can act on a row if the linked book belongs to them.
drop policy if exists "Users manage own book_libraries" on book_libraries;
create policy "Users manage own book_libraries" on book_libraries
  for all using (
    exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid())
  ) with check (
    exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid())
  );

-- notes: can act on a row if the linked book belongs to them.
drop policy if exists "Users manage own notes" on notes;
create policy "Users manage own notes" on notes
  for all using (
    exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid())
  ) with check (
    exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid())
  );