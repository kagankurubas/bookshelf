-- İstatistikler sayfası (yıllık/aylık/kategori kırılımı) için DB fonksiyonları.
--
-- Önemli: tüm yıl/ay gruplamaları kitabın "date_finished" (gerçekten
-- bitirildiği tarih) alanına göre yapılır, "created_at" (kayda ne zaman
-- eklendiği) alanına göre DEĞİL - kullanıcı 2023'te bitirdiği bir kitabı
-- 2026'da uygulamaya eklerse, bu kitap 2023 istatistiklerine sayılmalı,
-- 2026'ya değil.

-- get_reading_stats'a opsiyonel yıl filtresi eklemek için önce eski
-- (tek parametreli) sürümü kaldırıp yerine ikinci parametresi varsayılan
-- null olan sürümünü koyuyoruz - aksi halde iki sürüm birden var olup
-- tek parametreyle çağrıldığında "ambiguous function call" hatası verir.
drop function if exists get_reading_stats(uuid);

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

-- get_reading_years: yıl seçicide gösterilecek, kitaplıkta gerçekten veri
-- bulunan yılların listesi (en yeniden en eskiye).
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

-- get_monthly_reading_stats: seçilen yıl için 12 ay, veri olmayan aylar da
-- 0 olarak döner (grafik her zaman 12 sütun çizsin diye).
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

-- get_category_reading_stats: kitaplıktaki tamamlanmış kitapların kategoriye
-- göre kırılımı, isteğe bağlı yıl filtresiyle. Kategorisiz kitaplar "Diğer"e
-- düşer. Hangi kategorilerin ayrı renk alıp hangilerinin "Diğer"e katlanacağı
-- (renk körlüğü güvenli maksimum kategori sayısı) frontend'de belirleniyor.
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
