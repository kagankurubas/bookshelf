-- Until now the book_libraries RLS policy only checked that book_id
-- belonged to the calling user, not library_id. This allowed a user to
-- insert a book_libraries row linking their own book to another user's
-- library_id (a referential-integrity/data-mixing risk - not an active
-- data leak today since queries are filtered by book ownership, but a
-- real gap worth fixing). Now both book_id and library_id are checked to
-- belong to the same user.
drop policy if exists "Users manage own book_libraries" on book_libraries;

create policy "Users manage own book_libraries" on book_libraries
  for all using (
    exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid())
    and exists (select 1 from libraries l where l.id = library_id and l.user_id = auth.uid())
  ) with check (
    exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid())
    and exists (select 1 from libraries l where l.id = library_id and l.user_id = auth.uid())
  );
