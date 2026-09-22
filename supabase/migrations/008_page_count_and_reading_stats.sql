-- Page count field and a performant, single-query RPC function for
-- per-library reading stats.

-- =========================================================
-- 1. books.page_count: the book's page count (optional - can be blank on
--    older or manually-added records).
-- =========================================================
alter table books add column if not exists page_count integer check (page_count is null or page_count >= 0);

-- =========================================================
-- 2. get_reading_stats: computes completed book count, total pages, and
--    average rating for a library in a single query. Aggregation happens
--    in the DB instead of fetching all books and summing client-side -
--    scales as the library grows.
--    security invoker (the default) means the caller's RLS applies, so if
--    this function is called for another user's library (RLS already
--    applies to books/book_libraries), it returns zero rows, not an error.
-- =========================================================
create or replace function get_reading_stats(p_library_id uuid)
returns table (
  completed_count bigint,
  total_pages bigint,
  average_rating numeric
)
language sql
stable
security invoker
as $$
  select
    count(*) filter (where b.status = 'Tamamlandı') as completed_count,
    coalesce(sum(b.page_count) filter (where b.status = 'Tamamlandı'), 0) as total_pages,
    avg(b.rating) filter (where b.status = 'Tamamlandı' and b.rating > 0) as average_rating
  from books b
  join book_libraries bl on bl.book_id = b.id
  where bl.library_id = p_library_id;
$$;
