-- BookShelf database schema
--
-- This is the CURRENT target schema, meant to be run from scratch on a
-- new (empty) project. To bring an existing project to this state, run
-- the files under supabase/migrations/ IN ORDER (001, 002, 003, 004, 005...).
--
-- Users log in via Supabase Auth (email/password); every library and
-- book belongs to a user (auth.users), enforced by RLS via
-- auth.uid() = user_id.

-- =========================================================
-- 1. libraries: libraries created by the user
-- =========================================================
create table if not exists libraries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  shelf_count integer not null default 2,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists libraries_user_id_idx on libraries(user_id);

-- =========================================================
-- 2. books: book records
-- =========================================================
create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  author text not null,
  publisher text,
  rating smallint not null default 0 check (rating between 0 and 5),
  category text,
  status text not null default 'Başlanmadı'
    check (status in ('Başlanmadı', 'Okunuyor', 'Tamamlandı', 'Yarıda Bırakıldı')),
  date_started date,
  date_finished date,
  cover_image text,
  cover_position smallint not null default 50 check (cover_position between 0 and 100),
  shelf_id text not null default 'default',
  is_favorite boolean not null default false,
  -- shelf_row: which shelf row the book is on within the library (starts at 0).
  -- slot_index: order within that shelf row (starts at 0, kept packed/contiguous).
  -- There's no fixed "shelf capacity" - a shelf's visual length is just however
  -- many books are assigned to it.
  shelf_row integer not null default 0,
  slot_index integer not null default 0,
  -- Used when adding a book via barcode/ISBN lookup
  isbn text,
  -- For reading stats (total pages) - optional, blank if unknown.
  page_count integer check (page_count is null or page_count >= 0),
  created_at timestamptz not null default now()
);

create index if not exists books_user_id_idx on books(user_id);

-- =========================================================
-- 3. book_libraries: many-to-many join table between books <-> libraries
--    (a book can be in more than one library at a time)
-- =========================================================
create table if not exists book_libraries (
  book_id uuid not null references books(id) on delete cascade,
  library_id uuid not null references libraries(id) on delete cascade,
  primary key (book_id, library_id)
);

create index if not exists book_libraries_library_id_idx on book_libraries(library_id);

-- =========================================================
-- 4. notes: notes attached to a book
-- =========================================================
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists notes_book_id_idx on notes(book_id);

-- =========================================================
-- 5. ai_conversations / ai_messages: Book Assistant chat history
-- =========================================================
create table if not exists ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Yeni Sohbet',
  created_at timestamptz not null default now()
);

create table if not exists ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_conversations_user_id_idx on ai_conversations(user_id);
create index if not exists ai_messages_conversation_id_idx on ai_messages(conversation_id);

-- =========================================================
-- 6. Row Level Security
--    Each user can only see and modify their own library/book/note/chat
--    records.
-- =========================================================
alter table libraries enable row level security;
alter table books enable row level security;
alter table book_libraries enable row level security;
alter table notes enable row level security;
alter table ai_conversations enable row level security;
alter table ai_messages enable row level security;

create policy "Users manage own libraries" on libraries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own books" on books
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own book_libraries" on book_libraries
  for all using (
    exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid())
    and exists (select 1 from libraries l where l.id = library_id and l.user_id = auth.uid())
  ) with check (
    exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid())
    and exists (select 1 from libraries l where l.id = library_id and l.user_id = auth.uid())
  );

create policy "Users manage own notes" on notes
  for all using (
    exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid())
  ) with check (
    exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid())
  );

create policy "Users manage own ai_conversations" on ai_conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own ai_messages" on ai_messages
  for all using (
    exists (select 1 from ai_conversations c where c.id = conversation_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from ai_conversations c where c.id = conversation_id and c.user_id = auth.uid())
  );

-- =========================================================
-- 7. Reading stats: RPC functions that compute total/yearly/monthly/category
--    breakdowns per library in a single query (aggregation in the DB instead
--    of fetching all books and summing client-side). security invoker means
--    the caller's RLS applies. All year/month grouping is based on the
--    book's actual completion date (date_finished), NOT when the row was
--    added (created_at).
-- =========================================================
create or replace function get_reading_stats(p_library_id uuid, p_year int default null)
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
  where bl.library_id = p_library_id
    and (p_year is null or extract(year from b.date_finished)::int = p_year);
$$;

create or replace function get_reading_years(p_library_id uuid)
returns table (year int)
language sql
stable
security invoker
as $$
  select distinct extract(year from b.date_finished)::int as year
  from books b
  join book_libraries bl on bl.book_id = b.id
  where bl.library_id = p_library_id
    and b.status = 'Tamamlandı'
    and b.date_finished is not null
  order by year desc;
$$;

create or replace function get_monthly_reading_stats(p_library_id uuid, p_year int)
returns table (
  month int,
  completed_count bigint,
  total_pages bigint
)
language sql
stable
security invoker
as $$
  with finished as (
    select b.page_count, extract(month from b.date_finished)::int as fmonth
    from books b
    join book_libraries bl on bl.book_id = b.id
    where bl.library_id = p_library_id
      and b.status = 'Tamamlandı'
      and b.date_finished is not null
      and extract(year from b.date_finished)::int = p_year
  )
  select
    m.month,
    count(f.fmonth) as completed_count,
    coalesce(sum(f.page_count), 0) as total_pages
  from generate_series(1, 12) as m(month)
  left join finished f on f.fmonth = m.month
  group by m.month
  order by m.month;
$$;

create or replace function get_category_reading_stats(p_library_id uuid, p_year int default null)
returns table (
  category text,
  completed_count bigint,
  total_pages bigint
)
language sql
stable
security invoker
as $$
  select
    coalesce(b.category, 'Diğer') as category,
    count(*) as completed_count,
    coalesce(sum(b.page_count), 0) as total_pages
  from books b
  join book_libraries bl on bl.book_id = b.id
  where bl.library_id = p_library_id
    and b.status = 'Tamamlandı'
    and (p_year is null or extract(year from b.date_finished)::int = p_year)
  group by coalesce(b.category, 'Diğer')
  order by completed_count desc;
$$;

-- Reading trend by year - unlike the monthly chart, not limited to a single
-- year, covers the library's entire history.
create or replace function get_yearly_reading_stats(p_library_id uuid)
returns table (
  year int,
  completed_count bigint,
  total_pages bigint
)
language sql
stable
security invoker
as $$
  select
    extract(year from b.date_finished)::int as year,
    count(*) as completed_count,
    coalesce(sum(b.page_count), 0) as total_pages
  from books b
  join book_libraries bl on bl.book_id = b.id
  where bl.library_id = p_library_id
    and b.status = 'Tamamlandı'
    and b.date_finished is not null
  group by extract(year from b.date_finished)::int
  order by year asc;
$$;

-- =========================================================
-- 8. ai_daily_usage: daily usage quota for the Book Assistant (Gemini).
--    On Google's free tier this model has a 20 requests/day (RPD) limit,
--    and that limit is a single counter SHARED across ALL users, not
--    per-user. Instead of hitting that real limit and getting unexpected
--    errors from Gemini, we keep our own internal quota lower (see
--    DAILY_QUOTA_LIMIT in the ai-chat Edge Function) and return a polite
--    message to the user once the quota is used up, without calling
--    Gemini at all.
-- =========================================================
create table if not exists ai_daily_usage (
  usage_date date primary key,
  request_count integer not null default 0
);

alter table ai_daily_usage enable row level security;
-- Intentionally no policies - this table is only accessed through the
-- security definer function below, never directly from the client.

-- Atomically increments the counter for the given day; returns false
-- without incrementing once the limit is reached. Because it's a single
-- UPDATE statement, Postgres row locking makes it race-free even under
-- concurrent calls - the counter can't be exceeded even if two requests
-- arrive at the same time.
create or replace function try_consume_ai_quota(p_usage_date date, p_max_requests integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  insert into ai_daily_usage (usage_date, request_count)
  values (p_usage_date, 0)
  on conflict (usage_date) do nothing;

  update ai_daily_usage
  set request_count = request_count + 1
  where usage_date = p_usage_date
    and request_count < p_max_requests
  returning request_count into new_count;

  return new_count is not null;
end;
$$;

grant execute on function try_consume_ai_quota(date, integer) to authenticated;
