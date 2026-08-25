-- Sayfa sayısı alanı ve kitaplık bazlı okuma istatistikleri için
-- performanslı, tek sorguda hesaplayan bir RPC fonksiyonu.

-- =========================================================
-- 1. books.page_count: kitabın sayfa sayısı (opsiyonel - eski kayıtlarda
--    ve manuel eklenen kitaplarda boş kalabilir).
-- =========================================================
alter table books add column if not exists page_count integer check (page_count is null or page_count >= 0);

-- =========================================================
-- 2. get_reading_stats: bir kitaplıktaki tamamlanmış kitaplar için toplam
--    kitap sayısı, toplam sayfa sayısı ve ortalama puanı tek sorguda
--    hesaplar. Tüm kitapları çekip client'ta toplamak yerine DB'de
--    agregasyon yapılır - kitaplık büyüdükçe ölçeklenir.
--    security invoker (varsayılan) ile çağıranın RLS'i geçerli olur, bu
--    yüzden fonksiyon başka bir kullanıcının kitaplığı için çağrılırsa
--    (RLS zaten books/book_libraries üzerinde uygulandığından) sıfır satır
--    döner, hata değil.
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
