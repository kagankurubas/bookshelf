-- Ana kitaplık kavramını gerçek hale getirir ve mevcut veriyi onarır.
--
-- Sorun: uygulama şimdiye kadar hiçbir kitaplığı is_default = true olarak
-- işaretlemiyordu (LibraryToolbar'daki silme engeli bu bayrağa bakıyor ama
-- kimse hiç true olmadığı için hiçbir kitaplık gerçekte korunmuyordu).
-- Bir kullanıcı "ana" saydığı kitaplığını sildiğinde, kitapları book_libraries
-- (many-to-many ara tablo) üzerinden cascade ile bağlantısız kalıyor, kendisi
-- books tablosunda duruyor ama hiçbir kitaplıkta görünmüyor - veri kaybı gibi
-- görünen ama aslında "sahipsiz kitap" durumu.
--
-- Bu migration üç adımda onarır (hepsi idempotent, tekrar çalıştırmak güvenli):
--   1) Hâlâ hiçbir kitaplığı is_default olmayan kullanıcılar için en eski
--      (ilk oluşturulan) kitaplığı ana kitaplık olarak işaretler - bu,
--      App.jsx'in şimdiye kadar zaten "varsayılan" saydığı kitaplıkla aynısı.
--   2) Sahipsiz kitabı olup hiç kitaplığı kalmamış kullanıcılar için yeni bir
--      ana kitaplık oluşturur (tüm kitaplıklarını silmiş olabilirler).
--   3) Her sahipsiz kitabı, kullanıcısının ana kitaplığına bağlar.

-- 1) En eski kitaplığı ana kitaplık yap (henüz ana kitaplığı olmayanlar için).
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

-- 2) Sahipsiz kitabı olan ama hiç kitaplığı kalmamış kullanıcılar için yeni
--    bir ana kitaplık oluştur.
insert into libraries (user_id, name, shelf_count, is_default)
select distinct b.user_id, 'Kitaplığım', 2, true
from books b
where not exists (select 1 from book_libraries bl where bl.book_id = b.id)
  and not exists (select 1 from libraries l where l.user_id = b.user_id);

-- 3) Sahipsiz kalan her kitabı, kullanıcısının ana kitaplığına bağla.
insert into book_libraries (book_id, library_id)
select b.id, l.id
from books b
join libraries l on l.user_id = b.user_id and l.is_default = true
where not exists (select 1 from book_libraries bl where bl.book_id = b.id);
