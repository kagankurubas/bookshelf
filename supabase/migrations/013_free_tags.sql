-- Free-form tagging (tags): user-defined, unlimited, multiple tags per
-- book. A dimension completely independent of the existing `category`
-- field (single-select, fixed list).
--
-- A plain text[] column was chosen over a separate tags + book_tags
-- junction table: the app already fetches all of a user's books into
-- memory at once and filters client-side, tag-based stats/aggregation is
-- out of scope, and a normalized model would be unnecessary complexity at
-- this scale.
alter table books add column if not exists tags text[] not null default '{}';

-- No separate RLS policy needed - tags is just a plain column on books,
-- already covered by the existing "Users manage own books" policy
-- (auth.uid() = user_id) which applies to all columns.
