-- DB functions for the stats page (yearly/monthly/category breakdowns).
--
-- Important: all year/month grouping is based on the book's "date_finished"
-- (actual completion date), NOT "created_at" (when the row was added) - if
-- a user finished a book in 2023 but adds it to the app in 2026, it should
-- count toward 2023's stats, not 2026's.

-- To add an optional year filter to get_reading_stats, first drop the old
-- (single-parameter) version and replace it with one whose second
-- parameter defaults to null - otherwise both versions would exist and
-- calling with one parameter would raise an "ambiguous function call" error.
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

-- get_reading_years: years that actually have data in the library, for
-- the year picker (newest to oldest).
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

-- get_monthly_reading_stats: 12 months for the selected year, months with
-- no data still return 0 (so the chart always draws 12 columns).
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

-- get_category_reading_stats: category breakdown of completed books in a
-- library, with an optional year filter. Uncategorized books fall into
-- "Other". Which categories get their own color vs. fold into "Other"
-- (color-blind-safe max category count) is decided on the frontend.
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
