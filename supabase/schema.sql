-- BookShelf veritabani semasi
--
-- NOT: Bu uygulama su an tek kullanicili (kisisel) bir uygulama olarak
-- calisiyor, bu yuzden asagidaki RLS policy'leri herkese (anon dahil)
-- tam okuma/yazma izni verecek sekilde gevsek tanimlandi. Ileride
-- Supabase Auth ile kullanici girisi eklenirse bu policy'ler
-- auth.uid() bazli kisitlamalarla sikilastirilmali (orn. sadece kendi
-- kayitlarini gorebilme/degistirebilme).

-- =========================================================
-- 1. libraries: kullanicinin olusturdugu kitapliklar
-- =========================================================
create table if not exists libraries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- capacity: artik kullanilmiyor (eskiden raf basina sabit slot sayisiydi).
  -- Geriye donuk uyumluluk icin kolon duruyor, uygulama artik okumuyor/yazmiyor.
  capacity integer not null default 10,
  shelf_count integer not null default 2,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 2. books: kitap kayitlari
-- =========================================================
create table if not exists books (
  id uuid primary key default gen_random_uuid(),
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
  -- Artık sabit "raf kapasitesi" yok; bir rafın görsel uzunluğu, o rafa
  -- atanmış kitap sayısı kadardır.
  shelf_row integer not null default 0,
  slot_index integer not null default 0,
  -- Barkod/ISBN ile arama uzerinden kitap eklerken kullanilacak
  isbn text,
  created_at timestamptz not null default now()
);

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
-- 5. Row Level Security
--    Tek kullanicili kisisel uygulama icin simdilik herkese acik
--    okuma/yazma policy'si. Kullanici girisi eklenince sikilastirilacak.
-- =========================================================
alter table libraries enable row level security;
alter table books enable row level security;
alter table book_libraries enable row level security;
alter table notes enable row level security;

create policy "Allow all on libraries" on libraries
  for all using (true) with check (true);

create policy "Allow all on books" on books
  for all using (true) with check (true);

create policy "Allow all on book_libraries" on book_libraries
  for all using (true) with check (true);

create policy "Allow all on notes" on notes
  for all using (true) with check (true);
