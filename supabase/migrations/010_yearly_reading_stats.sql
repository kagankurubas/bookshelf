-- Yıllara göre okuma trendi (her yıl için tamamlanan kitap/sayfa sayısı) -
-- aylık grafiğin aksine tek bir yılla sınırlı değil, kitaplığın tüm
-- geçmişini kapsar. date_finished'a göre gruplanır (bkz. 009'daki not).
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
