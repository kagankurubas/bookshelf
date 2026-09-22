-- Makes the "default library" concept real and repairs existing data.
--
-- Problem: until now the app never marked any library as is_default = true
-- (the delete guard in LibraryToolbar checks this flag, but since it was
-- never true for anyone, no library was actually protected). When a user
-- deleted the library they considered "their main one," their books lost
-- their link via the book_libraries cascade (many-to-many join table) -
-- the book itself still exists in the books table but shows up in no
-- library - looks like data loss but is really an "unowned book" state.
--
-- This migration repairs it in three steps (all idempotent, safe to
-- re-run):
--   1) For users who still have no library marked is_default, marks their
--      oldest (first created) library as the default - the same library
--      App.jsx already treated as the "default" one up to now.
--   2) For users with an unowned book but no libraries left at all, creates
--      a new default library (they may have deleted every library).
--   3) Links every remaining unowned book to its user's default library.

-- 1) Make the oldest library the default (for users without one yet).
with users_without_default as (
  select user_id
  from libraries
  group by user_id
  having bool_or(is_default) = false
),
oldest_per_user as (
  select distinct on (l.user_id) l.id
  from libraries l
  join users_without_default u on u.user_id = l.user_id
  order by l.user_id, l.created_at asc, l.id asc
)
update libraries
set is_default = true
where id in (select id from oldest_per_user);

-- 2) Create a new default library for users with an unowned book but no
--    libraries left.
insert into libraries (user_id, name, shelf_count, is_default)
select distinct b.user_id, 'Kitaplığım', 2, true
from books b
where not exists (select 1 from book_libraries bl where bl.book_id = b.id)
  and not exists (select 1 from libraries l where l.user_id = b.user_id);

-- 3) Link every remaining unowned book to its user's default library.
insert into book_libraries (book_id, library_id)
select b.id, l.id
from books b
join libraries l on l.user_id = b.user_id and l.is_default = true
where not exists (select 1 from book_libraries bl where bl.book_id = b.id);
