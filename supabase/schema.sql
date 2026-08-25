-- BookShelf veritabani semasi
--
-- Bu, bir yeni (bos) projede sifirdan calistirilacak GUNCEL hedef sema.
-- Var olan bir projeyi bu hale getirmek icin supabase/migrations/
-- klasorundeki dosyalari SIRAYLA calistir (001, 002, 003, 004, 005...).
--
-- Kullanicilar Supabase Auth (e-posta/sifre) ile giris yapar; her
-- kitaplik ve kitap bir kullaniciya (auth.users) aittir, RLS bunu
-- auth.uid() = user_id kontrolu ile zorunlu kilar.

-- =========================================================
-- 1. libraries: kullanicinin olusturdugu kitapliklar
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
-- 2. books: kitap kayitlari
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
  -- shelf_row: kitabın kitaplık rafındaki hangi raf katında olduğu (0'dan başlar).
  -- slot_index: aynı raf katı içindeki sırası (0'dan başlar, o katta sıkışık/ardışık tutulur).
  -- Sabit "raf kapasitesi" yok; bir rafın görsel uzunluğu, o rafa
  -- atanmış kitap sayısı kadardır.
  shelf_row integer not null default 0,
  slot_index integer not null default 0,
  -- Barkod/ISBN ile arama uzerinden kitap eklerken kullanilacak
  isbn text,
  -- Okuma istatistikleri (toplam sayfa) icin - opsiyonel, bilinmiyorsa bos kalir.
  page_count integer check (page_count is null or page_count >= 0),
  created_at timestamptz not null default now()
);

create index if not exists books_user_id_idx on books(user_id);

-- =========================================================
-- 3. book_libraries: books <-> libraries many-to-many ara tablosu
--    (bir kitap ayni anda birden fazla kitaplikta olabilir)
-- =========================================================
create table if not exists book_libraries (
  book_id uuid not null references books(id) on delete cascade,
  library_id uuid not null references libraries(id) on delete cascade,
  primary key (book_id, library_id)
);

create index if not exists book_libraries_library_id_idx on book_libraries(library_id);

-- =========================================================
-- 4. notes: bir kitaba bagli notlar
-- =========================================================
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists notes_book_id_idx on notes(book_id);

-- =========================================================
-- 5. ai_conversations / ai_messages: Kitap Asistani sohbet gecmisi
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
--    Her kullanici sadece kendi kitaplik/kitap/not/sohbet kayitlarini
--    gorebilir ve degistirebilir.
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
  ) with check (
    exists (select 1 from books b where b.id = book_id and b.user_id = auth.uid())
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
-- 7. Okuma istatistikleri: kitaplık bazlı toplam/yıllık/aylık/kategori
--    kırılımları tek sorguda hesaplayan RPC fonksiyonları (client'ta tüm
--    kitapları çekip toplamak yerine DB'de agregasyon). security invoker
--    sayesinde çağıranın RLS'i geçerli olur. Tüm yıl/ay gruplamaları
--    kitabın gerçekten bitirildiği tarihe (date_finished) göre yapılır,
--    kayda ne zaman eklendiğine (created_at) göre DEĞİL.
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
